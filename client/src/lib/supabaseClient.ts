import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchServerConfig } from './config';

// Supabase client - initialized lazily from server config
let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

// Only create client if both credentials are valid URLs/keys
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Initialize Supabase client from server config (credentials protected server-side)
async function initializeSupabase(): Promise<SupabaseClient | null> {
  if (supabaseClient) return supabaseClient;
  if (initPromise) return initPromise;
  
  initPromise = fetchServerConfig().then(serverConfig => {
    const supabaseUrl = serverConfig.supabaseUrl || '';
    const supabaseAnonKey = serverConfig.supabaseAnonKey || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Supabase] Credentials missing. Chat will not work.');
      return null;
    }
    
    if (!isValidUrl(supabaseUrl)) {
      console.warn('[Supabase] Invalid URL. Chat will not work.');
      return null;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return supabaseClient;
    } catch (e) {
      console.warn('[Supabase] Failed to initialize:', e);
      return null;
    }
  }).catch(err => {
    console.error('[Supabase] Config fetch error:', err);
    return null;
  });
  
  return initPromise;
}

// Synchronous access to supabase client (may be null if not initialized)
export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

// Legacy export for backward compatibility - will be null until initialized
export const supabase: SupabaseClient | null = null;

// Initialize and get supabase client
export async function getSupabaseAsync(): Promise<SupabaseClient | null> {
  return initializeSupabase();
}

export async function fetchMessages() {
  const client = await getSupabaseAsync();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('id, user, text, created_at')
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Fetch messages error:', error);
      return [];
    }

    // Map to expected format
    return (data || []).map(msg => ({
      id: msg.id,
      username: msg.user,
      message: msg.text,
      created_at: msg.created_at
    }));
  } catch (e) {
    console.error('fetchMessages exception:', e);
    return [];
  }
}

interface SendMessageResult {
  success: boolean;
  message?: string;
  error?: string;
  secondsUntilReset?: number;
  remainingMessages?: number;
}

export async function sendMessage(username: string, message: string): Promise<SendMessageResult> {
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, message })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to send message',
        error: data.error,
        secondsUntilReset: data.secondsUntilReset,
        remainingMessages: data.remainingMessages
      };
    }

    return {
      success: true,
      message: data.message,
      remainingMessages: data.remainingMessages
    };
  } catch (e) {
    console.error('sendMessage exception:', e);
    return { success: false, error: 'Network error' };
  }
}

export interface ChatStatus {
  canSend: boolean;
  remainingMessages: number;
  maxMessagesPerHour: number;
  secondsUntilReset: number;
  minutesStr: string;
  secondsStr: string;
}

export async function getChatStatus(): Promise<ChatStatus | null> {
  try {
    const response = await fetch('/api/chat/status');
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('getChatStatus exception:', e);
    return null;
  }
}

export async function subscribeToMessages(callback: (message: any) => void): Promise<(() => void) | null> {
  const client = await getSupabaseAsync();
  if (!client) return null;

  const channel = client
    .channel('public:chat_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return () => {
    channel.unsubscribe();
  };
}

// Message reaction types
export interface ReactionStats {
  likes: number;
  dislikes: number;
  totalLikes: number;
  totalDislikes: number;
  userReaction: 'like' | 'dislike' | null;
}

export interface ReactionsResponse {
  success: boolean;
  stats: Record<string, ReactionStats>;
  top3: string[];
  hourStart: number;
}

// React to a message
export async function reactToMessage(messageId: string, reactionType: 'like' | 'dislike'): Promise<{ success: boolean; action?: string; likes?: number; dislikes?: number; totalLikes?: number; totalDislikes?: number }> {
  try {
    const response = await fetch('/api/chat/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, reactionType })
    });
    return await response.json();
  } catch (e) {
    console.error('reactToMessage exception:', e);
    return { success: false };
  }
}

// Get reaction stats for multiple messages
export async function getReactionStats(messageIds: string[]): Promise<ReactionsResponse | null> {
  try {
    const response = await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('getReactionStats exception:', e);
    return null;
  }
}
