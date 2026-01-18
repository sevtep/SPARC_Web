import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlay, FiClock, FiBarChart2, FiTarget, FiArrowLeft } from 'react-icons/fi';
import { gameService } from '../services/api';
import './GameDetail.css';

// 静态游戏详情数据
const staticGameDetails = {
  'meeting-cells': {
    name: 'Meeting Cells',
    slug: 'meeting-cells',
    description: 'Begin your journey into the bloodstream! Meet the different types of blood cells - red blood cells, white blood cells, and platelets. Learn their unique shapes, sizes, and vital roles in keeping the body healthy.',
    category: 'biology',
    difficulty: 'easy',
    estimatedTime: 20,
    gradeLevel: ['5', '6', '7', '8'],
    gameUrl: '#',
    learningObjectives: ['Identify different types of blood cells', 'Understand the function of red blood cells', 'Learn about white blood cells and immunity', 'Discover how platelets help with healing'],
    statistics: { totalPlays: 0, averageScore: 0 }
  },
  'thumping-heart': {
    name: 'Thumping Heart',
    slug: 'thumping-heart',
    description: 'Enter the powerful heart and feel its rhythm! Explore the four chambers, valves, and the electrical system that keeps your heart beating 100,000 times a day.',
    category: 'biology',
    difficulty: 'medium',
    estimatedTime: 25,
    gradeLevel: ['6', '7', '8', '9'],
    gameUrl: '#',
    learningObjectives: ['Understand the four chambers of the heart', 'Learn how valves control blood flow', 'Explore the cardiac cycle'],
    statistics: { totalPlays: 0, averageScore: 0 }
  },
  'speed-oxygen': {
    name: 'Need for Speed & Oxygen',
    slug: 'speed-oxygen',
    description: 'Race through the circulatory system! Experience the forces that propel blood through arteries and veins. Learn about blood pressure, flow dynamics, and how oxygen reaches every cell.',
    category: 'biology',
    difficulty: 'medium',
    estimatedTime: 30,
    gradeLevel: ['6', '7', '8', '9'],
    gameUrl: 'https://game.agaii.org/Force&Motion',
    learningObjectives: ['Understand blood pressure and flow dynamics', 'Learn how mass can affect speed', 'Discover how oxygen binds to hemoglobin'],
    statistics: { totalPlays: 0, averageScore: 0 }
  },
  'sickle-cell': {
    name: 'Sickle Cell Detective',
    slug: 'sickle-cell',
    description: 'Become a medical detective! Investigate sickle cell disease by measuring oxygen levels in healthy vs. sickle cells. Use data analysis to understand how cell shape affects oxygen-carrying capacity.',
    category: 'biology',
    difficulty: 'medium',
    estimatedTime: 30,
    gradeLevel: ['6', '7', '8', '9'],
    gameUrl: '#',
    learningObjectives: ['Understand sickle cell disease', 'Analyze data to find patterns', 'Learn how cell shape affects function'],
    statistics: { totalPlays: 0, averageScore: 0 }
  },
  'fixing-vessels': {
    name: 'Fixing Blood Vessels',
    slug: 'fixing-vessels',
    description: 'Use your surgical skills to repair damaged blood vessels! Learn about vessel structure, blood clots, and healing processes with AI-powered guidance.',
    category: 'biology',
    difficulty: 'hard',
    estimatedTime: 35,
    gradeLevel: ['7', '8', '9', '10'],
    gameUrl: '#',
    learningObjectives: ['Understand blood vessel structure', 'Learn about clot formation', 'Explore vessel repair processes'],
    statistics: { totalPlays: 0, averageScore: 0 }
  },
  'cold-response': {
    name: 'Cold Body Response',
    slug: 'cold-response',
    description: 'Discover how your body responds to cold temperatures! Learn about vasoconstriction, shivering, and the cardiovascular adjustments that keep you warm.',
    category: 'biology',
    difficulty: 'medium',
    estimatedTime: 25,
    gradeLevel: ['6', '7', '8', '9'],
    gameUrl: '#',
    learningObjectives: ['Understand thermoregulation', 'Learn about vasoconstriction', 'Explore how the heart responds to cold'],
    statistics: { totalPlays: 0, averageScore: 0 }
  }
};

const GameDetail = () => {
  const { slug } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGame();
  }, [slug]);

  const fetchGame = async () => {
    try {
      const response = await gameService.getGame(slug);
      const gameData = response?.data?.game;
      if (gameData) {
        setGame(gameData);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error fetching game, using static data:', error);
      // 使用静态数据
      setGame(staticGameDetails[slug] || null);
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

  if (loading) {
    return (
      <div className="game-detail-page">
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading game details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-detail-page">
        <div className="container">
          <div className="empty-state">
            <h2>Game Not Found</h2>
            <p>The game you're looking for doesn't exist.</p>
            <Link to="/games" className="btn btn-primary">
              <FiArrowLeft /> Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-detail-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/games" className="back-link">
            <FiArrowLeft /> Back to Games
          </Link>

          <div className="game-detail-header">
            <div className="game-detail-info">
              <div className="game-badges">
                <span className="badge badge-primary">{game.category}</span>
                <span 
                  className="badge"
                  style={{ 
                    background: `${getDifficultyColor(game.difficulty)}22`,
                    color: getDifficultyColor(game.difficulty),
                    border: `1px solid ${getDifficultyColor(game.difficulty)}`
                  }}
                >
                  {game.difficulty}
                </span>
              </div>
              <h1>{game.name}</h1>
              <p className="game-description">{game.description}</p>

              <div className="game-stats">
                <div className="stat">
                  <FiClock />
                  <span>{game.estimatedTime} min</span>
                </div>
                <div className="stat">
                  <FiBarChart2 />
                  <span>{game.statistics?.totalPlays || 0} plays</span>
                </div>
                <div className="stat">
                  <FiTarget />
                  <span>{game.statistics?.averageScore?.toFixed(0) || 0} avg score</span>
                </div>
              </div>

              <a 
                href={game.gameUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg play-button"
              >
                <FiPlay /> Play Now
              </a>
            </div>

            <div className="game-detail-visual">
              <div className="game-thumbnail">
                <span className="game-emoji">
                  {game.category === 'biology' ? '🧬' : '⚡'}
                </span>
              </div>
            </div>
          </div>

          <div className="game-detail-content">
            <div className="content-section">
              <h2>Learning Objectives</h2>
              <ul className="objectives-list">
                {game.learningObjectives?.map((objective, index) => (
                  <li key={index}>
                    <span className="objective-icon">✓</span>
                    {objective}
                  </li>
                ))}
              </ul>
            </div>

            <div className="content-section">
              <h2>Grade Levels</h2>
              <div className="grade-levels">
                {game.gradeLevel?.map(grade => (
                  <span key={grade} className="grade-tag">
                    Grade {grade}
                  </span>
                ))}
              </div>
            </div>

            {game.prerequisites?.length > 0 && (
              <div className="content-section">
                <h2>Prerequisites</h2>
                <div className="prerequisites">
                  {game.prerequisites.map(prereq => (
                    <Link 
                      key={prereq.slug}
                      to={`/games/${prereq.slug}`}
                      className="prereq-card"
                    >
                      <span className="prereq-name">{prereq.name}</span>
                      <FiArrowLeft className="prereq-arrow" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GameDetail;
