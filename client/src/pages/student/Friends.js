import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiUserPlus, FiUserCheck, FiUserX,
  FiSearch, FiMessageCircle, FiCheck, FiX
} from 'react-icons/fi';
import api from '../../services/api';
import './Friends.css';

const Friends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const fetchFriendsData = async () => {
    try {
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests/pending'),
        api.get('/friends/requests/sent')
      ]);

      setFriends(friendsRes.data.data);
      setPendingRequests(pendingRes.data.data);
      setSentRequests(sentRes.data.data);
    } catch (error) {
      console.error('Error fetching friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await api.get(`/friends/search?query=${searchQuery}`);
      setSearchResults(res.data.data);
      setActiveTab('search');
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      setSearchResults(prev => 
        prev.map(u => u._id === userId ? { ...u, requestSent: true } : u)
      );
      fetchFriendsData();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await api.put(`/friends/accept/${requestId}`);
      fetchFriendsData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await api.delete(`/friends/decline/${requestId}`);
      fetchFriendsData();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      await api.delete(`/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f._id !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length, icon: <FiUsers /> },
    { id: 'pending', label: 'Pending', count: pendingRequests.length, icon: <FiUserCheck /> },
    { id: 'sent', label: 'Sent', count: sentRequests.length, icon: <FiUserPlus /> },
    { id: 'search', label: 'Search', icon: <FiSearch /> }
  ];

  if (loading) {
    return (
      <div className="friends-loading">
        <div className="loading-spinner"></div>
        <p>Loading friends...</p>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <motion.div 
        className="friends-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiUsers /> Friends</h1>
          <p>Connect with other explorers</p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            <FiSearch /> {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        className="friends-tabs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <motion.div 
        className="friends-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="friends-list">
            {friends.length > 0 ? (
              friends.map(friend => (
                <div key={friend._id} className="friend-card">
                  <div className="friend-avatar">
                    {friend.avatar || '👤'}
                  </div>
                  <div className="friend-info">
                    <h3>{friend.username}</h3>
                    <p>{friend.bio || 'No bio yet'}</p>
                  </div>
                  <div className="friend-stats">
                    <span className="stat">
                      <strong>{friend.stats?.gamesPlayed || 0}</strong> games
                    </span>
                    <span className="stat">
                      <strong>{friend.stats?.totalScore?.toLocaleString() || 0}</strong> points
                    </span>
                  </div>
                  <div className="friend-actions">
                    <button className="btn-icon" title="Send message">
                      <FiMessageCircle />
                    </button>
                    <button 
                      className="btn-icon danger" 
                      title="Remove friend"
                      onClick={() => removeFriend(friend._id)}
                    >
                      <FiUserX />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FiUsers size={48} />
                <h3>No Friends Yet</h3>
                <p>Search for users to add them as friends!</p>
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <div className="friends-list">
            {pendingRequests.length > 0 ? (
              pendingRequests.map(request => (
                <div key={request._id} className="friend-card">
                  <div className="friend-avatar">
                    {request.from?.avatar || '👤'}
                  </div>
                  <div className="friend-info">
                    <h3>{request.from?.username}</h3>
                    <p>Wants to be your friend</p>
                  </div>
                  <div className="friend-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => acceptRequest(request._id)}
                    >
                      <FiCheck /> Accept
                    </button>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => declineRequest(request._id)}
                    >
                      <FiX /> Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FiUserCheck size={48} />
                <h3>No Pending Requests</h3>
                <p>You don't have any pending friend requests.</p>
              </div>
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="friends-list">
            {sentRequests.length > 0 ? (
              sentRequests.map(request => (
                <div key={request._id} className="friend-card">
                  <div className="friend-avatar">
                    {request.to?.avatar || '👤'}
                  </div>
                  <div className="friend-info">
                    <h3>{request.to?.username}</h3>
                    <p>Request pending...</p>
                  </div>
                  <div className="friend-actions">
                    <span className="pending-badge">Pending</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FiUserPlus size={48} />
                <h3>No Sent Requests</h3>
                <p>You haven't sent any friend requests.</p>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {activeTab === 'search' && (
          <div className="friends-list">
            {searchResults.length > 0 ? (
              searchResults.map(foundUser => {
                const isFriend = friends.some(f => f._id === foundUser._id);
                const isPending = sentRequests.some(r => r.to?._id === foundUser._id);
                const isCurrentUser = foundUser._id === user?._id;

                return (
                  <div key={foundUser._id} className="friend-card">
                    <div className="friend-avatar">
                      {foundUser.avatar || '👤'}
                    </div>
                    <div className="friend-info">
                      <h3>{foundUser.username}</h3>
                      <p>{foundUser.bio || 'No bio yet'}</p>
                    </div>
                    <div className="friend-actions">
                      {isCurrentUser ? (
                        <span className="self-badge">You</span>
                      ) : isFriend ? (
                        <span className="friend-badge">
                          <FiUserCheck /> Friend
                        </span>
                      ) : isPending || foundUser.requestSent ? (
                        <span className="pending-badge">Pending</span>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => sendFriendRequest(foundUser._id)}
                        >
                          <FiUserPlus /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <FiSearch size={48} />
                <h3>Search for Users</h3>
                <p>Enter a username to find other players.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Friends;
