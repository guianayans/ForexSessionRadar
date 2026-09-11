const { getApiKey, isProduction } = require('../utils/securityConfig');

function extractToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  const apiKeyHeader = req.get('x-api-key');
  if (apiKeyHeader) {
    return String(apiKeyHeader).trim();
  }

  return null;
}

function requireApiKey(req, res, next) {
  if (process.env.FOREX_SKIP_AUTH === 'true') {
    return next();
  }

  const expected = getApiKey();
  if (!expected) {
    if (isProduction()) {
      return res.status(503).json({
        message: 'API sem chave configurada no servidor'
      });
    }
    return next();
  }

  const token = extractToken(req);
  if (!token || token !== expected) {
    return res.status(401).json({
      message: 'Nao autorizado'
    });
  }

  return next();
}

module.exports = {
  requireApiKey,
  extractToken
};
