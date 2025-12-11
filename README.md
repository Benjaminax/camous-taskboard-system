# Campus Taskboard System

A collaborative task management platform for Academic City University students to work on group projects.

## Features

- **User Authentication**: Secure login and registration with password confirmation and visibility toggles
- **Team Management**: Create, join, leave, and delete teams with member management
- **Task Management**: Create, assign, update, and delete tasks with priority and due dates
- **Dashboard**: Home dashboard showing user stats and recent tasks
- **Admin Panel**: Admin users can manage all users and teams
- **Responsive UI**: Clean, modern interface optimized for students

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js, PostgreSQL
- **Authentication**: JWT tokens
- **Deployment**: Frontend on GitHub Pages, Backend on Render

## Feature Checklist (Exam Requirements)

### 1. User Registration & Authentication ✅
- Secure user registration and login (students only - @academiccity.edu emails)
- Allow users to create or join a project team (by code or join request)

### 2. Task Management ✅
- Create, assign, update, or delete project tasks
- Display tasks by status (Pending, In Progress, Completed)
- Task filtering and priority management

### 3. Team Dashboard ✅
- Show all team members and their assigned tasks
- Include summary indicators (total tasks, completed count, user stats)
- Team member management and task assignment

### 4. Admin Panel ✅
- Host backend on Render (Node.js + PostgreSQL)
- Host frontend on GitHub Pages and integrate with backend API
- Admin user/team management interface

## Deployment Links

- **Frontend**: https://benjaminax.github.io/camous-taskboard-system/
- **Backend**: https://camous-taskboard-system.onrender.com

## Demo Credentials

- Email: student001@academiccity.edu
- Password: password123

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- PostgreSQL database
- Git

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables. Create a `.env` file with:
   ```
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ADMIN_USER_IDS=optional_comma_separated_user_ids_for_admin_access
   PORT=5000
   ```

4. Ensure your PostgreSQL database has the following tables:
   - `users` (id, student_id, full_name, email, password_hash, is_admin)
   - `teams` (id, team_name, team_code, created_by, description, max_members)
   - `team_members` (team_id, user_id)
   - `join_requests` (id, team_id, user_id, requested_at, status)
   - `tasks` (id, title, description, priority, assigned_to, team_id, created_by, due_date, status, created_at, updated_at)

5. Run the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. The frontend files are in the root directory (`index.html`, `script.js`, `style.css`) and `frontend/` directory.

2. For local development, serve the files using a local server (e.g., Live Server extension in VS Code).

3. Update `API_BASE_URL` in `script.js` to point to your backend URL (e.g., `https://your-render-app.onrender.com`).

### Deployment

- **Frontend**: Deploy to GitHub Pages by pushing to the `main` branch.
- **Backend**: Deploy to Render with the environment variables set.

## Usage

1. Register a new account or login with existing credentials.
2. Create or join a team.
3. Add tasks to your team and assign them to members.
4. Use the Home tab to view your dashboard.
5. Admins can access the Admin panel to manage users and teams.

## Demo Credentials

- Email: student001@academiccity.edu
- Password: password123

## Contributing

This is a student project for CS3139. Feel free to fork and improve!

## License

MIT License</content>
<parameter name="filePath">c:\Users\kojob\Documents\Academic City Folders\LVL 300 SEM 1\Web Tech\camous taskboard system\README.md
