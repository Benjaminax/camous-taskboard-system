# Campus Taskboard System

## Project Overview
We have developed a collaborative task management platform specifically for Academic City University students to work on group projects. This system allows students to create teams, manage tasks, and collaborate effectively on their assignments. The platform includes user authentication, team management, task assignment, and an admin panel for oversight.

## Deployment Links
- **Frontend**: https://benjaminax.github.io/camous-taskboard-system/
- **Backend**: https://camous-taskboard-system.onrender.com

## Login Details
For testing purposes, you can use the following demo credentials:
- Email: student001@academiccity.edu
- Password: password123

## Feature Checklist
### 1. User Registration & Authentication
- Secure user registration and login for students only with @academiccity.edu emails
- Allow users to create or join a project team by code or join request

### 2. Task Management
- Create, assign, update, or delete project tasks
- Display tasks by status Pending, In Progress, Completed
- Task filtering and priority management

### 3. Team Dashboard
- Show all team members and their assigned tasks
- Include summary indicators total tasks, completed count, user stats
- Team member management and task assignment

### 4. Task Analytics
- Simple analytics dashboard powered by [Task Analytics Library](https://github.com/srinathbondala/Task-Management)
- View task completion rates, time analytics, status distribution, and performance metrics
- Track productivity scores, overdue tasks, and efficiency rates

### 5. Admin Panel
- Host backend on Render with Node.js + PostgreSQL
- Host frontend on GitHub Pages and integrate with backend API
- Admin user/team management interface

## Installation Instructions
### Prerequisites
- Node.js v14+
- PostgreSQL database
- Git

### Backend Setup
1. Navigate to the `backend` directory: cd backend

2. Install dependencies: npm install

3. Set up environment variables. Create a `.env` file with:

   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ADMIN_USER_IDS=optional_comma_separated_user_ids_for_admin_access
   PORT=5000


4. Ensure your PostgreSQL database has the following tables:
   -  users = ( id, student_id, full_name, email, password_hash, is_admin)
   -  teams = (id, team_name, team_code, created_by, description, max_members)
   -  team_members = (team_id, user_id)
   -  join_requests = (id, team_id, user_id, requested_at, status)
   -  tasks = (id, title, description, priority, assigned_to, team_id, created_by, due_date, status, created_at, updated_at)

5. Run the server: npm start

### Frontend Setup
1. The frontend files are in the root directory (`index.html`, `script.js`, `style.css`) and `frontend/` directory.

2. For local development, serve the files using a local server (such as Live Server extension in VS Code).

3. Update `API_BASE_URL` in `script.js` to point to your backend URL (such as `https://your-render-app.onrender.com`).

### Deployment
- **Frontend**: Deploy to GitHub Pages by pushing to the `main` branch.
- **Backend**: Deploy to Render with the environment variables set.

## Usage
1. Register a new account or login with existing credentials.
2. Create or join a team.
3. Add tasks to your team and assign them to members.
4. Use the Home tab to view task analytics and performance metrics.
5. Admins can access the Admin panel to manage users and teams.

## Task Analytics
The Home tab features a comprehensive task analytics dashboard powered by our [Task Analytics Library](https://github.com/srinathbondala/Task-Management). This provides:

- **Task Overview**: Total tasks, completion status breakdown
- **Time Analytics**: Average completion time, overdue tasks, on-time completion rate
- **Status Distribution**: Visual representation of task status percentages
- **Performance Metrics**: Productivity scores, weekly task counts, efficiency rates

All analytics are calculated in real-time from your task data.


