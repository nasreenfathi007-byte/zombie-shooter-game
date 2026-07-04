let token = localStorage.getItem('token');
let username = localStorage.getItem('username');

if (token) {
    showApp();
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
            alert('Registration successful! Please login.');
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
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-display').innerText = `Hello, ${username}!`;

    // Set default month to current month
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('month-filter').value = `${now.getFullYear()}-${month}`;

    fetchExpenses();
}

async function fetchExpenses() {
    const filter = document.getElementById('month-filter').value; // YYYY-MM
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
    const body = document.getElementById('expenses-body');
    body.innerHTML = '';
    let total = 0;

    expenses.forEach(exp => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = exp.date;
        row.appendChild(dateCell);

        const descCell = document.createElement('td');
        descCell.textContent = exp.description;
        row.appendChild(descCell);

        const catCell = document.createElement('td');
        catCell.textContent = exp.category;
        row.appendChild(catCell);

        const amountCell = document.createElement('td');
        amountCell.textContent = `$${exp.amount.toFixed(2)}`;
        row.appendChild(amountCell);

        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteExpense(exp.id);
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        body.appendChild(row);
        total += exp.amount;
    });

    document.getElementById('total-amount').innerText = total.toFixed(2);
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
            fetchExpenses();
        }
    } catch (err) {
        console.error(err);
    }
});

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

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
