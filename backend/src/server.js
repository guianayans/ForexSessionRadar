#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { DateTime } = require('luxon');
const { ZodError } = require('zod');
const { parseArgs } = require('./utils/parseArgs');
const { BASE_TIMEZONE } = require('./types/constants');
const { createStore } = require('./db/store');
const { createDashboardRoutes } = require('./routes/dashboardRoutes');
const { createPreferencesRoutes } = require('./routes/preferencesRoutes');
const { createPlannerRoutes } = require('./routes/plannerRoutes');
const { createAssistantRoutes } = require('./routes/assistantRoutes');

const args = parseArgs(process.argv.slice(2));
const app = express();
const normalizedWebDir = args.webDir ? path.resolve(args.webDir) : null;
const frontendCandidates = [
  normalizedWebDir,
  normalizedWebDir ? path.join(path.dirname(normalizedWebDir), '_up_/frontend/dist') : null,
  normalizedWebDir ? path.join(path.dirname(normalizedWebDir), 'frontend/dist') : null,
  normalizedWebDir ? path.join(normalizedWebDir, '../_up_/frontend/dist') : null,
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  process.pkg ? path.join(path.dirname(process.execPath), 'frontend-dist') : null
].filter(Boolean);

const frontendDistPath =
  frontendCandidates.find((candidatePath) => fs.existsSync(path.join(candidatePath, 'index.html'))) || null;
const frontendIndexPath = frontendDistPath ? path.join(frontendDistPath, 'index.html') : null;
const hasFrontendBuild = Boolean(frontendIndexPath && fs.existsSync(frontendIndexPath));

app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json({ limit: '500kb' }));

const store = createStore(args.dataDir);

function createNowProvider(mockNowIso) {
  if (!mockNowIso) {
    return {
      enabled: false,
      seedIso: null,
      getNow: () => DateTime.now().setZone(BASE_TIMEZONE)
    };
  }

  const seedParsed = DateTime.fromISO(mockNowIso, { setZone: true });
  const seed = seedParsed.isValid
    ? seedParsed.setZone(BASE_TIMEZONE)
    : DateTime.fromISO(mockNowIso, { zone: BASE_TIMEZONE });

  if (!seed.isValid) {
    console.warn(`FOREX_MOCK_NOW invalido: "${mockNowIso}". Usando horario real.`);
    return {
      enabled: false,
      seedIso: null,
      getNow: () => DateTime.now().setZone(BASE_TIMEZONE)
    };
  }

  const realStartEpochMs = Date.now();
  return {
    enabled: true,
    seedIso: seed.toISO(),
    getNow: () => seed.plus({ milliseconds: Date.now() - realStartEpochMs })
  };
}

const nowProvider = createNowProvider(args.mockNowIso);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'forex-session-radar-backend' });
});

app.use('/api', createDashboardRoutes(store, { getNow: nowProvider.getNow }));
app.use('/api', createPreferencesRoutes(store));
app.use('/api', createPlannerRoutes(store));
app.use('/api', createAssistantRoutes(store, { getNow: nowProvider.getNow }));

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.status(200).send(
      [
        'Backend ativo, mas o frontend build ainda nao foi encontrado.',
        'No modo dev: http://<IP-DO-MAC>:5173',
        'Para servir tudo em 4783: rode "npm run build:frontend" e reinicie o backend.'
      ].join('\n')
    );
  });
}

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Payload invalido',
      issues: error.issues
    });
  }

  console.error(error);
  return res.status(500).json({
    message: 'Erro interno no backend'
  });
});

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    if (!list) {
      continue;
    }

    for (const item of list) {
      if (item.family === 'IPv4' && !item.internal) {
        return item.address;
      }
    }
  }

  return null;
}

const server = app.listen(args.port, args.host, () => {
  const resolvedDataPath = path.resolve(args.dataDir);
  const localIp = getLocalNetworkIp();
  console.log(`Forex backend ativo em http://localhost:${args.port}`);
  if (localIp) {
    console.log(`Acesso na rede local: http://${localIp}:${args.port}`);
  }
  if (!hasFrontendBuild) {
    console.log('Frontend web (dev) em: http://<IP-DO-MAC>:5173');
    console.log(`Diretorios web verificados: ${frontendCandidates.join(', ')}`);
  }
  if (nowProvider.enabled) {
    console.log(`Simulacao de horario ativa: ${nowProvider.seedIso} (${BASE_TIMEZONE})`);
  }
  console.log(`Persistencia local: ${resolvedDataPath}`);
});

function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando backend...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
