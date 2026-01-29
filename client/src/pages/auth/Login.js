import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Redirect based on role
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

  return (
    <div className="auth-page">
      <div className="auth-title">
        <h2>Welcome Back!</h2>
        <p>Sign in to continue your learning journey</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
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
              data-agent-id="login_email"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="input-with-icon">
            <FiLock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              data-agent-id="login_password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
          data-agent-id="btn_signin"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-switch">
        Don't have an account?
        <Link to="/register" data-agent-id="link_signup">Sign Up</Link>
      </div>

      <style jsx="true">{`
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
      `}</style>
    </div>
  );
};

export default Login;
