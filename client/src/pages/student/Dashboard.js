import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiPlay, FiAward, FiClock, FiTrendingUp, 
  FiTarget, FiStar, FiChevronRight 
} from 'react-icons/fi';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [gamesRes, achievementsRes] = await Promise.all([
        api.get('/games/sessions/my').catch(() => ({ data: { data: [] } })),
        api.get('/achievements/my').catch(() => ({ data: { data: [] } }))
      ]);

      const gamesData = gamesRes?.data?.data;
      const achievementsData = achievementsRes?.data?.data;

      setRecentGames(Array.isArray(gamesData) ? gamesData.slice(0, 5) : []);
      setAchievements(Array.isArray(achievementsData) ? achievementsData.slice(0, 6) : []);

      // Calculate stats from user data
      setStats({
        totalGamesPlayed: user?.stats?.gamesPlayed || 0,
        totalScore: user?.stats?.totalScore || 0,
        totalPlayTime: user?.stats?.totalPlayTime || 0,
        achievementsCount: user?.achievements?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRecentGames([]);
      setAchievements([]);
      setStats({
        totalGamesPlayed: 0,
        totalScore: 0,
        totalPlayTime: 0,
        achievementsCount: 0
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <motion.section 
        className="welcome-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="welcome-content">
          <h1>{getGreeting()}, {user?.username}!</h1>
          <p>Ready to continue your journey through the human body?</p>
        </div>
        <Link to="/student/games" className="btn btn-primary">
          <FiPlay /> Continue Learning
        </Link>
      </motion.section>

      {/* Stats Grid */}
      <motion.section 
        className="stats-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon games">
              <FiTarget />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.totalGamesPlayed || 0}</span>
              <span className="stat-label">Games Played</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon score">
              <FiStar />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.totalScore?.toLocaleString() || 0}</span>
              <span className="stat-label">Total Score</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon time">
              <FiClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{formatPlayTime(stats?.totalPlayTime || 0)}</span>
              <span className="stat-label">Play Time</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon achievements">
              <FiAward />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats?.achievementsCount || 0}</span>
              <span className="stat-label">Achievements</span>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="dashboard-grid">
        {/* Recent Games */}
        <motion.section 
          className="recent-games-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="section-header">
            <h2><FiTrendingUp /> Recent Activity</h2>
            <Link to="/student/history" className="view-all">
              View All <FiChevronRight />
            </Link>
          </div>

          <div className="recent-games-list">
            {recentGames.length > 0 ? (
              recentGames.map((game, index) => (
                <div key={game._id} className="game-item">
                  <div className="game-icon">
                    {game.gameModule?.icon || '🎮'}
                  </div>
                  <div className="game-info">
                    <h4>{game.gameModule?.title || 'Game Session'}</h4>
                    <p>Score: {game.score?.toLocaleString() || 0}</p>
                  </div>
                  <div className="game-meta">
                    <span className="game-date">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`game-status ${game.completed ? 'completed' : 'in-progress'}`}>
                      {game.completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No games played yet. Start your first adventure!</p>
                <Link to="/games" className="btn btn-outline">Browse Games</Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* Achievements Preview */}
        <motion.section 
          className="achievements-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="section-header">
            <h2><FiAward /> Recent Achievements</h2>
            <Link to="/student/achievements" className="view-all">
              View All <FiChevronRight />
            </Link>
          </div>

          <div className="achievements-grid">
            {achievements.length > 0 ? (
              achievements.map((achievement, index) => (
                <div key={achievement._id} className="achievement-card">
                  <span className="achievement-icon">{achievement.icon}</span>
                  <span className="achievement-name">{achievement.title}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>Complete games to earn achievements!</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Quick Actions */}
      <motion.section 
        className="quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/games" className="action-card">
            <span className="action-icon">🎮</span>
            <span className="action-label">Play Games</span>
          </Link>
          <Link to="/knowledge-map" className="action-card">
            <span className="action-icon">🗺️</span>
            <span className="action-label">Knowledge Map</span>
          </Link>
          <Link to="/student/chat" className="action-card">
            <span className="action-icon">💬</span>
            <span className="action-label">Chat Room</span>
          </Link>
          <Link to="/student/friends" className="action-card">
            <span className="action-icon">👥</span>
            <span className="action-label">Friends</span>
          </Link>
          <Link to="/leaderboard" className="action-card">
            <span className="action-icon">🏆</span>
            <span className="action-label">Leaderboard</span>
          </Link>
          <Link to="/student/profile" className="action-card">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Settings</span>
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default Dashboard;
