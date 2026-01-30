import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiUser, FiMail, FiEdit2, FiSave, FiCamera,
  FiAward, FiTarget, FiClock, FiStar, FiHome, FiBook
} from 'react-icons/fi';
import api from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    avatar: '',
    school: '',
    course: ''
  });

  const avatars = [
    '👤', '🧑‍🔬', '👨‍🎓', '👩‍🎓', '🧬', '🔬', '💉', '🩸',
    '❤️', '🫀', '🫁', '🧠', '🦴', '💪', '🏃', '🎮'
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '👤',
        school: user.school || '',
        course: user.course || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarSelect = (avatar) => {
    setFormData({ ...formData, avatar });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.put('/users/profile', {
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        avatar: formData.avatar,
        school: formData.school,
        course: formData.course
      });

      updateUser(res.data.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPlayTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="profile-page">
      <motion.div 
        className="profile-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {formData.avatar || '👤'}
          </div>
          {editing && (
            <div className="avatar-selector">
              <p>Choose your avatar:</p>
              <div className="avatar-grid">
                {avatars.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    className={`avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(avatar)}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-info">
          <h1>{user?.username}</h1>
          <p className="profile-role">{user?.role}</p>
          <p className="profile-joined">
            Member since {new Date(user?.createdAt).toLocaleDateString()}
          </p>
        </div>

        <button 
          className={`btn ${editing ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Cancel' : <><FiEdit2 /> Edit Profile</>}
        </button>
      </motion.div>

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-content">
        <motion.div 
          className="profile-stats-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2>Your Stats</h2>
          <div className="profile-stats-grid">
            <div className="profile-stat">
              <FiTarget className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{user?.stats?.gamesPlayed || 0}</span>
                <span className="stat-label">Games Played</span>
              </div>
            </div>
            <div className="profile-stat">
              <FiStar className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{user?.stats?.totalScore?.toLocaleString() || 0}</span>
                <span className="stat-label">Total Score</span>
              </div>
            </div>
            <div className="profile-stat">
              <FiClock className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{formatPlayTime(user?.stats?.totalPlayTime || 0)}</span>
                <span className="stat-label">Play Time</span>
              </div>
            </div>
            <div className="profile-stat">
              <FiAward className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{user?.achievements?.length || 0}</span>
                <span className="stat-label">Achievements</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.form 
          className="profile-form-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2>Profile Information</h2>

          <div className="form-group">
            <label className="form-label">
              <FiUser /> Username
            </label>
            <input
              type="text"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              disabled={!editing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiMail /> Email
            </label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              disabled
            />
            <p className="form-hint">Email cannot be changed</p>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiHome /> School
            </label>
            <input
              type="text"
              name="school"
              className="form-input"
              value={formData.school}
              onChange={handleChange}
              disabled={!editing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiBook /> Course
            </label>
            <input
              type="text"
              name="course"
              className="form-input"
              value={formData.course}
              onChange={handleChange}
              disabled={!editing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              className="form-textarea"
              rows="4"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              disabled={!editing}
            />
          </div>

          {editing && (
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : <><FiSave /> Save Changes</>}
            </button>
          )}
        </motion.form>
      </div>
    </div>
  );
};

export default Profile;
