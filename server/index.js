require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Register endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(query, [username, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, username });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ auth: false, token: null });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    res.status(200).json({ auth: true, token, username: user.username });
  });
});

// Get all expenses for a user
app.get('/api/expenses', authenticateToken, (req, res) => {
  const query = `SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC`;
  db.all(query, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(rows);
  });
});

// Add a new expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  const { amount, description, category, date } = req.body;
  if (!amount || !description || !category || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = `INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [req.user.id, amount, description, category, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, amount, description, category, date });
  });
});

// Delete an expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const query = `DELETE FROM expenses WHERE id = ? AND user_id = ?`;
  db.run(query, [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Expense not found or unauthorized' });
    res.status(200).json({ message: 'Expense deleted' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
