import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, FiUser, FiAward, FiClock, FiUsers, FiMessageCircle,
  FiBarChart2, FiFileText, FiSettings, FiLogOut, FiMenu, FiX
} from 'react-icons/fi';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'student':
        return [
          { to: '/student', icon: <FiHome />, label: 'Dashboard', end: true },
          { to: '/student/profile', icon: <FiUser />, label: 'Profile' },
          { to: '/student/achievements', icon: <FiAward />, label: 'Achievements' },
          { to: '/student/history', icon: <FiClock />, label: 'Game History' },
          { to: '/student/friends', icon: <FiUsers />, label: 'Friends' },
          { to: '/student/chat', icon: <FiMessageCircle />, label: 'Chat' },
        ];
      case 'teacher':
        return [
          { to: '/teacher', icon: <FiHome />, label: 'Dashboard', end: true },
          { to: '/teacher/students', icon: <FiUsers />, label: 'My Students' },
          { to: '/teacher/reports', icon: <FiFileText />, label: 'Reports' },
        ];
      case 'admin':
        return [
          { to: '/admin', icon: <FiHome />, label: 'Dashboard', end: true },
          { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="dashboard-layout">
      {/* Mobile Header */}
      <header className="dashboard-mobile-header">
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>
        <span className="mobile-logo text-gradient">SPARC</span>
      </header>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo">
            <span className="text-gradient">SPARC</span>
          </NavLink>
          <span className="sidebar-role badge badge-primary">{user?.role}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div 
              className="avatar"
              style={{ background: user?.profile?.avatarColor || 'var(--gradient-primary)' }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{user?.username}</span>
              <span className="sidebar-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
