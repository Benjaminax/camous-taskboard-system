const API_BASE_URL = 'https://camous-taskboard-system.onrender.com/api';

// State
let currentUser = null;
let currentTeam = null;
let teams = [];
let tasks = [];

// DOM Elements
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const teamDashboard = document.getElementById('teamDashboard');
const emptyState = document.getElementById('emptyState');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for stored token
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        showAuth();
    }
    
    setupEventListeners();
    
    // Set default date for task due date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 7);
    document.getElementById('taskDueDate').min = today.toISOString().split('T')[0];
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
    loginForm.addEventListener('submit', handleLogin);
    
    // Register form
    registerForm.addEventListener('submit', handleRegister);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Team buttons
    document.getElementById('createTeamBtn').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('joinTeamBtn').addEventListener('click', () => openModal('joinTeamModal'));
    document.getElementById('createTeamBtnMain').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('joinTeamBtnMain').addEventListener('click', () => openModal('joinTeamModal'));
    
    // Task actions
    document.getElementById('createTaskBtn').addEventListener('click', () => {
        openModal('createTaskModal');
        // Set due date to 7 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        document.getElementById('taskDueDate').valueAsDate = dueDate;
    });
    
    // Task filter and sort
    document.getElementById('taskFilter').addEventListener('change', loadTeamTasks);
    document.getElementById('taskSort').addEventListener('change', loadTeamTasks);
    
    // Add member
    document.getElementById('addMemberBtn').addEventListener('click', () => openModal('addMemberModal'));
    
    // Modal forms
    document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm').addEventListener('submit', handleUpdateTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', handleDeleteTask);
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
    
    // Team code modal buttons
    document.getElementById('joinAfterCreateBtn').addEventListener('click', () => {
        const teamCode = document.getElementById('newTeamCode').textContent;
        document.getElementById('teamCodeInput').value = teamCode;
        closeModal('teamCodeModal');
        openModal('joinTeamModal');
    });
    
    document.getElementById('closeTeamCodeBtn').addEventListener('click', () => {
        closeModal('teamCodeModal');
    });
    
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
    
    // Mobile menu close on click outside
    document.addEventListener('click', (event) => {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (window.innerWidth <= 992 && 
            !sidebar.contains(event.target) && 
            !mobileMenuToggle.contains(event.target) &&
            sidebar.classList.contains('active')) {
            toggleMobileMenu();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Validate academic email
    if (!email.endsWith('@academiccity.edu.gh')) {
        alert('Please use your Academic City University email (@academiccity.edu.gh)');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            await fetchUserData();
            showDashboard();
            loadUserTeams();
        } else {
            alert(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please check your connection and try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('regStudentId').value.toUpperCase();
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    // Validation
    if (!studentId.match(/^ACU\d{7}$/)) {
        alert('Invalid Student ID format. Must be ACU followed by 7 digits (e.g., ACU2023001)');
        return;
    }
    
    if (!email.endsWith('@academiccity.edu.gh')) {
        alert('Please use your Academic City University email (@academiccity.edu.gh)');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                student_id: studentId, 
                full_name: fullName, 
                email, 
                password 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            switchTab('login');
            e.target.reset();
        } else {
            alert(data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Network error. Please check your connection and try again.');
    }
}

async function validateToken(token) {
    try {
        // Try to decode token and set user
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            throw new Error('Token expired');
        }
        
        // Verify token with backend
        const response = await fetchWithAuth(`${API_BASE_URL}/verify-token`);
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        currentUser = {
            id: payload.id,
            email: payload.email,
            student_id: payload.student_id,
            full_name: payload.full_name
        };
        
        await fetchUserData();
        showDashboard();
        loadUserTeams();
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        showAuth();
    }
}

async function fetchUserData() {
    if (!currentUser) return;
    
    // Update UI with user info
    document.getElementById('userName').textContent = currentUser.full_name || currentUser.student_id || 'Student';
    document.getElementById('userStudentId').textContent = currentUser.student_id || 'Student ID';
    document.getElementById('userEmail').textContent = currentUser.email;
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        currentUser = null;
        currentTeam = null;
        teams = [];
        tasks = [];
        showAuth();
    }
}

// Tab Switching
function switchTab(tab) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Show active form
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tab}Form`);
    });
}

// Sidebar Functions
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    updateSidebarCollapsedState();
}

function toggleMobileMenu() {
    sidebar.classList.toggle('active');
}

function handleResize() {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
    }
    updateSidebarCollapsedState();
}

function updateSidebarCollapsedState() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
}

// Team Functions
async function loadUserTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/user/teams`);
        
        if (response.ok) {
            teams = await response.json();
            renderTeams();
            updateStats();
            updateEmptyState();
        } else {
            throw new Error('Failed to load teams');
        }
    } catch (error) {
        console.error('Load teams error:', error);
        teams = [];
        renderTeams();
    }
}

function renderTeams() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';
    
    if (teams.length === 0) {
        teamsList.innerHTML = '<div class="no-teams">No teams yet</div>';
        return;
    }
    
    teams.forEach(team => {
        const teamItem = document.createElement('button');
        teamItem.className = `team-nav-item ${currentTeam?.id === team.id ? 'active' : ''}`;
        teamItem.innerHTML = `
            <i class="fas fa-users"></i>
            <span>${team.team_name}</span>
        `;
        
        teamItem.addEventListener('click', () => openTeamDashboard(team));
        teamsList.appendChild(teamItem);
    });
}

async function handleCreateTeam(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('teamNameInput').value.trim();
    const description = document.getElementById('teamDescription').value.trim();
    
    if (!teamName) {
        alert('Please enter a team name');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams`, {
            method: 'POST',
            body: JSON.stringify({ 
                team_name: teamName,
                description: description || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createTeamModal');
            e.target.reset();
            
            // Show team code modal
            document.getElementById('newTeamCode').textContent = data.team_code;
            openModal('teamCodeModal');
            
            // Note: Creator is NOT automatically added as a member
            // They need to join using the team code
            alert('Team created successfully! Share the team code with members (including yourself if you want to join).');
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
    
    const teamCode = document.getElementById('teamCodeInput').value.trim().toUpperCase();
    
    if (!teamCode) {
        alert('Please enter a team code');
        return;
    }
    
    if (teamCode.length !== 6) {
        alert('Team code must be 6 characters');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/join`, {
            method: 'POST',
            body: JSON.stringify({ team_code: teamCode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('joinTeamModal');
            e.target.reset();
            
            // Refresh teams list
            await loadUserTeams();
            
            // If we joined a team, show success message
            alert('Successfully joined the team!');
            
            // If we have the team data, open its dashboard
            if (data.team) {
                await openTeamDashboard(data.team);
            }
        } else {
            alert(data.error || data.message || 'Failed to join team');
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert('Network error. Please try again.');
    }
}

async function handleAddMember(e) {
    e.preventDefault();
    
    if (!currentTeam) return;
    
    const email = document.getElementById('inviteEmail').value.trim();
    
    if (!email.endsWith('@academiccity.edu.gh')) {
        alert('Please enter a valid Academic City University email');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('addMemberModal');
            e.target.reset();
            alert('Invitation sent successfully!');
        } else {
            alert(data.error || 'Failed to send invitation');
        }
    } catch (error) {
        console.error('Add member error:', error);
        alert('Network error. Please try again.');
    }
}

// Team Dashboard Functions
async function openTeamDashboard(team) {
    currentTeam = team;
    
    // Update UI
    document.getElementById('teamName').textContent = team.team_name;
    document.getElementById('teamCode').textContent = team.team_code;
    document.getElementById('teamCreated').textContent = formatDate(team.created_at);
    
    // Show team dashboard, hide empty state
    teamDashboard.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Update active team in sidebar
    document.querySelectorAll('.team-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.team-nav-item').forEach(item => {
        if (item.querySelector('span')?.textContent === team.team_name) {
            item.classList.add('active');
        }
    });
    
    // Load team data
    await loadTeamDashboard();
    
    // Close mobile sidebar
    if (window.innerWidth <= 992) {
        toggleMobileMenu();
    }
}

function closeTeamDashboard() {
    currentTeam = null;
    teamDashboard.style.display = 'none';
    emptyState.style.display = 'flex';
    
    // Update active team in sidebar
    document.querySelectorAll('.team-nav-item').forEach(item => {
        item.classList.remove('active');
    });
}

async function loadTeamDashboard() {
    try {
        await Promise.all([
            loadTeamStats(),
            loadTeamMembers(),
            loadTeamTasks()
        ]);
    } catch (error) {
        console.error('Load team dashboard error:', error);
    }
}

async function loadTeamStats() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/dashboard`);
        
        if (response.ok) {
            const data = await response.json();
            renderTeamStats(data.summary || {});
            renderTeamMembers(data.members || []);
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
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/members`);
        
        if (response.ok) {
            const members = await response.json();
            renderTeamMembers(members);
            updateMemberCount(members.length);
        }
    } catch (error) {
        console.error('Load members error:', error);
    }
}

function renderTeamMembers(members) {
    const membersList = document.getElementById('teamMembers');
    membersList.innerHTML = '';
    
    if (members.length === 0) {
        membersList.innerHTML = '<div class="no-teams">No members yet</div>';
        return;
    }
    
    members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.innerHTML = `
            <div class="member-avatar">
                ${member.full_name?.charAt(0) || '?'}
            </div>
            <div class="member-info">
                <h4>${member.full_name || 'Unknown'}</h4>
                <p>${member.student_id || 'No ID'}</p>
                ${member.is_creator ? '<span class="creator-badge">Creator</span>' : ''}
            </div>
        `;
        membersList.appendChild(memberCard);
    });
}

async function loadTeamTasks() {
    const status = document.getElementById('taskFilter').value;
    const sortBy = document.getElementById('taskSort').value;
    
    try {
        const url = new URL(`${API_BASE_URL}/teams/${currentTeam.id}/tasks`);
        if (status !== 'all') url.searchParams.append('status', status);
        if (sortBy) url.searchParams.append('sort_by', sortBy);
        
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
            tasks = await response.json();
            renderTasks();
            updateTaskCount(tasks.length);
        }
    } catch (error) {
        console.error('Load tasks error:', error);
        tasks = [];
        renderTasks();
    }
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="no-tasks">No tasks found. Create your first task!</div>';
        return;
    }
    
    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.status.toLowerCase().replace(' ', '-')}`;
        taskCard.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title || 'Untitled Task'}</div>
                    <p class="task-description">${task.description || 'No description provided'}</p>
                </div>
                <span class="task-priority ${task.priority?.toLowerCase() || 'medium'}">
                    ${task.priority || 'Medium'}
                </span>
            </div>
            <div class="task-meta">
                <div class="task-assignee">
                    <div class="assignee-avatar">
                        ${task.assigned_name?.charAt(0) || '?'}
                    </div>
                    <span>${task.assigned_name || 'Unassigned'}</span>
                </div>
                <span>Due: ${formatDate(task.due_date)}</span>
            </div>
        `;
        
        taskCard.addEventListener('click', () => openEditTaskModal(task));
        tasksList.appendChild(taskCard);
    });
}

// Task Functions
async function loadTeamMembersForSelect() {
    if (!currentTeam) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/members`);
        
        if (response.ok) {
            const members = await response.json();
            populateAssigneeSelect(members);
        }
    } catch (error) {
        console.error('Load members for select error:', error);
    }
}

function populateAssigneeSelect(members) {
    const assigneeSelect = document.getElementById('taskAssignee');
    assigneeSelect.innerHTML = '<option value="">Select a team member</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.full_name} (${member.student_id})`;
        assigneeSelect.appendChild(option);
    });
}

async function populateEditAssigneeSelect(members, currentAssignee) {
    const assigneeSelect = document.getElementById('editTaskAssignee');
    assigneeSelect.innerHTML = '<option value="">Select a team member</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.full_name} (${member.student_id})`;
        if (member.id === currentAssignee) {
            option.selected = true;
        }
        assigneeSelect.appendChild(option);
    });
}

async function handleCreateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const assigned_to = document.getElementById('taskAssignee').value;
    const due_date = document.getElementById('taskDueDate').value;
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    if (!assigned_to) {
        alert('Please assign the task to a team member');
        return;
    }
    
    if (!due_date) {
        alert('Please select a due date');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/tasks`, {
            method: 'POST',
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
            updateStats();
            alert('Task created successfully!');
        } else {
            alert(data.error || 'Failed to create task');
        }
    } catch (error) {
        console.error('Create task error:', error);
        alert('Network error. Please try again.');
    }
}

async function openEditTaskModal(task) {
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title || '';
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status || 'Pending';
    document.getElementById('editTaskPriority').value = task.priority || 'Medium';
    document.getElementById('editTaskDueDate').value = task.due_date || '';
    
    // Load members for assignee select
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/members`);
        if (response.ok) {
            const members = await response.json();
            await populateEditAssigneeSelect(members, task.assigned_to);
        }
    } catch (error) {
        console.error('Load members for edit error:', error);
    }
    
    openModal('editTaskModal');
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    const assigned_to = document.getElementById('editTaskAssignee').value;
    const due_date = document.getElementById('editTaskDueDate').value;
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
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
            updateStats();
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
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    const taskId = document.getElementById('editTaskId').value;
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editTaskModal');
            await loadTeamTasks();
            await loadTeamStats();
            updateStats();
            alert('Task deleted successfully!');
        } else {
            alert(data.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        alert('Network error. Please try again.');
    }
}

// UI Helper Functions
function showDashboard() {
    authSection.style.display = 'none';
    dashboard.style.display = 'flex';
    
    // Restore sidebar state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }
}

function showAuth() {
    authSection.style.display = 'block';
    dashboard.style.display = 'none';
    
    // Clear forms
    loginForm.reset();
    registerForm.reset();
}

function updateEmptyState() {
    if (teams.length === 0) {
        teamDashboard.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        teamDashboard.style.display = 'block';
        emptyState.style.display = 'none';
    }
}

function updateStats() {
    // Update sidebar stats
    document.getElementById('teamsCount').textContent = teams.length;
    document.getElementById('tasksCount').textContent = tasks.length;
}

function updateMemberCount(count) {
    document.getElementById('memberCount').textContent = count;
}

function updateTaskCount(count) {
    document.getElementById('taskCount').textContent = count;
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    
    // If opening task modal, load team members for assignee select
    if (modalId === 'createTaskModal') {
        loadTeamMembersForSelect();
        // Set default due date (7 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        document.getElementById('taskDueDate').valueAsDate = dueDate;
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    
    // Reset form
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
    }
}

// API Helper Function
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token');
    }
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    // If token is invalid, logout
    if (response.status === 401) {
        localStorage.removeItem('token');
        showAuth();
        throw new Error('Authentication failed');
    }
    
    return response;
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}