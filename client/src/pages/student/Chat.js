import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiMessageCircle, FiSend, FiUsers, FiPlus,
  FiHash, FiMoreVertical, FiSmile
} from 'react-icons/fi';
import socketService from '../../services/socket';
import api from '../../services/api';
import './Chat.css';

const Chat = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRooms();
    setupSocketListeners();

    return () => {
      socketService.off('message');
      socketService.off('userJoined');
      socketService.off('userLeft');
    };
  }, []);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom._id);
      socketService.joinRoom(activeRoom._id);
    }
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocketListeners = () => {
    socketService.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.on('userJoined', (userData) => {
      setOnlineUsers(prev => [...prev, userData]);
    });

    socketService.on('userLeft', (userId) => {
      setOnlineUsers(prev => prev.filter(u => u._id !== userId));
    });
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      const roomsData = res.data?.data || [];
      setRooms(roomsData);
      if (roomsData.length > 0) {
        setActiveRoom(roomsData[0]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const res = await api.get(`/chat/rooms/${roomId}/messages`);
      setMessages(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    socketService.sendMessage(activeRoom._id, newMessage.trim());
    setNewMessage('');
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const res = await api.post('/chat/rooms', { name: newRoomName });
      const newRoom = res.data?.data;
      if (newRoom) {
        setRooms(prev => [...prev, newRoom]);
        setActiveRoom(newRoom);
      }
      setShowNewRoomModal(false);
      setNewRoomName('');
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    const today = new Date();
    const msgDate = new Date(date);

    if (today.toDateString() === msgDate.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === msgDate.toDateString()) {
      return 'Yesterday';
    }

    return msgDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Sidebar - Rooms List */}
      <motion.aside 
        className="chat-sidebar"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="sidebar-header">
          <h2><FiMessageCircle /> Chat Rooms</h2>
          <button 
            className="btn-icon"
            onClick={() => setShowNewRoomModal(true)}
            title="Create new room"
          >
            <FiPlus />
          </button>
        </div>

        <div className="rooms-list">
          {rooms.map(room => (
            <div
              key={room._id}
              className={`room-item ${activeRoom?._id === room._id ? 'active' : ''}`}
              onClick={() => setActiveRoom(room)}
            >
              <FiHash className="room-icon" />
              <span className="room-name">{room.name}</span>
              {room.unreadCount > 0 && (
                <span className="unread-badge">{room.unreadCount}</span>
              )}
            </div>
          ))}
        </div>

        <div className="online-users">
          <h3><FiUsers /> Online ({onlineUsers.length})</h3>
          <div className="users-list">
            {onlineUsers.slice(0, 10).map(onlineUser => (
              <div key={onlineUser._id} className="user-item">
                <span className="user-avatar">{onlineUser.avatar || '👤'}</span>
                <span className="user-name">{onlineUser.username}</span>
                <span className="online-dot"></span>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <motion.main 
        className="chat-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {activeRoom ? (
          <>
            <div className="chat-header">
              <div className="room-info">
                <FiHash />
                <h3>{activeRoom.name}</h3>
              </div>
              <button className="btn-icon">
                <FiMoreVertical />
              </button>
            </div>

            <div className="messages-container">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="message-group">
                  <div className="date-divider">
                    <span>{date}</span>
                  </div>
                  {dateMessages.map((message, index) => {
                    const isOwn = message.user?._id === user?._id;
                    const showAvatar = index === 0 || 
                      dateMessages[index - 1]?.user?._id !== message.user?._id;

                    return (
                      <div
                        key={message._id}
                        className={`message ${isOwn ? 'own' : ''}`}
                      >
                        {!isOwn && showAvatar && (
                          <div className="message-avatar">
                            {message.user?.avatar || '👤'}
                          </div>
                        )}
                        <div className="message-content">
                          {!isOwn && showAvatar && (
                            <span className="message-author">
                              {message.user?.username}
                            </span>
                          )}
                          <div className="message-bubble">
                            <p>{message.content}</p>
                            <span className="message-time">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input" onSubmit={sendMessage}>
              <button type="button" className="btn-icon emoji-btn">
                <FiSmile />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary send-btn"
                disabled={!newMessage.trim()}
              >
                <FiSend />
              </button>
            </form>
          </>
        ) : (
          <div className="no-room-selected">
            <FiMessageCircle size={48} />
            <h3>Welcome to Chat</h3>
            <p>Select a room to start chatting</p>
          </div>
        )}
      </motion.main>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="modal-overlay" onClick={() => setShowNewRoomModal(false)}>
          <motion.div 
            className="modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Create New Room</h2>
            <form onSubmit={createRoom}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter room name..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowNewRoomModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Room
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Chat;
