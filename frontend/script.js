// Camous Taskboard System - Main Application Script
const API_BASE_URL = 'https://camous-taskboard-system.onrender.com/api';

// DOM Elements
let authSection, dashboard, sidebar, teamsList, teamDashboard, taskFilter;

// Application State
let currentUser = null;
let currentTeam = null;
let teams = [];
let tasks = [];

// Initialize DOM References
function initializeDOMElements() {
    authSection = document.getElementById('authSection');
    dashboard = document.getElementById('dashboard');
    sidebar = document.getElementById('sidebar');
    teamsList = document.getElementById('teamsList');
    teamDashboard = document.getElementById('teamDashboard');
    taskFilter = document.getElementById('taskFilter');
}

// Analytics Functions
function initializeAnalytics() {
    if (typeof mixpanel !== 'undefined') {
        const token = localStorage.getItem('MIXPANEL_TOKEN') || 'MIXPANEL_TOKEN_PLACEHOLDER';
        if (token !== 'MIXPANEL_TOKEN_PLACEHOLDER' && !window.mixpanelInitialized) {
            mixpanel.init(token, { debug: true });
            window.mixpanelInitialized = true;
        }
    }
}

function trackAnalytics(eventName, properties = {}) {
    if (typeof mixpanel !== 'undefined' && window.mixpanelInitialized) {
        mixpanel.track(eventName, {
            ...properties,
            timestamp: new Date().toISOString(),
            user_id: currentUser?.id
        });
    }
}

// API Helper with Retry Logic
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
                throw new Error('Network error');
            }
            
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                console.warn(`API attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeDOMElements();
        
        // Clear all state on page load
        currentUser = null;
        currentTeam = null;
        teams = [];
        tasks = [];
        
        // Force reset all display elements
        if (authSection) authSection.style.cssText = 'display: block !important;';
        if (dashboard) dashboard.style.cssText = 'display: none !important;';
        if (sidebar) sidebar.style.cssText = 'display: none !important;';
        
        const teamDash = document.getElementById('teamDashboard');
        if (teamDash) teamDash.style.cssText = 'display: none !important;';
        
        // Clear user display elements
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = '';
        
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        const userInitial = document.getElementById('userInitial');
        
        if (sidebarUserName) sidebarUserName.textContent = 'User';
        if (sidebarUserEmail) sidebarUserEmail.textContent = 'user@email.com';
        if (userInitial) userInitial.textContent = 'U';
        
        initializeAnalytics();
        setupEventListeners();
        setupSidebarListeners();
        
        // Check for valid token
        const token = localStorage.getItem('token');
        let isValidToken = false;
        
        if (token && token.trim()) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    
                    // Check expiration
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        console.log('Token expired');
                        localStorage.removeItem('token');
                    } else if (payload.id && payload.email) {
                        console.log('Valid token found');
                        isValidToken = true;
                        fetchUserData(token);
                    }
                }
            } catch (error) {
                console.error('Token validation error:', error);
                localStorage.removeItem('token');
            }
        }
        
        // If no valid token, show auth
        if (!isValidToken) {
            showAuth();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Event Listeners Setup
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn?.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Nav buttons
    document.getElementById('loginBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('login');
    });
    
    document.getElementById('registerBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('register');
    });
    
    // Forms
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Team buttons
    document.getElementById('createTeamBtn')?.addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('joinTeamBtn')?.addEventListener('click', () => openModal('joinTeamModal'));
    
    // Task button
    document.getElementById('createTaskBtn')?.addEventListener('click', () => openModal('createTaskModal'));
    
    // Task filter
    taskFilter?.addEventListener('change', loadTeamTasks);
    
    // Modal forms
    document.getElementById('createTeamForm')?.addEventListener('submit', handleCreateTeam);
    document.getElementById('joinTeamForm')?.addEventListener('submit', handleJoinTeam);
    document.getElementById('createTaskForm')?.addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm')?.addEventListener('submit', handleUpdateTask);
    document.getElementById('deleteTaskBtn')?.addEventListener('click', handleDeleteTask);
    
    // Close modals
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn?.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Sidebar Setup
function setupSidebarListeners() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    
    hamburger?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar(true, sidebar, hamburger, sidebarOverlay, mainContent);
    });
    
    closeSidebar?.addEventListener('click', () => {
        toggleSidebar(false, sidebar, hamburger, sidebarOverlay, mainContent);
    });
    
    sidebarOverlay?.addEventListener('click', () => {
        toggleSidebar(false, sidebar, hamburger, sidebarOverlay, mainContent);
    });
    
    // Sidebar actions
    document.getElementById('sidebarCreateTeam')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebarPanel();
        openModal('createTeamModal');
    });
    
    document.getElementById('sidebarJoinTeam')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebarPanel();
        openModal('joinTeamModal');
    });
    
    document.getElementById('sidebarCreateTask')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebarPanel();
        openModal('createTaskModal');
    });
    
    document.getElementById('sidebarLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebarPanel();
        handleLogout();
    });
}

function toggleSidebar(open, sidebar, hamburger, overlay, mainContent) {
    if (open) {
        sidebar?.classList.add('open');
        hamburger?.classList.add('active');
        overlay?.classList.add('active');
        mainContent?.classList.add('sidebar-open');
    } else {
        sidebar?.classList.remove('open');
        hamburger?.classList.remove('active');
        overlay?.classList.remove('active');
        mainContent?.classList.remove('sidebar-open');
    }
}

function closeSidebarPanel() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    toggleSidebar(false, sidebar, hamburger, overlay, mainContent);
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            trackAnalytics('User Login', {
                email: email,
                student_id: data.user?.student_id
            });
            
            if (typeof mixpanel !== 'undefined' && window.mixpanelInitialized) {
                mixpanel.identify(data.user?.id);
                mixpanel.people.set({
                    "$name": data.user?.full_name,
                    "$email": data.user?.email,
                    "student_id": data.user?.student_id
                });
            }
            
            showDashboard();
            loadUserTeams();
        } else {
            alert(data.error || 'Login failed');
            trackAnalytics('Login Failed', { email });
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please try again.');
        trackAnalytics('Login Error', { error: error.message });
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('regStudentId')?.value;
    const fullName = document.getElementById('regFullName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    
    if (!studentId || !fullName || !email || !password) {
        alert('Please fill all fields');
        return;
    }
    
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
            trackAnalytics('User Registration', { email, student_id: studentId, full_name: fullName });
            alert('Registration successful! Please login.');
            switchTab('login');
            e.target.reset();
        } else {
            alert(data.error || 'Registration failed');
            trackAnalytics('Registration Failed', { email });
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Network error. Please try again.');
        trackAnalytics('Registration Error', { error: error.message });
    }
}

function handleLogout() {
    trackAnalytics('User Logout', { user_id: currentUser?.id, email: currentUser?.email });
    localStorage.removeItem('token');
    currentUser = null;
    currentTeam = null;
    teams = [];
    tasks = [];
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
            teams = data || [];
            renderTeams();
        }
    } catch (error) {
        console.error('Load teams error:', error);
    }
}

function renderTeams() {
    if (!teamsList) return;
    teamsList.innerHTML = '';
    
    if (teams.length === 0) {
        teamsList.innerHTML = '<p class="no-teams">No teams yet. Create or join a team!</p>';
        return;
    }
    
    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `<h4>${team.team_name}</h4><p><strong>Code:</strong> ${team.team_code}</p>`;
        card.addEventListener('click', () => openTeamDashboard(team));
        teamsList.appendChild(card);
    });
}

async function handleCreateTeam(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('teamNameInput')?.value;
    if (!teamName) {
        alert('Please enter team name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ team_name: teamName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            trackAnalytics('Team Created', { team_name: teamName, team_id: data.id });
            closeModal('createTeamModal');
            e.target.reset();
            teams.push(data);
            renderTeams();
            alert('Team created!');
        } else {
            alert(data.error || 'Failed to create team');
        }
    } catch (error) {
        console.error('Create team error:', error);
        alert('Network error');
    }
}

async function handleJoinTeam(e) {
    e.preventDefault();
    
    const teamCode = document.getElementById('teamCodeInput')?.value;
    if (!teamCode) {
        alert('Please enter team code');
        return;
    }
    
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
            alert('Joined team!');
        } else {
            alert(data.error || 'Failed to join team');
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert('Network error');
    }
}

// Team Dashboard
async function openTeamDashboard(team) {
    currentTeam = team;
    const teamNameEl = document.getElementById('teamName');
    if (teamNameEl) teamNameEl.textContent = team.team_name;
    
    const td = document.getElementById('teamDashboard');
    if (td) {
        td.style.display = 'block';
        td.scrollIntoView({ behavior: 'smooth' });
    }
    
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
    const grid = document.getElementById('teamStats');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="stat-card"><h4>${stats?.total_tasks || 0}</h4><p>Total Tasks</p></div>
        <div class="stat-card"><h4>${stats?.completed_tasks || 0}</h4><p>Completed</p></div>
        <div class="stat-card"><h4>${stats?.in_progress_tasks || 0}</h4><p>In Progress</p></div>
        <div class="stat-card"><h4>${stats?.pending_tasks || 0}</h4><p>Pending</p></div>
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
    const list = document.getElementById('teamMembers');
    if (!list) return;
    list.innerHTML = '';
    
    (members || []).forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <div class="member-avatar">${member.full_name?.charAt(0) || 'U'}</div>
            <div><strong>${member.full_name}</strong><p>${member.student_id}</p></div>
        `;
        list.appendChild(card);
    });
}

async function loadTeamTasks() {
    const status = taskFilter?.value || '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeam.id}/tasks?status=${status}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        if (response.ok) {
            tasks = data || [];
            renderTasks();
        }
    } catch (error) {
        console.error('Load tasks error:', error);
    }
}

function renderTasks() {
    const list = document.getElementById('tasksList');
    if (!list) return;
    list.innerHTML = '';
    
    if (tasks.length === 0) {
        list.innerHTML = '<p class="no-tasks">No tasks found</p>';
        return;
    }
    
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.status?.toLowerCase().replace(' ', '-') || ''}`;
        card.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <p class="task-description">${task.description || 'No description'}</p>
                </div>
                <span class="task-priority ${task.priority?.toLowerCase() || ''}">${task.priority || 'Medium'}</span>
            </div>
            <div class="task-meta">
                <span>Assigned: ${task.assigned_name || 'Unassigned'}</span>
                <span>Due: ${formatDate(task.due_date)}</span>
            </div>
        `;
        card.addEventListener('click', () => openEditTaskModal(task));
        list.appendChild(card);
    });
}

// Task Functions
async function handleCreateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle')?.value;
    const description = document.getElementById('taskDescription')?.value;
    const priority = document.getElementById('taskPriority')?.value;
    const assigned_to = document.getElementById('taskAssignee')?.value;
    const due_date = document.getElementById('taskDueDate')?.value;
    
    if (!title) {
        alert('Please enter task title');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title, description, priority, assigned_to,
                team_id: currentTeam.id, due_date
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            trackAnalytics('Task Created', { task_title: title, team_id: currentTeam.id });
            closeModal('createTaskModal');
            e.target.reset();
            await loadTeamTasks();
            alert('Task created!');
        } else {
            alert(data.error || 'Failed to create task');
        }
    } catch (error) {
        console.error('Create task error:', error);
        alert('Network error');
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
            body: JSON.stringify({ title, description, status, priority, assigned_to, due_date })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            trackAnalytics('Task Updated', { task_title: title, status });
            closeModal('editTaskModal');
            await loadTeamTasks();
            alert('Task updated!');
        } else {
            alert(data.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Update task error:', error);
        alert('Network error');
    }
}

async function handleDeleteTask() {
    const taskId = document.getElementById('editTaskId').value;
    
    if (!confirm('Delete this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            trackAnalytics('Task Deleted', { task_id: taskId });
            closeModal('editTaskModal');
            await loadTeamTasks();
            alert('Task deleted!');
        } else {
            alert(data.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        alert('Network error');
    }
}

// Helper Functions
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

async function fetchUserData(token) {
    try {
        if (!token) {
            localStorage.removeItem('token');
            showAuth();
            return;
        }
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = { id: payload.id, email: payload.email, student_id: payload.student_id };
        
        const userName = currentUser.email.split('@')[0];
        const userEl = document.getElementById('userName');
        if (userEl) userEl.textContent = userName;
        
        const sidebarName = document.getElementById('sidebarUserName');
        const sidebarEmail = document.getElementById('sidebarUserEmail');
        const initial = document.getElementById('userInitial');
        
        if (sidebarName) sidebarName.textContent = userName;
        if (sidebarEmail) sidebarEmail.textContent = currentUser.email;
        if (initial) initial.textContent = currentUser.email.charAt(0).toUpperCase();
        
        showDashboard();
        loadUserTeams();
    } catch (error) {
        console.error('Token decode error:', error);
        localStorage.removeItem('token');
        showAuth();
    }
}

function showDashboard() {
    if (authSection) authSection.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (sidebar) sidebar.style.display = 'block';
}

function showAuth() {
    if (authSection) authSection.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    const td = document.getElementById('teamDashboard');
    if (td) td.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    closeSidebarPanel();
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn?.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        if (modalId === 'createTaskModal') {
            loadTeamMembersForSelect();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
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
        console.error('Load members error:', error);
    }
}

function populateAssigneeSelect(members) {
    const select = document.getElementById('taskAssignee');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Assignee</option>';
    (members || []).forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.full_name} (${member.student_id})`;
        select.appendChild(option);
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
            const select = document.getElementById('editTaskAssignee');
            if (!select) return;
            
            select.innerHTML = '';
            (data || []).forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.full_name} (${member.student_id})`;
                if (member.id === currentAssignee) option.selected = true;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Load members error:', error);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'No due date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Invalid date';
    }
}
