import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiCheck, FiHome, FiBook } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AnswerConfig.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AnswerConfig = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form states
  const [selectedModule, setSelectedModule] = useState('meeting-cells');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('');
  const [existingConfigs, setExistingConfigs] = useState([]);
  
  // Answers for 5 questions
  const [answers, setAnswers] = useState([
    { correctAnswer: '', isMultipleChoice: false, points: 20 },
    { correctAnswer: '', isMultipleChoice: false, points: 20 },
    { correctAnswer: '', isMultipleChoice: false, points: 20 },
    { correctAnswer: '', isMultipleChoice: false, points: 20 },
    { correctAnswer: '', isMultipleChoice: false, points: 20 }
  ]);

  const modules = [
    { value: 'meeting-cells', label: 'Meeting Cells', description: 'Learn about cell biology and blood circulation' },
    { value: 'force-motion', label: 'Force & Motion', description: 'Explore physics concepts of force and motion' },
    { value: 'sickle-cell', label: 'Sickle Cell', description: 'Understand sickle cell disease and genetics' },
    { value: 'fixing', label: 'Fixing', description: 'Problem-solving and repair scenarios' }
  ];

  // Fetch existing configurations
  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/teacher-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExistingConfigs(res.data.data || []);
      } catch (err) {
        console.error('Error fetching configs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, [token]);

  // Load existing config when module/school/course changes
  useEffect(() => {
    const existingConfig = existingConfigs.find(
      c => c.module === selectedModule && c.school === school && c.course === course
    );
    
    if (existingConfig) {
      setAnswers(existingConfig.correctAnswers.map(a => ({
        correctAnswer: a.correctAnswer,
        isMultipleChoice: a.isMultipleChoice,
        points: a.points
      })));
    } else {
      // Reset to default
      setAnswers([
        { correctAnswer: '', isMultipleChoice: false, points: 20 },
        { correctAnswer: '', isMultipleChoice: false, points: 20 },
        { correctAnswer: '', isMultipleChoice: false, points: 20 },
        { correctAnswer: '', isMultipleChoice: false, points: 20 },
        { correctAnswer: '', isMultipleChoice: false, points: 20 }
      ]);
    }
  }, [selectedModule, school, course, existingConfigs]);

  const handleAnswerChange = (index, field, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
  };

  const handleSave = async () => {
    // Validate
    const emptyAnswers = answers.filter(a => !a.correctAnswer.trim());
    if (emptyAnswers.length > 0) {
      setMessage({ type: 'error', text: 'Please fill in all 5 correct answers' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(
        `${API_URL}/teacher-config`,
        {
          school,
          course,
          module: selectedModule,
          correctAnswers: answers
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: 'Answer configuration saved successfully!' });
      
      // Refresh configs
      const res = await axios.get(`${API_URL}/teacher-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExistingConfigs(res.data.data || []);
    } catch (err) {
      console.error('Error saving config:', err);
      setMessage({ type: 'error', text: 'Failed to save configuration. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await axios.delete(`${API_URL}/teacher-config/${configId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setExistingConfigs(existingConfigs.filter(c => c._id !== configId));
      setMessage({ type: 'success', text: 'Configuration deleted.' });
    } catch (err) {
      console.error('Error deleting config:', err);
      setMessage({ type: 'error', text: 'Failed to delete configuration.' });
    }
  };

  return (
    <div className="answer-config-page">
      <div className="container">
        <Link to="/teacher/reports" className="back-link">
          <FiArrowLeft /> Back to Reports
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="config-header"
        >
          <h1>Answer Configuration</h1>
          <p>Set up correct answers for each module to grade student responses</p>
        </motion.div>

        {/* Existing Configurations */}
        {existingConfigs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="existing-configs"
          >
            <h2>Your Configurations</h2>
            <div className="configs-grid">
              {existingConfigs.map(config => (
                <div key={config._id} className="config-card">
                  <div className="config-info">
                    <span className="config-module">
                      {modules.find(m => m.value === config.module)?.label || config.module}
                    </span>
                    {config.school && <span><FiHome /> {config.school}</span>}
                    {config.course && <span><FiBook /> {config.course}</span>}
                  </div>
                  <div className="config-actions">
                    <button
                      className="btn-load"
                      onClick={() => {
                        setSelectedModule(config.module);
                        setSchool(config.school);
                        setCourse(config.course);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteConfig(config._id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Configuration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="config-form"
        >
          <h2>Configure Module</h2>

          {/* Module Selection */}
          <div className="form-section">
            <label>Select Module</label>
            <div className="module-selector">
              {modules.map(mod => (
                <div
                  key={mod.value}
                  className={`module-option ${selectedModule === mod.value ? 'selected' : ''}`}
                  onClick={() => setSelectedModule(mod.value)}
                >
                  <span className="module-name">{mod.label}</span>
                  <span className="module-desc">{mod.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* School & Course (Optional) */}
          <div className="form-row">
            <div className="form-group">
              <label><FiHome /> School (Optional)</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Enter school name for specific class"
              />
            </div>
            <div className="form-group">
              <label><FiBook /> Course (Optional)</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Enter course name for specific class"
              />
            </div>
          </div>

          {/* Answers Section */}
          <div className="form-section">
            <label>Correct Answers (5 Questions)</label>
            <div className="answers-list">
              {answers.map((answer, index) => (
                <div key={index} className="answer-row">
                  <span className="question-number">Q{index + 1}</span>
                  <input
                    type="text"
                    value={answer.correctAnswer}
                    onChange={(e) => handleAnswerChange(index, 'correctAnswer', e.target.value)}
                    placeholder={`Enter correct answer for question ${index + 1}`}
                    className="answer-input"
                  />
                  <div className="answer-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={answer.isMultipleChoice}
                        onChange={(e) => handleAnswerChange(index, 'isMultipleChoice', e.target.checked)}
                      />
                      Multiple Choice
                    </label>
                    <div className="points-input">
                      <input
                        type="number"
                        value={answer.points}
                        onChange={(e) => handleAnswerChange(index, 'points', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                      <span>pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.type === 'success' && <FiCheck />}
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="form-actions">
            <button
              className="btn btn-primary btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : <><FiSave /> Save Configuration</>}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnswerConfig;
