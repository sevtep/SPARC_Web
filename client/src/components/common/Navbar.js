import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiUser, FiLogOut } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  const navLinks = [
    { to: '/', label: 'Home', end: true, agentId: 'nav_home' },
    { to: '/games', label: 'Games', agentId: 'nav_games' },
    { to: '/knowledge-map', label: 'Knowledge Map', agentId: 'nav_knowledge' },
    { to: '/leaderboard', label: 'Rankings', agentId: 'nav_rankings' },
    { to: '/about', label: 'About', agentId: 'nav_about' },
  ];

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text text-gradient">SPARC</span>
          <span className="logo-tagline">Learning Through Play</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-links">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              data-agent-id={link.agentId}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Auth Section */}
        <div className="navbar-auth">
          {isAuthenticated ? (
            <div className="user-menu-wrapper">
              <button 
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div 
                  className="avatar avatar-sm"
                  style={{ background: user?.profile?.avatarColor || 'var(--gradient-primary)' }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user?.username}</span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    className="user-menu"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="user-menu-header">
                      <span className="user-menu-role badge badge-primary">{user?.role}</span>
                    </div>
                    <Link to={getDashboardLink()} className="user-menu-item">
                      <FiUser />
                      <span>Dashboard</span>
                    </Link>
                    <button className="user-menu-item" onClick={logout}>
                      <FiLogOut />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="auth-buttons">
              <a href="https://ping.agaii.org/?auth=login&return=https%3A%2F%2Fgame.agaii.org" className="btn btn-ghost" data-agent-id="btn_login">Login</a>
              <a href="https://ping.agaii.org/?auth=register&return=https%3A%2F%2Fgame.agaii.org" className="btn btn-primary" data-agent-id="btn_register">Get Started</a>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                data-agent-id={`mobile_${link.agentId}`}
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
            {!isAuthenticated && (
              <div className="mobile-auth">
                <a href="https://ping.agaii.org/?auth=login&return=https%3A%2F%2Fgame.agaii.org" className="btn btn-secondary">Login</a>
                <a href="https://ping.agaii.org/?auth=register&return=https%3A%2F%2Fgame.agaii.org" className="btn btn-primary">Get Started</a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
