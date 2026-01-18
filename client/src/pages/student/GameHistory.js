import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiClock, FiStar, FiTarget, FiCalendar, 
  FiChevronDown, FiFilter 
} from 'react-icons/fi';
import api from '../../services/api';
import './GameHistory.css';

const GameHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchGameHistory();
  }, [page, filter, sortBy]);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/games/sessions/my', {
        params: { page, limit: 10, completed: filter !== 'all' ? filter === 'completed' : undefined }
      });

      let sortedData = [...(res.data?.data || [])];
      
      if (sortBy === 'score') {
        sortedData.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortBy === 'date') {
        sortedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      setSessions(sortedData);
      setTotalPages(res.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching game history:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats
  const totalGames = sessions.length;
  const completedGames = sessions.filter(s => s.completed).length;
  const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
  const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

  return (
    <div className="game-history-page">
      <motion.div 
        className="history-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiClock /> Game History</h1>
          <p>Review your past gaming sessions and progress</p>
        </div>
      </motion.div>

      {/* Stats Summary */}
      <motion.div 
        className="history-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stat-item">
          <FiTarget className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{totalGames}</span>
            <span className="stat-label">Total Games</span>
          </div>
        </div>
        <div className="stat-item">
          <FiStar className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{completedGames}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-item">
          <FiStar className="stat-icon gold" />
          <div className="stat-content">
            <span className="stat-value">{totalScore.toLocaleString()}</span>
            <span className="stat-label">Total Score</span>
          </div>
        </div>
        <div className="stat-item">
          <FiTarget className="stat-icon purple" />
          <div className="stat-content">
            <span className="stat-value">{avgScore.toLocaleString()}</span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="history-filters"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="filter-group">
          <FiFilter />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Games</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>

        <div className="filter-group">
          <span>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Most Recent</option>
            <option value="score">Highest Score</option>
          </select>
        </div>
      </motion.div>

      {/* Sessions List */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading game history...</p>
        </div>
      ) : sessions.length > 0 ? (
        <motion.div 
          className="sessions-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {sessions.map((session, index) => (
            <motion.div
              key={session._id}
              className="session-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="session-icon">
                {session.gameModule?.icon || '🎮'}
              </div>

              <div className="session-info">
                <h3>{session.gameModule?.title || 'Game Session'}</h3>
                <div className="session-meta">
                  <span><FiCalendar /> {formatDate(session.createdAt)}</span>
                  <span><FiClock /> {formatDuration(session.duration)}</span>
                </div>
              </div>

              <div className="session-score">
                <span className="score-value">{session.score?.toLocaleString() || 0}</span>
                <span className="score-label">points</span>
              </div>

              <div className="session-status">
                <span className={`status-badge ${session.completed ? 'completed' : 'in-progress'}`}>
                  {session.completed ? 'Completed' : 'In Progress'}
                </span>
                {session.progress && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${session.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              <Link 
                to={`/games/${session.gameModule?._id}`} 
                className="btn btn-outline btn-sm"
              >
                {session.completed ? 'Play Again' : 'Continue'}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="empty-state">
          <FiClock size={48} />
          <h3>No Games Yet</h3>
          <p>Start playing to build your game history!</p>
          <Link to="/games" className="btn btn-primary">Browse Games</Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="btn btn-outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button 
            className="btn btn-outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default GameHistory;
