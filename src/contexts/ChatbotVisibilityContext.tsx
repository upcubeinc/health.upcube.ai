import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatbotVisibilityContextType {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatbotVisibilityContext = createContext<ChatbotVisibilityContextType | undefined>(undefined);

export const useChatbotVisibility = () => {
  const context = useContext(ChatbotVisibilityContext);
  if (!context) {
    throw new Error('useChatbotVisibility must be used within a ChatbotVisibilityProvider');
  }
  return context;
};

export const ChatbotVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  const toggleChat = () => setIsChatOpen(prev => !prev);

  return (
    <ChatbotVisibilityContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
      {children}
    </ChatbotVisibilityContext.Provider>
  );
};