import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiEdit2, FiTrash2,
  FiUserPlus, FiUserCheck, FiUserX, FiMoreVertical,
  FiMail, FiShield, FiX
} from 'react-icons/fi';
import api from '../../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Simulated user data
      const mockUsers = [
        { id: 1, username: 'admin_master', email: 'admin@sparc.edu', role: 'admin', avatar: '👑', status: 'active', createdAt: '2024-01-01' },
        { id: 2, username: 'teacher_sarah', email: 'sarah@school.edu', role: 'teacher', avatar: '👨‍🏫', status: 'active', createdAt: '2024-01-05' },
        { id: 3, username: 'teacher_mike', email: 'mike@school.edu', role: 'teacher', avatar: '👩‍🏫', status: 'pending', createdAt: '2024-01-10' },
        { id: 4, username: 'alex_chen', email: 'alex@school.edu', role: 'student', avatar: '🧑‍🔬', status: 'active', createdAt: '2024-01-12' },
        { id: 5, username: 'sarah_lee', email: 'slee@school.edu', role: 'student', avatar: '👩‍🎓', status: 'active', createdAt: '2024-01-13' },
        { id: 6, username: 'mike_j', email: 'mikej@school.edu', role: 'student', avatar: '👨‍🎓', status: 'suspended', createdAt: '2024-01-14' },
        { id: 7, username: 'emma_davis', email: 'emma@school.edu', role: 'student', avatar: '🧬', status: 'active', createdAt: '2024-01-15' },
        { id: 8, username: 'james_wilson', email: 'james@school.edu', role: 'student', avatar: '🔬', status: 'active', createdAt: '2024-01-16' },
        { id: 9, username: 'teacher_lisa', email: 'lisa@school.edu', role: 'teacher', avatar: '👩‍🏫', status: 'active', createdAt: '2024-01-17' },
        { id: 10, username: 'tom_garcia', email: 'tom@school.edu', role: 'student', avatar: '💉', status: 'active', createdAt: '2024-01-18' }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      // await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      // await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      // await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1><FiUsers /> User Management</h1>
          <p>Manage all users and their permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setSelectedUser(null);
          setModalMode('create');
          setShowModal(true);
        }}>
          <FiUserPlus /> Add User
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="user-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stat-pill">
          <span className="stat-value">{userStats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-pill students">
          <span className="stat-value">{userStats.students}</span>
          <span className="stat-label">Students</span>
        </div>
        <div className="stat-pill teachers">
          <span className="stat-value">{userStats.teachers}</span>
          <span className="stat-label">Teachers</span>
        </div>
        <div className="stat-pill admins">
          <span className="stat-value">{userStats.admins}</span>
          <span className="stat-label">Admins</span>
        </div>
        {userStats.pending > 0 && (
          <div className="stat-pill pending">
            <span className="stat-value">{userStats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="filters-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div 
        className="users-table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <td>
                  <div className="user-cell">
                    <span className="user-avatar">{user.avatar}</span>
                    <div className="user-info">
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <select 
                    className={`role-select ${user.role}`}
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select 
                    className={`status-select ${user.status}`}
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td>
                  <span className="join-date">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => handleEditUser(user)}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className="btn-icon" 
                      title="Send Email"
                    >
                      <FiMail />
                    </button>
                    <button 
                      className="btn-icon danger" 
                      title="Delete"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <FiUsers size={48} />
          <h3>No Users Found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div 
            className="modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? 'Add New User' : 
                 modalMode === 'edit' ? 'Edit User' : 'User Details'}
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input"
                  defaultValue={selectedUser?.username}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  defaultValue={selectedUser?.email}
                  placeholder="Enter email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select 
                  className="form-input"
                  defaultValue={selectedUser?.role || 'student'}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {modalMode === 'create' && (
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input 
                    type="password" 
                    className="form-input"
                    placeholder="Enter temporary password"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                {modalMode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
