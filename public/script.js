const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const authError = document.getElementById('auth-error');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const debtForm = document.getElementById('debt-form');
const debtsList = document.getElementById('debts-list');

let token = localStorage.getItem('token');
let username = localStorage.getItem('username');

// App Initialization
if (token) {
    showDashboard();
}

// Auth Tab Switching
showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    authError.textContent = '';
});

showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    showLoginBtn.classList.remove('active');
    showRegisterBtn.classList.add('active');
    authError.textContent = '';
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            username = data.username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            showDashboard();
        } else {
            authError.textContent = data.error;
        }
    } catch (err) {
        authError.textContent = 'Server error';
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('register-username').value;
    const pass = document.getElementById('register-password').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            authError.style.color = '#bb86fc';
            authError.textContent = 'Registered! Please login.';
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            showLoginBtn.classList.add('active');
            showRegisterBtn.classList.remove('active');
        } else {
            authError.textContent = data.error;
        }
    } catch (err) {
        authError.textContent = 'Server error';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    token = null;
    username = null;
    dashboardSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    loginForm.reset();
    registerForm.reset();
});

// Dashboard Actions
function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userDisplay.textContent = `Hello, ${username}`;
    loadDebts();
}

async function loadDebts() {
    try {
        const res = await fetch('/api/debts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const debts = await res.json();
        renderDebts(debts);
    } catch (err) {
        console.error('Failed to load debts');
    }
}

function renderDebts(debts) {
    debtsList.innerHTML = '';
    if (debts.length === 0) {
        debtsList.innerHTML = '<p class="subtitle" style="text-align:center">No debts recorded yet.</p>';
        return;
    }
    debts.forEach(debt => {
        const item = document.createElement('div');
        item.className = 'debt-item';
        item.innerHTML = `
            <div class="debt-info">
                <h4>${escapeHtml(debt.debtor_name)}</h4>
                <p>${escapeHtml(debt.description || '')}</p>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <span class="debt-amount">$${debt.amount.toFixed(2)}</span>
                <button class="delete-debt" onclick="deleteDebt(${debt.id})">&times;</button>
            </div>
        `;
        debtsList.appendChild(item);
    });
}

debtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('debtor-name').value;
    const amount = document.getElementById('debt-amount').value;
    const desc = document.getElementById('debt-description').value;

    try {
        const res = await fetch('/api/debts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ debtor_name: name, amount: parseFloat(amount), description: desc })
        });
        if (res.ok) {
            debtForm.reset();
            loadDebts();
        }
    } catch (err) {
        console.error('Failed to add debt');
    }
});

async function deleteDebt(id) {
    if (!confirm('Mark as settled?')) return;
    try {
        const res = await fetch(`/api/debts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadDebts();
        }
    } catch (err) {
        console.error('Failed to delete debt');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
