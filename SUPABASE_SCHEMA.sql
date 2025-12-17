-- Supabase SQL Schema for NOLA Chat Reactions with Hourly Ranking

-- Messages table (existing)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions table with hourly ranking support
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_ip TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL, -- Start of the hour window
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_ip, hour_bucket, reaction_type) -- One reaction per user per hour per type
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_hour_bucket ON message_reactions(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_reactions_user_ip ON message_reactions(user_ip);

-- Function to get current hour start
CREATE OR REPLACE FUNCTION get_hour_start(ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN DATE_TRUNC('hour', ts AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get reaction stats for messages (current hour)
CREATE OR REPLACE FUNCTION get_current_hour_reactions(message_ids UUID[])
RETURNS TABLE (
  message_id UUID,
  likes BIGINT,
  dislikes BIGINT
) AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  current_hour := get_hour_start(NOW() AT TIME ZONE 'UTC');
  
  RETURN QUERY
  SELECT 
    mr.message_id,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::BIGINT as likes,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)::BIGINT as dislikes
  FROM message_reactions mr
  WHERE mr.message_id = ANY(message_ids)
    AND mr.hour_bucket = current_hour
  GROUP BY mr.message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all-time reaction stats (for display purposes)
CREATE OR REPLACE FUNCTION get_all_time_reactions(message_ids UUID[])
RETURNS TABLE (
  message_id UUID,
  total_likes BIGINT,
  total_dislikes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.message_id,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::BIGINT as total_likes,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)::BIGINT as total_dislikes
  FROM message_reactions mr
  WHERE mr.message_id = ANY(message_ids)
  GROUP BY mr.message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get top 3 messages in current hour
CREATE OR REPLACE FUNCTION get_top_3_messages_current_hour()
RETURNS TABLE (
  message_id UUID,
  likes BIGINT,
  rank INT
) AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  current_hour := get_hour_start(NOW() AT TIME ZONE 'UTC');
  
  RETURN QUERY
  SELECT 
    mr.message_id,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::BIGINT as likes,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) DESC) as rank
  FROM message_reactions mr
  WHERE mr.hour_bucket = current_hour
  GROUP BY mr.message_id
  ORDER BY likes DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Function to record a reaction
CREATE OR REPLACE FUNCTION record_reaction(
  p_message_id UUID,
  p_user_ip TEXT,
  p_reaction_type TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  action TEXT,
  likes BIGINT,
  dislikes BIGINT,
  total_likes BIGINT,
  total_dislikes BIGINT
) AS $$
DECLARE
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_existing_type TEXT;
  v_likes BIGINT;
  v_dislikes BIGINT;
  v_total_likes BIGINT;
  v_total_dislikes BIGINT;
BEGIN
  v_current_hour := get_hour_start(NOW() AT TIME ZONE 'UTC');
  
  -- Check if user already reacted this hour
  SELECT reaction_type INTO v_existing_type
  FROM message_reactions
  WHERE message_id = p_message_id 
    AND user_ip = p_user_ip 
    AND hour_bucket = v_current_hour
  LIMIT 1;
  
  -- If same reaction exists, remove it (toggle)
  IF v_existing_type = p_reaction_type THEN
    DELETE FROM message_reactions
    WHERE message_id = p_message_id 
      AND user_ip = p_user_ip 
      AND hour_bucket = v_current_hour
      AND reaction_type = p_reaction_type;
    action := 'removed';
  ELSE
    -- If different reaction exists, remove it first
    IF v_existing_type IS NOT NULL THEN
      DELETE FROM message_reactions
      WHERE message_id = p_message_id 
        AND user_ip = p_user_ip 
        AND hour_bucket = v_current_hour;
    END IF;
    
    -- Insert new reaction
    INSERT INTO message_reactions (message_id, user_ip, reaction_type, hour_bucket)
    VALUES (p_message_id, p_user_ip, p_reaction_type, v_current_hour)
    ON CONFLICT DO NOTHING;
    
    action := CASE WHEN v_existing_type IS NULL THEN 'added' ELSE 'changed' END;
  END IF;
  
  -- Get current hour stats
  SELECT 
    COALESCE(SUM(CASE WHEN rt = 'like' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rt = 'dislike' THEN 1 ELSE 0 END), 0)
  INTO v_likes, v_dislikes
  FROM (SELECT reaction_type as rt FROM message_reactions 
        WHERE message_id = p_message_id AND hour_bucket = v_current_hour) t;
  
  -- Get all-time stats
  SELECT 
    COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)
  INTO v_total_likes, v_total_dislikes
  FROM message_reactions WHERE message_id = p_message_id;
  
  RETURN QUERY SELECT true, action, v_likes, v_dislikes, v_total_likes, v_total_dislikes;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old reactions (optional: run periodically to clean up old data)
-- Keeps reactions from the last 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_reactions()
RETURNS TABLE (deleted_count INT) AS $$
DECLARE
  v_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  v_cutoff := NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours';
  DELETE FROM message_reactions WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_cutoff AS ROW_COUNT;
  RETURN QUERY SELECT v_cutoff::INT;
END;
$$ LANGUAGE plpgsql;
