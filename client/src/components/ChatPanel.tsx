import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useEnsName } from 'wagmi';
import { MessageCircle } from 'lucide-react';
import { useChain, ChainType } from '@/lib/chainContext';
import { fetchMessages, sendMessage, subscribeToMessages, getChatStatus, ChatStatus } from '@/lib/supabaseClient';
import { useTypewriter } from '@/hooks/useTypewriter';

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface ChatPanelProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  };

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
          style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
          data-testid="container-chat-messages"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="chat-msg" data-testid={`chat-msg-${msg.id}`}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#b445ff', marginBottom: '4px' }}>
                {msg.username}
              </div>
              <div>{msg.message}</div>
            </div>
          ))}
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
