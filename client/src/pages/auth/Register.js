import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBook, FiHome } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    school: '',
    course: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      school: formData.school,
      course: formData.course
    });

    if (result.success) {
      const userRole = result.user?.role || 'student';
      switch (userRole) {
        case 'admin':
          navigate('/admin');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        default:
          navigate('/student');
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const roles = [
    { value: 'student', label: 'Student', icon: '🎮', desc: 'Play games and learn' },
    { value: 'teacher', label: 'Teacher', icon: '👨‍🏫', desc: 'Monitor student progress' }
  ];

  return (
    <div className="auth-page register-page">
      <div className="auth-title">
        <h2>Join SPARC</h2>
        <p>Create your account and start learning</p>
      </div>

      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="form-input"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">I am a...</label>
              <div className="role-selector">
                {roles.map(role => (
                  <div
                    key={role.value}
                    className={`role-option ${formData.role === role.value ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                  >
                    <span className="role-icon">{role.icon}</span>
                    <span className="role-label">{role.label}</span>
                    <span className="role-desc">{role.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleNextStep}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="password-strength">
                <div 
                  className={`strength-bar ${
                    formData.password.length >= 8 ? 'strong' :
                    formData.password.length >= 6 ? 'medium' : 'weak'
                  }`}
                  style={{ 
                    width: `${Math.min(formData.password.length * 10, 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className={`password-match ${
                  formData.password === formData.confirmPassword ? 'match' : 'no-match'
                }`}>
                  {formData.password === formData.confirmPassword 
                    ? '✓ Passwords match' 
                    : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="school">School</label>
              <div className="input-with-icon">
                <FiHome className="input-icon" />
                <input
                  type="text"
                  id="school"
                  name="school"
                  className="form-input"
                  placeholder="Enter your school name"
                  value={formData.school}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="course">Course</label>
              <div className="input-with-icon">
                <FiBook className="input-icon" />
                <input
                  type="text"
                  id="course"
                  name="course"
                  className="form-input"
                  placeholder="Enter your course name"
                  value={formData.course}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="auth-switch">
        Already have an account?
        <Link to="/login">Sign In</Link>
      </div>

      <style jsx="true">{`
        .register-page .auth-form {
          min-height: 300px;
        }
        
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }
        
        .step {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }
        
        .step.active {
          background: var(--primary);
          border-color: var(--primary);
          color: var(--bg-dark);
        }
        
        .step-line {
          width: 60px;
          height: 2px;
          background: var(--border);
        }
        
        .input-with-icon {
          position: relative;
        }
        
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        
        .input-with-icon .form-input {
          padding-left: 2.75rem;
          padding-right: 2.75rem;
        }
        
        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        
        .password-toggle:hover {
          color: var(--text-secondary);
        }
        
        .role-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .role-option {
          padding: 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
        }
        
        .role-option:hover {
          border-color: var(--primary);
        }
        
        .role-option.selected {
          border-color: var(--primary);
          background: rgba(0, 212, 255, 0.1);
        }
        
        .role-icon {
          display: block;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .role-label {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        
        .role-desc {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .password-strength {
          height: 4px;
          background: var(--bg-secondary);
          border-radius: 2px;
          margin-top: 0.5rem;
          overflow: hidden;
        }
        
        .strength-bar {
          height: 100%;
          border-radius: 2px;
          transition: all 0.3s ease;
        }
        
        .strength-bar.weak {
          background: var(--error);
        }
        
        .strength-bar.medium {
          background: #FFA500;
        }
        
        .strength-bar.strong {
          background: var(--success);
        }
        
        .password-match {
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }
        
        .password-match.match {
          color: var(--success);
        }
        
        .password-match.no-match {
          color: var(--error);
        }
        
        .form-actions {
          display: flex;
          gap: 1rem;
        }
        
        .form-actions .btn {
          flex: 1;
        }
        
        .btn-secondary {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          color: var(--text-primary);
        }
        
        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }
      `}</style>
    </div>
  );
};

export default Register;
