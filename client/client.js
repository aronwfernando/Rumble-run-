import './style.css';
import { io } from 'socket.io-client';
import { COLORS, DT, RULES } from '../shared/config.js';
import { PhysicsWorld } from '../shared/physics.js';
import { generateMap } from '../shared/maps.js';
import { GameScene } from './scene.js';
import { InputController } from './input.js';
import { samplePlayers, renderLocal } from './netcode.js';

const $ = selector => document.querySelector(selector);
const show = (selector, visible) => { $(selector).hidden = !visible; };
const text = (selector, value) => { $(selector).textContent = value; };
const storage = { get(key, fallback = '') { try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; } }, set(key, value) { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ } } };
let toastTimer;
function toast(message, sticky = false) { text('#toast', message); show('#toast', true); clearTimeout(toastTimer); if (!sticky) toastTimer = setTimeout(() => show('#toast', false), 4200); }
let personalResultTimer, personalStatus = null;
function hidePersonalResult() { clearTimeout(personalResultTimer); show('#personal-result', false); }
function showPersonalResult(status) {
  if (!['qualified', 'eliminated'].includes(status) || personalStatus === status) return;
  personalStatus = status;
  const qualified = status === 'qualified';
  text('#personal-result-eyebrow', qualified ? 'ROUND UPDATE' : 'ROUND OVER');
  text('#personal-result-title', qualified ? 'QUALIFIED!' : 'YOU’RE OUT');
  text('#personal-result-detail', qualified ? 'Nice run. You can watch the remaining beans before the next course.' : 'That run is over, but you can spectate the rest of the round and rejoin the next match.');
  show('#personal-result', true);
  clearTimeout(personalResultTimer);
  personalResultTimer = setTimeout(hidePersonalResult, qualified ? 2600 : 5200);
}
function fatal(message) { text('#fatal-message', message); show('#fatal', true); }
$('#reload').onclick = () => location.reload();
let view;
try { view = new GameScene($('#game')); } catch (error) { fatal('This browser could not start WebGL. Enable hardware acceleration or try a current Chrome, Firefox, Edge, or Safari browser.'); throw error; }
document.addEventListener('render-lost', () => fatal('The graphics context was interrupted. Reload to reconnect to your match.'));
const input = new InputController();
const socket = io({ auth: callback => callback({ token: storage.get('rumble-session') }), reconnectionDelay: 500, reconnectionDelayMax: 2000, timeout: 10000 });
let myId = null, state = null, snapshot = null, physics = null, roundKey = null;
let selectedColor = storage.get('rumble-color', COLORS[0]);
if (!COLORS.includes(selectedColor)) selectedColor = COLORS[0];
let networkRtt = 0, lastSnapshotAt = 0, localActionAt = -1000, packetAt = 0, simulationTime = 0, lastTeleport = -1;
let snapshotQueue = [], lastTick = -1, watching = null, soundEnabled = false, audioContext = null;
let frameCount = 0, fpsAt = performance.now(), lastFrame = performance.now(), accumulator = 0, uiAt = 0;
let renderStates = new Map();
const correctionOffset = [0, 0, 0];
let lastFalls = 0, lastCheckpoint = 0, respawnToastUntil = 0;
const touch = matchMedia('(pointer: coarse)').matches;

function beep(frequency = 500, duration = 0.1, kind = 'sine') {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = kind; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.3, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.045, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Audio is optional. */ }
}
function selectColor(color) {
  selectedColor = color; storage.set('rumble-color', color); view.setMenuColor(color);
  for (const b of $('#colors').children) b.setAttribute('aria-pressed', String(b.dataset.color === color));
}
COLORS.forEach((color, i) => {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'swatch'; button.dataset.color = color;
  button.style.setProperty('--swatch', color); button.setAttribute('aria-label', ['Pink', 'Mint', 'Yellow', 'Purple', 'Blue', 'Orange'][i]); button.onclick = () => selectColor(color); $('#colors').append(button);
});
selectColor(selectedColor);
$('#nickname').value = storage.get('rumble-name', 'Lucky Bean');
const inviteCode = new URL(location.href).searchParams.get('room');
if (inviteCode && /^[A-F0-9]{6}$/i.test(inviteCode)) $('#room-code').value = inviteCode.toUpperCase();
$('#room-code').addEventListener('input', e => e.target.value = e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''));
$('#room-form').onsubmit = event => { event.preventDefault(); join('create'); };
$('#join').onclick = () => join('join');
$('#quick').onclick = () => join('quick');
$('#room-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); join('join'); } });
$('#match-settings-toggle').onclick = () => show('#match-options', $('#match-options').hidden);
function join(mode) {
  if (!socket.connected) return toast('Connecting to the server. Please try again in a moment.');
  if (!$('#nickname').reportValidity()) return;
  storage.set('rumble-name', $('#nickname').value);
  $('#room-form button[type=submit]').disabled = true;
  socket.timeout(7000).emit('join', { mode, name: $('#nickname').value, color: selectedColor, code: $('#room-code').value.trim(), rounds: Number($('#rounds').value), seed: $('#seed').value.trim(), difficulty: $('#difficulty').value, playlist: $('#playlist').value }, (err, result) => {
    $('#room-form button[type=submit]').disabled = false;
    if (err || result?.error) toast(result?.error || 'Could not join. Check your connection and try again.');
  });
}
function request(event) { socket.timeout(5000).emit(event, (err, result) => { if (err || result?.error) toast(result?.error || 'The server did not respond. Please try again.'); }); }
$('#start').onclick = () => request('start');
$('#rematch').onclick = () => request('rematch');
function resetCheckpoint() { if (state?.phase === 'playing' && state.map.mode === 'race') request('reset-checkpoint'); }
$('#reset-checkpoint').onclick = () => { closeSettings(); resetCheckpoint(); };
async function leave() {
  input.clear(); input.enabled = false;
  socket.timeout(4000).emit('leave', (err, result) => {
    if (err || result?.error) return toast('Could not leave yet. Reconnect and try again.');
    storage.set('rumble-session', null); resetMenu();
  });
}
for (const id of ['leave-lobby', 'leave-game', 'result-leave']) $(`#${id}`).onclick = leave;
$('#copy-invite').onclick = async () => {
  const url = new URL(location.href); url.search = ''; url.searchParams.set('room', state.code);
  try { await navigator.clipboard.writeText(url.href); toast('Invite copied. Send it to your friends.'); }
  catch { $('#invite-fallback').value = url.href; show('#invite-fallback', true); $('#invite-fallback').select(); toast('Copy the selected invite link, or share the room code.'); }
};
function openSettings() { input.enabled = false; input.clear(); $('#settings').showModal(); show('#leave-game', !!state); }
function closeSettings() { $('#settings').close(); updateInput(); document.activeElement?.blur(); }
for (const id of ['settings-button', 'game-menu']) $(`#${id}`).onclick = openSettings;
for (const id of ['close-settings', 'resume']) $(`#${id}`).onclick = closeSettings;
$('#settings').addEventListener('close', () => { updateInput(); document.activeElement?.blur(); });
$('#quality').onchange = e => { view.qualityMode(e.target.value); storage.set('rumble-quality', e.target.value); };
$('#quality').value = storage.get('rumble-quality', touch ? 'low' : 'balanced'); view.qualityMode($('#quality').value || 'balanced');
for (const [id, fallback, apply] of [
  ['camera-fov', '58', value => view.cameraFov = Number(value)],
  ['camera-distance', '11.5', value => view.cameraDistance = Number(value)],
  ['camera-sensitivity', '1', value => input.sensitivity = Number(value)],
  ['motion', view.reducedMotion ? 'reduced' : 'on', value => view.reducedMotion = value === 'reduced'],
  ['names', 'on', value => view.showNames = value === 'on'],
  ['shadows', 'on', value => view.showShadows = value === 'on'],
]) {
  const element = $(`#${id}`), saved = storage.get(`rumble-${id}`, fallback);
  element.value = [...element.options].some(option => option.value === saved) ? saved : fallback;
  apply(element.value); element.onchange = () => { apply(element.value); storage.set(`rumble-${id}`, element.value); };
}
$('#sound').onclick = () => { soundEnabled = !soundEnabled; $('#sound span').textContent = soundEnabled ? 'ON' : 'OFF'; $('#sound').setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound'); beep(660); };
function toggleScore() { show('#scoreboard', $('#scoreboard').hidden); renderScore(); }
$('#score-button').onclick = toggleScore; $('#close-score').onclick = () => show('#scoreboard', false);
input.onToggleScore = toggleScore; input.onMenu = openSettings;
input.onReset = resetCheckpoint;
input.getYaw = () => view.cameraYaw;
input.onLook = amount => { view.cameraYaw += amount; };
input.onCenterCamera = () => { view.cameraYaw = 0; };
input.onChange = () => { if (socket.connected && state?.phase === 'playing') socket.volatile.emit('input', input.packet(roundKey)); };
input.onAction = action => { localActionAt = performance.now(); if (input.enabled && socket.connected) socket.volatile.emit('input', input.packet(roundKey)); if (action === 'jump') beep(380); if (action === 'dive') beep(180, 0.14, 'triangle'); };
$('#next-player').onclick = () => { const ids = snapshot?.players.filter(p => p.p && p.status === 'racing').map(p => p.id) || []; watching = ids[(ids.indexOf(watching) + 1) % ids.length] || null; view.smoothInitialized = false; };
$('#personal-result-watch').onclick = hidePersonalResult;

socket.on('connect', () => { text('#connection', 'Connected · ready to play'); if (state) toast('Connected. Rejoining your match…'); updateInput(); });
socket.on('connect_error', error => { text('#connection', 'Server unavailable'); toast(`Cannot connect to the game server. ${error.message === 'xhr poll error' ? 'Check that the server is running.' : 'Trying again…'}`); });
socket.on('disconnect', () => { text('#connection', 'Reconnecting…'); input.clear(); input.enabled = false; if (state) toast('Connection lost. Reconnecting… your slot is held for 30 seconds.', true); });
socket.on('session-expired', () => { storage.set('rumble-session', null); resetMenu(); toast('Your previous slot expired. Create or join a new room.'); });
socket.on('server-closing', () => toast('The server is restarting. Please reconnect shortly.', true));
socket.on('welcome', data => {
  myId = data.id; storage.set('rumble-session', data.token);
  input.seq = Math.max(input.seq, data.controls.seq || 0);
  for (const key of ['jump', 'dive', 'grab']) input.counters[key] = Math.max(input.counters[key], data.controls[key] || 0);
  // Counters are monotonic for this browser tab, including reconnects.
  roundKey = null; applyState(data.state); show('#toast', false);
});
socket.on('state', applyState);
socket.on('player-event', event => {
  if (event.roundKey !== roundKey || event.id !== myId) return;
  if (event.type === 'respawn') { respawnToastUntil = performance.now() + 850; correctionOffset.fill(0); view.smoothInitialized = false; }
  else showPersonalResult(event.type);
});
socket.on('snapshot', data => {
  if (!state || data.roundKey !== roundKey || data.tick <= lastTick) return;
  lastTick = data.tick; lastSnapshotAt = performance.now(); snapshot = data;
  // Align the clock before converting authoritative cooldowns into deadlines.
  if (Math.abs(simulationTime - data.time) > 0.3) simulationTime = data.time + Math.min(0.08, networkRtt / 2000);
  snapshotQueue.push({ ...data, at: lastSnapshotAt }); if (snapshotQueue.length > 8) snapshotQueue.shift();
  for (const row of data.players) {
    const player = state.players.find(p => p.id === row.id), previousStatus = player?.status;
    if (player) player.status = row.status;
    if (row.id === myId && previousStatus !== row.status) showPersonalResult(row.status);
    if (row.id === myId) {
      if (row.falls > lastFalls) respawnToastUntil = performance.now() + 850;
      if (row.checkpoint > lastCheckpoint) toast('Checkpoint reached');
      lastFalls = row.falls || 0; lastCheckpoint = row.checkpoint || 0;
    }
    if (!physics) continue;
    if (!row.p) { physics.removePlayer(row.id); continue; }
    let body = physics.players.get(row.id);
    if (!body) body = physics.addPlayer(row.id, row.p, row.id !== myId);
    if (row.id !== myId) {
      body.body.position.set(...row.p); body.body.velocity.set(...row.v); body.body.aabbNeedsUpdate = true; continue;
    }
    const b = body.body, latency = Math.min(0.075, networkRtt / 2000);
    const desired = row.p.map((v, i) => v + row.v[i] * latency);
    const error = Math.hypot(...desired.map((v, i) => v - [b.position.x, b.position.y, b.position.z][i]));
    if (row.tp !== lastTeleport || error > 4) {
      physics.teleport(myId, row.p); b.velocity.set(...row.v); lastTeleport = row.tp;
      body.teleports = row.tp; body.grounded = row.g; body.face = row.f;
      body.respawnUntil = simulationTime + (row.respawnLeft || 0);
      body.lastHit = simulationTime - RULES.hitCooldown;
      body.diveUntil = simulationTime + row.d; body.diveRecoveryUntil = simulationTime + (row.r || 0);
      body.nextDive = simulationTime + row.c; body.stunUntil = simulationTime + row.s;
      body.airDiveUsed = !!row.airDiveUsed; body.hits = row.hits;
      if (row.g) body.lastGround = simulationTime;
      correctionOffset.fill(0); view.smoothInitialized = false;
    } else if (performance.now() - localActionAt > 140) {
      if (error > 0.12) {
        for (const [i, key] of ['x', 'y', 'z'].entries()) {
          const correction = (desired[i] - b.position[key]) * (i === 1 ? 0.32 : 0.22);
          b.position[key] += correction; b.previousPosition[key] += correction; correctionOffset[i] -= correction;
        }
        b.aabbNeedsUpdate = true;
      }
      b.velocity.x += (row.v[0] - b.velocity.x) * 0.15; b.velocity.z += (row.v[2] - b.velocity.z) * 0.15;
      if (!row.g || Math.abs(b.velocity.y) < 1) b.velocity.y += (row.v[1] - b.velocity.y) * 0.12;
      body.diveUntil = simulationTime + row.d; body.diveRecoveryUntil = simulationTime + (row.r || 0); body.nextDive = simulationTime + row.c; body.stunUntil = simulationTime + row.s;
      body.airDiveUsed = !!row.airDiveUsed; body.hits = row.hits;
    }
  }
  physics?.syncEnvironment(data.environment);
  updateInput();
});
setInterval(() => {
  if (!socket.connected) return;
  const sent = performance.now(); socket.timeout(3000).emit('ping-check', err => { if (!err) networkRtt = Math.round(performance.now() - sent); });
}, 2000);

function resetMenu() {
  hidePersonalResult(); personalStatus = null;
  state = null; snapshot = null; physics = null; roundKey = null; myId = null; snapshotQueue = []; renderStates.clear(); lastTick = -1;
  input.clear(); input.enabled = false; input.inGame = false; document.body.classList.remove('playing');
  for (const selector of ['#lobby', '#hud', '#round-result', '#scoreboard', '#touch-controls']) show(selector, false);
  show('#menu', true); $('#settings').close(); view.menu = true; view.loadMap(generateMap({ seed: 'candy-club' })); view.makeShowcase(); selectColor(selectedColor);
}
function applyState(next) {
  const previousStatus = state?.players.find(p => p.id === myId)?.status;
  state = next;
  const nextStatus = next.players.find(p => p.id === myId)?.status;
  if (previousStatus !== nextStatus) showPersonalResult(nextStatus);
  if (next.phase !== 'playing') hidePersonalResult();
  const inMatch = next.phase !== 'lobby';
  document.body.classList.toggle('playing', inMatch); view.menu = !inMatch;
  show('#menu', false); show('#lobby', !inMatch); show('#hud', inMatch);
  show('#round-result', ['results', 'finished'].includes(next.phase));
  input.inGame = inMatch;
  if (!inMatch) {
    if (roundKey !== next.roundKey && !view.showcase) { view.loadMap(generateMap({ seed: next.seed })); view.makeShowcase(); selectColor(selectedColor); }
    roundKey = next.roundKey; snapshot = null; physics = null; snapshotQueue = []; lastTick = -1; renderLobby();
  } else if (next.map && roundKey !== next.roundKey) {
    hidePersonalResult(); personalStatus = null;
    lastFalls = 0; lastCheckpoint = 0; respawnToastUntil = 0; correctionOffset.fill(0); view.cameraYaw = 0;
    roundKey = next.roundKey; snapshot = null; snapshotQueue = []; lastTick = -1; accumulator = 0; simulationTime = 0; lastTeleport = -1;
    physics = new PhysicsWorld(next.map); view.loadMap(next.map); view.menu = false; watching = null; input.clear();
    next.players.forEach((p, i) => {
      view.addAvatar(p, p.id === myId);
      if (p.active) physics.addPlayer(p.id, next.map.spawn[next.players.filter(q => q.active).findIndex(q => q.id === p.id)] || next.map.spawn[i], p.id !== myId);
    });
    const survival = next.map.mode === 'survival';
    text('#map-name', next.map.name); text('#round-kind', next.map.type === 'final' ? survival ? 'LAST BEAN STANDING' : 'FINAL CROWN' : survival ? 'SURVIVAL' : 'RACE');
    text('#theme-name', `${next.map.theme.name} · ${next.map.difficulty < 0.3 ? 'WARM UP' : next.map.difficulty < 0.65 ? 'PICKING UP' : 'FULL SEND'}`);
    const friendDuel = survival && next.map.type !== 'final' && next.players.filter(p => p.active).length <= next.target;
    text('#objective', next.map.objective + (friendDuel ? ' Two-bean round: falls respawn until the final.' : ''));
    $('#round-track').replaceChildren();
    for (let i = 0; i < next.settings.rounds; i++) { const pip = document.createElement('span'); pip.className = `round-pip ${i < next.round ? 'done' : i === next.round ? 'current' : ''}`; pip.textContent = i === next.settings.rounds - 1 ? '★' : i + 1; pip.title = `Round ${i + 1}`; $('#round-track').append(pip); }
    show('#touch-grab', !!next.map.finish?.crown);
    beep(500, 0.2);
  }
  if (next.phase === 'playing') document.activeElement?.blur();
  if (['results', 'finished'].includes(next.phase)) renderResult();
  updateInput(); renderScore();
}
function updateInput() {
  const own = state?.players.find(p => p.id === myId);
  input.enabled = !!(socket.connected && state?.phase === 'playing' && own?.status === 'racing' && !(snapshot?.players.find(p => p.id === myId)?.respawnLeft > 0) && !$('#settings').open);
  input.inGame = !!(state && state.phase !== 'lobby');
  $('#reset-checkpoint').hidden = !(state?.phase === 'playing' && state.map.mode === 'race' && own?.status === 'racing');
  show('#touch-controls', touch && input.enabled);
}
function renderLobby() {
  if (!state) return;
  text('#lobby-code', state.code); text('#lobby-rounds', `${state.settings.rounds} rounds`);
  text('#lobby-count', `${state.players.length} / 30 players`);
  text('#lobby-title', state.privateRoom ? 'Your room. Your rivals.' : 'Finding your next rivals.');
  const host = state.hostId === myId, connected = state.players.filter(p => p.connected).length;
  $('#start').disabled = !host || connected < 2 || !state.privateRoom;
  text('#start', !state.privateRoom ? 'Waiting for players…' : !host ? 'Waiting for the host' : connected < 2 ? 'Waiting for a friend' : 'Everybody in? Let’s rumble.');
  text('#lobby-hint', host ? 'Share the invite. Start when your friends are here.' : 'The host will start when everyone is ready.');
  $('#roster').replaceChildren();
  $('#course-lineup').replaceChildren();
  (state.courses || []).forEach((course, i) => {
    const card = document.createElement('li'); card.className = 'course-card'; card.style.setProperty('--course-color', course.color);
    const number = document.createElement('span'); number.className = 'course-number'; number.textContent = String(i + 1).padStart(2, '0');
    const info = document.createElement('div');
    const label = document.createElement('small'); label.textContent = course.type === 'final' ? 'THE FINAL' : course.mode === 'survival' ? 'SURVIVE' : 'RACE';
    const name = document.createElement('strong'); name.textContent = course.name;
    info.append(label, name); card.append(number, info); card.title = course.objective; $('#course-lineup').append(card);
  });
  for (const p of state.players) {
    const row = document.createElement('div'); row.className = 'roster-player';
    const dot = document.createElement('span'); dot.className = 'bean-dot'; dot.style.setProperty('--swatch', p.color);
    const name = document.createElement('span'); name.className = 'name'; name.textContent = p.name;
    const role = document.createElement('span'); role.className = 'role'; role.textContent = !p.connected ? 'OFFLINE' : p.id === state.hostId ? 'HOST' : p.id === myId ? 'YOU' : '';
    row.append(dot, name, role); $('#roster').append(row);
  }
}
function renderResult() {
  const finished = state.phase === 'finished', qualified = state.qualifiers.includes(myId), winner = state.players.find(p => p.id === state.winner);
  text('#result-eyebrow', finished ? 'THAT’S A WRAP' : qualified ? `ROUND ${state.round + 1} COMPLETE` : 'ELIMINATED');
  text('#result-title', finished ? state.winner === myId ? 'Crown secured!' : winner ? `${winner.name} wins!` : 'No beans left!' : qualified ? 'You’re through!' : 'You’re out.');
  text('#result-detail', finished ? 'Same friends. New courses. Another shot at the crown?' : qualified ? `${state.qualifiers.length} beans move on. Get ready for the next course.` : 'Your run ended this round. Watch your friends or leave when you’re ready.');
  $('#result-names').replaceChildren();
  for (const id of state.qualifiers) { const p = state.players.find(p => p.id === id); if (!p) continue; const tag = document.createElement('span'); tag.className = 'result-name'; tag.textContent = p.name; $('#result-names').append(tag); }
  show('#rematch', finished && state.hostId === myId); show('#result-leave', finished || !qualified);
  text('#next-round-time', finished && state.hostId !== myId ? 'Waiting for the host to open the next lobby.' : '');
  beep(qualified || state.winner === myId ? 880 : 250, 0.25);
}
function renderScore() {
  if (!state || $('#scoreboard').hidden) return;
  $('#score-list').replaceChildren();
  const scores = snapshot?.players || [];
  const roster = [...state.players].sort((a, b) => (scores.find(p => p.id === b.id)?.progress || 0) - (scores.find(p => p.id === a.id)?.progress || 0));
  roster.forEach((p, i) => {
    const row = document.createElement('div'); row.className = `score-row ${p.id === myId ? 'you' : ''}`;
    const rank = document.createElement('span'); rank.className = 'position'; rank.textContent = i + 1;
    const dot = document.createElement('span'); dot.className = 'bean-dot'; dot.style.setProperty('--swatch', p.color);
    const name = document.createElement('span'); name.textContent = p.name;
    const status = document.createElement('span'); status.className = 'status'; status.textContent = !p.connected ? 'RECONNECTING' : p.status.toUpperCase();
    row.append(rank, dot, name, status); $('#score-list').append(row);
  });
}
function updateHud(now) {
  if (!state) return;
  if (state.phase === 'lobby') {
    if (!state.privateRoom && snapshot && state.players.filter(p => p.connected).length >= 2) text('#start', `Starting in ${Math.ceil(snapshot.phaseLeft)}…`);
    return;
  }
  const left = Math.ceil(snapshot?.phaseLeft ?? (state.phase === 'countdown' ? RULES.countdown : RULES.raceSeconds));
  text('#timer', `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
  const survival = state.map.mode === 'survival';
  text('#qualify-label', survival ? 'STILL STANDING' : state.map.type === 'final' ? 'ONE CROWN' : 'QUALIFIED');
  text('#qualified', survival ? `${snapshot?.alive ?? state.players.filter(p => p.active).length}` : `${snapshot?.qualified || 0} / ${state.target}`);
  text('#countdown', state.phase === 'countdown' ? Math.max(1, left) : '');
  const own = snapshot?.players.find(p => p.id === myId), spectator = own?.status && own.status !== 'racing';
  show('#respawn-banner', state.phase === 'playing' && own?.status === 'racing' && now < respawnToastUntil);
  text('#respawn-banner', state.map.mode === 'race' ? 'WHOOPS! BACK TO CHECKPOINT' : 'WHOOPS! BACK IN THE ROUND');
  show('#dive-meter', input.enabled);
  show('#status-banner', state.phase === 'playing' && !!spectator);
  text('#status-banner', own?.status === 'qualified' ? 'QUALIFIED · WATCHING' : 'YOU’RE OUT · WATCHING');
  show('#spectator', state.phase === 'playing' && !!spectator);
  const watched = state.players.find(p => p.id === watching); text('#watching', watched ? `Watching ${watched.name}` : 'Waiting for the next round');
  if (state.phase === 'results') text('#next-round-time', `Next course in ${left}…`);
  if (state.phase === 'playing' && left <= 15 && left > 0) text('#objective', survival ? state.map.variant === 'tilefall' ? 'At the horn: highest layer, then fewest hits.' : 'At the horn: fewest hits, then closest to center.' : 'At the horn: furthest checkpoint, then progress.');
  text('#net-status', socket.connected ? `${networkRtt} ms` : 'RECONNECTING');
  const cooldown = physics?.players.get(myId)?.nextDive - simulationTime || 0;
  $('#dive-fill').style.transform = `scaleX(${Math.max(0, 1 - cooldown / RULES.diveCooldown)})`;
  text('#dive-meter strong', cooldown > 0 ? 'DIVE RECHARGING' : 'DIVE READY');
  renderScore();
}
function interpolatePlayers(now) {
  if (snapshotQueue.length) return samplePlayers(snapshotQueue, now);
  const result = new Map();
  for (const p of state?.players || []) { const body = physics?.snapshot(p.id); if (body) result.set(p.id, body); }
  return result;
}
function frame(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now;
  accumulator += delta;
  input.pollGamepad(delta);
  if (input.enabled && socket.connected && now - packetAt >= 1000 / 30) { socket.volatile.emit('input', input.packet(roundKey)); packetAt = now; }
  let steps = 0;
  while (accumulator >= DT && steps < 5) {
    if (physics && socket.connected && state?.phase === 'playing' && state.players.find(p => p.id === myId)?.status === 'racing') { simulationTime += DT; physics.step(new Map([[myId, input.consume()]]), simulationTime); }
    accumulator -= DT; steps++;
  }
  if (steps === 5) accumulator = 0;
  renderStates = interpolatePlayers(now);
  const own = snapshot?.players.find(p => p.id === myId);
  correctionOffset.forEach((v, i) => correctionOffset[i] = v * Math.exp(-delta * 12));
  if (physics && state?.phase === 'playing' && socket.connected && (!own || own.status === 'racing')) {
    const local = physics.snapshot(myId), body = physics.players.get(myId);
    if (local && body) { local.p = renderLocal(body, accumulator / DT, correctionOffset); renderStates.set(myId, local); }
  }
  let followState = renderStates.get(myId);
  let follow = followState?.p;
  if (!follow) {
    if (!renderStates.get(watching)?.p) watching = [...renderStates.values()].find(p => p.p)?.id || null;
    followState = renderStates.get(watching);
    follow = followState?.p;
  }
  if (!follow && state?.map) follow = state.map.spawn[0];
  const time = state?.phase === 'playing' ? (snapshot?.time || 0) + Math.min(0.2, (now - lastSnapshotAt) / 1000) : snapshot?.time || 0;
  for (const p of state?.players || []) view.updateAvatar(p.id, renderStates.get(p.id), time, delta);
  view.render(delta, state ? time : now / 1000, follow, followState, now / 1000, snapshot?.environment);
  if (now - uiAt > 100) { updateHud(now); uiAt = now; }
  frameCount++;
  if (now - fpsAt > 1000) { text('#fps', `${Math.round(frameCount * 1000 / (now - fpsAt))} FPS`); frameCount = 0; fpsAt = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
