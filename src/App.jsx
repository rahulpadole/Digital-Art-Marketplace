import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadArt from './pages/UploadArt';
import ArtworkDetail from './pages/ArtworkDetail';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

function AppContent() {
  const { currentUser, signOut } = useAuth();
  
  return (
    <>
      <Navbar user={currentUser} signOut={signOut} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/upload" element={<UploadArt />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:chatId" element={<Messages />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <Router>
              <div className="app-container">
                <AppContent />
              </div>
            </Router>
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
