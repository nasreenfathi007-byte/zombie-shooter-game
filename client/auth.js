const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');

const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

showRegister.onclick = (e) => {
    if (e) e.preventDefault();
    console.log('Switching to register form');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
};

showLogin.onclick = (e) => {
    if (e) e.preventDefault();
    console.log('Switching to login form');
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
};

registerBtn.onclick = async () => {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
    } else {
        alert('Registered successfully! Please login.');
        showLogin.onclick();
    }
};

loginBtn.onclick = async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
    } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        checkAuth();
    }
};

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-menu').style.display = 'block';
        document.getElementById('user-display').innerText = localStorage.getItem('username');
        return true;
    } else {
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('main-menu').style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
    return false;
}

checkAuth();

document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    location.reload();
};
