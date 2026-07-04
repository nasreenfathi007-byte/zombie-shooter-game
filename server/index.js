const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const JWT_SECRET = process.env.JWT_SECRET || 'among_us_secret_dev';

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../client')));

const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
};

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
    if (err) return res.status(400).json({ error: 'Username already exists' });
    res.json({ message: 'User registered' });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  });
});

app.get('/users/search', authenticate, (req, res) => {
  const { q } = req.query;
  db.all(`SELECT id, username FROM users WHERE username LIKE ? AND id != ?`, [`%${q}%`, req.userId], (err, users) => {
    res.json(users || []);
  });
});

app.post('/friends/request', authenticate, (req, res) => {
  const { friendId } = req.body;
  db.run(`INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')`, [req.userId, friendId], (err) => {
    if (err) return res.status(400).json({ error: 'Request already sent' });
    res.json({ message: 'Friend request sent' });
  });
});

app.get('/friends/requests', authenticate, (req, res) => {
  db.all(`SELECT users.id, users.username FROM friends JOIN users ON friends.user_id = users.id WHERE friends.friend_id = ? AND friends.status = 'pending'`, [req.userId], (err, requests) => {
    res.json(requests || []);
  });
});

app.post('/friends/accept', authenticate, (req, res) => {
  const { friendId } = req.body;
  db.run(`UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`, [friendId, req.userId], (err) => {
    db.run(`INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')`, [req.userId, friendId], () => {
      res.json({ message: 'Friend request accepted' });
    });
  });
});

app.get('/friends', authenticate, (req, res) => {
  db.all(`SELECT users.id, users.username FROM friends JOIN users ON friends.friend_id = users.id WHERE friends.user_id = ? AND friends.status = 'accepted'`, [req.userId], (err, friends) => {
    res.json(friends || []);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const rooms = {};
const TASKS = [
    { id: 1, name: 'Swipe Card', x: 1000, y: 1000 },
    { id: 2, name: 'Fix Wiring', x: 700, y: 1000 },
    { id: 3, name: 'Download Data', x: 900, y: 1300 }
];
const COLORS = ['red', 'blue', 'green', 'yellow', 'pink', 'orange', 'black', 'white', 'purple', 'brown', 'cyan', 'lime'];

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join-lobby', ({ username, roomId }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], gameStarted: false, tasksCompleted: 0, totalTasks: 0, meeting: false, votes: {}, criticalSabotage: null };
    }
    const usedColors = rooms[roomId].players.map(p => p.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c)) || 'red';
    const player = { id: socket.id, username, x: 1000, y: 1000, role: 'crewmate', alive: true, tasks: [], color: availableColor };
    rooms[roomId].players.push(player);
    io.to(roomId).emit('update-players', rooms[roomId].players);
    socket.roomId = roomId;
    socket.username = username;
  });

  socket.on('change-color', (color) => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      if (room.gameStarted) return;
      if (!room.players.some(p => p.color === color) && COLORS.includes(color)) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.color = color;
          io.to(socket.roomId).emit('update-players', room.players);
        }
      }
    }
  });

  socket.on('start-game', () => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      room.gameStarted = true;
      room.tasksCompleted = 0;
      room.meeting = false;
      room.votes = {};
      const impostorIndex = Math.floor(Math.random() * room.players.length);
      let engineerIndex = -1;
      if (room.players.length >= 3) {
        do { engineerIndex = Math.floor(Math.random() * room.players.length); } while (engineerIndex === impostorIndex);
      }
      room.players.forEach((p, i) => {
        p.role = (i === impostorIndex) ? 'impostor' : (i === engineerIndex ? 'engineer' : 'crewmate');
        p.alive = true; p.x = 1000; p.y = 1000;
        p.tasks = p.role === 'impostor' ? [] : TASKS.map(t => ({ ...t, completed: false }));
      });
      room.totalTasks = room.players.filter(p => p.role !== 'impostor').length * TASKS.length;
      io.to(socket.roomId).emit('game-started', room.players);
      io.to(socket.roomId).emit('update-task-progress', { completed: 0, total: room.totalTasks });
    }
  });

  socket.on('move', ({ x, y }) => {
    const room = rooms[socket.roomId];
    if (room && !room.meeting) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.alive) { player.x = x; player.y = y; socket.to(socket.roomId).emit('update-players', room.players); }
    }
  });

  socket.on('send_chat', (message) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const chatData = { sender: player.username, message: message.substring(0, 100), isGhost: !player.alive };
    if (!player.alive) {
      room.players.forEach(p => { if (!p.alive) io.to(p.id).emit('chat_message', chatData); });
    } else if (room.meeting) {
      io.to(socket.roomId).emit('chat_message', chatData);
    }
  });

  socket.on('sabotage', (type) => {
    const room = rooms[socket.roomId];
    if (!room || !room.gameStarted) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player && player.role === 'impostor' && player.alive) {
      if (type === 'lights') io.to(socket.roomId).emit('sabotage_triggered', { type: 'lights' });
      else if (!room.criticalSabotage) {
        room.criticalSabotage = { type, timeLeft: 30, fixedBy: new Set() };
        io.to(socket.roomId).emit('sabotage_triggered', { type, timeLeft: 30 });
        const timer = setInterval(() => {
          if (!rooms[socket.roomId] || !room.criticalSabotage) return clearInterval(timer);
          room.criticalSabotage.timeLeft--;
          io.to(socket.roomId).emit('sabotage_timer', room.criticalSabotage.timeLeft);
          if (room.criticalSabotage.timeLeft <= 0) {
            io.to(socket.roomId).emit('game-over', 'Impostors Win! (Sabotage)');
            clearInterval(timer);
          }
        }, 1000);
      }
    }
  });

  socket.on('fix_sabotage', (type) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    if (type === 'lights') io.to(socket.roomId).emit('sabotage_fixed', { type: 'lights' });
    else if (room.criticalSabotage && room.criticalSabotage.type === type) {
      room.criticalSabotage.fixedBy.add(socket.id);
      if (room.criticalSabotage.fixedBy.size >= 2) {
        room.criticalSabotage = null;
        io.to(socket.roomId).emit('sabotage_fixed', { type });
      }
    }
  });

  socket.on('use_vent', (ventId) => {
    const room = rooms[socket.roomId];
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p && (p.role === 'impostor' || p.role === 'engineer') && p.alive) io.to(socket.roomId).emit('player_vented', { playerId: socket.id, ventId });
    }
  });

  socket.on('kill', (targetId) => {
    const room = rooms[socket.roomId];
    if (room && !room.meeting) {
      const imp = room.players.find(p => p.id === socket.id);
      if (imp && imp.role === 'impostor' && imp.alive) {
        const target = room.players.find(p => p.id === targetId);
        if (target && target.alive) {
          target.alive = false;
          io.to(socket.roomId).emit('update-players', room.players);
          const crewCount = room.players.filter(p => p.role !== 'impostor' && p.alive).length;
          const impCount = room.players.filter(p => p.role === 'impostor' && p.alive).length;
          if (crewCount <= impCount) io.to(socket.roomId).emit('game-over', 'Impostors Win!');
        }
      }
    }
  });

  socket.on('report', () => {
    const room = rooms[socket.roomId];
    if (room && !room.meeting) {
      room.meeting = true; room.votes = {};
      io.to(socket.roomId).emit('meeting-started', { reporter: socket.username, players: room.players });
    }
  });

  socket.on('vote', (targetId) => {
    const room = rooms[socket.roomId];
    if (room && room.meeting) {
      const v = room.players.find(p => p.id === socket.id);
      if (v && v.alive && !room.votes[socket.id]) {
        room.votes[socket.id] = targetId;
        const aliveCount = room.players.filter(p => p.alive).length;
        if (Object.keys(room.votes).length >= aliveCount) processVotes(socket.roomId);
      }
    }
  });

  function processVotes(roomId) {
    const room = rooms[roomId];
    const counts = {};
    Object.values(room.votes).forEach(v => { if (v !== 'skip') counts[v] = (counts[v] || 0) + 1; });
    let max = 0, ejectedId = null, tie = false;
    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; ejectedId = id; tie = false; } else if (c === max) tie = true; }
    let msg = "No one was ejected.";
    if (ejectedId && !tie) { const p = room.players.find(p => p.id === ejectedId); p.alive = false; msg = `${p.username} was ejected.`; }
    io.to(roomId).emit('meeting-ended', { ejectionMessage: msg, players: room.players });
    room.meeting = false;
    const crew = room.players.filter(p => p.role !== 'impostor' && p.alive), imps = room.players.filter(p => p.role === 'impostor' && p.alive);
    setTimeout(() => {
      if (imps.length === 0) io.to(roomId).emit('game-over', 'Crewmates Win!');
      else if (crew.length <= imps.length) io.to(roomId).emit('game-over', 'Impostors Win!');
    }, 3000);
  }

  socket.on('complete-task', (id) => {
    const room = rooms[socket.roomId];
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p && p.alive && p.role !== 'impostor') {
        const t = p.tasks.find(t => t.id === id);
        if (t && !t.completed) {
          t.completed = true; room.tasksCompleted++;
          io.to(socket.roomId).emit('update-task-progress', { completed: room.tasksCompleted, total: room.totalTasks });
          if (room.tasksCompleted >= room.totalTasks) io.to(socket.roomId).emit('game-over', 'Crewmates Win! (Tasks)');
        }
      }
    }
  });

  const leave = () => {
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].players = rooms[socket.roomId].players.filter(p => p.id !== socket.id);
      io.to(socket.roomId).emit('update-players', rooms[socket.roomId].players);
    }
  };
  socket.on('leave-lobby', leave);
  socket.on('disconnect', leave);
});
