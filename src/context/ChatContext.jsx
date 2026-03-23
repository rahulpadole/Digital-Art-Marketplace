import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Listen for chats where the current user is a participant
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = [];
      snapshot.forEach((doc) => {
        chats.push({ id: doc.id, ...doc.data() });
      });
      setConversations(chats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Start or get a conversation with another user
  const startConversation = async (otherUserId, otherUserName) => {
    if (!currentUser) return null;

    try {
      // Check if a chat already exists between these two users
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      let existingChat = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUserId)) {
          existingChat = { id: doc.id, ...data };
        }
      });

      if (existingChat) return existingChat.id;

      // Create new chat
      const newChatRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, otherUserId],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'User',
          [otherUserId]: otherUserName || 'Artist'
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      return newChatRef.id;
    } catch (error) {
      console.error("Error starting conversation:", error);
      return null;
    }
  };

  const sendMessage = async (chatId, text) => {
    if (!currentUser || !text.trim()) return;

    try {
      // 1. Add message to subcollection
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: currentUser.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
        read: false
      });

      // 2. Update chat document with last message info
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp()
      });

      // 3. Trigger notification for recipient
      const chat = conversations.find(c => c.id === chatId);
      if (chat) {
        const recipientId = chat.participants.find(p => p !== currentUser.uid);
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          type: 'message',
          message: `New message from ${currentUser.displayName || 'User'}`,
          link: `/messages/${chatId}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <ChatContext.Provider value={{ conversations, loading, startConversation, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}
