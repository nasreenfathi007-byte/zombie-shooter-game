/* ==========================================================================
   J.A.R.V.I.S. // STARK INDUSTRIES AI AGENT SYSTEM SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT & USER PREFERENCES
  // --------------------------------------------------------------------------
  const state = {
    userName: localStorage.getItem('jarvis_user_name') || 'Sir',
    voiceEnabled: true,
    isListening: false,
    arcPowerPct: 100,
    coreTemp: 38.4,
    energyOutput: 10.2,
    voltage: 1.21,
    protocols: {
      sentry: false,
      stealth: false,
      veronica: true,
      cleanslate: false
    },
    tasks: JSON.parse(localStorage.getItem('jarvis_tasks')) || [
      { id: 1, text: "Calibrate Mark LXXXV nanotech repulsors", completed: true },
      { id: 2, text: "Review clean energy grid for Avengers Compound", completed: false },
      { id: 3, text: "Order extra shawarma for the team", completed: false }
    ],
    radarAngle: 0,
    targets: [
      { id: 1, dist: 0.65, angle: 45, label: "SAT-LINK 4", type: "friendly" },
      { id: 2, dist: 0.85, angle: 160, label: "UNKNOWN BOGEY", type: "hostile" },
      { id: 3, dist: 0.35, angle: 280, label: "QUINJET 02", type: "friendly" }
    ]
  };

  // --------------------------------------------------------------------------
  // DOM ELEMENTS
  // --------------------------------------------------------------------------
  const userDisplayName = document.getElementById('user-display-name');
  const btnEditUser = document.getElementById('btn-edit-user');
  const userModal = document.getElementById('user-modal');
  const inputUserName = document.getElementById('input-user-name');
  const btnSaveUser = document.getElementById('btn-save-user');
  const btnCancelUser = document.getElementById('btn-cancel-user');

  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  const chatWindow = document.getElementById('chat-window');
  const commandForm = document.getElementById('command-form');
  const commandInput = document.getElementById('command-input');

  const btnToggleVoice = document.getElementById('btn-toggle-voice');
  const voiceLabel = document.getElementById('voice-label');
  const voiceIcon = document.getElementById('voice-icon');

  const btnToggleMic = document.getElementById('btn-toggle-mic');
  const micLabel = document.getElementById('mic-label');

  const arcCanvas = document.getElementById('arcReactorCanvas');
  const arcCtx = arcCanvas.getContext('2d');

  const audioVizCanvas = document.getElementById('audioVizCanvas');
  const audioVizCtx = audioVizCanvas.getContext('2d');

  const radarCanvas = document.getElementById('tacticalRadarCanvas');
  const radarCtx = radarCanvas.getContext('2d');

  const taskListEl = document.getElementById('task-list');
  const btnAddTask = document.getElementById('btn-add-task');

  // Telemetry elements
  const elArcPowerPct = document.getElementById('arc-power-pct');
  const elCoreTemp = document.getElementById('t-core-temp');
  const elEnergyOut = document.getElementById('t-energy-out');
  const elVoltage = document.getElementById('t-voltage');

  // --------------------------------------------------------------------------
  // CLOCK & TIMERS
  // --------------------------------------------------------------------------
  function updateClock() {
    const now = new Date();
    clockTime.textContent = now.toTimeString().split(' ')[0];
    clockDate.textContent = now.toISOString().split('T')[0];
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --------------------------------------------------------------------------
  // USER PERSONALIZATION
  // --------------------------------------------------------------------------
  function updateUserNameDisplay() {
    userDisplayName.textContent = `${state.userName}`;
  }
  updateUserNameDisplay();

  btnEditUser.addEventListener('click', () => {
    inputUserName.value = state.userName;
    userModal.hidden = false;
  });

  btnCancelUser.addEventListener('click', () => {
    userModal.hidden = true;
  });

  btnSaveUser.addEventListener('click', () => {
    const val = inputUserName.value.trim();
    if (val) {
      state.userName = val;
      localStorage.setItem('jarvis_user_name', val);
      updateUserNameDisplay();
      speak(`User name preference updated to ${val}, Sir.`);
      addJarvisMessage(`Very well, Sir. I shall address you as ${val} henceforth.`);
    }
    userModal.hidden = true;
  });

  // --------------------------------------------------------------------------
  // WEB AUDIO & SYNTHESIZER SFX
  // --------------------------------------------------------------------------
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSciFiSound(type) {
    initAudioContext();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'repulsor') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'alert') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  // --------------------------------------------------------------------------
  // WEB SPEECH API (TEXT TO SPEECH & RECOGNITION)
  // --------------------------------------------------------------------------
  const synth = window.speechSynthesis;
  let jarvisVoice = null;

  function loadVoices() {
    if (!synth) return;
    const voices = synth.getVoices();
    // Prefer British English male/accent for authentic JARVIS vibe
    jarvisVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('British') || v.name.includes('Oliver') || v.name.includes('Daniel') || v.name.includes('Google UK English Male')) ||
                  voices.find(v => v.lang.includes('en')) || voices[0];
  }

  if (synth) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }

  function speak(text) {
    if (!state.voiceEnabled || !synth) return;
    synth.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    if (jarvisVoice) {
      utterance.voice = jarvisVoice;
    }
    utterance.pitch = 0.95; // Slightly deeper, dignified
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      isAudioVizActive = true;
    };
    utterance.onend = () => {
      isAudioVizActive = false;
    };

    synth.speak(utterance);
  }

  // Toggle Voice Output
  btnToggleVoice.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    if (state.voiceEnabled) {
      voiceLabel.textContent = 'VOICE: ON';
      voiceIcon.textContent = '🔊';
      speak("Voice synthesis online, Sir.");
    } else {
      voiceLabel.textContent = 'VOICE: OFF';
      voiceIcon.textContent = '🔇';
      if (synth) synth.cancel();
    }
  });

  // Speech Recognition (Mic Input)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      state.isListening = true;
      btnToggleMic.classList.add('listening');
      micLabel.textContent = 'LISTENING...';
      playSciFiSound('beep');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      commandInput.value = transcript;
      handleCommandSubmit(transcript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };
  }

  function stopListening() {
    state.isListening = false;
    btnToggleMic.classList.remove('listening');
    micLabel.textContent = 'LISTEN';
  }

  btnToggleMic.addEventListener('click', () => {
    if (!recognition) {
      addJarvisMessage("I apologize, Sir. Speech recognition is not supported in this browser environment. You may type commands directly into the terminal.");
      return;
    }

    if (state.isListening) {
      recognition.stop();
      stopListening();
    } else {
      initAudioContext();
      try {
        recognition.start();
      } catch (e) {
        console.warn(e);
      }
    }
  });

  // --------------------------------------------------------------------------
  // CANVAS ANIMATIONS (ARC REACTOR, AUDIO VIZ, TACTICAL RADAR)
  // --------------------------------------------------------------------------
  let arcRotation = 0;
  let isAudioVizActive = false;

  function drawArcReactor() {
    const width = arcCanvas.width;
    const height = arcCanvas.height;
    const cx = width / 2;
    const cy = height / 2;

    arcCtx.clearRect(0, 0, width, height);

    // Outer Glowing Ring
    arcCtx.beginPath();
    arcCtx.arc(cx, cy, 115, 0, Math.PI * 2);
    arcCtx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    arcCtx.lineWidth = 4;
    arcCtx.stroke();

    // Rotating Segmented Outer Ring
    arcCtx.save();
    arcCtx.translate(cx, cy);
    arcCtx.rotate(arcRotation);
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      arcCtx.beginPath();
      arcCtx.arc(0, 0, 100, angle, angle + 0.35);
      arcCtx.strokeStyle = '#00f3ff';
      arcCtx.lineWidth = 6;
      arcCtx.shadowColor = '#00f3ff';
      arcCtx.shadowBlur = 12;
      arcCtx.stroke();
    }
    arcCtx.restore();

    // Inner Counter-Rotating Ring
    arcCtx.save();
    arcCtx.translate(cx, cy);
    arcCtx.rotate(-arcRotation * 1.5);
    const innerSegments = 8;
    for (let i = 0; i < innerSegments; i++) {
      const angle = (i * Math.PI * 2) / innerSegments;
      arcCtx.beginPath();
      arcCtx.arc(0, 0, 75, angle, angle + 0.5);
      arcCtx.strokeStyle = '#0066ff';
      arcCtx.lineWidth = 5;
      arcCtx.shadowColor = '#0066ff';
      arcCtx.shadowBlur = 10;
      arcCtx.stroke();
    }
    arcCtx.restore();

    // Core Glowing Circle
    const gradient = arcCtx.createRadialGradient(cx, cy, 10, cx, cy, 55);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(0, 243, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(0, 102, 255, 0.4)');
    gradient.addColorStop(1, 'transparent');

    arcCtx.beginPath();
    arcCtx.arc(cx, cy, 55, 0, Math.PI * 2);
    arcCtx.fillStyle = gradient;
    arcCtx.fill();

    arcRotation += 0.015;
  }

  // Audio Waveform Visualizer
  let vizPhase = 0;
  function drawAudioViz() {
    const w = audioVizCanvas.width;
    const h = audioVizCanvas.height;
    audioVizCtx.clearRect(0, 0, w, h);

    audioVizCtx.beginPath();
    audioVizCtx.moveTo(0, h / 2);

    const points = 50;
    const step = w / points;

    for (let i = 0; i <= points; i++) {
      const x = i * step;
      let amp = 2; // idle baseline
      if (isAudioVizActive) {
        amp = Math.sin(i * 0.3 + vizPhase) * 14 + Math.cos(i * 0.5 - vizPhase) * 8;
      } else {
        amp = Math.sin(i * 0.2 + vizPhase) * 3;
      }
      const y = h / 2 + amp;
      audioVizCtx.lineTo(x, y);
    }

    audioVizCtx.strokeStyle = isAudioVizActive ? '#00f3ff' : 'rgba(0, 243, 255, 0.4)';
    audioVizCtx.lineWidth = 2;
    audioVizCtx.shadowColor = '#00f3ff';
    audioVizCtx.shadowBlur = isAudioVizActive ? 10 : 2;
    audioVizCtx.stroke();

    vizPhase += 0.15;
  }

  // Tactical Radar Screen
  function drawRadar() {
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 10;

    radarCtx.clearRect(0, 0, w, h);

    // Grid circles
    radarCtx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
    radarCtx.lineWidth = 1;
    [0.3, 0.6, 0.9].forEach(factor => {
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, radius * factor, 0, Math.PI * 2);
      radarCtx.stroke();
    });

    // Crosshairs
    radarCtx.beginPath();
    radarCtx.moveTo(cx - radius, cy);
    radarCtx.lineTo(cx + radius, cy);
    radarCtx.moveTo(cx, cy - radius);
    radarCtx.lineTo(cx, cy + radius);
    radarCtx.stroke();

    // Radar Sweeper Cone
    radarCtx.save();
    radarCtx.translate(cx, cy);
    radarCtx.rotate(state.radarAngle);

    const grad = radarCtx.createConicGradient(0, 0, 0);
    grad.addColorStop(0, 'rgba(0, 243, 255, 0.4)');
    grad.addColorStop(0.15, 'rgba(0, 243, 255, 0.05)');
    grad.addColorStop(0.3, 'transparent');
    grad.addColorStop(1, 'transparent');

    radarCtx.beginPath();
    radarCtx.moveTo(0, 0);
    radarCtx.arc(0, 0, radius, -0.5, 0);
    radarCtx.fillStyle = grad;
    radarCtx.fill();

    // Sweeper Edge Line
    radarCtx.beginPath();
    radarCtx.moveTo(0, 0);
    radarCtx.lineTo(radius, 0);
    radarCtx.strokeStyle = '#00f3ff';
    radarCtx.lineWidth = 2;
    radarCtx.shadowColor = '#00f3ff';
    radarCtx.shadowBlur = 8;
    radarCtx.stroke();

    radarCtx.restore();

    // Render Targets
    state.targets.forEach(target => {
      const rad = (target.angle * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * (radius * target.dist);
      const ty = cy + Math.sin(rad) * (radius * target.dist);

      radarCtx.beginPath();
      radarCtx.arc(tx, ty, 4, 0, Math.PI * 2);
      radarCtx.fillStyle = target.type === 'hostile' ? '#ff2a55' : '#00ff88';
      radarCtx.shadowColor = target.type === 'hostile' ? '#ff2a55' : '#00ff88';
      radarCtx.shadowBlur = 6;
      radarCtx.fill();

      radarCtx.font = '8px "Share Tech Mono"';
      radarCtx.fillStyle = '#d0f4ff';
      radarCtx.fillText(target.label, tx + 6, ty + 3);
    });

    state.radarAngle += 0.03;
  }

  // Unified Render Loop
  function renderLoop() {
    drawArcReactor();
    drawAudioViz();
    drawRadar();
    requestAnimationFrame(renderLoop);
  }
  renderLoop();

  // --------------------------------------------------------------------------
  // TERMINAL & CHAT ENGINE
  // --------------------------------------------------------------------------
  function addMessage(sender, text, role) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${role}`;

    const header = document.createElement('div');
    header.className = 'msg-header';
    const timeStr = new Date().toLocaleTimeString().split(' ')[0];
    header.innerHTML = `<span>${sender}</span> <span>${timeStr}</span>`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;

    msgDiv.appendChild(header);
    msgDiv.appendChild(bubble);

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function addJarvisMessage(text) {
    addMessage('J.A.R.V.I.S.', text, 'jarvis');
  }

  function addUserMessage(text) {
    addMessage(state.userName.toUpperCase(), text, 'user');
  }

  // --------------------------------------------------------------------------
  // NATURAL LANGUAGE COMMAND PROCESSOR (JARVIS PERSONA)
  // --------------------------------------------------------------------------
  function handleCommandSubmit(rawInput) {
    const input = rawInput.trim();
    if (!input) return;

    addUserMessage(input);
    commandInput.value = '';
    playSciFiSound('beep');

    setTimeout(() => {
      processJarvisCommand(input);
    }, 300);
  }

  commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCommandSubmit(commandInput.value);
  });

  // Quick action buttons listener
  document.querySelectorAll('.btn-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) {
        handleCommandSubmit(cmd);
      }
    });
  });

  function processJarvisCommand(cmd) {
    const query = cmd.toLowerCase();

    // 1. Diagnostics / Suit Status
    if (query.includes('diagnostic') || query.includes('status') || query.includes('suit') || query.includes('health')) {
      const resp = `All Mark LXXXV systems operational, ${state.userName}. Arc Reactor core temperature is at ${state.coreTemp}°C with energy output at ${state.energyOutput} GJ/s. Armor integrity is at 100%. Nano-repair reserve at 98%.`;
      addJarvisMessage(resp);
      speak(resp);
      playSciFiSound('beep');
    }
    // 2. House Party Protocol
    else if (query.includes('house party') || query.includes('party protocol')) {
      const resp = `House Party Protocol initiated, ${state.userName}. Deploying all Iron Man armor suits from subterranean vault: Mark I through Mark LXXXV. Airspace secured.`;
      addJarvisMessage(resp);
      speak(resp);
      playSciFiSound('alert');
      state.protocols.sentry = true;
      document.getElementById('proto-sentry').classList.add('active');
      document.getElementById('p-sentry-status').textContent = 'ONLINE (SENTRY)';
    }
    // 3. Fire / Calibrate Repulsors
    else if (query.includes('repulsor') || query.includes('fire') || query.includes('blast') || query.includes('shoot')) {
      const resp = `Repulsors charged and fired, ${state.userName}. Target neutralized with zero collateral damage. Beam intensity recalibrated to maximum output.`;
      addJarvisMessage(resp);
      speak(resp);
      playSciFiSound('repulsor');
    }
    // 4. Stark Tower Power
    else if (query.includes('tower') || query.includes('stark tower') || query.includes('power')) {
      const resp = `Stark Tower clean arc energy grid is operating at peak efficiency, ${state.userName}. Main pent-house suite power draw is normal. Cybernetic security protocols engaged.`;
      addJarvisMessage(resp);
      speak(resp);
    }
    // 5. Weather
    else if (query.includes('weather') || query.includes('forecast') || query.includes('climate')) {
      const resp = `Current local conditions: 22°C with clear skies, wind speeds at 8 knots from the West. Optimal conditions for high-altitude repulsor flight tests, ${state.userName}.`;
      addJarvisMessage(resp);
      speak(resp);
    }
    // 6. Greetings / Persona Banter
    else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('jarvis')) {
      const resp = `Always a pleasure to assist you, ${state.userName}. How may I be of service today?`;
      addJarvisMessage(resp);
      speak(resp);
    }
    else if (query.includes('who are you') || query.includes('identity') || query.includes('what are you')) {
      const resp = `I am J.A.R.V.I.S., Just A Rather Very Intelligent System. Personal AI assistant created by Anthony Edward Stark.`;
      addJarvisMessage(resp);
      speak(resp);
    }
    else if (query.includes('who am i') || query.includes('my name')) {
      const resp = `You are ${state.userName}, genius, billionaire, playboy, philanthropist.`;
      addJarvisMessage(resp);
      speak(resp);
    }
    // 7. Tasks / Memos Command
    else if (query.includes('add task') || query.includes('remind me') || query.includes('memo')) {
      const taskText = cmd.replace(/add task|remind me to|memo/gi, '').trim();
      if (taskText) {
        addTask(taskText);
        const resp = `Added "${taskText}" to your Stark memo list, ${state.userName}.`;
        addJarvisMessage(resp);
        speak(resp);
      } else {
        const resp = `Please specify the task text, ${state.userName}. For example: "add task Review Vibranium telemetry"`;
        addJarvisMessage(resp);
        speak(resp);
      }
    }
    // 8. Help / Capabilities
    else if (query.includes('help') || query.includes('capabilities') || query.includes('what can you do')) {
      const resp = `I can execute suit diagnostics, trigger House Party or Veronica protocols, fire repulsor bursts, monitor tactical radar targets, track Stark memos, and assist with daily tasks, ${state.userName}. Speak or type commands anytime.`;
      addJarvisMessage(resp);
      speak(resp);
    }
    // Default fallback intelligence
    else {
      const resp = `Analyzing query: "${cmd}". Database search complete, ${state.userName}. Protocols ready at your instruction.`;
      addJarvisMessage(resp);
      speak(resp);
    }
  }

  // --------------------------------------------------------------------------
  // TASKS & PROTOCOL INTERACTIONS
  // --------------------------------------------------------------------------
  function renderTasks() {
    taskListEl.innerHTML = '';
    state.tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;

      const textSpan = document.createElement('span');
      textSpan.textContent = `• ${task.text}`;
      textSpan.style.cursor = 'pointer';
      textSpan.addEventListener('click', () => {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-del-task';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete task';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      item.appendChild(textSpan);
      item.appendChild(delBtn);
      taskListEl.appendChild(item);
    });
  }

  function saveTasks() {
    localStorage.setItem('jarvis_tasks', JSON.stringify(state.tasks));
  }

  function addTask(text) {
    state.tasks.push({
      id: Date.now(),
      text: text,
      completed: false
    });
    saveTasks();
    renderTasks();
  }

  btnAddTask.addEventListener('click', () => {
    const text = prompt("Enter new Stark task/memo:", "Calibrate ARC reactor");
    if (text && text.trim()) {
      addTask(text.trim());
      speak(`Task added, ${state.userName}.`);
    }
  });

  renderTasks();

  // Interactive Defense Protocol cards
  document.querySelectorAll('.protocol-card').forEach(card => {
    card.addEventListener('click', () => {
      const protoName = card.getAttribute('data-protocol');
      const statusEl = card.querySelector('.p-status');
      const isCurrentlyActive = card.classList.contains('active');

      if (isCurrentlyActive) {
        card.classList.remove('active');
        statusEl.textContent = 'INACTIVE';
        playSciFiSound('beep');
        addJarvisMessage(`${protoName} deactivated, ${state.userName}.`);
        speak(`${protoName} deactivated.`);
      } else {
        card.classList.add('active');
        statusEl.textContent = 'ACTIVE / ONLINE';
        playSciFiSound('alert');
        addJarvisMessage(`${protoName} engaged successfully, ${state.userName}. All defense parameters locked.`);
        speak(`${protoName} engaged, ${state.userName}.`);
      }
    });
  });

  // INITIAL JARVIS WELCOME GREETING
  setTimeout(() => {
    const welcome = `Welcome back, ${state.userName}. All Mark LXXXV systems operational. Arc Reactor output is at 100%. How may I assist you today?`;
    addJarvisMessage(welcome);
    speak(welcome);
  }, 600);

});
