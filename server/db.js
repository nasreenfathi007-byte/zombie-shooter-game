const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./finance.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    description TEXT,
    category TEXT,
    date TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

module.exports = db;
