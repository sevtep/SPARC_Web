import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiUsers, FiTarget, FiTrendingUp, FiFilter, FiSearch } from 'react-icons/fi';
import { wordGameService } from '../services/api';
import './WordGameScores.css';

const WordGameScores = () => {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [selectedScene, setSelectedScene] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedScene, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取统计数据
      const statsData = await wordGameService.getStats();
      if (statsData && statsData.success) {
        setStats(statsData.data);
      }

      // 获取排行榜
      const leaderboardData = await wordGameService.getLeaderboard({
        limit: 20,
        scene: selectedScene !== 'all' ? selectedScene : undefined
      });
      if (leaderboardData && leaderboardData.success) {
        const leaderboardList = leaderboardData.data;
        // Ensure it's an array
        setLeaderboard(Array.isArray(leaderboardList) ? leaderboardList : []);
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
        // Ensure it's an array
        setScores(Array.isArray(scoresList) ? scoresList : []);
        setPagination(scoresData.pagination || { total: 0, pages: 1, page: currentPage });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLeaderboard([]);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
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

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="wordgame-scores-page">
      <div className="page-header">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FiAward /> Word Game Leaderboard
        </motion.h1>
        <p>View all players' Word Game scores</p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <motion.div 
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="stat-card">
            <div className="stat-icon"><FiTarget /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.overview.totalGames}</span>
              <span className="stat-label">Total Games</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FiUsers /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.overview.uniquePlayers}</span>
              <span className="stat-label">Unique Players</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FiTrendingUp /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.overview.avgScore}</span>
              <span className="stat-label">Avg Score</span>
            </div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-icon"><FiAward /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.overview.highestScore}</span>
              <span className="stat-label">Highest Score</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 场景统计 */}
      {stats && stats.byScene && (
        <motion.div 
          className="scene-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>Scene Statistics</h3>
          <div className="scene-cards">
            {stats.byScene.map((scene, index) => (
              <div 
                key={index} 
                className="scene-card"
                style={{ borderColor: getSceneColor(scene.scene) }}
              >
                <span className="scene-icon">{getSceneIcon(scene.scene)}</span>
                <span className="scene-name">{scene.scene}</span>
                <span className="scene-count">{scene.count} plays</span>
                <span className="scene-avg">Avg: {scene.avgScore}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 筛选和搜索 */}
      <div className="filter-bar">
        <div className="filter-group">
          <FiFilter />
          <select 
            value={selectedScene} 
            onChange={(e) => { setSelectedScene(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Scenes</option>
            <option value="Heart">❤️ Heart</option>
            <option value="Force">⚡ Force</option>
            <option value="Fix">🔧 Fix</option>
          </select>
        </div>
        <div className="search-group">
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

      {/* 标签页 */}
      <div className="tabs">
        <button 
          className={activeTab === 'leaderboard' ? 'active' : ''} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button 
          className={activeTab === 'scores' ? 'active' : ''} 
          onClick={() => setActiveTab('scores')}
        >
          📋 Score Records
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {/* 排行榜 */}
          {activeTab === 'leaderboard' && (
            <motion.div 
              className="leaderboard-table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="table-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Total</span>
                <span>Games</span>
                <span>Best</span>
                <span>Avg</span>
              </div>
              {leaderboard.map((player, index) => (
                <motion.div 
                  key={index} 
                  className={`table-row ${index < 3 ? 'top-rank' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="rank">{getRankBadge(player.rank)}</span>
                  <span className="player-name">{player.playerName}</span>
                  <span className="total-score">{player.totalScore}</span>
                  <span className="games-played">{player.gamesPlayed}</span>
                  <span className="best-score">{player.bestScore}</span>
                  <span className="avg-score">{player.avgScore}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* 成绩记录 */}
          {activeTab === 'scores' && (
            <>
              <motion.div 
                className="scores-table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="table-header">
                  <span>Player</span>
                  <span>Score</span>
                  <span>Scene</span>
                  <span>Time</span>
                </div>
                {scores.map((score, index) => (
                  <motion.div 
                    key={index} 
                    className="table-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span className="player-name">{score.playerName}</span>
                    <span className={`score ${score.score >= 80 ? 'high' : score.score >= 50 ? 'medium' : 'low'}`}>
                      {score.score}
                    </span>
                    <span className="scene" style={{ color: getSceneColor(score.scene) }}>
                      {getSceneIcon(score.scene)} {score.scene}
                    </span>
                    <span className="time">
                      {new Date(score.playedAt).toLocaleString('en-US')}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              {/* 分页 */}
              {pagination && pagination.pages > 1 && (
                <div className="pagination">
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
    </div>
  );
};

export default WordGameScores;
