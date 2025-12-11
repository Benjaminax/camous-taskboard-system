// frontend/script.js
const API_BASE_URL = 'https://camous-taskboard-system.onrender.com/api';

// Helper function for API calls with retry logic
async function apiCall(endpoint, options = {}) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok && response.status === 0) {
                throw new Error('Network error - possible HTTP/2 issue');
            }
            
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                console.warn(`API call attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    throw lastError;
}

// DOM Elements
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const teamsList = document.getElementById('teamsList');
const teamDashboard = document.getElementById('teamDashboard');
const taskFilter = document.getElementById('taskFilter');

// State
let currentUser = null;
let currentTeam = null;
let teams = [];
let tasks = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for stored token
    const token = localStorage.getItem('token');
    if (token) {
        // Validate token
        fetchUserData(token);
    }
    
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Login form
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Team actions
    document.getElementById('createTeamBtn').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('joinTeamBtn').addEventListener('click', () => openModal('joinTeamModal'));
    
    // Task actions
    document.getElementById('createTaskBtn').addEventListener('click', () => openModal('createTaskModal'));
    
    // Task filter
    taskFilter.addEventListener('change', loadTeamTasks);
    
    // Modal forms
    document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm').addEventListener('submit', handleUpdateTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', handleDeleteTask);
    
    // Close modals
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals on outside click
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showDashboard();
            loadUserTeams();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please check your connection and try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('regStudentId').value;
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, full_name: fullName, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            switchTab('login');
            e.target.reset();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Network error. Please check your connection and try again.');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentTeam = null;
    showAuth();
}

// Team Functions
async function loadUserTeams() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/teams`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            teams = data;
            renderTeams();
        }
    } catch (error) {
        console.error('Load teams error:', error);
    }
}

function renderTeams() {
    teamsList.innerHTML = '';
    
    if (teams.length === 0) {
        teamsList.innerHTML = '<p class="no-teams">No teams yet. Create or join a team to get started!</p>';
        return;
    }
    
    teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        teamCard.innerHTML = `
            <h4>${team.team_name}</h4>
            <p><strong>Code:</strong> ${team.team_code}</p>
            <p><small>Click to view team dashboard</small></p>
        `;
        
        teamCard.addEventListener('click', () => openTeamDashboard(team));
        teamsList.appendChild(teamCard);
    });
}

async function handleCreateTeam(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('teamNameInput').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ team_name: teamName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createTeamModal');
            e.target.reset();
            teams.push(data);
            renderTeams();
            alert('Team created successfully!');
        } else {
            alert(data.error || 'Failed to create team');
        }
    } catch (error) {
        console.error('Create team error:', error);
        alert('Network error. Please try again.');
    }
}

async function handleJoinTeam(e) {
    e.preventDefault();
    
    const teamCode = document.getElementById('teamCodeInput').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams/join`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ team_code: teamCode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('joinTeamModal');
            e.target.reset();
            await loadUserTeams();
            alert('Joined team successfully!');
        } else {
            alert(data.error || 'Failed to join team');
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert('Network error. Please try again.');
    }
}

// Team Dashboard Functions
async function openTeamDashboard(team) {
    currentTeam = team;
    document.getElementById('teamName').textContent = team.team_name;
    teamDashboard.style.display = 'block';
    
    // Scroll to team dashboard
    teamDashboard.scrollIntoView({ behavior: 'smooth' });
    
    await loadTeamDashboard();
}

async function loadTeamDashboard() {
    await Promise.all([
        loadTeamStats(),
        loadTeamMembers(),
        loadTeamTasks()
    ]);
}

async function loadTeamStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/dashboard`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            renderTeamStats(data.summary);
            renderTeamMembers(data.members);
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

function renderTeamStats(stats) {
    const statsGrid = document.getElementById('teamStats');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <h4>${stats.total_tasks || 0}</h4>
            <p>Total Tasks</p>
        </div>
        <div class="stat-card">
            <h4>${stats.completed_tasks || 0}</h4>
            <p>Completed</p>
        </div>
        <div class="stat-card">
            <h4>${stats.in_progress_tasks || 0}</h4>
            <p>In Progress</p>
        </div>
        <div class="stat-card">
            <h4>${stats.pending_tasks || 0}</h4>
            <p>Pending</p>
        </div>
    `;
}

async function loadTeamMembers() {
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/members`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            populateAssigneeSelect(data);
        }
    } catch (error) {
        console.error('Load members error:', error);
    }
}

function renderTeamMembers(members) {
    const membersList = document.getElementById('teamMembers');
    membersList.innerHTML = '';
    
    members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.innerHTML = `
            <div class="member-avatar">
                ${member.full_name.charAt(0)}
            </div>
            <div>
                <strong>${member.full_name}</strong>
                <p>${member.student_id}</p>
                <p><small>Tasks: ${member.task_count || 0}</small></p>
            </div>
        `;
        membersList.appendChild(memberCard);
    });
}

async function loadTeamTasks() {
    const status = taskFilter.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/tasks?status=${status}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            tasks = data;
            renderTasks();
        }
    } catch (error) {
        console.error('Load tasks error:', error);
    }
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">No tasks found. Create your first task!</p>';
        return;
    }
    
    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.status.toLowerCase().replace(' ', '-')}`;
        taskCard.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <p class="task-description">${task.description || 'No description'}</p>
                </div>
                <span class="task-priority ${task.priority.toLowerCase()}">${task.priority}</span>
            </div>
            <div class="task-meta">
                <span>Assigned to: ${task.assigned_name || 'Unassigned'}</span>
                <span>Due: ${formatDate(task.due_date)}</span>
            </div>
        `;
        
        taskCard.addEventListener('click', () => openEditTaskModal(task));
        tasksList.appendChild(taskCard);
    });
}

// Task Functions
async function handleCreateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const priority = document.getElementById('taskPriority').value;
    const assigned_to = document.getElementById('taskAssignee').value;
    const due_date = document.getElementById('taskDueDate').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                description,
                priority,
                assigned_to,
                team_id: currentTeam.id,
                due_date
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createTaskModal');
            e.target.reset();
            await loadTeamTasks();
            await loadTeamStats();
            alert('Task created successfully!');
        } else {
            alert(data.error || 'Failed to create task');
        }
    } catch (error) {
        console.error('Create task error:', error);
        alert('Network error. Please try again.');
    }
}

function openEditTaskModal(task) {
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDueDate').value = task.due_date;
    
    populateEditAssigneeSelect(task.assigned_to);
    openModal('editTaskModal');
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value;
    const description = document.getElementById('editTaskDescription').value;
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    const assigned_to = document.getElementById('editTaskAssignee').value;
    const due_date = document.getElementById('editTaskDueDate').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                description,
                status,
                priority,
                assigned_to,
                due_date
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editTaskModal');
            await loadTeamTasks();
            await loadTeamStats();
            alert('Task updated successfully!');
        } else {
            alert(data.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Update task error:', error);
        alert('Network error. Please try again.');
    }
}

async function handleDeleteTask() {
    const taskId = document.getElementById('editTaskId').value;
    
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editTaskModal');
            await loadTeamTasks();
            await loadTeamStats();
            alert('Task deleted successfully!');
        } else {
            alert(data.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        alert('Network error. Please try again.');
    }
}

// Helper Functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function fetchUserData(token) {
    try {
        // Decode token to get user info
        if (!token) {
            localStorage.removeItem('token');
            showAuth();
            return;
        }
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = {
            id: payload.id,
            email: payload.email,
            student_id: payload.student_id
        };
        
        // Set user name (you might need an API endpoint to get full user details)
        document.getElementById('userName').textContent = currentUser.email.split('@')[0];
        
        showDashboard();
        loadUserTeams();
    } catch (error) {
        console.error('Token decode error:', error);
        localStorage.removeItem('token');
    }
}

function showDashboard() {
    authSection.style.display = 'none';
    dashboard.style.display = 'block';
}

function showAuth() {
    authSection.style.display = 'block';
    dashboard.style.display = 'none';
    teamDashboard.style.display = 'none';
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    
    // If opening task modal, load team members for assignee select
    if (modalId === 'createTaskModal') {
        loadTeamMembersForSelect();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function loadTeamMembersForSelect() {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/members`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            populateAssigneeSelect(data);
        }
    } catch (error) {
        console.error('Load members for select error:', error);
    }
}

function populateAssigneeSelect(members) {
    const assigneeSelect = document.getElementById('taskAssignee');
    assigneeSelect.innerHTML = '<option value="">Select Assignee</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.full_name} (${member.student_id})`;
        assigneeSelect.appendChild(option);
    });
}

async function populateEditAssigneeSelect(currentAssignee) {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/members`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const assigneeSelect = document.getElementById('editTaskAssignee');
            assigneeSelect.innerHTML = '';
            
            data.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.full_name} (${member.student_id})`;
                if (member.id === currentAssignee) {
                    option.selected = true;
                }
                assigneeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Load members for edit select error:', error);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}