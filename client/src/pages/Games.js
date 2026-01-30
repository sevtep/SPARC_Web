import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiPlay, FiClock, FiBarChart2, FiChevronRight } from 'react-icons/fi';
import { gameService } from '../services/api';
import './Games.css';

// 静态游戏数据（当 API 不可用时使用）
const staticGames = [
  {
    _id: 'forces-motion-basics',
    name: 'Forces and Motion: Basics',
    slug: 'forces-motion-basics',
    shortDescription: 'Learn core physics concepts with driving dynamics.',
    category: 'physics',
    difficulty: 'medium',
    estimatedTime: 30,
    gradeLevel: ['6', '7', '8', '9'],
    gameUrl: 'https://ping.agaii.org/games/Force&Motion/index.html',
    statistics: { totalPlays: 0 },
    emoji: '🏎️',
    color: '#00D4FF',
    isMainStory: true,
    chapter: 'Core Module'
  }
];

const Games = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', difficulty: '' });
  const [hoveredGame, setHoveredGame] = useState(null);

  useEffect(() => {
    fetchGames();
  }, [filter]);

  const fetchGames = async () => {
    try {
      const response = await gameService.getAllGames(filter);
      const gamesData = response?.data?.games;
      if (gamesData && Array.isArray(gamesData)) {
        // 合并静态数据的 emoji 和 color
        const enrichedGames = gamesData.map(game => {
          const staticGame = staticGames.find(g => g.slug === game.slug);
          return { ...game, emoji: staticGame?.emoji || '🎮', color: staticGame?.color || '#00D4FF' };
        });
        setGames(enrichedGames);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error fetching games, using static data:', error);
      let filteredGames = [...staticGames];
      if (filter.category) {
        filteredGames = filteredGames.filter(g => g.category === filter.category);
      }
      if (filter.difficulty) {
        filteredGames = filteredGames.filter(g => g.difficulty === filter.difficulty);
      }
      setGames(filteredGames);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'var(--accent-green)';
      case 'medium': return 'var(--accent-yellow)';
      case 'hard': return 'var(--secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="games-page">
      {/* 背景装饰 - 简化动画 */}
      <div className="games-bg-decoration">
        <div className="bg-grid"></div>
        <div className="floating-deco deco-1">🧬</div>
        <div className="floating-deco deco-2">🔬</div>
        <div className="floating-deco deco-3">⚗️</div>
      </div>

      <div className="container">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="header-icon">🎮</span>
          <h1>Game <span className="text-gradient">Library</span></h1>
          <p>Choose your adventure and start learning!</p>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="filters-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="filter-group">
            <FiFilter />
            <select 
              value={filter.category} 
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              data-agent-id="filter_category"
            >
              <option value="">All Categories</option>
              <option value="biology">Biology</option>
              <option value="physics">Physics</option>
            </select>
          </div>
          <div className="filter-group">
            <FiBarChart2 />
            <select 
              value={filter.difficulty} 
              onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
              data-agent-id="filter_difficulty"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </motion.div>

        {/* Games Grid */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading games...</p>
          </div>
        ) : (
          <motion.div 
            className="games-grid-new"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {games.map((game, index) => (
              <motion.div
                key={game._id || game.slug}
                className="game-portal-card"
                style={{ '--game-color': game.color }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -10 }}
                onHoverStart={() => setHoveredGame(game._id)}
                onHoverEnd={() => setHoveredGame(null)}
              >
                {/* Portal 入口 */}
                <div className="game-portal-visual">
                  <motion.div 
                    className="portal-glow"
                    animate={hoveredGame === game._id ? {
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3]
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="portal-rings">
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                    <div className="ring ring-3"></div>
                  </div>
                  <motion.div 
                    className="portal-center"
                    animate={hoveredGame === game._id ? { 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="portal-emoji">{game.emoji}</span>
                  </motion.div>
                  
                  {/* 粒子效果 */}
                  <AnimatePresence>
                    {hoveredGame === game._id && (
                      <>
                        {[...Array(6)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="portal-particle"
                            style={{ '--angle': `${i * 60}deg` }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: [0, 1, 0],
                              scale: [0.5, 1, 0.5],
                              y: [0, -30, 0]
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity,
                              delay: i * 0.2 
                            }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* 游戏信息 */}
                <div className="game-info">
                  <div className="game-header">
                    <span 
                      className="difficulty-badge"
                      style={{ color: getDifficultyColor(game.difficulty) }}
                    >
                      {game.difficulty}
                    </span>
                    <span className="category-badge">{game.category}</span>
                  </div>
                  
                  <h3>{game.name}</h3>
                  <p>{game.shortDescription}</p>

                  <div className="game-meta">
                    <span className="meta-item">
                      <FiClock />
                      {game.estimatedTime} min
                    </span>
                    <span className="meta-item">
                      <FiBarChart2 />
                      {game.statistics?.totalPlays || 0} plays
                    </span>
                  </div>

                  <div className="game-grades">
                    {game.gradeLevel?.slice(0, 3).map(grade => (
                      <span key={grade} className="grade-badge">G{grade}</span>
                    ))}
                    {game.gradeLevel?.length > 3 && (
                      <span className="grade-badge">+{game.gradeLevel.length - 3}</span>
                    )}
                  </div>

                  <div className="game-actions">
                    <Link 
                      to={`/games/${game.slug}`} 
                      className="btn-details"
                      data-agent-id={`game_details_${game.slug}`}
                    >
                      Details <FiChevronRight />
                    </Link>
                    <Link 
                      to={`/games/${game.slug}/play`}
                      className="btn-play"
                      data-agent-id={`game_play_${game.slug}`}
                    >
                      <FiPlay /> Play
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && games.length === 0 && (
          <motion.div 
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="empty-emoji">🔍</span>
            <p>No games found matching your filters.</p>
            <button 
              className="btn btn-secondary"
              onClick={() => setFilter({ category: '', difficulty: '' })}
              data-agent-id="btn_clear_filters"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Games;
