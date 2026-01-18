import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTarget, FiUsers, FiHeart, FiZap, FiAward, FiGlobe } from 'react-icons/fi';
import './About.css';

const About = () => {
  const values = [
    {
      icon: <FiHeart />,
      title: 'Student-Centered',
      description: 'Every feature is designed with students in mind, making learning engaging and accessible.'
    },
    {
      icon: <FiZap />,
      title: 'Innovation',
      description: 'We leverage cutting-edge technology to create immersive educational experiences.'
    },
    {
      icon: <FiUsers />,
      title: 'Collaboration',
      description: 'Learning together is better. We foster community and peer-to-peer learning.'
    },
    {
      icon: <FiTarget />,
      title: 'Excellence',
      description: 'We strive for the highest quality in content, design, and user experience.'
    }
  ];

  const team = [
    { name: 'Dr. Gina Tang', role: 'Project Lead', emoji: '👩‍🔬' },
    { name: 'Jacob Zhu', role: 'Lead Designer & Developer', emoji: '🎨' },
    { name: 'Yanlai Wu', role: 'Lead Developer', emoji: '👨‍💻' },
    { name: 'Ryan Hare', role: 'Designer & Developer', emoji: '🎮' }
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <motion.div 
            className="about-hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="section-badge">About SPARC</span>
            <h1>
              Systematic Problem-Solving &<br /><span className="text-gradient">Algorithmic Reasoning for Children</span>
            </h1>
            <p>
              SPARC is a narrative-based multiplayer mobile game developed in partnership with 
              Camden City School District and Morgan Village Middle School to address educational 
              equity and enhance STEM learning through immersive, gamified experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission section">
        <div className="container">
          <div className="mission-content">
            <motion.div 
              className="mission-text"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-badge">Our Mission</span>
              <h2>Cultivating <span className="text-gradient">Computational Thinking</span></h2>
              <p>
                SPARC incorporates computational thinking and collaborative strategies into 
                physical and life sciences curricula. Students explore the "engineering" of 
                the human body and solve problems collectively in a context-rich environment.
              </p>
              <p>
                Our goals include reinforcing students' understanding of science concepts, 
                strengthening problem-solving abilities, enhancing computational thinking skills, 
                and increasing motivation and readiness for STEM learning and careers. Students 
                develop a deep understanding of complex concepts while having fun.
              </p>
            </motion.div>
            <motion.div 
              className="mission-visual"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mission-card">
                <div className="mission-emoji">🚀</div>
                <h3>200+</h3>
                <p>Students Learning</p>
              </div>
              <div className="mission-card">
                <div className="mission-emoji">🏫</div>
                <h3>5+</h3>
                <p>Partner Schools</p>
              </div>
              <div className="mission-card">
                <div className="mission-emoji">🎮</div>
                <h3>6</h3>
                <p>Game Modules</p>
              </div>
              <div className="mission-card">
                <div className="mission-emoji">⭐</div>
                <h3>95%</h3>
                <p>Satisfaction Rate</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values section">
        <div className="container">
          <motion.div 
            className="section-header text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-badge">Our Values</span>
            <h2>What Drives <span className="text-gradient">Us</span></h2>
          </motion.div>

          <div className="values-grid">
            {values.map((value, index) => (
              <motion.div
                key={index}
                className="value-card card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-team section">
        <div className="container">
          <motion.div 
            className="section-header text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-badge">Our Team</span>
            <h2>Meet the <span className="text-gradient">Creators</span></h2>
          </motion.div>

          <div className="team-grid">
            {team.map((member, index) => (
              <motion.div
                key={index}
                className="team-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="team-avatar">{member.emoji}</div>
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pilot Photos Section */}
      <section className="about-pilot section">
        <div className="container">
          <motion.div 
            className="section-header text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-badge">In Action</span>
            <h2>SPARC in the <span className="text-gradient">Classroom</span></h2>
            <p>See how students engage with our interactive learning experiences</p>
          </motion.div>

          <div className="pilot-gallery">
            {[1, 2, 3, 4].map((num, index) => (
              <motion.div
                key={num}
                className="pilot-photo"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <img src={`${process.env.PUBLIC_URL}/images/pilot/pilot-${num}.webp`} alt={`Students using SPARC ${num}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta section">
        <div className="container">
          <motion.div 
            className="cta-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <FiGlobe className="cta-icon" />
            <h2>Ready to Join the <span className="text-gradient">Adventure</span>?</h2>
            <p>Start your science learning journey today!</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started Free
              </Link>
              <Link to="/games" className="btn btn-secondary btn-lg">
                Explore Games
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
