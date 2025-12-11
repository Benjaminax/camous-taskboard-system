
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use((req, res, next) => {
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5, max=100');
    next();
});


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


const JWT_SECRET = process.env.JWT_SECRET || 'academic_city_secret_key';


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


const requireAdmin = async (req, res, next) => {
    try {

        if (process.env.ADMIN_USER_IDS) {
            const adminIds = process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim(), 10));
            if (adminIds.includes(req.user.id)) return next();
        }


        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length > 0 && result.rows[0].is_admin) {
            return next();
        }
        return res.status(403).json({ error: 'Admin privileges required' });
    } catch (err) {
        console.error('Admin check error', err.message);
        return res.status(403).json({ error: 'Admin privileges required' });
    }
};



app.post('/api/register', async (req, res) => {
    try {
        const { student_id, full_name, email, password } = req.body;
        

        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR student_id = $2',
            [email, student_id]
        );
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        

        const passwordHash = await bcrypt.hash(password, 10);
        

        const result = await pool.query(
            'INSERT INTO users (student_id, full_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, student_id, full_name, email',
            [student_id, full_name, email, passwordHash]
        );
        const createdUser = result.rows[0];

        createdUser.is_admin = createdUser.is_admin || false;


        const tokenPayload = { id: createdUser.id, email: createdUser.email, student_id: createdUser.student_id, full_name: createdUser.full_name };
        if (typeof createdUser.is_admin !== 'undefined') tokenPayload.is_admin = createdUser.is_admin;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ token, user: createdUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


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
        

        const tokenPayload = { id: user.id, email: user.email, student_id: user.student_id, full_name: user.full_name };
        if (typeof user.is_admin !== 'undefined') tokenPayload.is_admin = user.is_admin;

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            token,
            user: {
                id: user.id,
                student_id: user.student_id,
                full_name: user.full_name,
                email: user.email,
                is_admin: user.is_admin || false
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.post('/api/teams', authenticateToken, async (req, res) => {
    try {
        console.log('API: Create team payload', req.body, 'by user', req.user?.id);
        const { team_name, description = null, max_members = null } = req.body;
        const team_code = generateTeamCode();
        
        let result;
        try {
            result = await pool.query(
                'INSERT INTO teams (team_name, team_code, created_by, description, max_members) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [team_name, team_code, req.user.id, description, max_members]
            );
        } catch (err) {

            console.warn('Extended INSERT failed, falling back to basic insert:', err.message);
            result = await pool.query(
                'INSERT INTO teams (team_name, team_code, created_by) VALUES ($1, $2, $3) RETURNING *',
                [team_name, team_code, req.user.id]
            );
        }
        console.log('API: Team created successfully', result.rows[0]);
        

        await pool.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [result.rows[0].id, req.user.id]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('API: Error creating team:', error);
        res.status(500).json({ error: error.message });
    }
});


app.put('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { team_name, description, max_members } = req.body;
        
        // Check if user is the creator
        const teamCheck = await pool.query('SELECT created_by FROM teams WHERE id = $1', [id]);
        if (teamCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (teamCheck.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Only the team creator can edit the team' });
        }
        
        // Check which columns exist
        const descExists = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description'");
        const maxExists = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'max_members'");
        
        let query = 'UPDATE teams SET team_name = $1';
        let params = [team_name];
        let paramIndex = 2;
        
        if (descExists.rows.length > 0) {
            query += `, description = $${paramIndex}`;
            params.push(description);
            paramIndex++;
        }
        if (maxExists.rows.length > 0) {
            query += `, max_members = $${paramIndex}`;
            params.push(max_members);
            paramIndex++;
        }
        
        query += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        const result = await pool.query(query, params);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('API: Error updating team:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/teams/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.full_name AS creator_name,
                    (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
             FROM teams t
             LEFT JOIN users u ON u.id = t.created_by
             ORDER BY t.id DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('API: Error fetching all teams:', error);
        res.status(500).json({ error: error.message });
    }
});


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



app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority, assigned_to, team_id, due_date } = req.body;

        if (!await isTeamMember(team_id, req.user.id)) {
            return res.status(403).json({ error: 'You must be a member of the team to create tasks' });
        }
        
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


app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, assigned_to, due_date } = req.body;
        

        const taskRes = await pool.query('SELECT team_id, created_by FROM tasks WHERE id = $1', [id]);
        if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        const taskTeamId = taskRes.rows[0].team_id;
        if (!await isTeamMember(taskTeamId, req.user.id)) {
            return res.status(403).json({ error: 'You must be a team member to update tasks' });
        }

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


app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        

        const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        const task = taskRes.rows[0];
        const teamRes = await pool.query('SELECT * FROM teams WHERE id = $1', [task.team_id]);
        const team = teamRes.rows[0];
        if (task.created_by !== req.user.id && team.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Only task creator or team owner can delete task' });
        }
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



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


app.get('/api/teams/:teamId/dashboard', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        

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
        

        const summaryResult = await pool.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks
             FROM tasks WHERE team_id = $1`,
            [teamId]
        );
        

        let joinRequests = [];
        try {
            const requestsResult = await pool.query(
                `SELECT jr.id, jr.requested_at, u.full_name, u.student_id, u.email
                 FROM join_requests jr
                 JOIN users u ON jr.user_id = u.id
                 WHERE jr.team_id = $1 AND jr.status = 'pending'
                 ORDER BY jr.requested_at DESC`,
                [teamId]
            );
            joinRequests = requestsResult.rows;
        } catch (err) {
            console.warn('join_requests table may not exist:', err.message);
        }
        
        res.json({
            members: membersResult.rows,
            summary: summaryResult.rows[0],
            join_requests: joinRequests
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const result = await pool.query(
            `SELECT u.id, u.student_id, u.full_name, u.email,
                    CASE WHEN t.created_by = u.id THEN true ELSE false END as is_creator
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             JOIN teams t ON t.id = tm.team_id
             WHERE tm.team_id = $1`,
            [teamId]
        );
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


function generateTeamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}


async function isTeamMember(teamId, userId) {
    try {
        const result = await pool.query('SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
        return result.rows.length > 0;
    } catch (err) {
        console.error('isTeamMember error', err.message);
        return false;
    }
}


app.get('/api/test', (req, res) => {
    res.json({ message: 'Campus Taskboard API is running!' });
});


app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, student_id, full_name, email FROM users ORDER BY full_name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/teams/:teamId/leave', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;


        const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

        const team = teamResult.rows[0];
        if (team.created_by === req.user.id) {
            return res.status(400).json({ error: 'Team creator cannot leave the team. Delete the team instead.' });
        }

        await pool.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, req.user.id]);
        res.json({ message: 'Left team successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.delete('/api/teams/:teamId', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
        const team = teamResult.rows[0];
        if (team.created_by !== req.user.id) return res.status(403).json({ error: 'Only the team creator can delete the team' });


        await pool.query('DELETE FROM tasks WHERE team_id = $1', [teamId]);
        await pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
        await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/user/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const teamsCountResult = await pool.query('SELECT COUNT(*) FROM team_members WHERE user_id = $1', [userId]);
        const tasksAssignedResult = await pool.query('SELECT COUNT(*) FROM tasks WHERE assigned_to = $1', [userId]);
        const totalTasksResult = await pool.query('SELECT COUNT(*) FROM tasks');

        res.json({
            total_teams: parseInt(teamsCountResult.rows[0].count, 10),
            tasks_assigned: parseInt(tasksAssignedResult.rows[0].count, 10),
            total_tasks: parseInt(totalTasksResult.rows[0].count, 10)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/teams/:teamId/request-join', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Team not found' });


        const memberCheck = await pool.query('SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, req.user.id]);
        if (memberCheck.rows.length > 0) return res.status(400).json({ error: 'Already a team member' });


        const requestCheck = await pool.query('SELECT * FROM join_requests WHERE team_id = $1 AND user_id = $2 AND status = $3', [teamId, req.user.id, 'pending']);
        if (requestCheck.rows.length > 0) return res.status(400).json({ error: 'Join request already pending' });


        await pool.query('INSERT INTO join_requests (team_id, user_id, requested_at, status) VALUES ($1, $2, NOW(), $3)', [teamId, req.user.id, 'pending']);
        res.json({ message: 'Join request sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/teams/:teamId/invite', authenticateToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { user_id, email } = req.body;
        let inviteUserId = user_id;

        const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

        if (!inviteUserId) {
            if (!email) return res.status(400).json({ error: 'Missing user_id or email' });
            const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
            inviteUserId = userResult.rows[0].id;
        }

        const memberCheck = await pool.query('SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, inviteUserId]);
        if (memberCheck.rows.length > 0) return res.status(400).json({ error: 'User already a team member' });

        await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)', [teamId, inviteUserId]);
        res.json({ message: 'User invited/joined successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/user/tasks', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT t.*, teams.team_name as team_name, u.full_name as assigned_name
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             LEFT JOIN teams ON t.team_id = teams.id
             WHERE t.assigned_to = $1 OR t.created_by = $1
             ORDER BY t.created_at DESC LIMIT 10`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, student_id, full_name, email, is_admin FROM users ORDER BY full_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, student_id, is_admin, password } = req.body;
        const updates = [];
        const params = [];
        let idx = 1;
        if (full_name) { updates.push(`full_name = $${idx++}`); params.push(full_name); }
        if (email) { updates.push(`email = $${idx++}`); params.push(email); }
        if (student_id) { updates.push(`student_id = $${idx++}`); params.push(student_id); }
        if (typeof is_admin !== 'undefined') { updates.push(`is_admin = $${idx++}`); params.push(is_admin); }
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            updates.push(`password_hash = $${idx++}`); params.push(hash);
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, student_id, full_name, email, is_admin`;
        params.push(id);
        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (+id === +req.user.id) {
            return res.status(400).json({ error: 'Admins cannot delete their own account' });
        }

        await pool.query('DELETE FROM team_members WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM tasks WHERE created_by = $1', [id]);
        await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [id]);
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/admin/teams', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.full_name as creator_name, (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
             FROM teams t
             LEFT JOIN users u ON t.created_by = u.id
             ORDER BY t.id DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/admin/teams/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE team_id = $1', [id]);
        await pool.query('DELETE FROM team_members WHERE team_id = $1', [id]);
        await pool.query('DELETE FROM teams WHERE id = $1', [id]);
        res.json({ message: 'Team deleted by admin' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

