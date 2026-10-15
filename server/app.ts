import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { authentication, parseCookies } from './auth.js';
import { RuleError, requireRule } from './game.js';
import {
  answerSchema,
  commandSchema,
  inspectAsset,
  joinSchema,
  playbackSchema,
  quizSchema,
  readySchema,
} from './validation.js';
import type { QuizService } from './service.js';
import type { Role, Result } from '../shared/types.js';

interface Options {
  service: QuizService;
  hostPassword: string;
  sessionSecret: string;
  production: boolean;
  publicOrigin?: string;
  autoTick?: boolean;
}
export async function createApplication(options: Options) {
  const { service, production } = options;
  const app = express();
  const http = createServer(app);
  const auth = authentication(options.hostPassword, options.sessionSecret, production);
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              mediaSrc: ["'self'", 'blob:'],
              connectSrc: ["'self'", 'wss:'],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const expected = options.publicOrigin ?? `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== expected) || req.get('sec-fetch-site') === 'cross-site')
      return next(new RuleError('Cross-origin requests are not allowed.', 403));
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post(
    '/api/host/login',
    rateLimit({
      windowMs: 15 * 60000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    (req, res) => {
      const { password } = z.object({ password: z.string().min(1).max(500) }).parse(req.body);
      requireRule(auth.checkPassword(password), 'Incorrect host password.', 401);
      auth.login(res);
      res.json({ ok: true });
    },
  );
  app.post('/api/host/logout', (_req, res) => {
    auth.logout(res);
    res.json({ ok: true });
  });
  app.get('/api/host', auth.requireHost, (_req, res) =>
    res.json({ quiz: service.state.quiz, game: service.state.game ? service.view('host') : null }),
  );
  app.put('/api/quiz', auth.requireHost, async (req, res) => {
    const quiz = quizSchema.parse(req.body);
    for (const song of quiz.songs) {
      if (song.audioId) {
        const audio = await service.storage.getAsset(song.audioId);
        requireRule(audio?.info.kind === 'audio', 'Audio file not found. Upload it again.');
        song.durationMs = audio.info.durationMs!;
      } else song.durationMs = 0;
      if (song.imageId) {
        const image = await service.storage.getAsset(song.imageId);
        requireRule(image?.info.kind === 'image', 'Picture not found. Upload it again.');
      }
      requireRule(
        !song.correctColleagueId || quiz.colleagues.some((c) => c.id === song.correctColleagueId),
        'A song refers to a removed colleague.',
      );
    }
    res.json(await service.saveQuiz(quiz));
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024, files: 1, fields: 1 },
  });
  app.post('/api/assets', auth.requireHost, upload.single('file'), async (req, res) => {
    requireRule(req.file, 'Select a file to upload.');
    let info;
    try {
      info = await inspectAsset(req.body.kind, req.file.buffer);
    } catch (error) {
      throw new RuleError(error instanceof Error ? error.message : 'Could not read the file.');
    }
    await service.storage.putAsset(info, req.file.buffer);
    res.status(201).json(info);
  });
  async function sendAsset(req: Request, res: Response, id: string) {
    const asset = await service.storage.getAsset(id);
    requireRule(asset, 'Media not found.', 404);
    res.type(asset.info.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${asset.data.length}`).end();
        return;
      }
      const start = match[1] ? Number(match[1]) : Math.max(0, asset.data.length - Number(match[2]));
      const end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), asset.data.length - 1)
          : asset.data.length - 1;
      if (!Number.isSafeInteger(start) || start > end || start >= asset.data.length) {
        res.status(416).set('Content-Range', `bytes */${asset.data.length}`).end();
        return;
      }
      res
        .status(206)
        .set('Content-Range', `bytes ${start}-${end}/${asset.data.length}`)
        .send(asset.data.subarray(start, end + 1));
      return;
    }
    res.send(asset.data);
  }
  app.get('/api/assets/:id', auth.requireHost, async (req, res) => {
    await sendAsset(req, res, String(req.params.id));
  });
  app.post('/api/games', auth.requireHost, async (_req, res) => {
    const game = await service.newGame();
    res.status(201).json({ roomCode: game.roomCode, runId: game.runId });
  });
  app.post('/api/game/command', auth.requireHost, async (req, res) => {
    const { command, requestId, runId } = commandSchema.parse(req.body);
    await service.command(command, requestId, runId);
    res.json({ ok: true });
  });
  app.post(
    '/api/games/:roomCode/join',
    rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }),
    async (req, res) => {
      const room = String(req.params.roomCode).toUpperCase();
      const { name } = joinSchema.parse(req.body);
      const player = await service.join(room, name);
      res.cookie(`quiz_player_${room}`, player.token, {
        httpOnly: true,
        secure: production,
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 86400000,
      });
      res.status(201).json({ id: player.id, token: player.token, name: player.name });
    },
  );
  const playerToken = (req: Request, room: string) =>
    req.get('authorization')?.replace(/^Bearer /, '') || req.cookies?.[`quiz_player_${room}`];
  app.get('/api/games/:roomCode/image', async (req, res) => {
    const room = req.params.roomCode.toUpperCase();
    const game = service.getGame(room);
    if (!auth.valid(req.cookies?.quiz_host)) service.player(room, playerToken(req, room));
    requireRule(
      ['revealing', 'results', 'finished'].includes(game.phase),
      'The picture has not been revealed.',
      403,
    );
    const song = game.quiz.songs[game.roundIndex];
    requireRule(song, 'No picture available.', 404);
    await sendAsset(req, res, song.imageId);
  });
  app.get('/api/games/:roomCode/audio/:songId', auth.requireHost, async (req, res) => {
    const song = service
      .getGame(String(req.params.roomCode))
      .quiz.songs.find((s) => s.id === req.params.songId);
    requireRule(song, 'Song not found.', 404);
    await sendAsset(req, res, song.audioId);
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        error:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Audio files must be 30 MB or smaller.'
            : 'Upload one file at a time.',
      });
      return;
    }
    if (error instanceof RuleError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON request.' });
      return;
    }
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    res.status(503).json({ error: 'Could not save the change. Please try again.' });
  };
  app.use(errorHandler);

  const io = new Server(http, {
    maxHttpBufferSize: 10000,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const parsed = new URL(origin);
        const expected =
          options.publicOrigin ?? `${production ? 'https' : 'http'}://${req.headers.host}`;
        callback(null, parsed.origin === origin && origin === expected);
      } catch {
        callback(null, false);
      }
    },
  });
  io.use((socket, next) => {
    try {
      const input = z
        .object({
          role: z.enum(['host', 'screen', 'player']),
          roomCode: z.string().optional(),
          token: z.string().optional(),
        })
        .parse(socket.handshake.auth);
      const cookies = parseCookies(socket.request.headers.cookie);
      if (input.role === 'host' || input.role === 'screen')
        requireRule(auth.valid(cookies.quiz_host), 'Host login required.', 401);
      if (input.role !== 'host') service.getGame(input.roomCode);
      if (input.role === 'player')
        socket.data.playerId = service.player(input.roomCode!, input.token).id;
      if (input.role === 'screen') service.attachScreen(socket.id);
      socket.data.role = input.role;
      socket.data.roomCode = input.roomCode;
      socket.data.token = input.token;
      socket.data.hostSession = cookies.quiz_host;
      next();
    } catch (error) {
      next(new Error(error instanceof Error ? error.message : 'Could not connect.'));
    }
  });
  function push() {
    for (const socket of io.sockets.sockets.values()) {
      try {
        const role: Role = socket.data.role;
        if (role !== 'player' && !auth.valid(socket.data.hostSession)) {
          socket.emit('session:expired');
          socket.disconnect(true);
          continue;
        }
        if (!service.state.game) {
          socket.emit('state', null);
          continue;
        }
        if (role !== 'host' && socket.data.roomCode !== service.state.game.roomCode) {
          socket.emit('game:closed');
          socket.disconnect(true);
          continue;
        }
        if (role === 'player') service.player(socket.data.roomCode, socket.data.token);
        socket.emit('state', service.view(role, socket.data.playerId));
      } catch {
        socket.disconnect(true);
      }
    }
  }
  service.on('change', push);
  io.on('connection', (socket) => {
    const role = socket.data.role as Role;
    if (role === 'player') {
      const set = service.connectedPlayers.get(socket.data.playerId) ?? new Set();
      set.add(socket.id);
      service.connectedPlayers.set(socket.data.playerId, set);
    }
    let inFlight = 0;
    let eventCount = 0;
    let windowAt = Date.now();
    const handler = (event: string, action: (payload: unknown) => unknown) =>
      socket.on(event, async (payload, callback) => {
        const reply = typeof callback === 'function' ? callback : () => {};
        if (Date.now() - windowAt > 10000) {
          eventCount = 0;
          windowAt = Date.now();
        }
        if (++eventCount > 60 || inFlight > 3) {
          reply({ ok: false, error: 'Please wait before trying again.' });
          return;
        }
        inFlight++;
        try {
          if (role !== 'player')
            requireRule(
              auth.valid(socket.data.hostSession),
              'Host session expired. Sign in again.',
              401,
            );
          const data = await action(payload);
          reply({ ok: true, data } satisfies Result<unknown>);
        } catch (error) {
          const message =
            error instanceof RuleError
              ? error.message
              : error instanceof z.ZodError
                ? error.issues[0].message
                : 'Could not save the change. Please try again.';
          reply({ ok: false, error: message });
        } finally {
          inFlight--;
        }
      });
    handler('snapshot', () =>
      service.state.game ? service.view(role, socket.data.playerId) : null,
    );
    handler('answer', async (payload) => {
      requireRule(role === 'player', 'Player connection required.', 403);
      const { colleagueId, runId } = answerSchema.parse(payload);
      await service.answer(socket.data.roomCode, socket.data.token, colleagueId, runId);
    });
    handler('screen:ready', (payload) => {
      requireRule(role === 'screen', 'Presentation connection required.', 403);
      const { songId, durationMs } = readySchema.parse(payload);
      service.markReady(socket.id, songId, durationMs);
    });
    handler('playback', async (payload) => {
      requireRule(role === 'screen', 'Presentation connection required.', 403);
      const { event, positionMs, runId } = playbackSchema.parse(payload);
      await service.playback(socket.id, event, runId, positionMs);
    });
    socket.on('disconnect', () => {
      if (role === 'screen')
        service
          .detachScreen(socket.id)
          .catch((error) =>
            console.error(
              JSON.stringify({ level: 'error', event: 'pause_failed', message: error.message }),
            ),
          );
      if (role === 'player') {
        service.connectedPlayers.get(socket.data.playerId)?.delete(socket.id);
        service.emit('change');
      }
    });
    push();
  });
  const timer =
    options.autoTick === false
      ? null
      : setInterval(() => {
          service
            .tick()
            .catch((error) =>
              console.error(
                JSON.stringify({ level: 'error', event: 'timer_failed', message: error.message }),
              ),
            );
        }, 250);
  return {
    app,
    http,
    io,
    service,
    async close() {
      if (timer) clearInterval(timer);
      service.off('change', push);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      if (http.listening) await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
