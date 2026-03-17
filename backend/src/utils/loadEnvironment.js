const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dotenv = require('dotenv');

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveEnvCandidates() {
  const explicit = process.env.FOREX_ENV_FILE ? path.resolve(process.env.FOREX_ENV_FILE) : null;
  const cwd = process.cwd();
  const home = os.homedir();
  const appSupportPath = path.join(home, 'Library', 'Application Support', 'Forex Session Radar', 'backend.env');
  const portablePath = path.join(home, '.forex-session-radar.env');
  const bundledPath = process.pkg ? path.join(path.dirname(process.execPath), '.env') : null;

  return unique([
    explicit,
    path.resolve(cwd, '.env'),
    path.resolve(cwd, 'backend/.env'),
    path.resolve(cwd, '.forex-session-radar.env'),
    portablePath,
    appSupportPath,
    bundledPath
  ]);
}

function loadEnvironment(logger = console) {
  const loaded = [];
  const candidates = resolveEnvCandidates();

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const result = dotenv.config({ path: envPath, override: false });
    if (!result.error) {
      loaded.push(envPath);
    }
  }

  if (loaded.length) {
    logger.log(`[env] Arquivos carregados: ${loaded.join(' | ')}`);
  }

  return loaded;
}

module.exports = {
  loadEnvironment
};
