# SPARC - K12 Educational Gaming Platform

![SPARC Logo](./client/public/logo.png)

SPARC (Students Playing And Really Circulating) is an innovative K12 educational gaming platform that teaches biology and physics concepts through immersive gamification experiences. Students "shrink down" and enter the human body to learn about blood circulation and other biological processes firsthand.

## 🌟 Features

### For Students
- 🎮 Interactive educational games with Unity WebGL integration
- 📊 Personal dashboard with learning progress tracking
- 🏆 Achievement system with badges and rewards
- 📈 Knowledge map showing learning progress
- 💬 Real-time chat with classmates
- 👥 Friend system for social learning
- 🏅 Leaderboard for healthy competition

### For Teachers
- 📋 Student management and monitoring
- 📊 Detailed progress reports and analytics
- 📈 Class performance visualization
- 🎯 Individual student insights

### For Administrators
- 👤 Complete user management
- ⚙️ System settings configuration
- 📊 Platform-wide analytics
- 🔐 Role and permission management

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router v6** - Client-side routing
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Icons** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## 📁 Project Structure

```
SPARC Web/
├── client/                    # React frontend
│   ├── public/               # Static assets
│   └── src/
│       ├── components/       # Reusable components
│       │   └── common/       # Common UI components
│       ├── context/          # React context providers
│       ├── layouts/          # Page layouts
│       ├── pages/            # Page components
│       │   ├── admin/        # Admin dashboard pages
│       │   ├── auth/         # Login/Register pages
│       │   ├── student/      # Student dashboard pages
│       │   └── teacher/      # Teacher dashboard pages
│       └── services/         # API and socket services
│
├── server/                    # Node.js backend
│   ├── middleware/           # Express middleware
│   ├── models/               # Mongoose models
│   ├── routes/               # API routes
│   ├── seeds/                # Database seeding
│   └── sockets/              # Socket.io handlers
│
└── package.json              # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sparc-web.git
   cd sparc-web
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/sparc

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d

   # Server
   PORT=5000
   NODE_ENV=development

   # Client URL (for CORS)
   CLIENT_URL=http://localhost:3000
   ```

4. **Seed the database (optional)**
   ```bash
   cd server
   npm run seed
   ```

5. **Run the application**
   
   Development mode (runs both server and client):
   ```bash
   # From root directory
   npm run dev
   ```
   
   Or run separately:
   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev

   # Terminal 2 - Client
   cd client
   npm start
   ```

6. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users (admin) |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (admin) |

### Games
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | Get all game modules |
| GET | `/api/games/:slug` | Get game by slug |
| POST | `/api/games` | Create game (admin) |
| POST | `/api/games/:id/session` | Start game session |
| PUT | `/api/games/session/:id` | Update game session |

### Achievements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/achievements` | Get all achievements |
| GET | `/api/achievements/user` | Get user achievements |
| POST | `/api/achievements/:id/unlock` | Unlock achievement |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | Get friends list |
| POST | `/api/friends/request/:userId` | Send friend request |
| PUT | `/api/friends/accept/:requestId` | Accept friend request |
| DELETE | `/api/friends/:friendId` | Remove friend |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/rooms` | Get user's chat rooms |
| POST | `/api/chat/rooms` | Create chat room |
| GET | `/api/chat/rooms/:id/messages` | Get messages |

## 🎮 Unity WebGL Integration

To integrate Unity games:

1. Build your Unity game for WebGL
2. Place the build files in `client/public/games/{game-slug}/`
3. Update the game module in the database with the correct path

Example embedding:
```jsx
<iframe
  src="/games/blood-circulation/index.html"
  width="100%"
  height="600px"
  frameBorder="0"
  title="Blood Circulation Game"
/>
```

## 🎨 Design System

### Colors
- **Primary**: #00D4FF (Cyan)
- **Secondary**: #FF00FF (Magenta)
- **Accent**: #00FF88 (Green)
- **Background Dark**: #0A0A1A
- **Background Secondary**: #12122A

### Fonts
- Primary: 'Orbitron' (headings)
- Secondary: 'Rajdhani' (body)

## 🔒 User Roles

| Role | Access |
|------|--------|
| Student | Personal dashboard, games, achievements, chat, friends |
| Teacher | Student monitoring, reports, analytics |
| Admin | Full access, user management, system settings |

## 📦 Available Scripts

### Root
- `npm run dev` - Run both server and client
- `npm run server` - Run server only
- `npm run client` - Run client only

### Server
- `npm run dev` - Run with nodemon
- `npm start` - Run production
- `npm run seed` - Seed database

### Client
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Unity Technologies for WebGL support
- All the amazing open-source libraries used in this project
- The K12 educators who inspired this platform

---

**SPARC** - Making learning an adventure! 🚀
