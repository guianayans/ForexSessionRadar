const path = require('node:path');

function parseArgs(argv) {
  const args = {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 4783),
    dataDir: process.env.FOREX_DATA_DIR || path.resolve(process.cwd(), 'data'),
    webDir: process.env.FOREX_WEB_DIR || null,
    mockNowIso: process.env.FOREX_MOCK_NOW || null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--port') {
      args.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === '--host') {
      args.host = String(argv[index + 1] || args.host);
      index += 1;
      continue;
    }

    if (current === '--data-dir') {
      args.dataDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === '--web-dir') {
      args.webDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current === '--mock-now') {
      args.mockNowIso = String(argv[index + 1] || '');
      index += 1;
    }
  }

  return args;
}

module.exports = {
  parseArgs
};
