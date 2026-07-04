const socket = io();

const friendContainer = document.getElementById('friend-container');
const showFriendsBtn = document.getElementById('show-friends-btn');
const closeFriendsBtn = document.getElementById('close-friends-btn');
const searchUserBtn = document.getElementById('search-user-btn');
const friendSearchInput = document.getElementById('friend-search');
const searchResults = document.getElementById('search-results');
const friendRequestsList = document.getElementById('friend-requests');
const friendList = document.getElementById('friend-list');

const mainMenu = document.getElementById('main-menu');
const lobbyContainer = document.getElementById('lobby-container');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
const lobbyIdDisplay = document.getElementById('lobby-id');
const playerListUI = document.getElementById('player-list');

const gameContainer = document.getElementById('game-container');

showFriendsBtn.onclick = () => {
    friendContainer.classList.remove('hidden');
    loadFriendRequests();
    loadFriends();
};

closeFriendsBtn.onclick = () => {
    friendContainer.classList.add('hidden');
};

searchUserBtn.onclick = async () => {
    const q = friendSearchInput.value;
    const res = await fetch(`/users/search?q=${q}`, {
        headers: { 'Authorization': localStorage.getItem('token') }
    });
    const users = await res.json();
    searchResults.innerHTML = '';
    users.forEach(user => {
        const div = document.createElement('div');
        div.innerHTML = `${user.username} <button onclick="sendFriendRequest(${user.id})">Add</button>`;
        searchResults.appendChild(div);
    });
};

window.sendFriendRequest = async (friendId) => {
    const res = await fetch('/friends/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify({ friendId })
    });
    const data = await res.json();
    alert(data.message || data.error);
};

async function loadFriendRequests() {
    const res = await fetch('/friends/requests', {
        headers: { 'Authorization': localStorage.getItem('token') }
    });
    const requests = await res.json();
    friendRequestsList.innerHTML = '';
    requests.forEach(req => {
        const li = document.createElement('li');
        li.innerHTML = `${req.username} <button onclick="acceptFriendRequest(${req.id})">Accept</button>`;
        friendRequestsList.appendChild(li);
    });
}

window.acceptFriendRequest = async (friendId) => {
    await fetch('/friends/accept', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify({ friendId })
    });
    loadFriendRequests();
    loadFriends();
};

async function loadFriends() {
    const res = await fetch('/friends', {
        headers: { 'Authorization': localStorage.getItem('token') }
    });
    const friends = await res.json();
    friendList.innerHTML = '';
    friends.forEach(f => {
        const li = document.createElement('li');
        li.innerText = f.username;
        friendList.appendChild(li);
    });
}

// Lobby Logic
createRoomBtn.onclick = () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    joinLobby(roomId);
};

joinRoomBtn.onclick = () => {
    const roomId = prompt("Enter Room ID:");
    if (roomId) joinLobby(roomId);
};

function joinLobby(roomId) {
    const username = localStorage.getItem('username');
    socket.emit('join-lobby', { username, roomId });
    mainMenu.classList.add('hidden');
    lobbyContainer.classList.remove('hidden');
    lobbyIdDisplay.innerText = roomId;
}

leaveLobbyBtn.onclick = () => {
    socket.emit('leave-lobby');
    lobbyContainer.classList.add('hidden');
    mainMenu.classList.remove('hidden');
};

const COLORS = ['red', 'blue', 'green', 'yellow', 'pink', 'orange', 'black', 'white', 'purple', 'brown', 'cyan', 'lime'];

socket.on('update-players', (players) => {
    playerListUI.innerHTML = '';
    const usedColors = players.map(p => p.color);

    players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p.username;
        li.style.color = p.color;
        playerListUI.appendChild(li);
    });

    const colorOptions = document.getElementById('color-options');
    if (colorOptions) {
        colorOptions.innerHTML = '';
        COLORS.forEach(c => {
            const dot = document.createElement('div');
            dot.className = 'color-dot' + (usedColors.includes(c) ? ' taken' : '');
            dot.style.backgroundColor = c;
            dot.onclick = () => {
                if (!usedColors.includes(c)) {
                    socket.emit('change-color', c);
                }
            };
            colorOptions.appendChild(dot);
        });
    }

    if (players.length > 0 && players[0].id === socket.id) {
        document.getElementById('start-game-btn').classList.remove('hidden');
    } else {
        document.getElementById('start-game-btn').classList.add('hidden');
    }
});
