import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useEnsName } from 'wagmi';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useChain, ChainType } from '@/lib/chainContext';
import { fetchMessages, sendMessage, subscribeToMessages, getChatStatus, ChatStatus, reactToMessage, getReactionStats, ReactionStats } from '@/lib/supabaseClient';
import { useTypewriter } from '@/hooks/useTypewriter';

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

// Get themed colors based on chain
function getChainColors(chain: ChainType): { primary: string; secondary: string; glow: string } {
  switch (chain) {
    case 'ETH':
      return { primary: '#4589ff', secondary: '#1370ff', glow: 'rgba(69, 137, 255, 0.6)' };
    case 'BRG':
      return { primary: '#ffb545', secondary: '#ff9f13', glow: 'rgba(255, 181, 69, 0.6)' };
    default:
      return { primary: '#b445ff', secondary: '#7013ff', glow: 'rgba(180, 69, 255, 0.6)' };
  }
}

interface ChatPanelProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Generate consistent random color for username
const getUsernameColor = (username: string): string => {
  const colors = [
    '#FF6B9D', '#C44569', '#F8B500', '#1ABC9C', '#3498DB',
    '#9B59B6', '#E74C3C', '#1E8449', '#D68910', '#7D3C98',
    '#2980B9', '#27AE60', '#E67E22', '#C0392B', '#16A085'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function ChatPanel({ isOpen: externalIsOpen, onOpenChange }: ChatPanelProps = {}) {
  const { address, isConnected } = useAccount();
  const { chain } = useChain();
  // Use wagmi's useEnsName hook for ENS lookup on Ethereum mainnet
  const { data: ensName } = useEnsName({
    address: address,
    chainId: 1, // Always query Ethereum mainnet for ENS
  });
  
  const [isOpen, setIsOpen] = useState(externalIsOpen ?? false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [reactionStats, setReactionStats] = useState<Record<string, ReactionStats>>({});
  const [top3Messages, setTop3Messages] = useState<string[]>([]);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reactionRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastMessageCountRef = useRef(0);
  const userScrolledRef = useRef(false);
  
  const chatPlaceholders = ["Drop your alpha...", "Share your insights..."];
  const typewriterChatPlaceholder = useTypewriter(chatPlaceholders, 70, 35, 900);

  // Fetch chat status on mount and when chat opens
  useEffect(() => {
    if (isOpen) {
      getChatStatus().then(status => {
        if (status) setChatStatus(status);
      });
    }
  }, [isOpen]);

  // Set username from ENS name, stored value, or wallet address
  useEffect(() => {
    const stored = localStorage.getItem('nola_chat_username');
    const isWalletFormat = stored && stored.includes('...') && stored.startsWith('0x');
    
    // Priority: 1. Custom username (not wallet format), 2. ENS name, 3. Shortened wallet address
    if (stored && !isWalletFormat) {
      setUsername(stored);
    } else if (ensName) {
      setUsername(ensName);
      localStorage.setItem('nola_chat_username', ensName);
    } else if (isConnected && address) {
      const walletUsername = `${address.slice(0, 6)}...${address.slice(-4)}`;
      setUsername(walletUsername);
      localStorage.setItem('nola_chat_username', walletUsername);
    }
  }, [isConnected, address, ensName]);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);
  
  const handleToggle = (newState: boolean) => {
    setIsOpen(newState);
    onOpenChange?.(newState);
  };
  
  useEffect(() => {
    if (isOpen && username) {
      loadMessages();

      let unsubscribe: (() => void) | null = null;
      let pollInterval: NodeJS.Timeout | null = null;

      // Real-time subscription for instant updates
      subscribeToMessages((payload) => {
        // Map payload to Message format
        const newMessage = {
          id: payload.id,
          username: payload.user,
          message: payload.text,
          created_at: payload.created_at
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }).then((unsub) => {
        unsubscribe = unsub;
      });

      // Fast polling every 300ms (0.3s) - balanced for Supabase
      pollInterval = setInterval(() => {
        loadMessages();
      }, 300);

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [isOpen, username]);

  // Smart auto-scroll: Only active when viewing recent 4 messages
  // Disabled when user scrolls back, re-enabled when returning to recent messages
  const checkIfNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    // Calculate if we're within the last ~4 messages height (approx 200px)
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = scrollBottom < 200; // Within ~4 messages from bottom
    return isNearBottom;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && autoScrollEnabled && !userScrolledRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScrollEnabled]);

  // Handle scroll events to detect user scrolling back
  const handleScroll = useCallback(() => {
    const isNearBottom = checkIfNearBottom();
    
    if (!isNearBottom) {
      // User scrolled back - disable auto-scroll
      userScrolledRef.current = true;
      setAutoScrollEnabled(false);
    } else if (userScrolledRef.current && isNearBottom) {
      // User returned to recent messages - re-enable auto-scroll
      userScrolledRef.current = false;
      setAutoScrollEnabled(true);
    }
  }, [checkIfNearBottom]);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isOpen) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen, handleScroll]);

  // Auto-scroll when new messages arrive (only if viewing recent messages)
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      // New messages arrived
      if (autoScrollEnabled && !userScrolledRef.current) {
        scrollToBottom();
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, autoScrollEnabled, scrollToBottom]);

  // Scroll to bottom when chat first opens
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        setAutoScrollEnabled(true);
        userScrolledRef.current = false;
      }, 100);
    }
  }, [isOpen]);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        toggleRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        handleToggle(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadMessages = async () => {
    const msgs = await fetchMessages();
    setMessages(msgs);
    // Load reaction stats for all messages immediately
    if (msgs.length > 0) {
      const stats = await getReactionStats(msgs.map(m => m.id));
      if (stats) {
        setReactionStats(stats.stats);
        setTop3Messages(stats.top3);
        console.log('[Chat] Loaded reaction stats:', stats.stats);
      }
    }
  };

  // Refresh reaction stats every 2 seconds for real-time global consistency
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const refreshStats = async () => {
        const stats = await getReactionStats(messages.map(m => m.id));
        if (stats) {
          setReactionStats(stats.stats);
          setTop3Messages(stats.top3);
        }
      };
      // Immediate refresh on open
      refreshStats();
      // Then refresh every 2 seconds for global sync
      reactionRefreshRef.current = setInterval(refreshStats, 2000);
      return () => {
        if (reactionRefreshRef.current) clearInterval(reactionRefreshRef.current);
      };
    }
  }, [isOpen, messages.length]);

  // Handle reaction click - direct inline reaction
  const handleReaction = async (messageId: string, type: 'like' | 'dislike') => {
    if (reactingTo) return; // Prevent double-click
    setReactingTo(messageId);
    
    const result = await reactToMessage(messageId, type);
    if (result.success) {
      // Refresh stats after reaction
      const stats = await getReactionStats(messages.map(m => m.id));
      if (stats) {
        setReactionStats(stats.stats);
        setTop3Messages(stats.top3);
      }
    }
    
    setReactingTo(null);
  };

  // Get aura rank (1, 2, 3) or 0 if not in top 3
  const getAuraRank = (messageId: string): number => {
    const idx = top3Messages.indexOf(messageId);
    return idx === -1 ? 0 : idx + 1;
  };

  const auraLabels = ['#1 ALPHA', '#2 ALPHA', '#3 ALPHA'];
  const auraGlows = [
    '0 0 20px rgba(255, 215, 0, 0.4)', // Gold
    '0 0 15px rgba(192, 192, 192, 0.3)', // Silver
    '0 0 10px rgba(205, 127, 50, 0.2)' // Bronze
  ];

  const chainColors = getChainColors(chain);

  const handleChatButtonClick = () => {
    if (!isOpen && !username) {
      setShowUsernameModal(true);
    } else {
      handleToggle(!isOpen);
    }
  };

  const handleSetUsername = () => {
    const name = (document.getElementById('username-input') as HTMLInputElement)?.value.trim();
    if (name && name.length >= 4) {
      setUsername(name);
      localStorage.setItem('nola_chat_username', name);
      setShowUsernameModal(false);
      handleToggle(true);
    }
  };

  const filterMessage = (text: string): boolean => {
    // Block URLs
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\w+\.\w{2,})/gi;
    if (urlPattern.test(text)) {
      // Assuming showToast is defined elsewhere and accessible
      // For demonstration purposes, we'll use console.error
      console.warn('Links are not allowed in chat'); 
      // showToast('Links are not allowed in chat', { type: 'warn' });
      return false;
    }

    // Block profanity and harsh words
    const profanityList = [
      'damn', 'hell', 'ass', 'bitch', 'fuck', 'shit', 'crap', 'bastard',
      'idiot', 'stupid', 'moron', 'dumb', 'loser', 'hate', 'kill', 'die'
    ];

    const lowerText = text.toLowerCase();
    for (const word of profanityList) {
      if (lowerText.includes(word)) {
        // Assuming showToast is defined elsewhere and accessible
        // For demonstration purposes, we'll use console.error
        console.warn('Please keep chat respectful and professional');
        // showToast('Please keep chat respectful and professional', { type: 'warn' });
        return false;
      }
    }

    return true;
  };


  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !username || isSending) return;

    if (!filterMessage(inputValue)) {
      return;
    }

    const messageText = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setRateLimitMessage(null);

    const result = await sendMessage(username, messageText);
    
    if (!result.success) {
      setInputValue(messageText);
      if (result.error === 'rate_limit') {
        setRateLimitMessage(result.message || 'Rate limit reached');
        // Start countdown timer
        if (result.secondsUntilReset) {
          setCountdownTimer(result.secondsUntilReset);
          // Start interval for countdown
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = setInterval(() => {
            setCountdownTimer((prev) => {
              if (prev === null || prev <= 1) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                setRateLimitMessage(null);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } else {
      // Refresh chat status after successful send
      const status = await getChatStatus();
      if (status) setChatStatus(status);
    }

    setIsSending(false);
  }, [inputValue, username, isSending]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getChatToggleClass = () => {
    if (chain === 'ETH') return 'chat-toggle eth-active';
    if (chain === 'BRG') return 'chat-toggle brg-active';
    return 'chat-toggle';
  };

  return (
    <>
      <div
        ref={toggleRef}
        className={getChatToggleClass()}
        onClick={handleChatButtonClick}
        data-testid="button-chat-toggle"
        title="Public Chat"
      >
        <MessageCircle size={20} />
      </div>

      <div
        ref={sidebarRef}
        className={`chat-sidebar ${isOpen ? 'open' : ''}`}
        data-testid="panel-chat-sidebar"
      >
        <h3 style={{ textAlign: 'center', marginBottom: '10px', color: '#e0b3ff' }}>
          Chat
        </h3>

        <div
          ref={messagesContainerRef}
          style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
          data-testid="container-chat-messages"
        >
          {messages.map((msg) => {
            const stats = reactionStats[msg.id];
            const auraRank = getAuraRank(msg.id);
            const isReacting = reactingTo === msg.id;
            
            return (
              <div 
                key={msg.id} 
                className={`chat-msg ${auraRank > 0 ? 'aura-msg aura-' + auraRank : ''}`}
                data-testid={`chat-msg-${msg.id}`}
                style={{
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: auraRank > 0 ? auraGlows[auraRank - 1] : 'none',
                  border: auraRank > 0 ? `1px solid ${chainColors.primary}44` : 'none',
                  background: auraRank > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  padding: auraRank > 0 ? '12px' : '8px 4px',
                  borderRadius: auraRank > 0 ? '12px' : '0px',
                  margin: auraRank > 0 ? '8px 4px' : '0px'
                }}
              >
                {auraRank > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-10px', 
                    right: '10px', 
                    background: chainColors.primary, 
                    color: '#fff', 
                    fontSize: '9px', 
                    fontWeight: 900, 
                    padding: '2px 8px', 
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10
                  }}>
                    {auraLabels[auraRank - 1]}
                  </div>
                )}
                {/* Message content */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: getUsernameColor(msg.username), marginBottom: '4px' }}>
                    {msg.username}
                  </div>
                  <div>{msg.message}</div>
                  
                  {/* Inline reaction buttons below message - always visible like YouTube comments */}
                  <div 
                    style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '6px',
                      fontSize: '10px'
                    }}
                  >
                    <button
                      onClick={() => handleReaction(msg.id, 'like')}
                      disabled={isReacting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: stats?.likes > 0 ? chainColors.primary : 'rgba(255,255,255,0.5)',
                        fontWeight: stats?.likes > 0 ? 600 : 400,
                        background: 'none',
                        border: 'none',
                        cursor: isReacting ? 'not-allowed' : 'pointer',
                        padding: '2px 4px',
                        opacity: isReacting ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      data-testid={`button-like-inline-${msg.id}`}
                      title="Like"
                    >
                      <ThumbsUp size={11} />
                      {stats && stats.likes > 0 && <span className={isReacting ? 'count-animate' : ''}>{stats.likes}</span>}
                    </button>
                    
                    <button
                      onClick={() => handleReaction(msg.id, 'dislike')}
                      disabled={isReacting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: stats?.dislikes > 0 ? '#ff6b6b' : 'rgba(255,255,255,0.5)',
                        fontWeight: stats?.dislikes > 0 ? 600 : 400,
                        background: 'none',
                        border: 'none',
                        cursor: isReacting ? 'not-allowed' : 'pointer',
                        padding: '2px 4px',
                        opacity: isReacting ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      data-testid={`button-dislike-inline-${msg.id}`}
                      title="Dislike"
                    >
                      <ThumbsDown size={11} />
                      {stats && stats.dislikes > 0 && <span className={isReacting ? 'count-animate' : ''}>{stats.dislikes}</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating rate limit handler with countdown */}
        {rateLimitMessage && countdownTimer !== null && (
          <div 
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '20px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(255,180,70,0.2), rgba(255,140,50,0.15))',
              border: '1px solid rgba(255,180,70,0.5)',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#ffb545',
              textAlign: 'center',
              animation: 'slideIn 0.4s ease',
              zIndex: 9998,
              maxWidth: '280px',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 8px 32px rgba(255,180,70,0.2)'
            }}
            data-testid="notification-rate-limit-float"
          >
            <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '12px', opacity: 0.9 }}>
              {rateLimitMessage}
            </div>
            <div style={{
              fontWeight: 900,
              fontSize: '24px',
              fontFamily: 'monospace',
              color: '#ffc870',
              letterSpacing: '2px'
            }}>
              {String(Math.floor(countdownTimer / 60)).padStart(2, '0')}:{String(countdownTimer % 60).padStart(2, '0')}
            </div>
          </div>
        )}

        <div className="chat-input">
          <input
            type="text"
            placeholder={typewriterChatPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatStatus?.remainingMessages === 0}
            data-testid="input-chat-message"
          />
          <button 
            onClick={handleSend} 
            disabled={isSending || chatStatus?.remainingMessages === 0} 
            data-testid="button-send-chat" 
            className="chat-send-arrow"
          >
            {isSending ? (
              <span className="btn-spinner" style={{ width: '14px', height: '14px' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {showUsernameModal && (
        <div className="username-modal" style={{ display: 'flex' }} data-testid="modal-username">
          <div className="modal-content">
            <h3 style={{ color: '#e0b3ff' }}>Choose a Username</h3>
            <input
              id="username-input"
              placeholder="Enter name (min 4 chars)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSetUsername();
              }}
              data-testid="input-username"
              minLength={4}
            />
            <button onClick={handleSetUsername} data-testid="button-confirm-username" className="themed-arrow-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
