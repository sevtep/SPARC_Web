import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiFileText, FiDownload, FiCalendar, FiUsers,
  FiBarChart2, FiPieChart, FiFilter
} from 'react-icons/fi';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import api from '../../services/api';
import './Reports.css';

const Reports = () => {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({});

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Simulated report data
      await new Promise(resolve => setTimeout(resolve, 500));

      setReportData({
        summary: {
          totalStudents: 45,
          activeStudents: 32,
          avgProgress: 68,
          totalGameSessions: 234,
          avgTimeSpent: '2.5 hours',
          completionRate: 72
        },
        progressTrend: [
          { date: 'Week 1', progress: 35, sessions: 45 },
          { date: 'Week 2', progress: 42, sessions: 52 },
          { date: 'Week 3', progress: 55, sessions: 68 },
          { date: 'Week 4', progress: 68, sessions: 85 }
        ],
        moduleCompletion: [
          { name: 'Blood Flow Adventure', value: 78, color: '#00D4FF' },
          { name: 'Heart Explorer', value: 65, color: '#FF00FF' },
          { name: 'Cell Navigator', value: 52, color: '#00FF88' },
          { name: 'Immune Defense', value: 45, color: '#FFD700' }
        ],
        studentDistribution: [
          { range: '0-20%', count: 5 },
          { range: '21-40%', count: 8 },
          { range: '41-60%', count: 12 },
          { range: '61-80%', count: 15 },
          { range: '81-100%', count: 5 }
        ],
        topAchievements: [
          { name: 'First Blood', earned: 42, icon: '🩸' },
          { name: 'Heart Master', earned: 28, icon: '❤️' },
          { name: 'Cell Explorer', earned: 35, icon: '🔬' },
          { name: 'Quick Learner', earned: 38, icon: '⚡' }
        ]
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    // In production, this would generate and download a report file
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const reportTypes = [
    { id: 'overview', label: 'Overview', icon: <FiBarChart2 /> },
    { id: 'progress', label: 'Progress', icon: <FiPieChart /> },
    { id: 'engagement', label: 'Engagement', icon: <FiUsers /> }
  ];

  const dateRanges = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' }
  ];

  const COLORS = ['#00D4FF', '#FF00FF', '#00FF88', '#FFD700', '#FF6B6B'];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Generating report...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiFileText /> Reports</h1>
          <p>Generate and export student progress reports</p>
        </div>
        <div className="export-buttons">
          <button className="btn btn-outline" onClick={() => handleExport('pdf')}>
            <FiDownload /> Export PDF
          </button>
          <button className="btn btn-outline" onClick={() => handleExport('csv')}>
            <FiDownload /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Report Controls */}
      <motion.div 
        className="report-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="control-group">
          <label>Report Type:</label>
          <div className="button-group">
            {reportTypes.map(type => (
              <button
                key={type.id}
                className={`control-btn ${reportType === type.id ? 'active' : ''}`}
                onClick={() => setReportType(type.id)}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label><FiCalendar /> Date Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
          >
            {dateRanges.map(range => (
              <option key={range.id} value={range.id}>{range.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        className="summary-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="summary-card">
          <h3>Total Students</h3>
          <span className="summary-value">{reportData.summary?.totalStudents}</span>
          <span className="summary-change positive">+5 this {dateRange}</span>
        </div>
        <div className="summary-card">
          <h3>Active Students</h3>
          <span className="summary-value">{reportData.summary?.activeStudents}</span>
          <span className="summary-change positive">71% of total</span>
        </div>
        <div className="summary-card">
          <h3>Avg. Progress</h3>
          <span className="summary-value">{reportData.summary?.avgProgress}%</span>
          <span className="summary-change positive">+12% vs last {dateRange}</span>
        </div>
        <div className="summary-card">
          <h3>Completion Rate</h3>
          <span className="summary-value">{reportData.summary?.completionRate}%</span>
          <span className="summary-change positive">+8% vs last {dateRange}</span>
        </div>
      </motion.div>

      <div className="reports-grid">
        {/* Progress Trend Chart */}
        <motion.section 
          className="report-card large"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h2>Progress Trend</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.progressTrend}>
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
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  name="Avg. Progress (%)"
                  stroke="#00D4FF" 
                  strokeWidth={2}
                  dot={{ fill: '#00D4FF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  name="Game Sessions"
                  stroke="#FF00FF" 
                  strokeWidth={2}
                  dot={{ fill: '#FF00FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Module Completion */}
        <motion.section 
          className="report-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h2>Module Completion</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reportData.moduleCompletion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportData.moduleCompletion?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {reportData.moduleCompletion?.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ background: item.color }}></span>
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Student Distribution */}
        <motion.section 
          className="report-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h2>Student Progress Distribution</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reportData.studentDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="range" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" name="Students" fill="#00D4FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Top Achievements */}
        <motion.section 
          className="report-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="card-header">
            <h2>Top Achievements Earned</h2>
          </div>
          <div className="achievements-list">
            {reportData.topAchievements?.map((achievement, index) => (
              <div key={index} className="achievement-row">
                <span className="achievement-icon">{achievement.icon}</span>
                <span className="achievement-name">{achievement.name}</span>
                <span className="achievement-count">{achievement.earned} students</span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Reports;
