import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Companion Agent
import CompanionAgent from './components/agent/CompanionAgent';
import { setOpenCompetitionCallback } from './components/agent/runner';

// Quiz Competition
import QuizCompetition from './components/competition/QuizCompetition';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import GamePlay from './pages/GamePlay';
import KnowledgeMap from './pages/KnowledgeMap';
import Leaderboard from './pages/Leaderboard';
import WordGameScores from './pages/WordGameScores';

// Auth Pages
import PingAuthRedirect from './pages/auth/PingAuthRedirect';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import StudentAchievements from './pages/student/Achievements';
import StudentHistory from './pages/student/GameHistory';
import StudentFriends from './pages/student/Friends';
import Chat from './pages/student/Chat';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudents from './pages/teacher/StudentList';
import TeacherReports from './pages/teacher/TeacherReports';
import StudentReport from './pages/teacher/StudentReport';
import AnswerConfig from './pages/teacher/AnswerConfig';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(false);

  // Set up the callback for the agent to open competition
  useEffect(() => {
    setOpenCompetitionCallback(() => {
      setIsCompetitionOpen(true);
    });
    
    return () => {
      setOpenCompetitionCallback(null);
    };
  }, []);

  const handleCloseCompetition = () => {
    setIsCompetitionOpen(false);
  };

  return (
    <>
      <CompanionAgent />
      <QuizCompetition 
        isOpen={isCompetitionOpen} 
        onClose={handleCloseCompetition} 
      />
      <Routes>
        {/* Public Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:slug" element={<GameDetail />} />
        <Route path="/games/:slug/play" element={<GamePlay />} />
        <Route path="/knowledge-map" element={<KnowledgeMap />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/wordgame-scores" element={<WordGameScores />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PingAuthRedirect mode="login" />} />
        <Route path="/register" element={<PingAuthRedirect mode="register" />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="achievements" element={<StudentAchievements />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="friends" element={<StudentFriends />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:roomId" element={<Chat />} />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="reports" element={<TeacherReports />} />
        <Route path="student-report/:studentId" element={<StudentReport />} />
        <Route path="answer-config" element={<AnswerConfig />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
