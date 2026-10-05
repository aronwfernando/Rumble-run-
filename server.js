import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { Tournament } from './server/tournament.js';
import { Bucket, cleanName, cleanColor, cleanInput, cleanSettings } from './server/validation.js';
import { DT, TICK_RATE, SNAPSHOT_RATE, VERSION } from './shared/config.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const numberEnv = (name, fallback, min, max) => Math.max(min, Math.min(max, Number(process.env[name]) || fallback));

export async function createGameServer({ dev = false, maxRooms = numberEnv('MAX_ROOMS', 12, 1, 100), maxConnections = numberEnv('MAX_CONNECTIONS', 360, 2, 3000), timings = {}, allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean) } = {}) {
  const app = express();
  const http = createServer(app);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: dev ? false : { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: null } }, crossOriginEmbedderPolicy: false }));
  app.use(compression());
  const rooms = new Map(), sessions = new Map();
  let shuttingDown = false, lastTickMs = 0, droppedTime = 0;
  app.get('/healthz', (_req, res) => res.status(shuttingDown ? 503 : 200).json({ ok: !shuttingDown, version: VERSION, rooms: rooms.size, connections: io.engine.clientsCount, simulationMs: +lastTickMs.toFixed(2), droppedTimeMs: Math.round(droppedTime * 1000) }));
  const io = new Server(http, {
    serveClient: false, maxHttpBufferSize: 4096, pingInterval: 10000, pingTimeout: 10000,
    perMessageDeflate: false,
    allowRequest(req, done) {
      if (shuttingDown || io.engine.clientsCount >= maxConnections) return done('Server full', false);
      const origin = req.headers.origin;
      let valid = !origin;
      try { valid ||= allowedOrigins.length ? allowedOrigins.includes(origin) : new URL(origin).host === req.headers.host; } catch { /* Invalid origin is rejected. */ }
      done(valid ? null : 'Origin not allowed', valid);
    },
  });
  let vite;
  if (dev) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server: http } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use('/assets', express.static(path.join(root, 'dist/assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(path.join(root, 'dist'), { maxAge: 0, setHeaders(res, file) { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
    app.get('/', (_req, res) => res.status(503).type('text').send('Build the client first: npm run build'));
  }

  function newRoom(privateRoom, settings) {
    if (rooms.size >= maxRooms) throw new Error('All rooms are busy. Please try again shortly.');
    let code;
    do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (rooms.has(code));
    const room = new Tournament(code, { privateRoom, ...settings, timings });
    room.on('state', state => io.to(code).emit('state', state));
    room.on('player-event', event => io.to(code).emit('player-event', event));
    rooms.set(code, room);
    return room;
  }
  function dropSession(token) {
    const session = sessions.get(token);
    if (!session) return;
    const room = rooms.get(session.code);
    room?.leave(session.id);
    sessions.delete(token);
    if (room && !room.humans.length) { rooms.delete(room.code); room.removeAllListeners(); }
  }
  function bind(socket, session, token) {
    const room = rooms.get(session.code);
    if (!room?.players.has(session.id)) return false;
    if (session.socketId && session.socketId !== socket.id) io.sockets.sockets.get(session.socketId)?.disconnect(true);
    session.socketId = socket.id; session.expires = Infinity;
    socket.data.token = token; socket.data.playerId = session.id; socket.data.code = session.code;
    socket.join(session.code);
    room.setConnected(session.id, true);
    const player = room.players.get(session.id);
    socket.emit('welcome', { id: session.id, token, controls: { seq: player.lastSeq, jump: player.jumps, dive: player.dives, grab: player.grabs }, state: room.state() });
    return true;
  }
  io.on('connection', socket => {
    const joinBucket = new Bucket(0.5, 5), inputBucket = new Bucket(90, 150), miscBucket = new Bucket(2, 8);
    socket.data.idleUntil = performance.now() + 10 * 60 * 1000;
    const token = socket.handshake.auth?.token;
    if (typeof token === 'string' && token.length <= 80) {
      if (sessions.has(token)) bind(socket, sessions.get(token), token);
      else if (token) socket.emit('session-expired');
    }
    socket.on('join', (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (!joinBucket.take()) return ack({ error: 'Slow down and try again in a few seconds.' });
      if (socket.data.token) return ack({ error: 'Leave your current room first.' });
      try {
        if (!payload || typeof payload !== 'object') throw new Error('Invalid room request.');
        let room;
        if (payload.mode === 'create') room = newRoom(true, cleanSettings(payload));
        else if (payload.mode === 'quick') room = [...rooms.values()].find(r => !r.privateRoom && r.phase === 'lobby' && r.players.size < 30) || newRoom(false, cleanSettings({}));
        else if (payload.mode === 'join') {
          if (typeof payload.code !== 'string' || !/^[A-F0-9]{6}$/i.test(payload.code)) throw new Error('Enter a six-character room code.');
          room = rooms.get(payload.code.toUpperCase());
          if (!room) throw new Error('Room not found. Check the code with your friend.');
        } else throw new Error('Choose create, join, or quick play.');
        const p = room.addHuman({ name: cleanName(payload.name), color: cleanColor(payload.color) });
        const newToken = randomBytes(32).toString('base64url');
        const session = { code: room.code, id: p.id, socketId: socket.id, expires: Infinity };
        sessions.set(newToken, session);
        bind(socket, session, newToken);
        ack({ ok: true });
      } catch (error) { ack({ error: error.message }); }
    });
    socket.on('input', payload => {
      if (!inputBucket.take()) return;
      const input = cleanInput(payload);
      if (!input || typeof payload.roundKey !== 'string') return;
      rooms.get(socket.data.code)?.receiveInput(socket.data.playerId, input, payload.roundKey);
    });
    socket.on('start', ack => {
      if (typeof ack !== 'function' || !miscBucket.take()) return;
      try { const room = rooms.get(socket.data.code); if (!room) throw new Error('Join a room first.'); room.start(socket.data.playerId); ack({ ok: true }); } catch (e) { ack({ error: e.message }); }
    });
    socket.on('reset-checkpoint', ack => {
      if (typeof ack !== 'function' || !miscBucket.take()) return;
      try { const room = rooms.get(socket.data.code); if (!room) throw new Error('Join a room first.'); room.resetCheckpoint(socket.data.playerId); ack({ ok: true }); }
      catch (e) { ack({ error: e.message }); }
    });
    socket.on('rematch', ack => {
      if (typeof ack !== 'function' || !miscBucket.take()) return;
      try { const room = rooms.get(socket.data.code); if (!room) throw new Error('Join a room first.'); room.rematch(socket.data.playerId); ack({ ok: true }); } catch (e) { ack({ error: e.message }); }
    });
    socket.on('ping-check', ack => { if (typeof ack === 'function' && miscBucket.take()) ack(); });
    socket.on('leave', ack => {
      if (!miscBucket.take()) return;
      if (socket.data.token) dropSession(socket.data.token);
      if (socket.data.code) socket.leave(socket.data.code);
      socket.data.token = null; socket.data.code = null; socket.data.playerId = null;
      if (typeof ack === 'function') ack({ ok: true });
    });
    socket.on('disconnect', () => {
      const session = sessions.get(socket.data.token);
      if (!session || session.socketId !== socket.id) return;
      session.socketId = null; session.expires = performance.now() + 30000;
      rooms.get(session.code)?.setConnected(session.id, false);
    });
  });
  let last = performance.now(), accumulator = 0, step = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min((now - last) / 1000, 0.25); last = now;
    const began = performance.now();
    let substeps = 0;
    while (accumulator >= DT && substeps < 5) {
      for (const room of rooms.values()) room.step();
      accumulator -= DT; substeps++; step++;
      if (step % (TICK_RATE / SNAPSHOT_RATE) === 0) for (const room of rooms.values()) io.to(room.code).volatile.emit('snapshot', room.snapshot());
    }
    if (substeps === 5 && accumulator >= DT) { droppedTime += accumulator; accumulator = 0; }
    lastTickMs = performance.now() - began;
    for (const [key, s] of sessions) if (s.expires <= now) dropSession(key);
    for (const socket of io.sockets.sockets.values()) if (!socket.data.token && socket.data.idleUntil < now) socket.disconnect(true);
  }, 1000 / TICK_RATE);
  async function close() {
    shuttingDown = true;
    clearInterval(timer);
    io.emit('server-closing');
    await vite?.close();
    await new Promise(resolve => io.close(resolve));
    if (http.listening) await new Promise(resolve => http.close(resolve));
  }
  return { app, io, http, rooms, sessions, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dev = process.argv.includes('--dev');
  if (!dev && !fs.existsSync(path.join(root, 'dist/index.html'))) {
    console.error('Missing client build. Run npm run build, or npm run dev.');
    process.exit(1);
  }
  const game = await createGameServer({ dev });
  const port = numberEnv('PORT', 3000, 1, 65535);
  game.http.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Rumble Run listening on http://localhost:${port} (${dev ? 'development' : 'production'})`));
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await game.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
