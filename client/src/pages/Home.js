import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiVolume2, FiVolumeX } from 'react-icons/fi';
import './Home.css';

// 世界入口数据 - 5个游戏模块
const worldPortals = [
  {
    id: 'meeting-cells',
    name: 'Meeting Cells',
    subtitle: 'Chapter 1',
    description: 'Meet the citizens of your body - red blood cells, white blood cells, and platelets. Your journey begins here!',
    link: '/games/meeting-cells',
    atmosphere: 'red',
    icon: '🔴',
    unlocked: true,
    isMainStory: true,
    position: { x: 20, y: 40 }
  },
  {
    id: 'thumping-heart',
    name: 'Thumping Heart',
    subtitle: 'Chapter 2',
    description: 'Enter the cardiovascular command center. Feel the rhythm of life as you explore the four chambers.',
    link: '/games/thumping-heart',
    atmosphere: 'pink',
    icon: '🫀',
    unlocked: true,
    isMainStory: true,
    position: { x: 50, y: 40 }
  },
  {
    id: 'need-for-speed',
    name: 'Need for Speed & Oxygen',
    subtitle: 'Chapter 3',
    description: 'Race through blood vessels! Deliver oxygen to cells before time runs out in this thrilling adventure.',
    link: '/games/need-for-speed',
    atmosphere: 'blue',
    icon: '💨',
    unlocked: true,
    isMainStory: true,
    position: { x: 80, y: 40 }
  },
  {
    id: 'cell-detective',
    name: 'Cell Detective',
    subtitle: 'Bonus Mission',
    description: 'Side Quest: Investigate mysteries within the body. Use AI-powered analysis to solve the case of sickle cell disease.',
    link: '/games/cell-detective',
    atmosphere: 'green',
    icon: '🔍',
    unlocked: true,
    isMainStory: false,
    position: { x: 35, y: 75 }
  },
  {
    id: 'cell-rescuer',
    name: 'Cell Rescuer',
    subtitle: 'Bonus Mission',
    description: 'Side Quest: Emergency! Cells are in danger. Join the rescue mission and save lives in this action-packed module.',
    link: '/games/cell-rescuer',
    atmosphere: 'purple',
    icon: '🚑',
    unlocked: true,
    isMainStory: false,
    position: { x: 65, y: 75 }
  }
];

// 漂浮粒子背景 - 优化数量以提高性能
const ParticleField = React.memo(() => {
  const particles = React.useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 3
  })), []);

  return (
    <div className="particle-field">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="ambient-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -80, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
});

// 世界传送门组件
const WorldPortal = ({ portal, isActive, onClick, onHover }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`world-portal ${portal.atmosphere} ${isActive ? 'active' : ''} ${!portal.unlocked ? 'locked' : ''} ${portal.isMainStory ? 'main-story' : 'side-quest'}`}
      style={{
        left: `${portal.position.x}%`,
        top: `${portal.position.y}%`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 + Math.random() * 0.5, type: 'spring' }}
      onMouseEnter={() => { setIsHovered(true); onHover(portal); }}
      onMouseLeave={() => { setIsHovered(false); onHover(null); }}
      onClick={() => portal.unlocked && onClick(portal)}
    >
      {/* 主线标记 */}
      {portal.isMainStory && (
        <motion.div 
          className="main-story-badge"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⭐
        </motion.div>
      )}

      {/* 传送门外层光环 */}
      <motion.div 
        className="portal-aura"
        animate={{
          scale: isHovered ? [1, 1.5, 1.3] : [1, 1.2, 1],
          opacity: isHovered ? [0.4, 0.8, 0.5] : [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* 能量环 */}
      <motion.div 
        className="portal-ring outer"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div 
        className="portal-ring inner"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* 核心图标 */}
      <motion.div 
        className="portal-core"
        animate={{
          scale: isHovered ? 1.3 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <span className="portal-icon">{portal.icon}</span>
      </motion.div>

      {/* 名称标签 */}
      <motion.div 
        className="portal-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0.7 }}
      >
        <span className="label-name">{portal.name}</span>
      </motion.div>

      {/* 浮动粒子 - 减少数量 */}
      <div className="portal-particles">
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            className="p-particle"
            style={{
              left: `${50 + Math.cos(i * 120 * Math.PI / 180) * 35}%`,
              top: `${50 + Math.sin(i * 120 * Math.PI / 180) * 35}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2.5 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* 锁定覆盖 */}
      {!portal.unlocked && (
        <div className="portal-lock">
          <span>🔒</span>
        </div>
      )}
    </motion.div>
  );
};

// 信息面板组件
const InfoPanel = ({ portal, onEnter }) => {
  if (!portal) return null;

  return (
    <motion.div
      className={`info-panel ${portal.atmosphere}`}
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <div className="panel-glow" />
      
      {/* 主线/支线标签 */}
      <div className={`story-type-badge ${portal.isMainStory ? 'main' : 'side'}`}>
        {portal.isMainStory ? '⭐ Main Story' : '🎯 Side Quest'}
      </div>
      
      <div className="info-header">
        <motion.span 
          className="info-icon"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {portal.icon}
        </motion.span>
        <div>
          <h3>{portal.name}</h3>
          <span className="info-subtitle">{portal.subtitle}</span>
        </div>
      </div>
      
      <p className="info-description">{portal.description}</p>
      
      {portal.unlocked ? (
        <motion.button
          className="enter-btn"
          whileHover={{ scale: 1.05, boxShadow: '0 0 30px currentColor' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEnter(portal.link)}
        >
          <span>Enter World</span>
          <FiArrowRight />
          <motion.div 
            className="btn-shimmer"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
          />
        </motion.button>
      ) : (
        <div className="locked-message">
          <span>🔒 Complete previous adventures to unlock</span>
        </div>
      )}
    </motion.div>
  );
};

// 打字机效果
const TypeWriter = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <span className="typewriter-text">{displayedText}<span className="cursor">|</span></span>;
};

// 主页组件
const Home = () => {
  const navigate = useNavigate();
  const [hoveredPortal, setHoveredPortal] = useState(null);
  const [showWorld, setShowWorld] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  // 跳过介绍直接显示世界
  const skipIntro = () => {
    setIntroComplete(true);
    setShowWorld(true);
  };

  // 开始探索
  const startExploring = () => {
    setIntroComplete(true);
    setTimeout(() => setShowWorld(true), 500);
  };

  // 进入传送门
  const enterPortal = (link) => {
    navigate(link);
  };

  return (
    <div className="home-world" ref={containerRef}>
      {/* 背景层 */}
      <motion.div className="world-background" style={{ y: backgroundY }}>
        <div className="bg-gradient-overlay" />
        <ParticleField />
        <div className="grid-overlay" />
        
        {/* 星云效果 */}
        <div className="nebula nebula-1" />
        <div className="nebula nebula-2" />
        <div className="nebula nebula-3" />
      </motion.div>

      {/* 音效控制 */}
      <motion.button 
        className="sound-toggle"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsMuted(!isMuted)}
      >
        {isMuted ? <FiVolumeX /> : <FiVolume2 />}
      </motion.button>

      {/* 介绍序列 */}
      <AnimatePresence>
        {!introComplete && (
          <motion.div 
            className="intro-sequence"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="intro-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div 
                className="intro-logo"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 1.2, bounce: 0.4 }}
              >
                <motion.span 
                  className="logo-spark left"
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [0.8, 1.2, 0.8],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >✨</motion.span>
                <h1 className="logo-text">
                  <span className="letter">S</span>
                  <span className="letter">P</span>
                  <span className="letter">A</span>
                  <span className="letter">R</span>
                  <span className="letter">C</span>
                </h1>
                <motion.span 
                  className="logo-spark right"
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [0.8, 1.2, 0.8],
                    rotate: [360, 180, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >✨</motion.span>
              </motion.div>

              <motion.p 
                className="intro-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <TypeWriter 
                  text="Shrink down. Explore within. Discover the wonders of life."
                  speed={40}
                />
              </motion.p>

              <motion.div 
                className="intro-story"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4 }}
              >
                <p>You are about to embark on an incredible journey...</p>
                <p>A journey where you will shrink down to the size of a cell</p>
                <p>and explore the wonders within the human body.</p>
              </motion.div>

              <motion.div 
                className="intro-actions"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 6 }}
              >
                <motion.button
                  className="btn-explore"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startExploring}
                  data-agent-id="btn_begin_journey"
                >
                  <span className="btn-text">Begin Your Journey</span>
                  <span className="btn-icon">→</span>
                  <motion.div 
                    className="btn-glow"
                    animate={{ 
                      opacity: [0.3, 0.8, 0.3],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>

                <button className="btn-skip" onClick={skipIntro} data-agent-id="btn_skip_intro">
                  Skip Intro →
                </button>
              </motion.div>
            </motion.div>

            {/* 装饰性漂浮元素 */}
            <motion.div 
              className="intro-decoration deco-1"
              animate={{ 
                y: [0, -40, 0],
                rotate: [0, 15, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 6, repeat: Infinity }}
            >🔴</motion.div>
            <motion.div 
              className="intro-decoration deco-2"
              animate={{ 
                y: [0, 30, 0],
                rotate: [0, -20, 0],
                scale: [1, 0.9, 1]
              }}
              transition={{ duration: 5, repeat: Infinity }}
            >🫀</motion.div>
            <motion.div 
              className="intro-decoration deco-3"
              animate={{ 
                y: [0, -25, 0],
                x: [0, 30, 0],
              }}
              transition={{ duration: 7, repeat: Infinity }}
            >🧬</motion.div>
            <motion.div 
              className="intro-decoration deco-4"
              animate={{ 
                y: [0, 35, 0],
                x: [0, -25, 0],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            >⚡</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 世界地图 */}
      <AnimatePresence>
        {showWorld && (
          <motion.div 
            className="world-map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* 世界标题 */}
            <motion.div 
              className="world-header"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <h2 className="world-title">
                <span className="title-decorator">⬡</span>
                <span className="glow-text">The Inner Universe</span>
                <span className="title-decorator">⬡</span>
              </h2>
              <p className="world-subtitle">Hover over a portal to learn more. Click to enter.</p>
            </motion.div>

            {/* 传送门区域 */}
            <div className="portals-container">
              {/* 连接线 */}
              <svg className="portal-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(0,212,255,0)" />
                    <stop offset="50%" stopColor="rgba(0,212,255,0.5)" />
                    <stop offset="100%" stopColor="rgba(0,212,255,0)" />
                  </linearGradient>
                  <linearGradient id="sideLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(168,85,247,0)" />
                    <stop offset="50%" stopColor="rgba(168,85,247,0.4)" />
                    <stop offset="100%" stopColor="rgba(168,85,247,0)" />
                  </linearGradient>
                </defs>
                {/* 主线连接: Meeting Cells → Thumping Heart → Need for Speed */}
                <motion.path 
                  d="M 20 40 L 50 40" 
                  stroke="url(#lineGrad)" 
                  strokeWidth="0.2" 
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1 }}
                />
                <motion.path 
                  d="M 50 40 L 80 40" 
                  stroke="url(#lineGrad)" 
                  strokeWidth="0.2" 
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1.5 }}
                />
                {/* 支线分支: 从主线连接到支线 */}
                <motion.path 
                  d="M 35 40 Q 35 58 35 75" 
                  stroke="url(#sideLineGrad)" 
                  strokeWidth="0.15" 
                  fill="none"
                  strokeDasharray="2 2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 2 }}
                />
                <motion.path 
                  d="M 65 40 Q 65 58 65 75" 
                  stroke="url(#sideLineGrad)" 
                  strokeWidth="0.15" 
                  fill="none"
                  strokeDasharray="2 2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 2.3 }}
                />
                {/* 支线之间的连接 */}
                <motion.path 
                  d="M 35 75 L 65 75" 
                  stroke="url(#sideLineGrad)" 
                  strokeWidth="0.12" 
                  fill="none"
                  strokeDasharray="1 2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 2.6 }}
                />
              </svg>

              {worldPortals.map((portal) => (
                <WorldPortal
                  key={portal.id}
                  portal={portal}
                  isActive={hoveredPortal?.id === portal.id}
                  onClick={(p) => enterPortal(p.link)}
                  onHover={setHoveredPortal}
                />
              ))}
            </div>

            {/* 信息面板 */}
            <AnimatePresence>
              {hoveredPortal && (
                <InfoPanel 
                  portal={hoveredPortal} 
                  onEnter={enterPortal}
                />
              )}
            </AnimatePresence>

            {/* 底部导航 */}
            <motion.div 
              className="world-footer"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              <div className="footer-links">
                <Link to="/about" className="footer-link">
                  <span className="link-icon">📖</span>
                  <span className="link-text">About SPARC</span>
                </Link>
                <Link to="/leaderboard" className="footer-link">
                  <span className="link-icon">🏆</span>
                  <span className="link-text">Hall of Fame</span>
                </Link>
                <a href="https://ping.agaii.org/?auth=register" className="footer-link highlight">
                  <span className="link-icon">🚀</span>
                  <span className="link-text">Join the Adventure</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
