import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiAward, FiTarget, FiFilter, FiSearch, FiTrendingUp, FiUsers, FiZap } from 'react-icons/fi';
import { userService, wordGameService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Leaderboard.css';

// 静态排行榜数据
const staticLeaderboard = [
  { id: '1', username: 'StarExplorer', level: 12, score: 2850, gamesCompleted: 12, rank: 1, avatarColor: '#FF6B6B' },
  { id: '2', username: 'CellMaster', level: 11, score: 2720, gamesCompleted: 11, rank: 2, avatarColor: '#4ECDC4' },
  { id: '3', username: 'HeartHero', level: 10, score: 2580, gamesCompleted: 10, rank: 3, avatarColor: '#45B7D1' },
  { id: '4', username: 'OxygenRacer', level: 9, score: 2450, gamesCompleted: 9, rank: 4, avatarColor: '#96CEB4' },
  { id: '5', username: 'BloodDetective', level: 8, score: 2320, gamesCompleted: 8, rank: 5, avatarColor: '#FFEAA7' },
  { id: '6', username: 'VesselFixer', level: 7, score: 2100, gamesCompleted: 7, rank: 6, avatarColor: '#DDA0DD' },
  { id: '7', username: 'ColdWarrior', level: 6, score: 1980, gamesCompleted: 6, rank: 7, avatarColor: '#98D8C8' },
  { id: '8', username: 'ScienceKid', level: 5, score: 1850, gamesCompleted: 5, rank: 8, avatarColor: '#F7DC6F' },
  { id: '9', username: 'BioLearner', level: 4, score: 1720, gamesCompleted: 4, rank: 9, avatarColor: '#BB8FCE' },
  { id: '10', username: 'CuriousMind', level: 3, score: 1600, gamesCompleted: 3, rank: 10, avatarColor: '#85C1E9' }
];

const Leaderboard = () => {
  const { user } = useAuth();
  // 主排行榜状态
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  
  // Tab 切换
  const [activeTab, setActiveTab] = useState('overall'); // 'overall' | 'wordgame'
  
  // Word Game 状态
  const [wordGameLeaderboard, setWordGameLeaderboard] = useState([]);
  const [wordGameScores, setWordGameScores] = useState([]);
  const [wordGameStats, setWordGameStats] = useState(null);
  const [wordGameLoading, setWordGameLoading] = useState(false);
  const [selectedScene, setSelectedScene] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [wordGameSubTab, setWordGameSubTab] = useState('leaderboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    if (activeTab === 'overall') {
      fetchLeaderboard();
    } else {
      fetchWordGameData();
    }
  }, [limit, activeTab, selectedScene, currentPage]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await userService.getLeaderboard({ limit });
      const leaderboardData = response?.data?.leaderboard;
      if (leaderboardData && Array.isArray(leaderboardData)) {
        setLeaderboard(leaderboardData);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error fetching leaderboard, using static data:', error);
      setLeaderboard(staticLeaderboard.slice(0, limit));
    } finally {
      setLoading(false);
    }
  };

  const fetchWordGameData = async () => {
    setWordGameLoading(true);
    try {
      // 获取统计数据
      const statsData = await wordGameService.getStats();
      if (statsData && statsData.success) {
        setWordGameStats(statsData.data);
      }

      // 获取排行榜
      const leaderboardData = await wordGameService.getLeaderboard({
        limit: 20,
        scene: selectedScene !== 'all' ? selectedScene : undefined
      });
      if (leaderboardData && leaderboardData.success) {
        const list = leaderboardData.data;
        setWordGameLeaderboard(Array.isArray(list) ? list : []);
      }

      // 获取分数列表
      const scoresData = await wordGameService.getScores({
        page: currentPage,
        limit: 20,
        scene: selectedScene !== 'all' ? selectedScene : undefined,
        playerName: searchName || undefined
      });
      if (scoresData && scoresData.success) {
        const scoresList = scoresData.data;
        setWordGameScores(Array.isArray(scoresList) ? scoresList : []);
        setPagination(scoresData.pagination || { total: 0, pages: 1, page: currentPage });
      }
    } catch (error) {
      console.error('Failed to fetch word game data:', error);
      setWordGameLeaderboard([]);
      setWordGameScores([]);
    } finally {
      setWordGameLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchWordGameData();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <FiAward className="rank-icon gold" />;
      case 2: return <FiStar className="rank-icon silver" />;
      case 3: return <FiTarget className="rank-icon bronze" />;
      default: return <span className="rank-number">{rank}</span>;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1: return 'rank-gold';
      case 2: return 'rank-silver';
      case 3: return 'rank-bronze';
      default: return '';
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getSceneColor = (scene) => {
    switch (scene) {
      case 'Heart': return '#FF6B6B';
      case 'Force': return '#4ECDC4';
      case 'Fix': return '#45B7D1';
      default: return '#888';
    }
  };

  const getSceneIcon = (scene) => {
    switch (scene) {
      case 'Heart': return '❤️';
      case 'Force': return '⚡';
      case 'Fix': return '🔧';
      default: return '🎮';
    }
  };

  const tabs = [
    { id: 'overall', label: 'Overall Ranking', icon: <FiAward />, emoji: '🏆' },
    { id: 'wordgame', label: 'Word Game', icon: <FiZap />, emoji: '📝' }
  ];

  return (
    <div className="leaderboard-page">
      {/* 装饰性背景 */}
      <div className="ranking-bg-decoration">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
      </div>

      <div className="container">
        <motion.div 
          className="page-header text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            className="header-trophy"
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🏆
          </motion.div>
          <h1><span className="text-gradient">Rankings</span></h1>
          <p>See how you rank against other players</p>
        </motion.div>

        {/* 主Tab切换 - 浮动胶囊样式 */}
        <motion.div 
          className="ranking-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`ranking-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="tab-emoji">{tab.emoji}</span>
              <span className="tab-label">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  className="tab-indicator"
                  layoutId="tabIndicator"
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Overall Ranking Tab */}
          {activeTab === 'overall' && (
            <motion.div
              key="overall"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="leaderboard-controls"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="limit-selector">
                  <span>Show top</span>
                  <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>players</span>
                </div>
              </motion.div>

              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading leaderboard...</p>
                </div>
              ) : (
                <motion.div 
                  className="leaderboard-table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="table-header">
                    <div className="col-rank">Rank</div>
                    <div className="col-player">Player</div>
                    <div className="col-level">Level</div>
                    <div className="col-games">Games</div>
                    <div className="col-score">Score</div>
                  </div>

                  <div className="table-body">
                    {leaderboard.map((player, index) => (
                      <motion.div
                        key={player.id}
                        className={`table-row ${getRankClass(player.rank)} ${player.id === user?.id ? 'current-user' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="col-rank">
                          {getRankIcon(player.rank)}
                        </div>
                        <div className="col-player">
                          <motion.div 
                            className="avatar"
                            style={{ background: player.avatarColor || 'var(--gradient-primary)' }}
                            whileHover={{ scale: 1.1, rotate: 10 }}
                          >
                            {player.username.charAt(0).toUpperCase()}
                          </motion.div>
                          <span className="player-name">
                            {player.username}
                            {player.id === user?.id && <span className="you-badge">You</span>}
                          </span>
                        </div>
                        <div className="col-level">
                          <FiStar className="level-icon" />
                          <span>{player.level}</span>
                        </div>
                        <div className="col-games">
                          {player.gamesCompleted}
                        </div>
                        <div className="col-score">
                          <span className="score-value">{player.score.toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!loading && leaderboard.length === 0 && (
                <div className="empty-state">
                  <FiAward className="empty-icon" />
                  <p>No players on the leaderboard yet. Be the first!</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Word Game Tab */}
          {activeTab === 'wordgame' && (
            <motion.div
              key="wordgame"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="wordgame-section"
            >
              {/* 统计卡片 */}
              {wordGameStats && (
                <motion.div 
                  className="wg-stats-grid"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.div className="wg-stat-card" whileHover={{ scale: 1.05, y: -5 }}>
                    <div className="wg-stat-icon"><FiTarget /></div>
                    <div className="wg-stat-info">
                      <span className="wg-stat-value">{wordGameStats.overview?.totalGames || 0}</span>
                      <span className="wg-stat-label">Total Games</span>
                    </div>
                  </motion.div>
                  <motion.div className="wg-stat-card" whileHover={{ scale: 1.05, y: -5 }}>
                    <div className="wg-stat-icon"><FiUsers /></div>
                    <div className="wg-stat-info">
                      <span className="wg-stat-value">{wordGameStats.overview?.uniquePlayers || 0}</span>
                      <span className="wg-stat-label">Players</span>
                    </div>
                  </motion.div>
                  <motion.div className="wg-stat-card" whileHover={{ scale: 1.05, y: -5 }}>
                    <div className="wg-stat-icon"><FiTrendingUp /></div>
                    <div className="wg-stat-info">
                      <span className="wg-stat-value">{wordGameStats.overview?.avgScore || 0}</span>
                      <span className="wg-stat-label">Avg Score</span>
                    </div>
                  </motion.div>
                  <motion.div className="wg-stat-card highlight" whileHover={{ scale: 1.05, y: -5 }}>
                    <div className="wg-stat-icon"><FiAward /></div>
                    <div className="wg-stat-info">
                      <span className="wg-stat-value">{wordGameStats.overview?.highestScore || 0}</span>
                      <span className="wg-stat-label">High Score</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* 场景按钮 */}
              {wordGameStats && wordGameStats.byScene && (
                <motion.div 
                  className="scene-filters"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.button
                    className={`scene-btn ${selectedScene === 'all' ? 'active' : ''}`}
                    onClick={() => { setSelectedScene('all'); setCurrentPage(1); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🎮 All Scenes
                  </motion.button>
                  {wordGameStats.byScene.map((scene, index) => (
                    <motion.button
                      key={index}
                      className={`scene-btn ${selectedScene === scene.scene ? 'active' : ''}`}
                      style={{ '--scene-color': getSceneColor(scene.scene) }}
                      onClick={() => { setSelectedScene(scene.scene); setCurrentPage(1); }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {getSceneIcon(scene.scene)} {scene.scene}
                      <span className="scene-count">{scene.count}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* 搜索和子Tab */}
              <div className="wg-controls">
                <div className="wg-subtabs">
                  <button 
                    className={wordGameSubTab === 'leaderboard' ? 'active' : ''} 
                    onClick={() => setWordGameSubTab('leaderboard')}
                  >
                    🏆 Leaderboard
                  </button>
                  <button 
                    className={wordGameSubTab === 'scores' ? 'active' : ''} 
                    onClick={() => setWordGameSubTab('scores')}
                  >
                    📋 Records
                  </button>
                </div>
                <div className="wg-search">
                  <FiSearch />
                  <input 
                    type="text" 
                    placeholder="Search player..." 
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button onClick={handleSearch}>Search</button>
                </div>
              </div>

              {wordGameLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : (
                <>
                  {/* Word Game 排行榜 */}
                  {wordGameSubTab === 'leaderboard' && (
                    <motion.div 
                      className="leaderboard-table wg-table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="table-header wg-header">
                        <span>Rank</span>
                        <span>Player</span>
                        <span>Total</span>
                        <span>Games</span>
                        <span>Best</span>
                        <span>Avg</span>
                      </div>
                      <div className="table-body">
                        {wordGameLeaderboard.map((player, index) => (
                          <motion.div 
                            key={index} 
                            className={`table-row wg-row ${index < 3 ? 'top-rank' : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, x: 5 }}
                          >
                            <span className="wg-rank">{getRankBadge(player.rank)}</span>
                            <span className="wg-player">{player.playerName}</span>
                            <span className="wg-total">{player.totalScore}</span>
                            <span className="wg-games">{player.gamesPlayed}</span>
                            <span className="wg-best">{player.bestScore}</span>
                            <span className="wg-avg">{player.avgScore}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* 成绩记录 */}
                  {wordGameSubTab === 'scores' && (
                    <>
                      <motion.div 
                        className="leaderboard-table wg-table scores-table"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="table-header wg-header scores-header">
                          <span>Player</span>
                          <span>Score</span>
                          <span>Scene</span>
                          <span>Time</span>
                        </div>
                        <div className="table-body">
                          {wordGameScores.map((score, index) => (
                            <motion.div 
                              key={index} 
                              className="table-row wg-row"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              whileHover={{ scale: 1.02, x: 5 }}
                            >
                              <span className="wg-player">{score.playerName}</span>
                              <span className={`wg-score ${score.score >= 80 ? 'high' : score.score >= 50 ? 'medium' : 'low'}`}>
                                {score.score}
                              </span>
                              <span className="wg-scene" style={{ color: getSceneColor(score.scene) }}>
                                {getSceneIcon(score.scene)} {score.scene}
                              </span>
                              <span className="wg-time">
                                {new Date(score.playedAt).toLocaleString('en-US')}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* 分页 */}
                      {pagination && pagination.pages > 1 && (
                        <div className="wg-pagination">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                          >
                            Previous
                          </button>
                          <span>Page {currentPage} / {pagination.pages}</span>
                          <button 
                            disabled={currentPage === pagination.pages}
                            onClick={() => setCurrentPage(p => p + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Leaderboard;
