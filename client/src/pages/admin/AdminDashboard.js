import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiDatabase, FiActivity, FiServer,
  FiShield, FiSettings, FiAlertCircle, FiCheckCircle,
  FiTrendingUp, FiBarChart2, FiChevronRight
} from 'react-icons/fi';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    activeToday: 0,
    gameModules: 0,
    totalSessions: 0,
    systemHealth: 'good'
  });
  const [userGrowth, setUserGrowth] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Simulated admin data
      setStats({
        totalUsers: 156,
        students: 120,
        teachers: 32,
        admins: 4,
        activeToday: 45,
        gameModules: 8,
        totalSessions: 1250,
        systemHealth: 'good'
      });

      setUserGrowth([
        { date: 'Jan', users: 45, sessions: 120 },
        { date: 'Feb', users: 62, sessions: 180 },
        { date: 'Mar', users: 78, sessions: 250 },
        { date: 'Apr', users: 95, sessions: 340 },
        { date: 'May', users: 120, sessions: 480 },
        { date: 'Jun', users: 156, sessions: 620 }
      ]);

      setRecentActivity([
        { id: 1, type: 'user', message: 'New user registered: john_doe', time: '5 min ago', icon: '👤' },
        { id: 2, type: 'game', message: 'Game module updated: Blood Flow', time: '15 min ago', icon: '🎮' },
        { id: 3, type: 'system', message: 'Database backup completed', time: '1 hour ago', icon: '💾' },
        { id: 4, type: 'user', message: 'Teacher account approved: sarah_teacher', time: '2 hours ago', icon: '👨‍🏫' },
        { id: 5, type: 'system', message: 'Server maintenance completed', time: '3 hours ago', icon: '🔧' }
      ]);

      setSystemAlerts([
        { id: 1, type: 'info', message: 'System update scheduled for tonight', severity: 'low' },
        { id: 2, type: 'warning', message: '3 pending teacher approvals', severity: 'medium' }
      ]);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <motion.section 
        className="welcome-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="welcome-content">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.username}. Here's your system overview.</p>
        </div>
        <div className="system-status">
          <FiCheckCircle className="status-icon good" />
          <span>All Systems Operational</span>
        </div>
      </motion.section>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <motion.section 
          className="alerts-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {systemAlerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.type}`}>
              <FiAlertCircle />
              <span>{alert.message}</span>
              <button className="alert-dismiss">Dismiss</button>
            </div>
          ))}
        </motion.section>
      )}

      {/* Stats Grid */}
      <motion.section 
        className="stats-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-icon users">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">Total Users</span>
            </div>
            <div className="stat-breakdown">
              <span>👨‍🎓 {stats.students}</span>
              <span>👨‍🏫 {stats.teachers}</span>
              <span>👑 {stats.admins}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <FiActivity />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.activeToday}</span>
              <span className="stat-label">Active Today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon modules">
              <FiDatabase />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.gameModules}</span>
              <span className="stat-label">Game Modules</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon sessions">
              <FiBarChart2 />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalSessions}</span>
              <span className="stat-label">Total Sessions</span>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="dashboard-grid">
        {/* User Growth Chart */}
        <motion.section 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h2><FiTrendingUp /> User Growth</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#00D4FF" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Recent Activity */}
        <motion.section 
          className="activity-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h2><FiActivity /> Recent Activity</h2>
            <Link to="/admin/logs" className="view-all">
              View All <FiChevronRight />
            </Link>
          </div>
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <span className="activity-icon">{activity.icon}</span>
                <div className="activity-info">
                  <p>{activity.message}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Quick Actions */}
      <motion.section 
        className="quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/admin/users" className="action-card">
            <span className="action-icon"><FiUsers /></span>
            <span className="action-label">User Management</span>
            <span className="action-desc">Manage all users</span>
          </Link>
          <Link to="/admin/modules" className="action-card">
            <span className="action-icon"><FiDatabase /></span>
            <span className="action-label">Game Modules</span>
            <span className="action-desc">Configure games</span>
          </Link>
          <Link to="/admin/settings" className="action-card">
            <span className="action-icon"><FiSettings /></span>
            <span className="action-label">System Settings</span>
            <span className="action-desc">Configure system</span>
          </Link>
          <Link to="/admin/permissions" className="action-card">
            <span className="action-icon"><FiShield /></span>
            <span className="action-label">Permissions</span>
            <span className="action-desc">Role management</span>
          </Link>
          <Link to="/admin/server" className="action-card">
            <span className="action-icon"><FiServer /></span>
            <span className="action-label">Server Status</span>
            <span className="action-desc">Monitor health</span>
          </Link>
          <Link to="/admin/logs" className="action-card">
            <span className="action-icon"><FiActivity /></span>
            <span className="action-label">Activity Logs</span>
            <span className="action-desc">View all logs</span>
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default AdminDashboard;
