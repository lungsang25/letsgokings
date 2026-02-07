import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { trackLiveChatViewed } from '@/lib/analytics';

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: Timestamp;
}

const MESSAGES_COLLECTION = 'chat_messages';
const MAX_MESSAGES = 100;

const ChatBox = () => {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(MAX_MESSAGES)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({
          id: doc.id,
          ...doc.data()
        } as ChatMessage);
      });
      // Reverse to show oldest first
      setMessages(msgs.reverse());
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !newMessage.trim() || isSending) return;
    if (currentUser.isGuest) return; // Only authenticated users can send

    setIsSending(true);
    try {
      await addDoc(collection(db, MESSAGES_COLLECTION), {
        text: newMessage.trim(),
        userId: currentUser.id,
        userName: currentUser.name,
        userPhoto: currentUser.photoUrl || null,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color from username
  const getUserColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9',
      '#92A8D1', '#955251', '#B565A7', '#009B77', '#DD4124'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Track chat view
  const handleOpenChat = () => {
    setIsOpen(true);
    if (currentUser) {
      trackLiveChatViewed(currentUser.isGuest ? 'guest' : 'google');
    }
  };

  const handleExpandChat = () => {
    setIsMinimized(false);
    if (currentUser) {
      trackLiveChatViewed(currentUser.isGuest ? 'guest' : 'google');
    }
  };

  // Floating button when chat is closed
  if (!isOpen) {
    return (
      <Button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 flex flex-col bg-background border border-border rounded-lg shadow-2xl transition-all duration-200 ${
        isMinimized ? 'w-72 h-12' : 'w-80 sm:w-96 h-[28rem]'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-t-lg cursor-pointer"
        onClick={() => isMinimized && handleExpandChat()}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">Live Chat</span>
          <span className="text-xs text-white/80">({messages.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              if (isMinimized) {
                handleExpandChat();
              } else {
                setIsMinimized(true);
              }
            }}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat content - hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Messages area */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-0.5">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Be the first to say something!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-1.5 py-0.5 hover:bg-muted/50 px-1 rounded">
                    <Avatar className="h-5 w-5 flex-shrink-0 mt-0.5">
                      <AvatarImage src={msg.userPhoto} />
                      <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                        {getInitials(msg.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm leading-relaxed break-words min-w-0">
                      <span 
                        className="font-semibold mr-1"
                        style={{ color: getUserColor(msg.userName) }}
                      >
                        {msg.userName}:
                      </span>
                      <span className="text-foreground">{msg.text}</span>
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-3 border-t border-border">
            {currentUser && !currentUser.isGuest ? (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-9 text-sm"
                  maxLength={500}
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  className="h-9 w-9 bg-amber-500 hover:bg-amber-600"
                  disabled={!newMessage.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-2">
                {currentUser?.isGuest 
                  ? 'Sign in with Google to chat'
                  : 'Sign in to join the chat'
                }
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBox;
