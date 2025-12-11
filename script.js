const API_BASE_URL = 'https://camous-taskboard-system.onrender.com';

// State
let currentUser = null;
let currentTeam = null;
let teams = [];
let tasks = [];
let allTeams = [];

// DOM Elements
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const teamDashboard = document.getElementById('teamDashboard');
const emptyState = document.getElementById('emptyState');
const browseTeamsSection = document.getElementById('browseTeamsSection');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for stored token
    const token = localStorage.getItem('token');
    if (token) {
        // Try to auto-login with token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 > Date.now()) {
                currentUser = {
                    id: payload.id,
                    email: payload.email,
                    student_id: payload.student_id,
                    full_name: payload.full_name
                };
                showDashboard();
                loadUserTeams();
            } else {
                localStorage.removeItem('token');
                showAuth();
            }
        } catch (error) {
            localStorage.removeItem('token');
            showAuth();
        }
    } else {
        showAuth();
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
    loginForm.addEventListener('submit', handleLogin);
    
    // Register form
    registerForm.addEventListener('submit', handleRegister);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Team buttons
    document.getElementById('createTeamBtn').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('browseTeamsBtn').addEventListener('click', () => showBrowseTeams());
    document.getElementById('joinTeamBtn').addEventListener('click', () => openModal('joinTeamModal'));
    document.getElementById('createTeamBtnMain').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('browseTeamsBtnMain').addEventListener('click', () => showBrowseTeams());
    document.getElementById('joinTeamBtnMain').addEventListener('click', () => openModal('joinTeamModal'));
    
    // Task actions
    document.getElementById('createTaskBtn').addEventListener('click', () => openModal('createTaskModal'));
    document.getElementById('inviteMemberBtn').addEventListener('click', () => openModal('inviteMemberModal'));
    document.getElementById('manageMembersBtn').addEventListener('click', () => alert('Member management feature coming soon!'));
    document.getElementById('exportTasksBtn').addEventListener('click', () => alert('Export feature coming soon!'));
    
    // Task filter
    document.getElementById('taskFilter').addEventListener('change', loadTeamTasks);
    
    // Team search
    document.getElementById('teamSearch')?.addEventListener('input', filterTeams);
    document.getElementById('modalTeamSearch')?.addEventListener('input', filterAvailableTeams);
    document.getElementById('modalSearchBtn')?.addEventListener('click', loadAvailableTeams);
    
    // Modal forms
    document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
    document.getElementById('requestJoinForm').addEventListener('submit', handleRequestJoin);
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm').addEventListener('submit', handleUpdateTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', handleDeleteTask);
    document.getElementById('inviteMemberForm').addEventListener('submit', handleInviteMember);
    
    // Team code modal
    document.getElementById('closeTeamCodeBtn').addEventListener('click', () => closeModal('teamCodeModal'));
    
    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
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
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                email: email, 
                password: password 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showDashboard();
            loadUserTeams();
        } else {
            // Handle specific error messages
            if (data.error && data.error.includes('Invalid credentials')) {
                alert('Invalid email or password. Please try again.');
            } else if (data.error && data.error.includes('User not found')) {
                alert('No account found with this email. Please register.');
                switchTab('register');
            } else {
                alert(data.error || 'Login failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please check your connection and try again.');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('regStudentId').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    
    // Validation
    if (!studentId || !fullName || !email || !password || !passwordConfirm) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('Passwords do not match');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                student_id: studentId, 
                full_name: fullName, 
                email: email, 
                password: password 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showDashboard();
            loadUserTeams();
        } else {
            // Handle specific error messages
            if (data.error && data.error.includes('already exists')) {
                alert('An account with this email already exists. Please login instead.');
                switchTab('login');
            } else if (data.error && data.error.includes('Invalid email')) {
                alert('Please enter a valid email address');
            } else {
                alert(data.error || 'Registration failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Network error. Please check your connection and try again.');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        currentUser = null;
        currentTeam = null;
        teams = [];
        tasks = [];
        allTeams = [];
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
    
    // Clear forms when switching tabs
    if (tab === 'login') {
        loginForm.reset();
    } else if (tab === 'register') {
        registerForm.reset();
    }
}

// Team Functions
async function loadUserTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/user/teams`);
        
        if (response.ok) {
            teams = await response.json();
            renderTeams();
            updateEmptyState();
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
    const maxMembers = document.getElementById('teamMaxMembers').value;
    
    if (!teamName) {
        alert('Please enter a team name');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams`, {
            method: 'POST',
            body: JSON.stringify({ 
                team_name: teamName,
                description: description || null,
                max_members: maxMembers
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createTeamModal');
            e.target.reset();
            
            // Show team code modal
            document.getElementById('newTeamCode').textContent = data.team_code;
            openModal('teamCodeModal');
            
            // Add team to local state and reload
            teams.push(data);
            renderTeams();
            await openTeamDashboard(data);
            
            alert('Team created successfully and saved to database!');
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
            alert(data.error || 'Failed to join team');
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert('Network error. Please try again.');
    }
}

async function handleInviteMember(e) {
    e.preventDefault();
    
    if (!currentTeam) return;
    
    const email = document.getElementById('inviteEmail').value.trim();
    const message = document.getElementById('inviteMessage').value.trim();
    
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${currentTeam.id}/invite`, {
            method: 'POST',
            body: JSON.stringify({ 
                email: email,
                message: message || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('inviteMemberModal');
            e.target.reset();
            alert('Invitation sent successfully!');
        } else {
            alert(data.error || 'Failed to send invitation');
        }
    } catch (error) {
        console.error('Invite member error:', error);
        alert('Network error. Please try again.');
    }
}

// Browse Teams Functions
async function showBrowseTeams() {
    teamDashboard.style.display = 'none';
    emptyState.style.display = 'none';
    browseTeamsSection.style.display = 'block';
    
    await loadAllTeams();
}

async function loadAllTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/all`);
        
        if (response.ok) {
            allTeams = await response.json();
            renderAllTeams();
        } else {
            console.error('Failed to load all teams');
            allTeams = [];
            renderAllTeams();
        }
    } catch (error) {
        console.error('Load all teams error:', error);
        allTeams = [];
        renderAllTeams();
    }
}

function renderAllTeams() {
    const allTeamsList = document.getElementById('allTeamsList');
    allTeamsList.innerHTML = '';
    
    if (allTeams.length === 0) {
        allTeamsList.innerHTML = '<div class="no-teams">No teams available to join.</div>';
        return;
    }
    
    allTeams.forEach(team => {
        // Check if user is already in this team
        const isMember = teams.some(t => t.id === team.id);
        
        const teamCard = document.createElement('div');
        teamCard.className = 'team-browse-card';
        teamCard.innerHTML = `
            <h4>${team.team_name}</h4>
            <p class="team-description">${team.description || 'No description provided.'}</p>
            <div class="team-meta">
                <div class="team-creator-info">
                    <i class="fas fa-user"></i> ${team.creator_name || 'Unknown'}
                </div>
                <div class="team-size">
                    <i class="fas fa-users"></i> ${team.member_count || 0}/${team.max_members || '∞'} members
                </div>
            </div>
            ${isMember ? 
                '<button class="request-join-btn" disabled>Already a Member</button>' :
                `<button class="request-join-btn" data-team-id="${team.id}">
                    <i class="fas fa-user-plus"></i> Request to Join
                </button>`
            }
        `;
        
        if (!isMember) {
            const joinBtn = teamCard.querySelector('.request-join-btn');
            joinBtn.addEventListener('click', () => openRequestJoinModal(team));
        }
        
        allTeamsList.appendChild(teamCard);
    });
}

function filterTeams() {
    const searchTerm = document.getElementById('teamSearch').value.toLowerCase();
    const filteredTeams = allTeams.filter(team => 
        team.team_name.toLowerCase().includes(searchTerm) ||
        (team.description && team.description.toLowerCase().includes(searchTerm)) ||
        (team.creator_name && team.creator_name.toLowerCase().includes(searchTerm))
    );
    
    renderFilteredTeams(filteredTeams);
}

function renderFilteredTeams(filteredTeams) {
    const allTeamsList = document.getElementById('allTeamsList');
    allTeamsList.innerHTML = '';
    
    if (filteredTeams.length === 0) {
        allTeamsList.innerHTML = '<div class="no-teams">No teams match your search.</div>';
        return;
    }
    
    filteredTeams.forEach(team => {
        const isMember = teams.some(t => t.id === team.id);
        
        const teamCard = document.createElement('div');
        teamCard.className = 'team-browse-card';
        teamCard.innerHTML = `
            <h4>${team.team_name}</h4>
            <p class="team-description">${team.description || 'No description provided.'}</p>
            <div class="team-meta">
                <div class="team-creator-info">
                    <i class="fas fa-user"></i> ${team.creator_name || 'Unknown'}
                </div>
                <div class="team-size">
                    <i class="fas fa-users"></i> ${team.member_count || 0}/${team.max_members || '∞'} members
                </div>
            </div>
            ${isMember ? 
                '<button class="request-join-btn" disabled>Already a Member</button>' :
                `<button class="request-join-btn" data-team-id="${team.id}">
                    <i class="fas fa-user-plus"></i> Request to Join
                </button>`
            }
        `;
        
        if (!isMember) {
            const joinBtn = teamCard.querySelector('.request-join-btn');
            joinBtn.addEventListener('click', () => openRequestJoinModal(team));
        }
        
        allTeamsList.appendChild(teamCard);
    });
}

async function loadAvailableTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/all`);
        
        if (response.ok) {
            const availableTeams = await response.json();
            renderAvailableTeams(availableTeams);
        }
    } catch (error) {
        console.error('Load available teams error:', error);
    }
}

function renderAvailableTeams(teamsList) {
    const availableTeamsList = document.getElementById('availableTeamsList');
    availableTeamsList.innerHTML = '';
    
    if (teamsList.length === 0) {
        availableTeamsList.innerHTML = '<div class="no-teams">No teams available.</div>';
        return;
    }
    
    teamsList.forEach(team => {
        const isMember = teams.some(t => t.id === team.id);
        
        const teamItem = document.createElement('div');
        teamItem.className = 'available-team-item';
        teamItem.innerHTML = `
            <h5>${team.team_name}</h5>
            <p>${team.description || 'No description'}</p>
            <div class="team-meta">
                <span><i class="fas fa-user"></i> ${team.creator_name || 'Unknown'}</span>
                <span><i class="fas fa-users"></i> ${team.member_count || 0}/${team.max_members || '∞'}</span>
            </div>
        `;
        
        if (!isMember) {
            teamItem.addEventListener('click', () => openRequestJoinModal(team));
        }
        
        availableTeamsList.appendChild(teamItem);
    });
}

function filterAvailableTeams() {
    const searchTerm = document.getElementById('modalTeamSearch').value.toLowerCase();
    const filtered = allTeams.filter(team => 
        team.team_name.toLowerCase().includes(searchTerm) ||
        (team.description && team.description.toLowerCase().includes(searchTerm))
    );
    renderAvailableTeams(filtered);
}

// Request to Join Functions
function openRequestJoinModal(team) {
    document.getElementById('requestTeamName').textContent = team.team_name;
    document.getElementById('requestTeamDescription').textContent = team.description || 'No description provided.';
    document.getElementById('requestTeamCreator').textContent = team.creator_name || 'Unknown';
    document.getElementById('requestTeamMembers').textContent = team.member_count || 0;
    document.getElementById('requestTeamMaxMembers').textContent = team.max_members || '∞';
    
    // Store team ID in form
    const form = document.getElementById('requestJoinForm');
    form.dataset.teamId = team.id;
    
    openModal('requestJoinModal');
}

async function handleRequestJoin(e) {
    e.preventDefault();
    
    const teamId = e.target.dataset.teamId;
    const requestedRole = document.getElementById('requestedRole').value;
    const message = document.getElementById('joinMessage').value.trim();
    
    if (!requestedRole) {
        alert('Please select a role you want to play in the team.');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/teams/${teamId}/request-join`, {
            method: 'POST',
            body: JSON.stringify({
                requested_role: requestedRole,
                message: message || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('requestJoinModal');
            e.target.reset();
            alert('Join request sent successfully! The team creator will review your request.');
        } else {
            alert(data.error || 'Failed to send join request');
        }
    } catch (error) {
        console.error('Request join error:', error);
        alert('Network error. Please try again.');
    }
}

// Team Dashboard Functions
async function openTeamDashboard(team) {
    currentTeam = team;
    
    // Hide other sections
    browseTeamsSection.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Update UI
    document.getElementById('teamName').textContent = team.team_name;
    document.getElementById('teamCode').textContent = team.team_code;
    document.getElementById('teamCreator').textContent = team.creator_name || 'Unknown';
    
    // Show team dashboard
    teamDashboard.style.display = 'block';
    
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
                ${member.role ? `<span class="member-role">${member.role}</span>` : ''}
                ${member.is_creator ? '<span class="member-role">Creator</span>' : ''}
            </div>
        `;
        membersList.appendChild(memberCard);
    });
}

async function loadTeamTasks() {
    const status = document.getElementById('taskFilter').value;
    
    try {
        const url = status === 'all' 
            ? `${API_BASE_URL}/teams/${currentTeam.id}/tasks`
            : `${API_BASE_URL}/teams/${currentTeam.id}/tasks?status=${status}`;
        
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
            alert('Task created successfully and saved to database!');
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
            alert('Task updated successfully and saved to database!');
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
    // Set user info in sidebar
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.full_name || 'User';
        document.getElementById('userEmail').textContent = currentUser.email || '';
    }
    
    authSection.style.display = 'none';
    dashboard.style.display = 'flex';
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
        browseTeamsSection.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
    }
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
        // Set due date to 7 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        document.getElementById('taskDueDate').valueAsDate = dueDate;
    }
    
    // If opening browse teams modal
    if (modalId === 'browseTeamsModal') {
        loadAvailableTeams();
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