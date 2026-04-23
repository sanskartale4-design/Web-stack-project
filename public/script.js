const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token') || null;

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

    // Instead of real-time filtering without fetching, we fetch once and filter in memory for speed
    document.getElementById('search-skills').addEventListener('input', () => renderDashboard());
    document.getElementById('filter-category').addEventListener('change', () => renderDashboard());
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    // Safety check: Make sure what we got back is actually JSON
    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        // If Railway returned a 502/503 HTML page or our catch block returned text
        const textError = await response.text();
        throw new Error(textError ? textError.substring(0, 50) + "..." : `HTTP Error ${response.status}`);
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

async function checkSession() {
    if (token) {
        try {
            currentUser = await apiCall('/auth/me');
            navbar.classList.remove('hidden');
            document.getElementById('welcome-name').textContent = currentUser.name;
            switchView('dashboard-view');
        } catch (err) {
            handleLogout();
        }
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

    if (viewId === 'dashboard-view') renderDashboard(true);
    if (viewId === 'my-skills-view') renderMySkills();
    if (viewId === 'requests-view') renderRequests();
}

function toggleAuthForms(showSignup) {
    document.getElementById('login-form-container').classList.toggle('hidden', showSignup);
    document.getElementById('signup-form-container').classList.toggle('hidden', !showSignup);
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
        const data = await apiCall('/auth/register', 'POST', { name, email, password });
        token = data.token;
        localStorage.setItem('token', token);
        e.target.reset();
        showToast('Account created successfully!', 'success');
        checkSession();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiCall('/auth/login', 'POST', { email, password });
        token = data.token;
        localStorage.setItem('token', token);
        e.target.reset();
        showToast('Logged in successfully!', 'success');
        checkSession();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function handleLogout() {
    currentUser = null;
    token = null;
    localStorage.removeItem('token');
    showToast('Logged out successfully!', 'success');
    navbar.classList.add('hidden');
    switchView('auth-view');
}

async function handleAddSkill(e) {
    e.preventDefault();
    const title = document.getElementById('skill-title').value.trim();
    const category = document.getElementById('skill-category').value;
    const desc = document.getElementById('skill-desc').value.trim();

    try {
        await apiCall('/skills', 'POST', { title, category, desc });
        e.target.reset();
        showToast('Skill posted successfully!', 'success');
        switchView('my-skills-view');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

let allSkillsCache = [];

async function renderDashboard(fetchData = false) {
    const grid = document.getElementById('all-skills-grid');
    grid.innerHTML = '<p class="subtitle" style="grid-column: 1/-1;">Loading skills...</p>';

    if (fetchData || allSkillsCache.length === 0) {
        try {
            allSkillsCache = await apiCall('/skills');
        } catch (err) {
            grid.innerHTML = `<p class="subtitle" style="grid-column: 1/-1; color: var(--danger-color);">${err.message}</p>`;
            return;
        }
    }

    const searchQuery = document.getElementById('search-skills').value.toLowerCase();
    const filterCategory = document.getElementById('filter-category').value;

    const displaySkills = allSkillsCache.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchQuery) || s.desc.toLowerCase().includes(searchQuery);
        const matchesCategory = filterCategory === 'All' || s.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (displaySkills.length === 0) {
        grid.innerHTML = '<p class="subtitle" style="grid-column: 1/-1;">No skills found matching your criteria.</p>';
        return;
    }

    grid.innerHTML = '';
    displaySkills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'card glass';
        
        const isOwnSkill = skill.providerId === currentUser._id;
        
        let actionHTML = '';
        if (isOwnSkill) {
            actionHTML = '<span class="status-badge status-accepted" style="background:var(--secondary-color)">Your Skill</span>';
        } else {
            actionHTML = `<button class="btn btn-primary btn-sm" onclick="openRequestModal('${skill._id}', '${skill.title.replace(/'/g, "\\'")}', '${skill.providerEmail}', '${skill.providerName.replace(/'/g, "\\'")}')">Request</button>`;
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

async function renderMySkills() {
    const grid = document.getElementById('my-skills-grid');
    grid.innerHTML = '<p class="subtitle" style="grid-column: 1/-1;">Loading your skills...</p>';

    try {
        const mySkills = await apiCall('/skills/my');

        if (mySkills.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p class="subtitle mb-4">You haven't offered any skills yet.</p>
                    <button class="btn btn-primary" onclick="switchView('add-skill-view')">Add Your First Skill</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
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
                        <button class="btn btn-secondary btn-sm" onclick="openEditModal('${skill._id}', '${skill.title.replace(/'/g, "\\'")}', '${skill.category}', '${skill.desc.replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteSkill('${skill._id}')">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = `<p class="subtitle" style="grid-column: 1/-1; color: var(--danger-color);">${err.message}</p>`;
    }
}

async function deleteSkill(id) {
    if(!confirm("Are you sure you want to delete this skill?")) return;
    try {
        await apiCall(`/skills/${id}`, 'DELETE');
        showToast('Skill deleted successfully', 'success');
        renderMySkills();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function openEditModal(id, title, category, desc) {
    document.getElementById('edit-skill-id').value = id;
    document.getElementById('edit-skill-title').value = title;
    document.getElementById('edit-skill-category').value = category;
    document.getElementById('edit-skill-desc').value = desc;

    document.getElementById('edit-modal').classList.add('show');
}

async function handleEditSkill(e) {
    e.preventDefault();
    const id = document.getElementById('edit-skill-id').value;
    const title = document.getElementById('edit-skill-title').value.trim();
    const category = document.getElementById('edit-skill-category').value;
    const desc = document.getElementById('edit-skill-desc').value.trim();

    try {
        await apiCall(`/skills/${id}`, 'PUT', { title, category, desc });
        showToast('Skill updated successfully', 'success');
        document.getElementById('edit-modal').classList.remove('show');
        renderMySkills();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function openRequestModal(skillId, skillTitle, providerEmail, providerName) {
    document.getElementById('request-skill-id').value = skillId;
    document.getElementById('request-provider-email').value = providerEmail;
    document.getElementById('request-skill-info').innerHTML = `You are requesting: <strong>${skillTitle}</strong> from <strong>${providerName}</strong>`;
    document.getElementById('request-message').value = '';
    
    document.getElementById('request-modal').classList.add('show');
}

async function handleSendRequest(e) {
    e.preventDefault();
    const skillId = document.getElementById('request-skill-id').value;
    const message = document.getElementById('request-message').value.trim();

    try {
        await apiCall('/requests', 'POST', { skillId, message: message || undefined });
        showToast('Request sent successfully!', 'success');
        document.getElementById('request-modal').classList.remove('show');
        switchView('requests-view');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function renderRequests() {
    const incomingList = document.getElementById('incoming-requests-list');
    const outgoingList = document.getElementById('outgoing-requests-list');
    
    incomingList.innerHTML = '<p class="subtitle">Loading...</p>';
    outgoingList.innerHTML = '<p class="subtitle">Loading...</p>';

    try {
        const { incoming, outgoing } = await apiCall('/requests');

        incomingList.innerHTML = '';
        outgoingList.innerHTML = '';

        if (incoming.length === 0) {
            incomingList.innerHTML = '<p class="subtitle">No incoming requests yet.</p>';
        } else {
            incoming.forEach(req => {
                const el = document.createElement('div');
                el.className = 'request-item';
                
                let actionHTML = '';
                if (req.status === 'Pending') {
                    actionHTML = `
                        <div class="card-actions">
                            <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${req._id}', 'Accepted')">Accept</button>
                            <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${req._id}', 'Rejected')">Reject</button>
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
            outgoing.forEach(req => {
                const el = document.createElement('div');
                el.className = 'request-item';
                
                let cancelHTML = '';
                if (req.status === 'Pending') {
                    cancelHTML = `<button class="btn btn-secondary btn-sm" onclick="cancelRequest('${req._id}')">Cancel</button>`;
                }

                el.innerHTML = `
                    <h4>${req.skillTitle}</h4>
                    <div class="request-meta">Requested from: ${req.providerEmail}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                        <span class="status-badge status-${req.status.toLowerCase()}">${req.status}</span>
                        ${cancelHTML}
                    </div>
                `;
                outgoingList.appendChild(el);
            });
        }
    } catch (err) {
        incomingList.innerHTML = `<p class="subtitle" style="color: var(--danger-color);">${err.message}</p>`;
        outgoingList.innerHTML = `<p class="subtitle" style="color: var(--danger-color);">${err.message}</p>`;
    }
}

async function updateRequestStatus(id, newStatus) {
    try {
        await apiCall(`/requests/${id}`, 'PATCH', { status: newStatus });
        showToast('Request ' + newStatus.toLowerCase(), newStatus === 'Accepted' ? 'success' : 'error');
        renderRequests();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cancelRequest(id) {
    if(!confirm("Cancel this request?")) return;
    try {
        await apiCall(`/requests/${id}`, 'PATCH'); // No status body = cancel
        showToast('Request cancelled', 'success');
        renderRequests();
    } catch (err) {
        showToast(err.message, 'error');
    }
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
