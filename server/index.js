const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'minimalist_finance_tracker_secret_dev_only';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';

    db.run(sql, [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.get(sql, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    });
});

// Debt Routes
app.get('/api/debts', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC';
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/debts', authenticateToken, (req, res) => {
    const { debtor_name, amount, description } = req.body;
    if (!debtor_name || !amount) return res.status(400).json({ error: 'Missing name or amount' });

    const sql = 'INSERT INTO debts (user_id, debtor_name, amount, description) VALUES (?, ?, ?, ?)';
    db.run(sql, [req.user.id, debtor_name, amount, description], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, debtor_name, amount, description });
    });
});

app.delete('/api/debts/:id', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM debts WHERE id = ? AND user_id = ?';
    db.run(sql, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Debt not found' });
        res.json({ message: 'Debt deleted' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
