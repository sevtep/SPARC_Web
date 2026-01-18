import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiTrendingUp, FiBarChart2, FiClock,
  FiAward, FiFileText, FiChevronRight, FiActivity
} from 'react-icons/fi';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import api from '../../services/api';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    avgProgress: 0,
    totalSessions: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [moduleStats, setModuleStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Simulated data for demonstration
      // In production, these would come from API calls

      setStats({
        totalStudents: 45,
        activeStudents: 32,
        avgProgress: 68,
        totalSessions: 234
      });

      setRecentActivity([
        { id: 1, student: 'Alex Chen', action: 'Completed', game: 'Blood Flow Adventure', time: '5 min ago' },
        { id: 2, student: 'Sarah Lee', action: 'Started', game: 'Heart Explorer', time: '12 min ago' },
        { id: 3, student: 'Mike Johnson', action: 'Achieved', game: 'First Blood Badge', time: '25 min ago' },
        { id: 4, student: 'Emma Davis', action: 'Completed', game: 'Immune Defense', time: '1 hour ago' },
        { id: 5, student: 'James Wilson', action: 'Started', game: 'Cell Navigator', time: '2 hours ago' }
      ]);

      setTopStudents([
        { id: 1, name: 'Alex Chen', avatar: '🧑‍🔬', score: 15420, progress: 92 },
        { id: 2, name: 'Sarah Lee', avatar: '👩‍🎓', score: 14280, progress: 88 },
        { id: 3, name: 'Mike Johnson', avatar: '👨‍🎓', score: 12850, progress: 85 },
        { id: 4, name: 'Emma Davis', avatar: '🧬', score: 11920, progress: 78 },
        { id: 5, name: 'James Wilson', avatar: '🔬', score: 10540, progress: 72 }
      ]);

      setProgressData([
        { name: 'Mon', students: 28, sessions: 45 },
        { name: 'Tue', students: 32, sessions: 52 },
        { name: 'Wed', students: 35, sessions: 48 },
        { name: 'Thu', students: 30, sessions: 55 },
        { name: 'Fri', students: 38, sessions: 62 },
        { name: 'Sat', students: 22, sessions: 35 },
        { name: 'Sun', students: 18, sessions: 28 }
      ]);

      setModuleStats([
        { name: 'Blood Flow', completion: 78, avgScore: 850 },
        { name: 'Heart Explorer', completion: 65, avgScore: 720 },
        { name: 'Cell Navigator', completion: 52, avgScore: 680 },
        { name: 'Immune Defense', completion: 45, avgScore: 620 }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Welcome Section */}
      <motion.section 
        className="welcome-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="welcome-content">
          <h1>Welcome back, {user?.username}!</h1>
          <p>Here's an overview of your students' progress</p>
        </div>
        <Link to="/teacher/reports" className="btn btn-primary">
          <FiFileText /> Generate Report
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
            <div className="stat-icon students">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalStudents}</span>
              <span className="stat-label">Total Students</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <FiActivity />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.activeStudents}</span>
              <span className="stat-label">Active This Week</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon progress">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.avgProgress}%</span>
              <span className="stat-label">Avg. Progress</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon sessions">
              <FiClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalSessions}</span>
              <span className="stat-label">Game Sessions</span>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="dashboard-grid">
        {/* Activity Chart */}
        <motion.section 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <h2><FiBarChart2 /> Weekly Activity</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#00D4FF" 
                  strokeWidth={2}
                  dot={{ fill: '#00D4FF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#FF00FF" 
                  strokeWidth={2}
                  dot={{ fill: '#FF00FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="dot cyan"></span> Active Students
            </span>
            <span className="legend-item">
              <span className="dot magenta"></span> Game Sessions
            </span>
          </div>
        </motion.section>

        {/* Recent Activity */}
        <motion.section 
          className="activity-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h2><FiActivity /> Recent Activity</h2>
            <Link to="/teacher/students" className="view-all">
              View All <FiChevronRight />
            </Link>
          </div>
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.action.toLowerCase()}`}>
                  {activity.action === 'Completed' && '✅'}
                  {activity.action === 'Started' && '🎮'}
                  {activity.action === 'Achieved' && '🏆'}
                </div>
                <div className="activity-info">
                  <p>
                    <strong>{activity.student}</strong> {activity.action.toLowerCase()}{' '}
                    <span className="highlight">{activity.game}</span>
                  </p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="dashboard-grid">
        {/* Top Students */}
        <motion.section 
          className="top-students-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h2><FiAward /> Top Performers</h2>
            <Link to="/teacher/students" className="view-all">
              View All <FiChevronRight />
            </Link>
          </div>
          <div className="students-list">
            {topStudents.map((student, index) => (
              <div key={student.id} className="student-item">
                <span className="rank">#{index + 1}</span>
                <span className="student-avatar">{student.avatar}</span>
                <div className="student-info">
                  <h4>{student.name}</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${student.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="student-score">
                  <span className="score-value">{student.score.toLocaleString()}</span>
                  <span className="score-label">points</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Module Stats */}
        <motion.section 
          className="module-stats-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h2><FiBarChart2 /> Module Completion</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={moduleStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="completion" fill="#00D4FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      {/* Quick Actions */}
      <motion.section 
        className="quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/teacher/students" className="action-card">
            <span className="action-icon">👥</span>
            <span className="action-label">View Students</span>
          </Link>
          <Link to="/teacher/reports" className="action-card">
            <span className="action-icon">📊</span>
            <span className="action-label">Reports</span>
          </Link>
          <Link to="/games" className="action-card">
            <span className="action-icon">🎮</span>
            <span className="action-label">Game Modules</span>
          </Link>
          <Link to="/knowledge-map" className="action-card">
            <span className="action-icon">🗺️</span>
            <span className="action-label">Knowledge Map</span>
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default TeacherDashboard;
