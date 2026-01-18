import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './FloatingPortal.css';

// 浮动入口组件 - 用于创建炫酷的场景入口
const FloatingPortal = ({ 
  to, 
  icon, 
  emoji,
  title, 
  subtitle, 
  color = '#00D4FF',
  delay = 0,
  size = 'medium',
  particles = true,
  glowIntensity = 'medium',
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const portalRef = useRef(null);

  const handleMouseMove = (e) => {
    if (portalRef.current) {
      const rect = portalRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left - rect.width / 2) / 20,
        y: (e.clientY - rect.top - rect.height / 2) / 20
      });
    }
  };

  const sizeClasses = {
    small: 'portal-small',
    medium: 'portal-medium',
    large: 'portal-large'
  };

  const glowClasses = {
    low: 'glow-low',
    medium: 'glow-medium',
    high: 'glow-high'
  };

  const content = (
    <motion.div
      ref={portalRef}
      className={`floating-portal ${sizeClasses[size]} ${glowClasses[glowIntensity]}`}
      style={{ '--portal-color': color }}
      initial={{ opacity: 0, scale: 0, rotate: -180 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotate: 0,
        x: isHovered ? mousePosition.x : 0,
        y: isHovered ? mousePosition.y : 0
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 200, 
        damping: 15,
        delay: delay * 0.1
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* 背景光晕 */}
      <div className="portal-glow" />
      
      {/* 轨道环 */}
      <div className="portal-orbit orbit-1" />
      <div className="portal-orbit orbit-2" />
      <div className="portal-orbit orbit-3" />
      
      {/* 粒子效果 */}
      {particles && (
        <div className="portal-particles">
          {[...Array(6)].map((_, i) => (
            <motion.span 
              key={i} 
              className="particle"
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2
              }}
              style={{
                left: `${10 + i * 15}%`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* 核心内容 */}
      <div className="portal-core">
        {emoji ? (
          <span className="portal-emoji">{emoji}</span>
        ) : (
          <span className="portal-icon">{icon}</span>
        )}
      </div>
      
      {/* 标题 */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            className="portal-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <span className="portal-title">{title}</span>
            {subtitle && <span className="portal-subtitle">{subtitle}</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点击涟漪效果 */}
      <div className="portal-ripple" />
    </motion.div>
  );

  if (onClick) {
    return <div onClick={onClick} style={{ cursor: 'pointer' }}>{content}</div>;
  }

  return to ? <Link to={to}>{content}</Link> : content;
};

// 浮动场景网格 - 用于展示多个入口
export const FloatingPortalGrid = ({ portals, className = '' }) => {
  return (
    <div className={`floating-portal-grid ${className}`}>
      {portals.map((portal, index) => (
        <FloatingPortal key={index} {...portal} delay={index} />
      ))}
    </div>
  );
};

// 浮动导航球 - 始终跟随鼠标的装饰元素
export const FloatingOrb = ({ color = '#00D4FF' }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      className="floating-orb"
      style={{ '--orb-color': color }}
      animate={{
        x: position.x - 15,
        y: position.y - 15,
        opacity: isVisible ? 0.6 : 0
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
    />
  );
};

export default FloatingPortal;
