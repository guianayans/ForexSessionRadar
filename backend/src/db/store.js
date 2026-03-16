const fs = require('node:fs/promises');
const path = require('node:path');
const { DEFAULT_STORE } = require('../types/constants');

function deepMerge(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) {
    return incoming ?? base;
  }

  if (typeof base !== 'object' || base === null) {
    return incoming ?? base;
  }

  const output = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    output[key] = key in base ? deepMerge(base[key], value) : value;
  }

  return output;
}

async function ensureStore(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
  }
}

async function readStore(filePath) {
  await ensureStore(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return deepMerge(DEFAULT_STORE, parsed);
}

async function writeStore(filePath, payload) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function createStore(dataDir) {
  const filePath = path.join(dataDir, 'store.json');

  return {
    async get() {
      return readStore(filePath);
    },
    async update(section, partialData) {
      const current = await readStore(filePath);
      const merged = {
        ...current,
        [section]: deepMerge(current[section], partialData)
      };
      await writeStore(filePath, merged);
      return merged;
    }
  };
}

module.exports = {
  createStore
};
