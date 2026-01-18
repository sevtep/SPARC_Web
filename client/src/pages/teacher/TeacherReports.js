import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUsers, FiFilter, FiDownload, FiSearch, FiEye, FiBook, FiHome, FiSettings } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './TeacherReports.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TeacherReports = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Report data
  const [classStats, setClassStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [answerConfigs, setAnswerConfigs] = useState([]);

  const modules = [
    { value: '', label: 'All Modules' },
    { value: 'meeting-cells', label: 'Meeting Cells' },
    { value: 'force-motion', label: 'Force & Motion' },
    { value: 'sickle-cell', label: 'Sickle Cell' },
    { value: 'fixing', label: 'Fixing' }
  ];

  // Fetch schools list
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await axios.get(`${API_URL}/reports/schools`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSchools(res.data.data || []);
      } catch (err) {
        console.error('Error fetching schools:', err);
      }
    };
    fetchSchools();
  }, [token]);

  // Fetch courses when school changes
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const url = selectedSchool 
          ? `${API_URL}/reports/courses?school=${encodeURIComponent(selectedSchool)}`
          : `${API_URL}/reports/courses`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(res.data.data || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };
    fetchCourses();
  }, [selectedSchool, token]);

  // Fetch teacher's answer configurations
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await axios.get(`${API_URL}/teacher-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnswerConfigs(res.data.data || []);
      } catch (err) {
        console.error('Error fetching answer configs:', err);
      }
    };
    fetchConfigs();
  }, [token]);

  // Fetch class report
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (selectedSchool) params.append('school', selectedSchool);
        if (selectedCourse) params.append('course', selectedCourse);
        if (selectedModule) params.append('module', selectedModule);

        const res = await axios.get(
          `${API_URL}/reports/wordgame/class?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setClassStats(res.data.classStats);
        setStudents(res.data.students || []);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedSchool, selectedCourse, selectedModule, token]);

  // Filter students by search query
  const filteredStudents = students.filter(student => 
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get score color based on percentage
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-needs-work';
  };

  return (
    <div className="teacher-reports-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="reports-header"
        >
          <div className="header-content">
            <h1><FiUsers /> Class Reports</h1>
            <p>View and analyze student performance on WordGame modules</p>
          </div>
          <Link to="/teacher/answer-config" className="btn btn-secondary">
            <FiSettings /> Configure Answers
          </Link>
        </motion.div>

        {/* Answer Config Warning */}
        {answerConfigs.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="config-warning"
          >
            <FiSettings />
            <p>
              <strong>No answer configurations found.</strong> Please configure correct answers for each module 
              to calculate student scores.
            </p>
            <Link to="/teacher/answer-config" className="btn btn-primary btn-sm">
              Configure Now
            </Link>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="filters-section"
        >
          <div className="filter-group">
            <label><FiHome /> School</label>
            <select 
              value={selectedSchool} 
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                setSelectedCourse('');
              }}
            >
              <option value="">All Schools</option>
              {schools.map(school => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label><FiBook /> Course</label>
            <select 
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label><FiFilter /> Module</label>
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              {modules.map(mod => (
                <option key={mod.value} value={mod.value}>{mod.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label><FiSearch /> Search</label>
            <input 
              type="text" 
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Class Stats Overview */}
        {classStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stats-overview"
          >
            <div className="stat-card">
              <div className="stat-value">{classStats.totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{classStats.studentsWithGames}</div>
              <div className="stat-label">Active Players</div>
            </div>
            {Object.entries(classStats.moduleAverages || {}).map(([module, stats]) => (
              <div key={module} className="stat-card module-stat">
                <div className="stat-value">{stats.average}%</div>
                <div className="stat-label">{module.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                <div className="stat-detail">
                  {stats.studentsCompleted} completed | High: {stats.highestScore}%
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Loading/Error States */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading report data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="students-table-container"
          >
            <div className="table-header">
              <h2>Student Performance</h2>
              <span className="student-count">{filteredStudents.length} students</span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="no-data">
                <p>No students found matching your criteria.</p>
              </div>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>School</th>
                    <th>Course</th>
                    <th>Meeting Cells</th>
                    <th>Force & Motion</th>
                    <th>Sickle Cell</th>
                    <th>Fixing</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.studentId}>
                      <td className="student-info">
                        <div className="student-name">{student.username}</div>
                        <div className="student-email">{student.email}</div>
                      </td>
                      <td>{student.school || '-'}</td>
                      <td>{student.course || '-'}</td>
                      <td>
                        {student.moduleScores['meeting-cells'] ? (
                          <span className={`score-badge ${getScoreColor(student.moduleScores['meeting-cells'].percentage)}`}>
                            {student.moduleScores['meeting-cells'].percentage}%
                          </span>
                        ) : (
                          <span className="no-score">-</span>
                        )}
                      </td>
                      <td>
                        {student.moduleScores['force-motion'] ? (
                          <span className={`score-badge ${getScoreColor(student.moduleScores['force-motion'].percentage)}`}>
                            {student.moduleScores['force-motion'].percentage}%
                          </span>
                        ) : (
                          <span className="no-score">-</span>
                        )}
                      </td>
                      <td>
                        {student.moduleScores['sickle-cell'] ? (
                          <span className={`score-badge ${getScoreColor(student.moduleScores['sickle-cell'].percentage)}`}>
                            {student.moduleScores['sickle-cell'].percentage}%
                          </span>
                        ) : (
                          <span className="no-score">-</span>
                        )}
                      </td>
                      <td>
                        {student.moduleScores['fixing'] ? (
                          <span className={`score-badge ${getScoreColor(student.moduleScores['fixing'].percentage)}`}>
                            {student.moduleScores['fixing'].percentage}%
                          </span>
                        ) : (
                          <span className="no-score">-</span>
                        )}
                      </td>
                      <td>
                        <Link 
                          to={`/teacher/student-report/${student.studentId}`} 
                          className="btn btn-icon"
                          title="View Details"
                        >
                          <FiEye />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TeacherReports;
