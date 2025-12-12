
let currentUser = null;
let currentTeam = null;
let teams = [];
let tasks = [];
let allTeams = [];
const API_BASE_URL = 'https://camous-taskboard-system.onrender.com';

const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const teamDashboard = document.getElementById('teamDashboard');
const emptyState = document.getElementById('emptyState');
const browseTeamsSection = document.getElementById('browseTeamsSection');

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 > Date.now()) {
                currentUser = null;
                currentTeam = null;
                teams = [];
                tasks = [];
                allTeams = [];
                
                currentUser = {
                    id: payload.id,
                    email: payload.email,
                    student_id: payload.student_id,
                    full_name: payload.full_name
                    ,
                    is_admin: payload.is_admin || false
                };
                showDashboard();
                loadUserTeams();
                showAdminIfNeeded();
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

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    loginForm.addEventListener('submit', handleLogin);
    
    registerForm.addEventListener('submit', handleRegister);
    
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    const homeBtnEl = document.getElementById('homeBtn');
    if (homeBtnEl) homeBtnEl.addEventListener('click', showHome);
    const adminBtnEl = document.getElementById('adminBtn');
    if (adminBtnEl) adminBtnEl.addEventListener('click', showAdmin);
    const adminUsersBtn = document.getElementById('adminUsersBtn');
    if (adminUsersBtn) adminUsersBtn.addEventListener('click', showAdminUsers);
    const adminTeamsBtn = document.getElementById('adminTeamsBtn');
    if (adminTeamsBtn) adminTeamsBtn.addEventListener('click', showAdminTeams);
    
    document.getElementById('createTeamBtn').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('browseTeamsBtn').addEventListener('click', () => showBrowseTeams());
    document.getElementById('joinTeamBtn').addEventListener('click', () => openModal('joinTeamModal'));
    document.getElementById('createTeamBtnMain').addEventListener('click', () => openModal('createTeamModal'));
    document.getElementById('browseTeamsBtnMain').addEventListener('click', () => showBrowseTeams());
    document.getElementById('joinTeamBtnMain').addEventListener('click', () => openModal('joinTeamModal'));
    
    document.getElementById('createTaskBtn').addEventListener('click', () => openModal('createTaskModal'));
    document.getElementById('leaveTeamBtn').addEventListener('click', handleLeaveTeam);
    document.getElementById('deleteTeamBtn').addEventListener('click', handleDeleteTeam);
    document.getElementById('inviteMemberBtn').addEventListener('click', () => openModal('inviteMemberModal'));
    document.getElementById('editTeamBtn').addEventListener('click', () => openEditTeamModal());
    document.getElementById('manageMembersBtn').addEventListener('click', () => alert('Member management feature coming soon!'));
    document.getElementById('exportTasksBtn').addEventListener('click', () => alert('Export feature coming soon!'));
    
    document.getElementById('taskFilter').addEventListener('change', loadTeamTasks);
    
    document.getElementById('teamSearch')?.addEventListener('input', filterTeams);
    document.getElementById('modalTeamSearch')?.addEventListener('input', filterAvailableTeams);
    document.getElementById('modalSearchBtn')?.addEventListener('click', loadAvailableTeams);
    
    document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);
    document.getElementById('editTeamForm').addEventListener('submit', handleEditTeam);
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
    document.getElementById('requestJoinForm').addEventListener('submit', handleRequestJoin);
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm').addEventListener('submit', handleUpdateTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', handleDeleteTask);
    document.getElementById('inviteMemberForm').addEventListener('submit', handleInviteMember);
    
    document.getElementById('closeTeamCodeBtn').addEventListener('click', () => closeModal('teamCodeModal'));
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            e.target !== mobileMenuBtn && 
            !mobileMenuBtn.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
    
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
    
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
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
            currentUser = null;
            currentTeam = null;
            teams = [];
            tasks = [];
            allTeams = [];
            
            localStorage.setItem('token', data.token);
            currentUser = { ...data.user, is_admin: data.user.is_admin || false };
            showDashboard();
            loadUserTeams();
            showAdminIfNeeded();
        } else {
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
            currentUser = { ...data.user, is_admin: data.user.is_admin || false };
            showDashboard();
            loadUserTeams();
            showAdminIfNeeded();
        } else {
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
        showAdminIfNeeded();
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tab}Form`);
    });
    
    if (tab === 'login') {
        loginForm.reset();
    } else if (tab === 'register') {
        registerForm.reset();
    }
}

async function loadUserTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/teams`);
        
        if (response.ok) {
            teams = await response.json();
            renderTeams();
            updateEmptyState();
            
            if (document.getElementById('homeDashboard').style.display === 'block') {
                showHome();
            }
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
    const maxMembersValue = document.getElementById('teamMaxMembers').value;
    const maxMembers = maxMembersValue !== '' ? parseInt(maxMembersValue, 10) : null;
    
    if (!teamName) {
        alert('Please enter a team name');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams`, {
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
            
            document.getElementById('newTeamCode').textContent = data.team_code;
            openModal('teamCodeModal');
            
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

function openEditTeamModal() {
    document.getElementById('editTeamNameInput').value = currentTeam.team_name;
    document.getElementById('editTeamDescription').value = currentTeam.description || '';
    document.getElementById('editTeamMaxMembers').value = currentTeam.max_members || 10;
    openModal('editTeamModal');
}

async function handleEditTeam(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('editTeamNameInput').value.trim();
    const description = document.getElementById('editTeamDescription').value.trim();
    const maxMembersValue = document.getElementById('editTeamMaxMembers').value;
    const maxMembers = maxMembersValue !== '' ? parseInt(maxMembersValue, 10) : null;
    
    if (!teamName) {
        alert('Please enter a team name');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                team_name: teamName,
                description: description || null,
                max_members: maxMembers
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editTeamModal');
            e.target.reset();
            
            // Update currentTeam
            currentTeam.team_name = data.team_name;
            currentTeam.description = data.description;
            currentTeam.max_members = data.max_members;
            
            // Update UI
            document.getElementById('teamName').textContent = data.team_name;
            
            // Update teams array
            const index = teams.findIndex(t => t.id === data.id);
            if (index !== -1) {
                teams[index] = data;
                renderTeams();
            }
            
            alert('Team updated successfully!');
        } else {
            alert(data.error || 'Failed to update team');
        }
    } catch (error) {
        console.error('Error updating team:', error);
        alert('Failed to update team');
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/join`, {
            method: 'POST',
            body: JSON.stringify({ team_code: teamCode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('joinTeamModal');
            e.target.reset();
            
            await loadUserTeams();
            
            alert('Successfully joined the team!');
            
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}/invite`, {
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

async function showBrowseTeams() {
    teamDashboard.style.display = 'none';
    emptyState.style.display = 'none';
    browseTeamsSection.style.display = 'block';
    document.getElementById('homeDashboard').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    
    await loadAllTeams();
}

async function loadAllTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/all`);
        
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/all`);
        
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

function openRequestJoinModal(team) {
    document.getElementById('requestTeamName').textContent = team.team_name;
    document.getElementById('requestTeamDescription').textContent = team.description || 'No description provided.';
    document.getElementById('requestTeamCreator').textContent = team.creator_name || 'Unknown';
    document.getElementById('requestTeamMembers').textContent = team.member_count || 0;
    document.getElementById('requestTeamMaxMembers').textContent = team.max_members || '∞';
    
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${teamId}/request-join`, {
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

async function openTeamDashboard(team) {
    currentTeam = team;
    
    browseTeamsSection.style.display = 'none';
    emptyState.style.display = 'none';
    
    document.getElementById('teamName').textContent = team.team_name;
    document.getElementById('teamCode').textContent = team.team_code;
    document.getElementById('teamCreator').textContent = team.creator_name || 'Unknown';
    
    teamDashboard.style.display = 'block';
    document.getElementById('homeDashboard').style.display = 'none';
    
    clearActiveNav();
    document.querySelectorAll('.team-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.team-nav-item').forEach(item => {
        if (item.querySelector('span')?.textContent === team.team_name) {
            item.classList.add('active');
        }
    });
    
    await loadTeamDashboard();
    document.getElementById('adminPanel').style.display = 'none';
    const deleteBtn = document.getElementById('deleteTeamBtn');
    const leaveBtn = document.getElementById('leaveTeamBtn');
    const editBtn = document.getElementById('editTeamBtn');
    if (currentUser && currentTeam && deleteBtn && leaveBtn && editBtn) {
        if (currentTeam.created_by === currentUser.id || currentUser.is_admin) {
            deleteBtn.style.display = 'inline-flex';
            leaveBtn.style.display = 'none';
            editBtn.style.display = 'inline-flex';
        } else {
            deleteBtn.style.display = 'none';
            leaveBtn.style.display = 'inline-flex';
            editBtn.style.display = 'none';
        }
    }
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}/dashboard`);
        
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}/members`);
        
        if (response.ok) {
            const members = await response.json();
            renderTeamMembers(members);
            updateMemberCount(members.length);
            const creator = members.find(m => m.is_creator);
            if (creator) {
                document.getElementById('teamCreator').textContent = creator.full_name || '';
            } else {
                document.getElementById('teamCreator').textContent = '';
            }
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
                ${member.is_creator ? '<span class="member-role leader">Leader</span>' : '<span class="member-role member">Member</span>'}
            </div>
        `;
        membersList.appendChild(memberCard);
    });
}

async function loadTeamTasks() {
    const status = document.getElementById('taskFilter').value;
    
    try {
        const tasksUrl = status === 'all' 
            ? `${API_BASE_URL}/api/teams/${currentTeam.id}/tasks`
            : `${API_BASE_URL}/api/teams/${currentTeam.id}/tasks?status=${status}`;
        
        const tasksResponse = await fetchWithAuth(tasksUrl);
        let tasksData = [];
        if (tasksResponse.ok) {
            tasksData = await tasksResponse.json();
        }
        
        const dashboardResponse = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}/dashboard`);
        let joinRequests = [];
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            joinRequests = dashboardData.join_requests || [];
        }
        
        const allItems = [];
        
        tasksData.forEach(task => {
            allItems.push({
                ...task,
                type: 'task'
            });
        });
        
        joinRequests.forEach(request => {
            allItems.push({
                id: `join_${request.id}`,
                title: `Join Request from ${request.full_name}`,
                description: `${request.full_name} (${request.student_id}) wants to join the team`,
                status: 'Pending',
                priority: 'High',
                assigned_name: 'Team Leader',
                due_date: null,
                type: 'join_request',
                request_data: request
            });
        });
        
        tasks = allItems;
        renderTasks();
        updateTaskCount(tasks.filter(item => item.type === 'task').length);
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
        
        if (task.type === 'join_request') {
            taskCard.className = 'task-card join-request';
            taskCard.innerHTML = `
                <div class="task-header">
                    <div>
                        <div class="task-title">${task.title}</div>
                        <p class="task-description">${task.description}</p>
                    </div>
                    <span class="task-priority high join-request-badge">
                        Join Request
                    </span>
                </div>
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="assignee-avatar">J</div>
                        <span>Pending Review</span>
                    </div>
                    <span>Requested: ${formatDate(task.request_data.requested_at)}</span>
                </div>
            `;
        } else {
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
        }
        
        tasksList.appendChild(taskCard);
    });
}

async function loadAssignableUsers() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/users`);
        if (response.ok) {
            const users = await response.json();
            populateAssigneeSelect(users);
        }
    } catch (error) {
        console.error('Load assignable users error:', error);
    }
}

function populateAssigneeSelect(users) {
    const assigneeSelect = document.getElementById('taskAssignee');
    assigneeSelect.innerHTML = '<option value="">Select a user</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.full_name} (${user.student_id})`;
        assigneeSelect.appendChild(option);
    });
}

async function populateEditAssigneeSelect(users, currentAssignee) {
    const assigneeSelect = document.getElementById('editTaskAssignee');
    assigneeSelect.innerHTML = '<option value="">Select a team member</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.full_name} (${user.student_id})`;
        if (user.id === currentAssignee) {
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
        alert('Please assign the task to a user');
        return;
    }
    
    if (!due_date) {
        alert('Please select a due date');
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/tasks`, {
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
    
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/users`);
        if (response.ok) {
            const users = await response.json();
            await populateEditAssigneeSelect(users, task.assigned_to);
        }
    } catch (error) {
        console.error('Load users for edit error:', error);
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/tasks/${taskId}`, {
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
        const response = await fetchWithAuth(`${API_BASE_URL}/api/tasks/${taskId}`, {
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

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function showDashboard() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.full_name || 'User';
        document.getElementById('userEmail').textContent = currentUser.email || '';
        const badge = document.getElementById('userRoleBadge');
        if (badge) {
            if (currentUser.is_admin) { badge.style.display = 'inline-block'; badge.textContent = 'Admin'; } else { badge.style.display = 'none'; }
        }
    }
    
    document.getElementById('teamDashboard').style.display = 'none';
    document.getElementById('homeDashboard').style.display = 'none';
    document.getElementById('browseTeamsSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    
    authSection.style.display = 'none';
    dashboard.style.display = 'flex';
    clearActiveNav();
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.classList.add('active');
    document.getElementById('homeDashboard').style.display = 'block';
    loadHomeDashboard();
}

function showAuth() {
    authSection.style.display = 'block';
    dashboard.style.display = 'none';
    
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
    
    if (modalId === 'createTaskModal') {
        loadAssignableUsers();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        document.getElementById('taskDueDate').valueAsDate = dueDate;
    }
    
    if (modalId === 'browseTeamsModal') {
        loadAvailableTeams();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
    }
}

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
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        showAuth();
        throw new Error('Authentication failed');
    }
    
    return response;
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

function clearActiveNav() {
    document.querySelectorAll('.nav-btn, .team-nav-item').forEach(el => el.classList.remove('active'));
}

function showHome() {
    clearActiveNav();
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.classList.add('active');

    showDashboard();
    browseTeamsSection.style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    
    teamDashboard.style.display = 'none';
    emptyState.style.display = 'none';
    document.getElementById('homeDashboard').style.display = 'block';
    
    if (!teams || teams.length === 0) {
        document.getElementById('homeStats').innerHTML = `
            <div class="welcome-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-users" style="font-size: 3rem; color: #666; margin-bottom: 1rem;"></i>
                <h2 style="color: #333; margin-bottom: 1rem;">Welcome to Your Dashboard</h2>
                <p style="color: #666; margin-bottom: 2rem;">Get started by creating a new team, browsing existing teams, or joining a team with a code.</p>
                <div class="empty-actions" style="justify-content: center;">
                    <button id="createTeamBtnMain" class="btn-primary" style="margin: 0 0.5rem;">
                        <i class="fas fa-plus"></i> Create Team
                    </button>
                    <button id="browseTeamsBtnMain" class="btn-secondary" style="margin: 0 0.5rem;">
                        <i class="fas fa-search"></i> Browse Teams
                    </button>
                    <button id="joinTeamBtnMain" class="btn-secondary" style="margin: 0 0.5rem;">
                        <i class="fas fa-user-plus"></i> Join Team
                    </button>
                </div>
            </div>
        `;
        document.getElementById('homeRecentTasks').innerHTML = '';
    } else {
        loadHomeDashboard();
    }
}

async function handleLeaveTeam() {
    if (!currentTeam) return alert('No team selected');
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}/leave`, {
            method: 'POST'
        });
        const data = await response.json();
        if (response.ok) {
            teams = teams.filter(t => t.id !== currentTeam.id);
            currentTeam = null;
            renderTeams();
            showHome();
            alert(data.message || 'Left team successfully');
        } else {
            alert(data.error || 'Failed to leave team');
        }
    } catch (err) {
        console.error('Leave team error:', err);
        alert('Network error. Please try again.');
    }
}

async function handleDeleteTeam() {
    if (!currentTeam) return alert('No team selected');
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/teams/${currentTeam.id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok) {
            teams = teams.filter(t => t.id !== currentTeam.id);
            currentTeam = null;
            renderTeams();
            showHome();
            alert(data.message || 'Team deleted successfully');
        } else {
            alert(data.error || 'Failed to delete team');
        }
    } catch (err) {
        console.error('Delete team error:', err);
        alert('Network error. Please try again.');
    }
}

async function loadHomeDashboard() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/user/dashboard`);
        if (!response.ok) return;
        const data = await response.json();
        const statsGrid = document.getElementById('homeStats');
        if (!statsGrid) return;
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h4>${data.total_teams || 0}</h4>
                <p>Your Teams</p>
            </div>
            <div class="stat-card">
                <h4>${data.tasks_assigned || 0}</h4>
                <p>Tasks Assigned to You</p>
            </div>
            <div class="stat-card">
                <h4>${data.total_tasks || 0}</h4>
                <p>Total Tasks</p>
            </div>
        `;
        try {
            const recentRes = await fetchWithAuth(`${API_BASE_URL}/api/user/tasks`);
            if (recentRes.ok) {
                const tasks = await recentRes.json();
                const recentList = document.getElementById('homeRecentTasks');
                if (recentList) {
                    recentList.innerHTML = '<h3>Recent Tasks</h3>' + tasks.map(t => `\
                        <div class="recent-task-card">\
                            <h4>${t.title}</h4>\
                            <p>${t.team_name || 'No team'} - ${t.status || 'No status'}</p>\
                        </div>`).join('');
                }
            }
        } catch (err) {
            console.error('Load recent tasks error:', err);
        }
    } catch (error) {
        console.error('Load home dashboard error:', error);
    }
}

function showAdminIfNeeded() {
    const adminBtn = document.getElementById('adminBtn');
    if (!adminBtn) return;
    if (currentUser && currentUser.is_admin) {
        adminBtn.style.display = 'block';
    } else {
        adminBtn.style.display = 'none';
    }
}

function showAdmin() {
    clearActiveNav();
    document.getElementById('adminBtn').classList.add('active');
    document.getElementById('teamDashboard').style.display = 'none';
    document.getElementById('browseTeamsSection').style.display = 'none';
    document.getElementById('homeDashboard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    showAdminUsers();
}

function showAdminUsers() {
    document.getElementById('adminUsers').style.display = 'block';
    document.getElementById('adminTeams').style.display = 'none';
    loadAdminUsers();
}

function showAdminTeams() {
    document.getElementById('adminUsers').style.display = 'none';
    document.getElementById('adminTeams').style.display = 'block';
    loadAdminTeams();
}

async function loadAdminUsers() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        renderAdminUsers(users);
    } catch (err) {
        console.error('Admin users load error', err);
    }
}

function renderAdminUsers(users) {
    const el = document.getElementById('adminUsers');
    el.innerHTML = '';
    if (!users || users.length === 0) {
        el.innerHTML = '<div class="no-teams">No users found</div>';
        return;
    }
    users.forEach(user => {
        const u = document.createElement('div');
        u.className = 'admin-user-card';
        u.innerHTML = `
            <div class="admin-user-info">
                <strong>${user.full_name}</strong> (${user.student_id})<br>
                <small>${user.email}</small>
            </div>
            <div class="admin-user-actions">
                <button class="btn-secondary btn-sm" data-id="${user.id}" data-action="toggleAdmin">${user.is_admin ? 'Revoke Admin' : 'Make Admin'}</button>
                <button class="btn-danger btn-sm" data-id="${user.id}" data-action="deleteUser">Delete</button>
            </div>
        `;
        u.querySelectorAll('button').forEach(b => {
            b.addEventListener('click', async (ev) => {
                const action = b.getAttribute('data-action');
                const id = b.getAttribute('data-id');
                if (action === 'toggleAdmin') {
                    await handleAdminUserEdit(id);
                } else if (action === 'deleteUser') {
                    await handleAdminUserDelete(id);
                }
            });
        });
        el.appendChild(u);
    });
}

async function handleAdminUserEdit(userId) {
    try {
        const answer = confirm('Toggle admin status for this user?');
        if (!answer) return;

        const resp = await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);
        const users = await resp.json();
        const user = users.find(u => +u.id === +userId);
        if (!user) return alert('User not found');

        const updated = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ is_admin: !user.is_admin })
        });
        if (!updated.ok) throw new Error('Failed to update user');
        alert('User updated');
        loadAdminUsers();
    } catch (err) {
        console.error('Admin edit error', err);
        alert('Failed to update user');
    }
}

async function handleAdminUserDelete(userId) {
    try {
        const confirmDelete = confirm('Are you sure you want to delete this user? This cannot be undone.');
        if (!confirmDelete) return;
        const resp = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Delete failed');
        alert('User deleted');
        loadAdminUsers();
    } catch (err) {
        console.error('Delete user error', err);
        alert('Failed to delete user');
    }
}

async function loadAdminTeams() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/teams`);
        if (!response.ok) throw new Error('Failed to load teams');
        const teams = await response.json();
        renderAdminTeams(teams);
    } catch (err) {
        console.error('Admin teams load error', err);
    }
}

function renderAdminTeams(teams) {
    const el = document.getElementById('adminTeams');
    el.innerHTML = '';
    if (!teams || teams.length === 0) {
        el.innerHTML = '<div class="no-teams">No teams found</div>';
        return;
    }
    teams.forEach(team => {
        const t = document.createElement('div');
        t.className = 'admin-team-card';
        t.innerHTML = `
            <div class="admin-team-info">
                <strong>${team.team_name}</strong> (Creator: ${team.creator_name || 'n/a'})
                <div class="muted">Code: ${team.team_code} · Members: ${team.member_count}</div>
            </div>
            <div class="admin-team-actions">
                <button class="btn-danger btn-sm" data-id="${team.id}" data-action="deleteTeam">Delete Team</button>
            </div>
        `;
        t.querySelector('button').addEventListener('click', async (ev) => {
            const id = ev.target.getAttribute('data-id');
            const answer = confirm('Delete team and all tasks/members?');
            if (!answer) return;
            try {
                const resp = await fetchWithAuth(`${API_BASE_URL}/api/admin/teams/${id}`, { method: 'DELETE' });
                if (!resp.ok) throw new Error('Delete failed');
                alert('Team deleted');
                loadAdminTeams();
            } catch (err) {
                console.error('Delete team error', err);
                alert('Failed to delete team');
            }
        });
        el.appendChild(t);
    });
}
