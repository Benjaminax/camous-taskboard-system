// backend/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let pool;
try {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('Database pool created successfully');
    pool.query('SELECT 1', (err) => {
        if (err) {
            console.error('Database connection test failed:', err.message);
        } else {
            console.log('Database connection test succeeded');
        }
    });
} catch (err) {
    console.error('Error creating database pool:', err.message);
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'academic_city_secret_key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// 1. USER REGISTRATION & AUTHENTICATION
// Register user
app.post('/api/register', async (req, res) => {
    try {
        const { student_id, full_name, email, password } = req.body;
        
        // Check if user exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR student_id = $2',
            [email, student_id]
        );
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // Insert user
        const result = await pool.query(
            'INSERT INTO users (student_id, full_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, student_id, full_name, email',
            [student_id, full_name, email, passwordHash]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, student_id: user.student_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                student_id: user.student_id,
                full_name: user.full_name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. TEAM MANAGEMENT
// Create team
app.post('/api/teams', authenticateToken, async (req, res) => {
    try {
        const { team_name } = req.body;
        const team_code = generateTeamCode();
        
        const result = await pool.query(
            'INSERT INTO teams (team_name, team_code, created_by) VALUES ($1, $2, $3) RETURNING *',
            [team_name, team_code, req.user.id]
        );
        
        // Add creator as team member
        await pool.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [result.rows[0].id, req.user.id]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Join team
app.post('/api/teams/join', authenticateToken, async (req, res) => {
    try {
        const { team_code } = req.body;
        
        const teamResult = await pool.query(
            'SELECT * FROM teams WHERE team_code = $1',
            [team_code]
        );
        
        if (teamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = teamResult.rows[0];
        
        // Check if already a member
        const memberCheck = await pool.query(
            'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
            [team.id, req.user.id]
        );
        
        if (memberCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Already a team member' });
        }
        
        await pool.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [team.id, req.user.id]
        );
        
        res.json({ message: 'Joined team successfully', team });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. TASK MANAGEMENT
// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority, assigned_to, team_id, due_date } = req.body;
        
        const result = await pool.query(
            `INSERT INTO tasks (title, description, priority, assigned_to, team_id, created_by, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, priority, assigned_to, team_id, req.user.id, due_date]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tasks by team
app.get('/api/teams/:teamId/tasks', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { status } = req.query;
        
        let query = `
            SELECT t.*, u.full_name as assigned_name, 
                   uc.full_name as created_by_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE t.team_id = $1
        `;
        
        const params = [teamId];
        
        if (status && status !== 'all') {
            query += ' AND t.status = $2';
            params.push(status);
        }
        
        query += ' ORDER BY t.created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, assigned_to, due_date } = req.body;
        
        const result = await pool.query(
            `UPDATE tasks 
             SET title = $1, description = $2, status = $3, priority = $4, 
                 assigned_to = $5, due_date = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [title, description, status, priority, assigned_to, due_date, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. DASHBOARD DATA
// Get user's teams
app.get('/api/user/teams', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.* FROM teams t
             JOIN team_members tm ON t.id = tm.team_id
             WHERE tm.user_id = $1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get team dashboard data
app.get('/api/teams/:teamId/dashboard', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Team members
        const membersResult = await pool.query(
            `SELECT u.id, u.student_id, u.full_name, u.email,
                    COUNT(t.id) as task_count
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             LEFT JOIN tasks t ON u.id = t.assigned_to AND t.team_id = $1
             WHERE tm.team_id = $1
             GROUP BY u.id, u.student_id, u.full_name, u.email`,
            [teamId]
        );
        
        // Task summary
        const summaryResult = await pool.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks
             FROM tasks WHERE team_id = $1`,
            [teamId]
        );
        
        res.json({
            members: membersResult.rows,
            summary: summaryResult.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get team members
app.get('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const result = await pool.query(
            `SELECT u.id, u.student_id, u.full_name, u.email
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = $1`,
            [teamId]
        );
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function
function generateTeamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Campus Taskboard API is running!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});