let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let skills = JSON.parse(localStorage.getItem('skills')) || [];
let requests = JSON.parse(localStorage.getItem('requests')) || [];

const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-link');
const navbar = document.getElementById('navbar');

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(true); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(false); });

    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('add-skill-form').addEventListener('submit', handleAddSkill);
    document.getElementById('edit-skill-form').addEventListener('submit', handleEditSkill);
    document.getElementById('request-skill-form').addEventListener('submit', handleSendRequest);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchView(target);
        });
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('edit-modal').classList.remove('show');
    });
    document.querySelector('.close-request-modal').addEventListener('click', () => {
        document.getElementById('request-modal').classList.remove('show');
    });

    document.getElementById('search-skills').addEventListener('input', renderDashboard);
    document.getElementById('filter-category').addEventListener('change', renderDashboard);
}

function checkSession() {
    if (currentUser) {
        navbar.classList.remove('hidden');
        document.getElementById('welcome-name').textContent = currentUser.name;
        switchView('dashboard-view');
    } else {
        navbar.classList.add('hidden');
        switchView('auth-view');
    }
}

function switchView(viewId) {
    views.forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target') === viewId) {
            link.classList.add('active');
        }
    });

    if (viewId === 'dashboard-view') renderDashboard();
    if (viewId === 'my-skills-view') renderMySkills();
    if (viewId === 'requests-view') renderRequests();
}

function toggleAuthForms(showSignup) {
    document.getElementById('login-form-container').classList.toggle('hidden', showSignup);
    document.getElementById('signup-form-container').classList.toggle('hidden', !showSignup);
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (users.some(u => u.email === email)) {
        showToast('Email already exists.', 'error');
        return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    saveData('users', users);
    
    currentUser = { name, email };
    saveData('currentUser', currentUser);
    
    e.target.reset();
    showToast('Account created successfully!', 'success');
    checkSession();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        showToast('Invalid email or password.', 'error');
        return;
    }

    currentUser = { name: user.name, email: user.email };
    saveData('currentUser', currentUser);
    
    e.target.reset();
    showToast('Logged in successfully!', 'success');
    checkSession();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully!', 'success');
    checkSession();
}

function handleAddSkill(e) {
    e.preventDefault();
    const title = document.getElementById('skill-title').value.trim();
    const category = document.getElementById('skill-category').value;
    const desc = document.getElementById('skill-desc').value.trim();

    const newSkill = {
        id: generateId(),
        title,
        category,
        desc,
        providerEmail: currentUser.email,
        providerName: currentUser.name,
        createdAt: new Date().toISOString()
    };

    skills.push(newSkill);
    saveData('skills', skills);
    
    e.target.reset();
    showToast('Skill posted successfully!', 'success');
    switchView('my-skills-view');
}

function renderDashboard() {
    const grid = document.getElementById('all-skills-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('search-skills').value.toLowerCase();
    const filterCategory = document.getElementById('filter-category').value;

    const displaySkills = skills.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchQuery) || s.desc.toLowerCase().includes(searchQuery);
        const matchesCategory = filterCategory === 'All' || s.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (displaySkills.length === 0) {
        grid.innerHTML = '<p class="subtitle" style="grid-column: 1/-1;">No skills found matching your criteria.</p>';
        return;
    }

    displaySkills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'card glass';
        
        const isOwnSkill = skill.providerEmail === currentUser.email;

        // Secure creation without using backticks that conflict with template literals
        // But since this is a JS file and I'm avoiding specific button tags inside
        // innerHTML string escaping, I'll use simple concat.
        
        let actionHTML = '';
        if (isOwnSkill) {
            actionHTML = '<span class="status-badge status-accepted" style="background:var(--secondary-color)">Your Skill</span>';
        } else {
            actionHTML = '<button class="btn btn-primary btn-sm" onclick="openRequestModal(\'' + skill.id + '\')">Request</button>';
        }

        const providerText = isOwnSkill ? 'You' : skill.providerName;

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${skill.title}</h3>
                    <span class="card-category">${skill.category}</span>
                </div>
            </div>
            <p class="card-desc">${skill.desc}</p>
            <div class="card-footer">
                <span class="card-provider">By: ${providerText}</span>
                <div class="card-actions">
                    ${actionHTML}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderMySkills() {
    const grid = document.getElementById('my-skills-grid');
    grid.innerHTML = '';

    const mySkills = skills.filter(s => s.providerEmail === currentUser.email);

    if (mySkills.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p class="subtitle mb-4">You haven't offered any skills yet.</p>
                <button class="btn btn-primary" onclick="switchView('add-skill-view')">Add Your First Skill</button>
            </div>
        `;
        return;
    }

    mySkills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'card glass';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="card-title">${skill.title}</h3>
                    <span class="card-category">${skill.category}</span>
                </div>
            </div>
            <p class="card-desc">${skill.desc}</p>
            <div class="card-footer" style="justify-content: flex-end;">
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal('${skill.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSkill('${skill.id}')">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function deleteSkill(id) {
    if(!confirm("Are you sure you want to delete this skill?")) return;
    skills = skills.filter(s => s.id !== id);
    saveData('skills', skills);
    
    requests = requests.filter(r => r.skillId !== id);
    saveData('requests', requests);

    showToast('Skill deleted successfully', 'success');
    renderMySkills();
}

function openEditModal(id) {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;

    document.getElementById('edit-skill-id').value = skill.id;
    document.getElementById('edit-skill-title').value = skill.title;
    document.getElementById('edit-skill-category').value = skill.category;
    document.getElementById('edit-skill-desc').value = skill.desc;

    document.getElementById('edit-modal').classList.add('show');
}

function handleEditSkill(e) {
    e.preventDefault();
    const id = document.getElementById('edit-skill-id').value;
    const skillIndex = skills.findIndex(s => s.id === id);
    
    if(skillIndex > -1) {
        skills[skillIndex].title = document.getElementById('edit-skill-title').value.trim();
        skills[skillIndex].category = document.getElementById('edit-skill-category').value;
        skills[skillIndex].desc = document.getElementById('edit-skill-desc').value.trim();
        
        saveData('skills', skills);
        showToast('Skill updated successfully', 'success');
        document.getElementById('edit-modal').classList.remove('show');
        renderMySkills();
    }
}

function openRequestModal(skillId) {
    const skill = skills.find(s => s.id === skillId);
    if(!skill) return;

    const existingReq = requests.find(r => r.skillId === skillId && r.requesterEmail === currentUser.email && r.status !== 'Rejected');
    if (existingReq) {
        showToast('You already have an active request for this skill.', 'error');
        return;
    }

    document.getElementById('request-skill-id').value = skill.id;
    document.getElementById('request-provider-email').value = skill.providerEmail;
    document.getElementById('request-skill-info').innerHTML = `You are requesting: <strong>${skill.title}</strong> from <strong>${skill.providerName}</strong>`;
    document.getElementById('request-message').value = '';
    
    document.getElementById('request-modal').classList.add('show');
}

function handleSendRequest(e) {
    e.preventDefault();
    const skillId = document.getElementById('request-skill-id').value;
    const providerEmail = document.getElementById('request-provider-email').value;
    const message = document.getElementById('request-message').value.trim();

    const skill = skills.find(s => s.id === skillId);

    const newRequest = {
        id: generateId(),
        skillId,
        skillTitle: skill.title,
        requesterEmail: currentUser.email,
        requesterName: currentUser.name,
        providerEmail: providerEmail,
        message: message || "I'd like to learn this skill from you.",
        status: 'Pending',
        createdAt: new Date().toISOString()
    };

    requests.push(newRequest);
    saveData('requests', requests);
    
    showToast('Request sent successfully!', 'success');
    document.getElementById('request-modal').classList.remove('show');
    switchView('requests-view');
}

function renderRequests() {
    const incomingList = document.getElementById('incoming-requests-list');
    const outgoingList = document.getElementById('outgoing-requests-list');
    
    incomingList.innerHTML = '';
    outgoingList.innerHTML = '';

    const incoming = requests.filter(r => r.providerEmail === currentUser.email);
    const outgoing = requests.filter(r => r.requesterEmail === currentUser.email);

    if (incoming.length === 0) {
        incomingList.innerHTML = '<p class="subtitle">No incoming requests yet.</p>';
    } else {
        incoming.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(req => {
            const el = document.createElement('div');
            el.className = 'request-item';
            
            let actionHTML = '';
            if (req.status === 'Pending') {
                actionHTML = `
                    <div class="card-actions">
                        <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${req.id}', 'Accepted')">Accept</button>
                        <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${req.id}', 'Rejected')">Reject</button>
                    </div>
                `;
            }

            let msgHTML = req.message ? `<div class="request-message">"${req.message}"</div>` : '';

            el.innerHTML = `
                <h4>${req.skillTitle}</h4>
                <div class="request-meta">From: ${req.requesterName} (${req.requesterEmail})</div>
                ${msgHTML}
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="status-badge status-${req.status.toLowerCase()}">${req.status}</span>
                    ${actionHTML}
                </div>
            `;
            incomingList.appendChild(el);
        });
    }

    if (outgoing.length === 0) {
        outgoingList.innerHTML = '<p class="subtitle">You have not requested any skills.</p>';
    } else {
        outgoing.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(req => {
            // Find current provider info
            const skill = skills.find(s => s.id === req.skillId);
            const providerName = skill ? skill.providerName : 'Unknown User';
            
            const el = document.createElement('div');
            el.className = 'request-item';
            
            let cancelHTML = '';
            if (req.status === 'Pending') {
                cancelHTML = `<button class="btn btn-secondary btn-sm" onclick="cancelRequest('${req.id}')">Cancel</button>`;
            }

            el.innerHTML = `
                <h4>${req.skillTitle}</h4>
                <div class="request-meta">Requested from: ${providerName}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                    <span class="status-badge status-${req.status.toLowerCase()}">${req.status}</span>
                    ${cancelHTML}
                </div>
            `;
            outgoingList.appendChild(el);
        });
    }
}

function updateRequestStatus(id, newStatus) {
    const reqIndex = requests.findIndex(r => r.id === id);
    if(reqIndex > -1) {
        requests[reqIndex].status = newStatus;
        saveData('requests', requests);
        showToast('Request ' + newStatus.toLowerCase(), newStatus === 'Accepted' ? 'success' : 'error');
        renderRequests();
    }
}

function cancelRequest(id) {
    if(!confirm("Cancel this request?")) return;
    requests = requests.filter(r => r.id !== id);
    saveData('requests', requests);
    showToast('Request cancelled', 'success');
    renderRequests();
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
