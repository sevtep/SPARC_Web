import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSettings, FiSave, FiRefreshCw, FiDatabase,
  FiMail, FiShield, FiGlobe, FiMonitor, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import './SystemSettings.css';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'SPARC Learning Platform',
      siteDescription: 'K12 Educational Gaming Platform',
      maintenanceMode: false,
      allowRegistration: true,
      requireEmailVerification: true,
      defaultUserRole: 'student'
    },
    email: {
      smtpHost: 'smtp.example.com',
      smtpPort: '587',
      smtpUser: 'noreply@sparc.edu',
      smtpPassword: '********',
      fromName: 'SPARC Learning',
      fromEmail: 'noreply@sparc.edu'
    },
    security: {
      passwordMinLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      sessionTimeout: 60,
      maxLoginAttempts: 5
    },
    game: {
      allowGuestPlay: false,
      autoSaveProgress: true,
      saveInterval: 30,
      showLeaderboard: true,
      enableAchievements: true,
      enableChat: true
    }
  });

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleToggle = (category, field) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Simulated save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <FiGlobe /> },
    { id: 'email', label: 'Email', icon: <FiMail /> },
    { id: 'security', label: 'Security', icon: <FiShield /> },
    { id: 'game', label: 'Game Settings', icon: <FiMonitor /> }
  ];

  const Toggle = ({ value, onChange }) => (
    <button 
      className={`toggle-btn ${value ? 'active' : ''}`}
      onClick={onChange}
      type="button"
    >
      {value ? <FiToggleRight /> : <FiToggleLeft />}
    </button>
  );

  return (
    <div className="system-settings-page">
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiSettings /> System Settings</h1>
          <p>Configure platform settings and preferences</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline">
            <FiRefreshCw /> Reset to Defaults
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : <><FiSave /> Save Changes</>}
          </button>
        </div>
      </motion.div>

      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-layout">
        {/* Tabs */}
        <motion.aside 
          className="settings-tabs"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </motion.aside>

        {/* Settings Content */}
        <motion.main 
          className="settings-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="setting-group">
                <label className="setting-label">Site Name</label>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.general.siteName}
                  onChange={(e) => handleChange('general', 'siteName', e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">Site Description</label>
                <textarea
                  className="setting-textarea"
                  value={settings.general.siteDescription}
                  onChange={(e) => handleChange('general', 'siteDescription', e.target.value)}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Maintenance Mode</label>
                  <p className="setting-desc">Disable access for non-admin users</p>
                </div>
                <Toggle 
                  value={settings.general.maintenanceMode}
                  onChange={() => handleToggle('general', 'maintenanceMode')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Allow Registration</label>
                  <p className="setting-desc">Allow new users to register</p>
                </div>
                <Toggle 
                  value={settings.general.allowRegistration}
                  onChange={() => handleToggle('general', 'allowRegistration')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Require Email Verification</label>
                  <p className="setting-desc">Users must verify email before accessing</p>
                </div>
                <Toggle 
                  value={settings.general.requireEmailVerification}
                  onChange={() => handleToggle('general', 'requireEmailVerification')}
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">Default User Role</label>
                <select
                  className="setting-select"
                  value={settings.general.defaultUserRole}
                  onChange={(e) => handleChange('general', 'defaultUserRole', e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher (Requires Approval)</option>
                </select>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="settings-section">
              <h2>Email Settings</h2>
              
              <div className="setting-row">
                <div className="setting-group">
                  <label className="setting-label">SMTP Host</label>
                  <input
                    type="text"
                    className="setting-input"
                    value={settings.email.smtpHost}
                    onChange={(e) => handleChange('email', 'smtpHost', e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">SMTP Port</label>
                  <input
                    type="text"
                    className="setting-input"
                    value={settings.email.smtpPort}
                    onChange={(e) => handleChange('email', 'smtpPort', e.target.value)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-group">
                  <label className="setting-label">SMTP Username</label>
                  <input
                    type="text"
                    className="setting-input"
                    value={settings.email.smtpUser}
                    onChange={(e) => handleChange('email', 'smtpUser', e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">SMTP Password</label>
                  <input
                    type="password"
                    className="setting-input"
                    value={settings.email.smtpPassword}
                    onChange={(e) => handleChange('email', 'smtpPassword', e.target.value)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-group">
                  <label className="setting-label">From Name</label>
                  <input
                    type="text"
                    className="setting-input"
                    value={settings.email.fromName}
                    onChange={(e) => handleChange('email', 'fromName', e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">From Email</label>
                  <input
                    type="email"
                    className="setting-input"
                    value={settings.email.fromEmail}
                    onChange={(e) => handleChange('email', 'fromEmail', e.target.value)}
                  />
                </div>
              </div>

              <button className="btn btn-outline test-btn">
                <FiMail /> Send Test Email
              </button>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>

              <div className="setting-group">
                <label className="setting-label">Minimum Password Length</label>
                <input
                  type="number"
                  className="setting-input small"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => handleChange('security', 'passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="32"
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Require Uppercase Letters</label>
                  <p className="setting-desc">Password must contain uppercase letters</p>
                </div>
                <Toggle 
                  value={settings.security.requireUppercase}
                  onChange={() => handleToggle('security', 'requireUppercase')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Require Numbers</label>
                  <p className="setting-desc">Password must contain numbers</p>
                </div>
                <Toggle 
                  value={settings.security.requireNumbers}
                  onChange={() => handleToggle('security', 'requireNumbers')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Require Special Characters</label>
                  <p className="setting-desc">Password must contain special characters</p>
                </div>
                <Toggle 
                  value={settings.security.requireSpecialChars}
                  onChange={() => handleToggle('security', 'requireSpecialChars')}
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">Session Timeout (minutes)</label>
                <input
                  type="number"
                  className="setting-input small"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="480"
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">Max Login Attempts</label>
                <input
                  type="number"
                  className="setting-input small"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => handleChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  min="3"
                  max="10"
                />
              </div>
            </div>
          )}

          {/* Game Settings */}
          {activeTab === 'game' && (
            <div className="settings-section">
              <h2>Game Settings</h2>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Allow Guest Play</label>
                  <p className="setting-desc">Allow users to play without logging in</p>
                </div>
                <Toggle 
                  value={settings.game.allowGuestPlay}
                  onChange={() => handleToggle('game', 'allowGuestPlay')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Auto-Save Progress</label>
                  <p className="setting-desc">Automatically save game progress</p>
                </div>
                <Toggle 
                  value={settings.game.autoSaveProgress}
                  onChange={() => handleToggle('game', 'autoSaveProgress')}
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">Save Interval (seconds)</label>
                <input
                  type="number"
                  className="setting-input small"
                  value={settings.game.saveInterval}
                  onChange={(e) => handleChange('game', 'saveInterval', parseInt(e.target.value))}
                  min="10"
                  max="300"
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Show Leaderboard</label>
                  <p className="setting-desc">Display public leaderboard</p>
                </div>
                <Toggle 
                  value={settings.game.showLeaderboard}
                  onChange={() => handleToggle('game', 'showLeaderboard')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Enable Achievements</label>
                  <p className="setting-desc">Enable achievement system</p>
                </div>
                <Toggle 
                  value={settings.game.enableAchievements}
                  onChange={() => handleToggle('game', 'enableAchievements')}
                />
              </div>

              <div className="setting-group toggle-group">
                <div className="setting-info">
                  <label className="setting-label">Enable Chat</label>
                  <p className="setting-desc">Enable chat functionality</p>
                </div>
                <Toggle 
                  value={settings.game.enableChat}
                  onChange={() => handleToggle('game', 'enableChat')}
                />
              </div>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
};

export default SystemSettings;
