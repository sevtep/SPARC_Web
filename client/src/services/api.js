import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://ping.agaii.org/api/sparc';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sparc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sparc_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Check if using PHP API (simple check based on API_URL)
const isPhpApi = API_URL && API_URL.includes('api.php');

console.log('API_URL:', API_URL);
console.log('isPhpApi:', isPhpApi);

// For PHP API, create a separate axios instance that doesn't modify the URL
const phpApi = isPhpApi ? axios.create({
  baseURL: API_URL,
  withCredentials: true
}) : null;

if (phpApi) {
  phpApi.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('sparc_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  );
}

// API Services
export const authService = {
  login: (email, password) => {
    console.log('🔐 authService.login:', { email, isPhpApi, apiUrl: API_URL });
    if (isPhpApi) {
      const params = new URLSearchParams({
        action: 'login',
        email: email,
        password: password
      });
      const fullUrl = `${API_URL}?${params.toString()}`;
      console.log('📤 Request URL:', fullUrl);
      return axios.get(fullUrl)
        .then(response => {
          console.log('✅ Login response:', response.data);
          return response;
        })
        .catch(error => {
          console.error('❌ Login request failed:', error.message);
          console.error('Response:', error.response?.data);
          console.error('Status:', error.response?.status);
          throw error;
        });
    }
    console.log('Using Node.js API for login');
    return api.post('/auth/login', { email, password });
  },
  register: (userData) => {
    console.log('📝 authService.register:', { userData, isPhpApi, apiUrl: API_URL });
    if (isPhpApi) {
      const params = new URLSearchParams({
        action: 'register',
        ...userData
      });
      const fullUrl = `${API_URL}?${params.toString()}`;
      console.log('📤 Request URL:', fullUrl);
      return axios.get(fullUrl)
        .then(response => {
          console.log('✅ Register response:', response.data);
          return response;
        })
        .catch(error => {
          console.error('❌ Register request failed:', error.message);
          console.error('Response:', error.response?.data);
          console.error('Status:', error.response?.status);
          throw error;
        });
    }
    console.log('Using Node.js API for register');
    return api.post('/auth/register', userData);
  },
  getMe: () => {
    if (isPhpApi) {
      return axios.get(`${API_URL}?action=me`);
    }
    return api.get('/auth/me');
  },
  changePassword: (data) => {
    if (isPhpApi) {
      const params = new URLSearchParams({
        action: 'change-password',
        ...data
      });
      return axios.get(`${API_URL}?${params.toString()}`);
    }
    return api.put('/auth/password', data);
  }
};

export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getLeaderboard: (params) => api.get('/users/leaderboard', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getUserHistory: (id, params) => api.get(`/users/${id}/history`, { params }),
  searchUsers: (query) => api.get(`/users/search/${query}`)
};

export const gameService = {
  getAllGames: (params) => api.get('/games', { params }),
  getGame: (slug) => api.get(`/games/${slug}`),
  getKnowledgeMap: () => api.get('/games/knowledge-map'),
  startSession: (data) => api.post('/games/session/start', data),
  updateSession: (id, data) => api.put(`/games/session/${id}`, data),
  getSessionHistory: (params) => api.get('/games/session/history', { params })
};

export const achievementService = {
  getAll: (params) => api.get('/achievements', { params }),
  getMy: () => api.get('/achievements/my'),
  check: () => api.post('/achievements/check')
};

export const friendService = {
  getFriends: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  acceptRequest: (userId) => api.post(`/friends/accept/${userId}`),
  rejectRequest: (userId) => api.post(`/friends/reject/${userId}`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
  blockUser: (userId) => api.post(`/friends/block/${userId}`)
};

export const chatService = {
  getRooms: () => api.get('/chat/rooms'),
  getRoom: (id) => api.get(`/chat/rooms/${id}`),
  createRoom: (data) => api.post('/chat/rooms', data),
  joinRoom: (id) => api.post(`/chat/rooms/${id}/join`),
  leaveRoom: (id) => api.post(`/chat/rooms/${id}/leave`),
  getDirectRoom: (userId) => api.post(`/chat/direct/${userId}`)
};

export const reportService = {
  getStudentReport: (id) => api.get(`/reports/student/${id}`),
  getClassReport: () => api.get('/reports/class'),
  exportReport: (studentId) => api.get(`/reports/export/${studentId}`)
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  restoreUser: (id) => api.post(`/admin/users/${id}/restore`),
  assignTeacher: (data) => api.post('/admin/assign-teacher', data),
  createUser: (data) => api.post('/admin/create-user', data)
};

// Word Game Scores API - 使用同一个后端
export const wordGameService = {
  getStats: async () => {
    try {
      if (isPhpApi) {
        // PHP API: /api.php?action=stats
        const response = await api.get('', { params: { action: 'stats' } });
        return response.data;
      }
      // Node.js API
      const response = await api.get('/wordgame-scores/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { success: false, data: null };
    }
  },
  
  getLeaderboard: async (params = {}) => {
    try {
      if (isPhpApi) {
        // PHP API: /api.php?action=leaderboard&limit=20&scene=...
        const phpParams = { action: 'leaderboard', ...params };
        const response = await api.get('', { params: phpParams });
        // PHP API returns data directly as array, wrap it
        if (Array.isArray(response.data)) {
          return { success: true, data: response.data };
        }
        return response.data;
      }
      // Node.js API
      const response = await api.get('/wordgame-scores/leaderboard', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return { success: false, data: [] };
    }
  },
  
  getScores: async (params = {}) => {
    try {
      if (isPhpApi) {
        // PHP API: /api.php?action=scores&page=1&limit=50&...
        const phpParams = { action: 'scores', ...params };
        const response = await api.get('', { params: phpParams });
        if (response.data && response.data.success) {
          return response.data;
        }
        // If not wrapped in success envelope
        return {
          success: true,
          data: Array.isArray(response.data) ? response.data : [],
          pagination: response.data?.pagination || { total: 0, pages: 1, page: 1 }
        };
      }
      // Node.js API
      const response = await api.get('/wordgame-scores/scores', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching scores:', error);
      return { success: false, data: [], pagination: { total: 0, pages: 1, page: 1 } };
    }
  }
};
