const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const lobbyContainer = document.getElementById('lobby-container');
const gameContainer = document.getElementById('game-container');
const startGameBtn = document.getElementById('start-game-btn');
const killBtn = document.getElementById('kill-btn');
const sabotageBtn = document.getElementById('sabotage-btn');
const sabotageMenu = document.getElementById('sabotage-menu');
const reportBtn = document.getElementById('report-btn');
const useBtn = document.getElementById('use-btn');
const roleDisplay = document.getElementById('role-display');
const taskBarInner = document.getElementById('task-bar-inner');

const meetingUI = document.getElementById('meeting-ui');
const votingList = document.getElementById('voting-list');
const skipVoteBtn = document.getElementById('skip-vote-btn');
const ejectionScreen = document.getElementById('ejection-screen');
const ejectionText = document.getElementById('ejection-text');

const splashScreen = document.getElementById('splash-screen');
const roleText = document.getElementById('role-text');

let players = [];
let myId = null;
let keys = {};
let myRole = 'crewmate';
let currentTask = null;
let amAlive = true;

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;

const ROOMS = [
    { name: 'Cafeteria', x: 800, y: 800, w: 400, h: 400 },
    { name: 'Medbay', x: 600, y: 900, w: 200, h: 200 },
    { name: 'Reactor', x: 200, y: 900, w: 200, h: 200 },
    { name: 'Security', x: 400, y: 900, w: 200, h: 200 },
    { name: 'Electrical', x: 800, y: 1200, w: 200, h: 200 },
    { name: 'Admin', x: 1200, y: 1000, w: 200, h: 200 },
    { name: 'O2', x: 1200, y: 800, w: 200, h: 200 }
];

const VENTS = [
    { id: 1, x: 850, y: 850 },
    { id: 2, x: 250, y: 950 },
    { id: 3, x: 850, y: 1250 },
    { id: 4, x: 1250, y: 850 }
];

let nearVent = null;
let nearSabotage = null;
let showSecurity = false;
let showAdmin = false;
let lightsOut = false;
let criticalSabotage = null;

socket.on('connect', () => {
    myId = socket.id;
});

startGameBtn.onclick = () => {
    socket.emit('start-game');
};

socket.on('game-started', (updatedPlayers) => {
    players = updatedPlayers;
    lobbyContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    const me = players.find(p => p.id === socket.id);
    if (me) {
        myRole = me.role;
        amAlive = true;

        splashScreen.classList.remove('hidden');
        roleText.innerText = myRole.toUpperCase();
        roleText.style.color = (myRole === 'impostor') ? 'red' : (myRole === 'engineer' ? 'orange' : 'green');

        setTimeout(() => {
            splashScreen.classList.add('hidden');
        }, 3000);

        roleDisplay.innerText = `ROLE: ${myRole.toUpperCase()}`;
        roleDisplay.style.color = roleText.style.color;
        if (myRole === 'impostor') {
            killBtn.classList.remove('hidden');
            sabotageBtn.classList.remove('hidden');
        } else {
            killBtn.classList.add('hidden');
            sabotageBtn.classList.add('hidden');
        }
    }
});

socket.on('update-players', (updatedPlayers) => {
    players = updatedPlayers;
    const me = players.find(p => p.id === socket.id);
    if (me && !me.alive) {
        amAlive = false;
        roleDisplay.innerText = "YOU ARE DEAD (GHOST)";
        roleDisplay.style.color = "gray";
        killBtn.classList.add('hidden');
        sabotageBtn.classList.add('hidden');
    }
});

socket.on('sabotage_triggered', (data) => {
    if (data.type === 'lights') lightsOut = true;
    else criticalSabotage = data;
});

socket.on('sabotage_fixed', (data) => {
    if (data.type === 'lights') lightsOut = false;
    else criticalSabotage = null;
});

socket.on('sabotage_timer', (timeLeft) => {
    if (criticalSabotage) criticalSabotage.timeLeft = timeLeft;
});

socket.on('update-task-progress', ({ completed, total }) => {
    const progress = (completed / total) * 100;
    taskBarInner.style.width = `${progress}%`;
});

socket.on('meeting-started', ({ reporter, players: meetingPlayers }) => {
    players = meetingPlayers;
    meetingUI.classList.remove('hidden');
    votingList.innerHTML = '';

    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'vote-item' + (p.alive ? '' : ' dead-vote-item');
        div.style.color = p.color;
        div.innerText = p.username + (p.alive ? '' : ' (DEAD)');
        if (p.alive && amAlive) {
            div.onclick = () => {
                socket.emit('vote', p.id);
                document.querySelectorAll('.vote-item').forEach(el => el.classList.remove('voted'));
                div.classList.add('voted');
            };
        }
        votingList.appendChild(div);
    });
});

skipVoteBtn.onclick = () => {
    if (amAlive) {
        socket.emit('vote', 'skip');
        skipVoteBtn.innerText = "Skipped!";
    }
};

function triggerSabotage(type) {
    socket.emit('sabotage', type);
    sabotageMenu.classList.add('hidden');
}

sabotageBtn.onclick = () => {
    sabotageMenu.classList.toggle('hidden');
};

socket.on('meeting-ended', ({ ejectionMessage, players: updatedPlayers }) => {
    players = updatedPlayers;
    meetingUI.classList.add('hidden');
    ejectionScreen.classList.remove('hidden');
    ejectionText.innerText = ejectionMessage;

    setTimeout(() => {
        ejectionScreen.classList.add('hidden');
        skipVoteBtn.innerText = "Skip Vote";
    }, 3000);
});

socket.on('game-over', (msg) => {
    alert(msg);
    location.reload();
});

socket.on('chat_message', (data) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg' + (data.isGhost ? ' ghost' : '');

    const senderSpan = document.createElement('span');
    senderSpan.className = 'sender';
    senderSpan.textContent = `${data.sender}${data.isGhost ? ' (Ghost)' : ''}: `;

    const textNode = document.createTextNode(data.message);

    msgDiv.appendChild(senderSpan);
    msgDiv.appendChild(textNode);

    document.getElementById('chat-messages').appendChild(msgDiv);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
});

document.getElementById('chat-send-btn').onclick = () => {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (msg) {
        socket.emit('send_chat', msg);
        input.value = '';
    }
};

killBtn.onclick = () => {
    const me = players.find(p => p.id === socket.id);
    if (!me || me.role !== 'impostor' || !me.alive) return;

    let closest = null;
    let minDist = 80;

    players.forEach(p => {
        if (p.id !== socket.id && p.alive) {
            const dist = Math.hypot(p.x - me.x, p.y - me.y);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }
    });

    if (closest) {
        socket.emit('kill', closest.id);
    }
};

useBtn.onclick = () => {
    const me = players.find(p => p.id === socket.id);
    if (!me || !me.alive) return;

    if (currentTask) {
        socket.emit('complete-task', currentTask.id);
        alert(`Completed task: ${currentTask.name}`);
    } else if (nearSabotage) {
        socket.emit('fix_sabotage', nearSabotage);
    } else if (nearVent && (myRole === 'impostor' || myRole === 'engineer')) {
        const nextVent = VENTS.find(v => v.id !== nearVent.id);
        if (nextVent) {
            me.x = nextVent.x;
            me.y = nextVent.y;
            socket.emit('move', { x: me.x, y: me.y });
        }
    }
};

reportBtn.onclick = () => {
    socket.emit('report');
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function update() {
    if (!meetingUI.classList.contains('hidden')) return;
    if (!splashScreen.classList.contains('hidden')) return;

    const me = players.find(p => p.id === socket.id);
    if (me) {
        let moved = false;
        let speed = me.alive ? 4 : 8;
        if (keys['ArrowUp'] || keys['KeyW']) { me.y -= speed; moved = true; }
        if (keys['ArrowDown'] || keys['KeyS']) { me.y += speed; moved = true; }
        if (keys['ArrowLeft'] || keys['KeyA']) { me.x -= speed; moved = true; }
        if (keys['ArrowRight'] || keys['KeyD']) { me.x += speed; moved = true; }

        if (moved) {
            socket.emit('move', { x: me.x, y: me.y });
        }

        showSecurity = (Math.hypot(425 - me.x, 925 - me.y) < 60);
        showAdmin = (Math.hypot(1225 - me.x, 1025 - me.y) < 60);

        nearVent = null;
        VENTS.forEach(v => {
            if (Math.hypot(v.x - me.x, v.y - me.y) < 60) nearVent = v;
        });

        nearSabotage = null;
        if (criticalSabotage) {
            if (criticalSabotage.type === 'reactor' && me.x >= 200 && me.x <= 400 && me.y >= 900 && me.y <= 1100) nearSabotage = 'reactor';
            if (criticalSabotage.type === 'o2' && me.x >= 1200 && me.x <= 1400 && me.y >= 800 && me.y <= 1000) nearSabotage = 'o2';
        }
        if (lightsOut && me.x >= 800 && me.x <= 1000 && me.y >= 1200 && me.y <= 1400) nearSabotage = 'lights';

        currentTask = null;
        if (me.role !== 'impostor' && me.alive) {
            me.tasks.forEach(t => {
                if (!t.completed) {
                    const dist = Math.hypot(t.x - me.x, t.y - me.y);
                    if (dist < 60) currentTask = t;
                }
            });
        }

        useBtn.style.opacity = (currentTask || nearSabotage || (nearVent && (myRole === 'impostor' || myRole === 'engineer'))) ? '1.0' : '0.5';
    }
}

function drawPlayer(p) {
    ctx.save();
    if (!p.alive) ctx.globalAlpha = 0.3;
    const color = p.color || 'red';
    ctx.fillStyle = color;
    ctx.fillRect(p.x - 25, p.y - 15, 15, 30);
    ctx.beginPath();
    ctx.arc(p.x, p.y - 10, 20, Math.PI, 0);
    ctx.lineTo(p.x + 20, p.y + 20);
    ctx.arc(p.x + 10, p.y + 20, 10, 0, Math.PI);
    ctx.arc(p.x - 10, p.y + 20, 10, 0, Math.PI);
    ctx.lineTo(p.x - 20, p.y - 10);
    ctx.fill();
    ctx.fillStyle = '#83d3e3';
    ctx.beginPath();
    ctx.ellipse(p.x + 10, p.y - 10, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, p.x, p.y - 45);
    ctx.restore();
}

function drawMap() {
    ctx.fillStyle = lightsOut ? '#000' : '#1a1a1a';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    for(let i=0; i<MAP_WIDTH; i+=100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MAP_HEIGHT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MAP_WIDTH, i); ctx.stroke();
    }
    ctx.lineWidth = 15;
    ROOMS.forEach(room => {
        ctx.strokeStyle = '#444';
        ctx.strokeRect(room.x, room.y, room.w, room.h);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(room.x, room.y, room.w, room.h);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(room.name, room.x + 10, room.y + 40);
    });
    ctx.fillStyle = 'blue'; ctx.fillRect(410, 910, 30, 30);
    ctx.fillStyle = 'green'; ctx.fillRect(1210, 1010, 30, 30);
    ctx.fillStyle = '#555';
    VENTS.forEach(v => {
        ctx.beginPath(); ctx.ellipse(v.x, v.y, 25, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'black'; ctx.stroke();
    });
    const me = players.find(p => p.id === socket.id);
    if (me && me.role !== 'impostor' && me.alive) {
        me.tasks.forEach(t => {
            if (!t.completed) {
                ctx.fillStyle = 'yellow';
                ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'white'; ctx.fillText("TASK", t.x, t.y - 20);
            }
        });
    }
}

function draw() {
    update();
    const me = players.find(p => p.id === socket.id) || {x: 1000, y: 1000};
    ctx.save();
    ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);
    drawMap();
    players.forEach(p => {
        if (!lightsOut || p.id === socket.id || myRole === 'impostor') drawPlayer(p);
    });
    ctx.restore();
    if (criticalSabotage) {
        ctx.fillStyle = 'red'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`CRITICAL: ${criticalSabotage.type.toUpperCase()} - ${criticalSabotage.timeLeft}s`, canvas.width / 2, 100);
    }
    if (showSecurity) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
        const views = [ROOMS[0], ROOMS[1], ROOMS[4], ROOMS[6]];
        views.forEach((room, i) => {
            const vx = 100 + (i % 2) * (canvas.width/2 - 100), vy = 120 + Math.floor(i / 2) * (canvas.height/2 - 120);
            const vw = canvas.width/2 - 200, vh = canvas.height/2 - 200;
            ctx.fillStyle = 'black'; ctx.fillRect(vx, vy, vw, vh);
            ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
            ctx.translate(vx + vw/2, vy + vh/2); ctx.scale(0.3, 0.3); ctx.translate(-room.x - room.w/2, -room.y - room.h/2);
            players.forEach(p => { if (p.x >= room.x && p.x <= room.x + room.w && p.y >= room.y && p.y <= room.y + room.h) drawPlayer(p); });
            ctx.restore();
            ctx.fillStyle = 'white'; ctx.fillText(room.name, vx + 10, vy + 20);
        });
    }
    if (showAdmin) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(100, 100, canvas.width - 200, canvas.height - 200);
        ROOMS.forEach(room => {
            const count = players.filter(p => p.alive && p.x >= room.x && p.x <= room.x + room.w && p.y >= room.y && p.y <= room.y + room.h).length;
            const ax = 150 + (room.x / MAP_WIDTH) * (canvas.width - 400), ay = 150 + (room.y / MAP_HEIGHT) * (canvas.height - 400);
            ctx.fillStyle = '#333'; ctx.fillRect(ax, ay, 80, 80);
            ctx.fillStyle = 'yellow';
            for(let j=0; j<count; j++) { ctx.beginPath(); ctx.arc(ax + 20 + j*20, ay + 40, 10, 0, Math.PI*2); ctx.fill(); }
            ctx.fillStyle = 'white'; ctx.fillText(room.name, ax, ay - 10);
        });
    }
    requestAnimationFrame(draw);
}
draw();
