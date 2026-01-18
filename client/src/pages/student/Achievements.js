import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { FiAward, FiLock, FiCheck, FiStar } from 'react-icons/fi';
import api from '../../services/api';
import './Achievements.css';

const Achievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/achievements/my')
      ]);

      setAchievements(allRes.data?.data || []);
      const myData = myRes.data?.data || [];
      setUserAchievements(myData.map(a => a?._id).filter(Boolean));
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]);
      setUserAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId) => {
    return userAchievements.includes(achievementId);
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return isUnlocked(achievement._id);
    if (filter === 'locked') return !isUnlocked(achievement._id);
    return achievement.category === filter;
  });

  const categories = ['all', 'unlocked', 'locked', 'learning', 'exploration', 'mastery', 'social'];

  const unlockedCount = achievements.filter(a => isUnlocked(a._id)).length;
  const totalPoints = achievements
    .filter(a => isUnlocked(a._id))
    .reduce((sum, a) => sum + (a.points || 0), 0);

  if (loading) {
    return (
      <div className="achievements-loading">
        <div className="loading-spinner"></div>
        <p>Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="achievements-page">
      <motion.div 
        className="achievements-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiAward /> Achievements</h1>
          <p>Track your progress and unlock rewards</p>
        </div>

        <div className="achievements-summary">
          <div className="summary-item">
            <span className="summary-value">{unlockedCount}/{achievements.length}</span>
            <span className="summary-label">Unlocked</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="summary-value">{totalPoints}</span>
            <span className="summary-label">Points</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="summary-value">
              {Math.round((unlockedCount / achievements.length) * 100) || 0}%
            </span>
            <span className="summary-label">Complete</span>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div 
        className="achievements-progress"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          ></div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="achievements-filters"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {categories.map(category => (
          <button
            key={category}
            className={`filter-btn ${filter === category ? 'active' : ''}`}
            onClick={() => setFilter(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Achievements Grid */}
      <motion.div 
        className="achievements-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {filteredAchievements.map((achievement, index) => {
          const unlocked = isUnlocked(achievement._id);
          
          return (
            <motion.div
              key={achievement._id}
              className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="achievement-icon">
                {unlocked ? (
                  <span className="icon-emoji">{achievement.icon}</span>
                ) : (
                  <FiLock />
                )}
                {unlocked && (
                  <span className="unlocked-badge"><FiCheck /></span>
                )}
              </div>

              <div className="achievement-content">
                <h3>{unlocked ? achievement.title : '???'}</h3>
                <p>{unlocked ? achievement.description : 'Keep playing to unlock!'}</p>
              </div>

              <div className="achievement-footer">
                <span className="achievement-category">{achievement.category}</span>
                <span className="achievement-points">
                  <FiStar /> {achievement.points || 0}
                </span>
              </div>

              {achievement.rarity && (
                <div className={`rarity-badge ${achievement.rarity}`}>
                  {achievement.rarity}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {filteredAchievements.length === 0 && (
        <div className="empty-state">
          <FiAward size={48} />
          <p>No achievements found for this filter.</p>
        </div>
      )}
    </div>
  );
};

export default Achievements;
