import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';

export default function Messages() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { conversations, loading: convLoading, sendMessage, startConversation } = useChat();
  const { showToast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [activeChatDoc, setActiveChatDoc] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch the specific active chat document directly
  useEffect(() => {
    if (!chatId) {
      setActiveChatDoc(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
      if (docSnap.exists()) {
        setActiveChatDoc({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [chatId]);

  // Listen for other user's real-time presence and profile changes
  useEffect(() => {
    const chatToUse = activeChatDoc || conversations.find(c => c.id === chatId);
    const otherId = chatToUse?.participants?.find(p => p !== currentUser?.uid);
    
    if (!otherId) {
      setOtherUser(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
      if (docSnap.exists()) {
        setOtherUser({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [activeChatDoc, conversations, chatId, currentUser]);

  // Listen for messages in the selected chat
  useEffect(() => {
    if (!chatId || !currentUser) return;

    setMessagesLoading(true);
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;
    
    await sendMessage(chatId, newMessage);
    setNewMessage('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    if (searchEmail.trim() === currentUser.email) {
      return showToast("You cannot message yourself.", "error");
    }

    setSearchLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showToast("No user found with that email.", "info");
      } else {
        const foundUserDoc = querySnapshot.docs[0];
        const foundUserId = foundUserDoc.id;
        const foundUserData = foundUserDoc.data();
        
        const newChatId = await startConversation(foundUserId, foundUserData.displayName || 'User');
        if (newChatId) {
          setSearchEmail('');
          navigate(`/messages/${newChatId}`);
        } else {
          showToast("Error starting conversation.", "error");
        }
      }
    } catch (error) {
      console.error("Error searching user:", error);
      showToast("Search failed.", "error");
    }
    setSearchLoading(false);
  };

  if (!currentUser) {
    return <div className="container" style={{ marginTop: '4rem', textAlign: 'center' }}>Please log in to view messages.</div>;
  }

  const chatToRender = activeChatDoc || conversations.find(c => c.id === chatId);
  const otherParticipantId = chatToRender?.participants?.find(p => p !== currentUser?.uid);
  const otherParticipantName = chatToRender?.participantNames?.[otherParticipantId] || 'Conversation';

  return (
    <section className="messages-page" style={{ 
      height: 'calc(100vh - 80px)', 
      padding: '1.5rem', 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="glass messages-container" style={{ 
        width: '100%', 
        maxWidth: '1400px', 
        height: '100%', 
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        {/* Sidebar: Chat List */}
        <aside className="chat-sidebar" style={{ 
          flex: '0 0 350px',
          background: 'rgba(11, 12, 16, 0.4)', 
          borderRight: '1px solid var(--glass-border)', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💬</span> Messages
            </h2>
            
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <input 
                type="email" 
                placeholder="Search valid email..." 
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem 1rem', 
                  paddingRight: '4rem',
                  borderRadius: '30px', 
                  border: '1px solid var(--glass-border)', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
              <button 
                type="submit" 
                disabled={searchLoading} 
                style={{ 
                  position: 'absolute', 
                  right: '4px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  background: 'linear-gradient(135deg, var(--secondary-accent), var(--primary-accent))', 
                  border: 'none', 
                  borderRadius: '30px', 
                  padding: '0.5rem 1rem', 
                  color: 'var(--bg-color)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {searchLoading ? '...' : 'Find'}
              </button>
            </form>
          </header>
          
          <section style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scroll">
            {convLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <div style={{ opacity: 0.5, marginBottom: '0.5rem', fontSize: '2rem' }}>⏳</div>
                Loading chats...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No active conversations.
              </div>
            ) : (
              conversations.map(conv => {
                const otherId = conv.participants.find(p => p !== currentUser.uid);
                const otherName = conv.participantNames?.[otherId] || 'User';
                const isActive = chatId === conv.id;
                
                return (
                  <article 
                    key={conv.id} 
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    style={{
                      padding: '1rem',
                      borderRadius: '16px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(102, 252, 241, 0.1)' : 'transparent',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--primary-accent)' : 'transparent',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '45px', 
                      height: '45px', 
                      borderRadius: '50%', 
                      background: isActive ? 'var(--primary-accent)' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? 'var(--bg-color)' : '#fff',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {(chatId === conv.id && otherUser ? (otherUser.displayName || 'U') : otherName).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.2rem', color: isActive ? 'var(--primary-accent)' : '#fff' }}>
                        {chatId === conv.id && otherUser ? (otherUser.displayName || 'User') : otherName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage || 'Click to initiate chat...'}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </aside>

        {/* Main: Chat Window */}
        <main className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {chatId ? (
            <>
              {/* Chat Header */}
              <header style={{ 
                padding: '1.2rem 2rem', 
                borderBottom: '1px solid var(--glass-border)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                background: 'rgba(11, 12, 16, 0.6)',
                backdropFilter: 'blur(20px)',
                zIndex: 10
              }}>
                 <div style={{
                  width: '50px', height: '50px', borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--secondary-accent), var(--primary-accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--bg-color)', position: 'relative'
                }}>
                  {(otherUser?.displayName || otherParticipantName).charAt(0).toUpperCase()}
                  
                  {otherUser?.isOnline && (
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2, width: '12px', height: '12px', 
                      borderRadius: '50%', background: '#4caf50', border: '2px solid var(--bg-color)',
                      boxShadow: '0 0 8px rgba(76, 175, 80, 0.5)'
                    }}></div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{otherUser?.displayName || otherParticipantName}</h3>
                  <div style={{ fontSize: '0.85rem', color: otherUser?.isOnline ? '#4caf50' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {otherUser?.isOnline ? (
                      <>Online Now</>
                    ) : (
                      <>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }}></span>
                        {otherUser?.lastSeen ? `Last seen ${otherUser.lastSeen.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'recently'}` : 'Offline'}
                      </>
                    )}
                  </div>
                </div>
              </header>

              {/* Chat Messages */}
              <section 
                ref={chatContainerRef}
                className="custom-scroll chat-messages"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '2rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem',
                  scrollBehavior: 'smooth'
                }}
              >
                {messagesLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 'auto' }}>
                    <div style={{ opacity: 0.5, marginBottom: '0.5rem', fontSize: '2rem' }}>⏳</div>
                    Syncing timeline...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }}>👋</div>
                    <h3>Say hello!</h3>
                    <p>This is the start of your encrypted conversation with {otherUser?.displayName || otherParticipantName}.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === currentUser.uid;
                    return (
                      <div 
                        key={msg.id} 
                        className="animate-fade-in"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                          width: '100%',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div 
                          style={{
                            maxWidth: '75%',
                            padding: '1rem 1.4rem',
                            borderRadius: isMine ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
                            background: isMine ? 'linear-gradient(135deg, var(--secondary-accent), var(--primary-accent))' : 'rgba(255, 255, 255, 0.08)',
                            color: isMine ? 'var(--bg-color)' : '#ffffff',
                            fontWeight: '400',
                            border: isMine ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            boxShadow: isMine ? '0 8px 24px rgba(102, 252, 241, 0.25)' : '0 4px 15px rgba(0,0,0,0.1)',
                            backdropFilter: isMine ? 'none' : 'blur(10px)',
                            fontSize: '0.95rem'
                          }}
                        >
                          <div style={{ wordBreak: 'break-word', lineHeight: '1.5' }}>{msg.text}</div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            marginTop: '0.5rem', 
                            opacity: isMine ? 0.7 : 0.4, 
                            display: 'flex',
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                            {isMine && (
                              <span style={{ fontSize: '10px', marginLeft: '2px' }}>✓</span> 
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </section>

              {/* Chat Input */}
              <footer style={{ 
                padding: '1.5rem', 
                background: 'rgba(11, 12, 16, 0.8)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--glass-border)',
                zIndex: 10
              }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '1rem 1.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '30px',
                      color: '#fff',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                    onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.06)'}
                    onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}
                  />
                  <button 
                    disabled={!newMessage.trim()} 
                    type="submit" 
                    style={{ 
                      flexShrink: 0,
                      padding: '1rem 2rem', 
                      borderRadius: '30px',
                      background: newMessage.trim() ? 'linear-gradient(135deg, var(--secondary-accent), var(--primary-accent))' : 'rgba(255,255,255,0.1)',
                      color: newMessage.trim() ? 'var(--bg-color)' : 'var(--text-secondary)',
                      border: 'none',
                      fontWeight: '600',
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s',
                      boxShadow: newMessage.trim() ? '0 8px 16px rgba(102, 252, 241, 0.3)' : 'none'
                    }}
                  >
                    Send
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <section style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', marginBottom: '2rem',
                border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                💬
              </div>
              <h2 style={{ color: '#fff' }}>Secure Messaging</h2>
              <p style={{ maxWidth: '400px', textAlign: 'center', opacity: 0.8, marginTop: '0.5rem' }}>
                Connect directly with artists, negotiate prices, or discuss commissions in real-time. Select a conversation from the sidebar to begin.
              </p>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
