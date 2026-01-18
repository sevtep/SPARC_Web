import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, FiUser, FiMail, FiHome, FiBook, FiCalendar, 
  FiCheckCircle, FiXCircle, FiClock, FiAward 
} from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './StudentReport.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StudentReport = () => {
  const { studentId } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [moduleSummary, setModuleSummary] = useState({});
  const [games, setGames] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [expandedGame, setExpandedGame] = useState(null);

  const moduleNames = {
    'meeting-cells': 'Meeting Cells',
    'force-motion': 'Force & Motion',
    'sickle-cell': 'Sickle Cell',
    'fixing': 'Fixing'
  };

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const url = selectedModule
          ? `${API_URL}/reports/wordgame/student/${studentId}?module=${selectedModule}`
          : `${API_URL}/reports/wordgame/student/${studentId}`;
          
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStudent(res.data.student);
        setModuleSummary(res.data.moduleSummary || {});
        setGames(res.data.games || []);
      } catch (err) {
        console.error('Error fetching student report:', err);
        setError('Failed to load student report. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [studentId, selectedModule, token]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'needs-work';
  };

  if (loading) {
    return (
      <div className="student-report-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading student report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-report-page">
        <div className="container">
          <div className="error-state">
            <p>{error}</p>
            <Link to="/teacher/reports" className="btn btn-primary">
              Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-report-page">
      <div className="container">
        {/* Back Button */}
        <Link to="/teacher/reports" className="back-link">
          <FiArrowLeft /> Back to Class Reports
        </Link>

        {/* Student Info Header */}
        {student && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="student-header"
          >
            <div className="student-avatar">
              {student.username.charAt(0).toUpperCase()}
            </div>
            <div className="student-details">
              <h1>{student.username}</h1>
              <div className="student-meta">
                <span><FiMail /> {student.email}</span>
                {student.school && <span><FiHome /> {student.school}</span>}
                {student.course && <span><FiBook /> {student.course}</span>}
                <span><FiCalendar /> Joined {formatDate(student.joinedAt)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Module Filter */}
        <div className="module-filter">
          <button
            className={`filter-btn ${selectedModule === '' ? 'active' : ''}`}
            onClick={() => setSelectedModule('')}
          >
            All Modules
          </button>
          {Object.entries(moduleNames).map(([key, name]) => (
            <button
              key={key}
              className={`filter-btn ${selectedModule === key ? 'active' : ''}`}
              onClick={() => setSelectedModule(key)}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Module Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="module-summary"
        >
          <h2>Performance Summary</h2>
          <div className="summary-cards">
            {Object.entries(moduleNames).map(([key, name]) => {
              const summary = moduleSummary[key];
              return (
                <div key={key} className={`summary-card ${summary ? '' : 'no-data'}`}>
                  <h3>{name}</h3>
                  {summary ? (
                    <>
                      <div className={`score-circle ${getScoreColor(summary.bestScore)}`}>
                        <span className="score-value">{summary.bestScore}%</span>
                        <span className="score-label">Best</span>
                      </div>
                      <div className="summary-stats">
                        <div className="stat-row">
                          <span>Average:</span>
                          <strong>{summary.averageScore}%</strong>
                        </div>
                        <div className="stat-row">
                          <span>Attempts:</span>
                          <strong>{summary.totalAttempts}</strong>
                        </div>
                        <div className="stat-row">
                          <span>Completed:</span>
                          <strong>{summary.completedAttempts}</strong>
                        </div>
                        {summary.lastAttempt && (
                          <div className="stat-row last-attempt">
                            <FiClock />
                            <span>{formatDate(summary.lastAttempt)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="no-data-message">
                      <p>No attempts yet</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Game History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="game-history"
        >
          <h2>Game History</h2>
          
          {games.length === 0 ? (
            <div className="no-games">
              <p>No games recorded for this student.</p>
            </div>
          ) : (
            <div className="games-list">
              {games.map((game, index) => (
                <div key={game.gameId} className="game-card">
                  <div 
                    className="game-header"
                    onClick={() => setExpandedGame(expandedGame === index ? null : index)}
                  >
                    <div className="game-info">
                      <span className="module-tag">{moduleNames[game.module] || game.module}</span>
                      <span className="game-date">{formatDate(game.completedAt || game.createdAt)}</span>
                    </div>
                    
                    {game.hasConfig ? (
                      <div className={`game-score ${getScoreColor(game.percentage)}`}>
                        <FiAward />
                        <span>{game.percentage}%</span>
                        <small>({game.totalScore}/{game.maxScore})</small>
                      </div>
                    ) : (
                      <div className="no-config">
                        <span>No scoring configured</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedGame === index && game.hasConfig && game.questionDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="game-details"
                    >
                      <table className="questions-table">
                        <thead>
                          <tr>
                            <th>Q#</th>
                            <th>Student Answer</th>
                            <th>Correct Answer</th>
                            <th>Result</th>
                            <th>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {game.questionDetails.map((q, qIndex) => (
                            <tr key={qIndex} className={q.isCorrect ? 'correct' : 'incorrect'}>
                              <td>{q.questionNumber}</td>
                              <td>{q.playerAnswer || '-'}</td>
                              <td>{q.correctAnswer || '-'}</td>
                              <td>
                                {q.isCorrect ? (
                                  <FiCheckCircle className="icon-correct" />
                                ) : (
                                  <FiXCircle className="icon-incorrect" />
                                )}
                              </td>
                              <td>{q.score}/{q.maxScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudentReport;
