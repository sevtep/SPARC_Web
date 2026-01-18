import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiMail, FiHeart } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="text-gradient">SPARC</span>
            </Link>
            <p className="footer-description">
              Empowering K12 students to learn biology and physics through 
              immersive gamification. Explore the human body like never before!
            </p>
            <div className="footer-social">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <FiGithub />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <FiTwitter />
              </a>
              <a href="mailto:contact@sparc.edu">
                <FiMail />
              </a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <Link to="/games">Games</Link>
              <Link to="/knowledge-map">Knowledge Map</Link>
              <Link to="/leaderboard">Leaderboard</Link>
              <Link to="/about">About Us</Link>
            </div>

            <div className="footer-column">
              <h4>Resources</h4>
              <Link to="/about">For Students</Link>
              <Link to="/about">For Teachers</Link>
              <Link to="/about">Documentation</Link>
              <Link to="/about">FAQ</Link>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <Link to="/about">Privacy Policy</Link>
              <Link to="/about">Terms of Service</Link>
              <Link to="/about">Cookie Policy</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} SPARC. All rights reserved.
          </p>
          <p className="footer-made">
            Made with <FiHeart className="heart-icon" /> for learners everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
