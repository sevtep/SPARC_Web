import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiChevronDown,
  FiMail, FiBarChart2, FiMoreVertical
} from 'react-icons/fi';
import api from '../../services/api';
import './StudentList.css';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterProgress, setFilterProgress] = useState('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Simulated data
      const mockStudents = [
        { id: 1, username: 'Alex Chen', email: 'alex@school.edu', avatar: '🧑‍🔬', gamesPlayed: 45, totalScore: 15420, progress: 92, lastActive: '2024-01-15T10:30:00' },
        { id: 2, username: 'Sarah Lee', email: 'sarah@school.edu', avatar: '👩‍🎓', gamesPlayed: 38, totalScore: 14280, progress: 88, lastActive: '2024-01-15T09:15:00' },
        { id: 3, username: 'Mike Johnson', email: 'mike@school.edu', avatar: '👨‍🎓', gamesPlayed: 42, totalScore: 12850, progress: 85, lastActive: '2024-01-14T16:45:00' },
        { id: 4, username: 'Emma Davis', email: 'emma@school.edu', avatar: '🧬', gamesPlayed: 35, totalScore: 11920, progress: 78, lastActive: '2024-01-14T14:20:00' },
        { id: 5, username: 'James Wilson', email: 'james@school.edu', avatar: '🔬', gamesPlayed: 28, totalScore: 10540, progress: 72, lastActive: '2024-01-13T11:00:00' },
        { id: 6, username: 'Lisa Wang', email: 'lisa@school.edu', avatar: '💉', gamesPlayed: 32, totalScore: 9850, progress: 65, lastActive: '2024-01-13T09:30:00' },
        { id: 7, username: 'David Kim', email: 'david@school.edu', avatar: '🩸', gamesPlayed: 25, totalScore: 8420, progress: 58, lastActive: '2024-01-12T15:00:00' },
        { id: 8, username: 'Amy Brown', email: 'amy@school.edu', avatar: '❤️', gamesPlayed: 20, totalScore: 6280, progress: 45, lastActive: '2024-01-11T10:00:00' },
        { id: 9, username: 'Tom Garcia', email: 'tom@school.edu', avatar: '🫀', gamesPlayed: 15, totalScore: 4120, progress: 32, lastActive: '2024-01-10T14:30:00' },
        { id: 10, username: 'Jane Smith', email: 'jane@school.edu', avatar: '🫁', gamesPlayed: 8, totalScore: 2150, progress: 18, lastActive: '2024-01-09T09:00:00' }
      ];

      setStudents(mockStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'high';
    if (progress >= 50) return 'medium';
    return 'low';
  };

  const formatLastActive = (date) => {
    const now = new Date();
    const lastActive = new Date(date);
    const diffMs = now - lastActive;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return lastActive.toLocaleDateString();
  };

  // Filter and sort students
  let filteredStudents = students.filter(student => {
    const matchesSearch = student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterProgress === 'all') return matchesSearch;
    if (filterProgress === 'high') return matchesSearch && student.progress >= 80;
    if (filterProgress === 'medium') return matchesSearch && student.progress >= 50 && student.progress < 80;
    if (filterProgress === 'low') return matchesSearch && student.progress < 50;
    return matchesSearch;
  });

  filteredStudents = filteredStudents.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.username.localeCompare(b.username);
      case 'score':
        return b.totalScore - a.totalScore;
      case 'progress':
        return b.progress - a.progress;
      case 'active':
        return new Date(b.lastActive) - new Date(a.lastActive);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <div className="student-list-page">
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiUsers /> Student List</h1>
          <p>Manage and monitor your students</p>
        </div>
        <div className="header-stats">
          <div className="header-stat">
            <span className="stat-number">{students.length}</span>
            <span className="stat-text">Total Students</span>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="filters-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select 
            value={filterProgress} 
            onChange={(e) => setFilterProgress(e.target.value)}
          >
            <option value="all">All Progress</option>
            <option value="high">High (80%+)</option>
            <option value="medium">Medium (50-79%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>
        </div>

        <div className="filter-group">
          <span>Sort by:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="score">Score</option>
            <option value="progress">Progress</option>
            <option value="active">Last Active</option>
          </select>
        </div>
      </motion.div>

      {/* Student Table */}
      <motion.div 
        className="students-table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Games Played</th>
              <th>Total Score</th>
              <th>Progress</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => (
              <motion.tr
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <td>
                  <div className="student-cell">
                    <span className="student-avatar">{student.avatar}</span>
                    <div className="student-info">
                      <span className="student-name">{student.username}</span>
                      <span className="student-email">{student.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="games-count">{student.gamesPlayed}</span>
                </td>
                <td>
                  <span className="score">{student.totalScore.toLocaleString()}</span>
                </td>
                <td>
                  <div className="progress-cell">
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${getProgressColor(student.progress)}`}
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{student.progress}%</span>
                  </div>
                </td>
                <td>
                  <span className="last-active">{formatLastActive(student.lastActive)}</span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-icon" title="View Details">
                      <FiBarChart2 />
                    </button>
                    <button className="btn-icon" title="Send Message">
                      <FiMail />
                    </button>
                    <button className="btn-icon" title="More Options">
                      <FiMoreVertical />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {filteredStudents.length === 0 && (
        <div className="empty-state">
          <FiUsers size={48} />
          <h3>No Students Found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default StudentList;
