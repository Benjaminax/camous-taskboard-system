# Academic City Campus Task Collaboration Board

A modern, full-stack collaborative task management system designed for Academic City University students to manage team projects efficiently.

**Live Demo:** https://benjaminax.github.io/camous-taskboard-system/

**API Server:** https://camous-taskboard-system.onrender.com

---

## 🎯 Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Team Management**: Create teams, generate shareable team codes, and manage team members
- **Task Management**: Create, assign, update, and delete tasks with priorities
- **Dashboard**: Real-time statistics including total tasks, completed, in-progress, and pending tasks
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Academic City University branding with professional colors and typography

### Advanced Features
- **Sidebar Navigation**: Quick access to teams, tasks, and activities
- **Task Filtering**: Filter tasks by status (All, Pending, In Progress, Completed)
- **User Profile Management**: User information in sidebar with quick actions
- **Team Statistics**: Visual dashboard showing team progress and member contributions
- **Analytics Tracking**: Comprehensive event tracking for user behavior and insights

---

## 📊 Analytics Implementation

### Mixpanel Integration

This application uses **Mixpanel** for advanced analytics tracking. Mixpanel provides:

- **Event Tracking**: Tracks user actions like login, registration, team creation, and task management
- **User Profiles**: Maintains detailed user properties for segmentation and personalization
- **Funnel Analysis**: Analyze conversion rates and user workflows
- **Cohort Analysis**: Group users by behavior patterns and attributes
- **Real-time Dashboards**: Monitor user engagement in real-time

### Reference & Documentation
- **GitHub Repository**: [Mixpanel JavaScript SDK](https://github.com/mixpanel/mixpanel-js)
- **Official Docs**: [Mixpanel JavaScript SDK Documentation](https://developer.mixpanel.com/docs/javascript-full-api-reference)

### Tracked Events

The following user actions are automatically tracked:

#### Authentication Events
- `User Registration` - Triggered when a new user registers
  - Properties: email, student_id, full_name
- `User Login` - Triggered on successful login
  - Properties: email, student_id
- `Login Failed` - Triggered on failed login attempt
  - Properties: email
- `User Logout` - Triggered when user logs out
  - Properties: user_id, email

#### Team Events
- `Team Created` - Triggered when a new team is created
  - Properties: team_name, team_id
- `Team Creation Failed` - Triggered on team creation failure
  - Properties: team_name

#### Task Events
- `Task Created` - Triggered when a task is created
  - Properties: task_title, task_id, team_id, priority, status
- `Task Updated` - Triggered when a task is modified
  - Properties: task_title, task_id, status, priority
- `Task Deleted` - Triggered when a task is deleted
  - Properties: task_id
- `Task Creation Failed` - Triggered on task creation failure
  - Properties: task_title

### Setup Instructions

1. **Obtain Mixpanel Token**:
   - Sign up at [Mixpanel.com](https://mixpanel.com)
   - Create a new project
   - Copy your project token

2. **Configure Token**:
   - Store the token in `localStorage` with key `MIXPANEL_TOKEN`
   - Or set it as an environment variable
   - The frontend will initialize Mixpanel when the token is available

3. **View Analytics**:
   - Log in to your Mixpanel dashboard
   - Navigate to "Events" to see tracked user actions
   - Use "Funnels" to analyze user workflows
   - Create custom reports and dashboards

### Implementation Example

```javascript
// Initialize Mixpanel (automatically done in the app)
mixpanel.init(token);

// Track a custom event
trackAnalytics('User Login', {
    email: userEmail,
    student_id: studentId
});

// Set user properties
mixpanel.identify(userId);
mixpanel.people.set({
    "$name": userName,
    "$email": userEmail
});
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with bcryptjs
- **Hosting**: Render.com
- **CORS**: Enabled for frontend integration

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Flexbox, Grid, and animations
- **JavaScript**: Vanilla ES6+
- **Analytics**: Mixpanel JavaScript SDK
- **Fonts**: Google Fonts (Montserrat)
- **Icons**: Font Awesome 6.4.0
- **Hosting**: GitHub Pages

### Design System
- **Colors**:
  - Primary: #CC3634 (Academic City Red)
  - Secondary: #575656 (Gray)
  - Accent: #B2B2B2 (Light Gray)
- **Typography**: Montserrat (400, 500, 600, 700 weights)
- **Layout**: Mobile-first responsive design

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- PostgreSQL database
- Git

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/benjaminax/camous-taskboard-system.git
   cd camous-taskboard-system/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file**:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database_name
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   NODE_ENV=production
   ```

4. **Run database migrations** (if applicable):
   ```bash
   npm run migrate
   ```

5. **Start the server**:
   ```bash
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Configure API endpoint** (if different from deployed):
   - Edit `script.js` line 1:
   ```javascript
   const API_BASE_URL = 'https://your-api-url/api';
   ```

3. **Set Mixpanel Token** (optional):
   - Store in browser's localStorage or set as environment variable
   - Key: `MIXPANEL_TOKEN`

4. **Serve locally**:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js http-server
   npx http-server .
   ```

### Deployment

#### Backend (Render)
1. Push code to GitHub
2. Connect Render to your repository
3. Set environment variables in Render dashboard
4. Deploy

#### Frontend (GitHub Pages)
1. Update `API_BASE_URL` in `script.js`
2. Commit and push to GitHub
3. Enable GitHub Pages in repository settings
4. Select "Deploy from branch" -> "main"

---

## 📝 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Teams
- `GET /api/user/teams` - Get user's teams
- `POST /api/teams` - Create new team
- `POST /api/teams/join` - Join team by code
- `GET /api/teams/:id/members` - Get team members
- `GET /api/teams/:id/dashboard` - Get team dashboard stats
- `GET /api/teams/:id/tasks` - Get team tasks

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get all tasks
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

---

## 📱 Features in Detail

### User Authentication
- Secure password hashing with bcryptjs
- JWT-based session management
- Automatic token validation on page load
- Logout with secure token removal

### Team Management
- Create unlimited teams
- Generate unique team codes for sharing
- Invite team members via code
- View all team members and their statistics
- Team-based task isolation

### Task Management
- Create tasks with title, description, and priority
- Assign tasks to team members
- Set due dates
- Track task status (Pending, In Progress, Completed)
- Update and delete tasks
- Filter tasks by status

### Dashboard
- Real-time team statistics
- Member activity overview
- Task distribution visualization
- Quick actions for common tasks
- Responsive sidebar navigation

---

## 🔐 Security

- JWT tokens for authentication
- Password hashing with bcryptjs
- CORS configuration for secure API access
- Authorization headers on all API requests
- Environment variables for sensitive data
- Token validation on protected routes

---

## 📋 Project Structure

```
camous-taskboard-system/
├── backend/
│   ├── server.js           # Main Express server
│   ├── package.json        # Dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── style.css          # Styles with sidebar
│   ├── script.js          # Application logic with analytics
│   └── package.json       # Frontend dependencies
├── index.html             # Root HTML (GitHub Pages)
├── style.css              # Root styles
├── script.js              # Root JavaScript
└── README.md              # This file
```

---

## 🐛 Troubleshooting

### "Cannot connect to API"
- Check backend server is running
- Verify `API_BASE_URL` in script.js matches your backend
- Check browser console for CORS errors

### "Login fails with network error"
- Ensure JWT_SECRET is set in backend .env
- Check database connection string
- Verify PostgreSQL is running

### "Analytics not tracking"
- Set MIXPANEL_TOKEN in localStorage
- Check browser console for Mixpanel errors
- Verify token is valid in Mixpanel dashboard

### "Tasks not loading"
- Verify you're logged in (token in localStorage)
- Check team ID is correct
- Verify database has task records

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👥 Author

**Benjamin Amoah**
- GitHub: [@benjaminax](https://github.com/benjaminax)
- Repository: [camous-taskboard-system](https://github.com/benjaminax/camous-taskboard-system)

---

## 🎓 Academic Context

Built for Academic City University as a capstone project to demonstrate:
- Full-stack web development
- Database design and management
- API development with Node.js/Express
- Frontend design and user experience
- Analytics integration
- Project management and collaboration

---

## 📞 Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Contact: [Your Contact Information]
- Email: [Your Email]

---

## 🙏 Acknowledgments

- Mixpanel for analytics infrastructure
- Font Awesome for icons
- Google Fonts for typography
- Academic City University for project requirements
- Open source community for tools and libraries

---

**Last Updated**: December 2024
**Version**: 1.0.0
