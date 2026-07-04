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

        const checkbox = document.createElement('div');
        checkbox.className = 'expense-checkbox';
        item.appendChild(checkbox);

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
        amount.textContent = `$${exp.amount.toFixed(2)}`;
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

    document.getElementById('total-amount').innerText = total.toFixed(2);
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
