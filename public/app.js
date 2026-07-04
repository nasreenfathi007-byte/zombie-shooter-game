let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isLightMode = localStorage.getItem('theme') === 'light';

if (isLightMode) {
    document.body.classList.add('light-mode');
    updateThemeIcon();
}

if (token) {
    showApp();
}

function toggleTheme() {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode', isLightMode);
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    if (isLightMode) {
        // Sun icon
        icon.innerHTML = '<path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.88,4.88L18,4V7.12L20.88,10L20,13.12V16.26L17.12,19.14L14,18.26V21.12L10.88,24L8,21.12V18.26L5.12,15.38L6,12.26V9.12L3.12,6.24L6,5.38V2.26L9.12,3.12L12,2Z" />';
    } else {
        // Moon icon
        icon.innerHTML = '<path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
    }
}

function toggleAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

async function register() {
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
            alert('Account created! Please sign in.');
            toggleAuth();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
    }
}

async function login() {
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
            showApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        console.error(err);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    location.reload();
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('user-display').innerText = username;

    // Set default month to current month
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('month-filter').value = `${now.getFullYear()}-${month}`;

    fetchExpenses();
}

async function fetchExpenses() {
    const filter = document.getElementById('month-filter').value;
    try {
        const res = await fetch('/api/expenses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            let expenses = await res.json();
            if (filter) {
                expenses = expenses.filter(exp => exp.date.startsWith(filter));
            }
            renderExpenses(expenses);
        } else if (res.status === 403 || res.status === 401) {
            logout();
        }
    } catch (err) {
        console.error(err);
    }
}

function renderExpenses(expenses) {
    const container = document.getElementById('expenses-list');
    container.innerHTML = '';
    let total = 0;

    if (expenses.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #5f6368; margin-top: 48px;">No expenses for this month.</div>';
    }

    expenses.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'expense-item';

        const content = document.createElement('div');
        content.className = 'expense-content';

        const title = document.createElement('div');
        title.className = 'expense-title';
        title.textContent = exp.description;
        content.appendChild(title);

        const details = document.createElement('div');
        details.className = 'expense-details';

        const date = document.createElement('span');
        date.textContent = exp.date;
        details.appendChild(date);

        const cat = document.createElement('span');
        cat.className = 'expense-category';
        cat.textContent = exp.category;
        details.appendChild(cat);

        content.appendChild(details);
        item.appendChild(content);

        const amount = document.createElement('div');
        amount.className = 'expense-amount';
        amount.textContent = `₹${exp.amount.toFixed(2)}`;
        item.appendChild(amount);

        const delBtn = document.createElement('div');
        delBtn.className = 'delete-icon';
        delBtn.innerHTML = '<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteExpense(exp.id);
        };
        item.appendChild(delBtn);

        container.appendChild(item);
        total += exp.amount;
    });

    document.getElementById('total-amount').innerText = `₹${total.toFixed(2)}`;
}

function openModal() {
    document.getElementById('expense-modal').style.display = 'flex';
    document.getElementById('date').valueAsDate = new Date();
}

function closeModal() {
    document.getElementById('expense-modal').style.display = 'none';
}

document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount, description, category, date })
        });
        if (res.ok) {
            document.getElementById('expense-form').reset();
            closeModal();
            fetchExpenses();
        }
    } catch (err) {
        console.error(err);
    }
});

async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;

    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchExpenses();
        }
    } catch (err) {
        console.error(err);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('expense-modal');
    if (event.target == modal) {
        closeModal();
    }
}
