const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { isForexOpen, isSessionOpen } = require('./marketTimeService');

test('isForexOpen - bordas de mercado (UTC)', () => {
  assert.equal(isForexOpen('2026-03-15T20:59:00', 'UTC'), false); // domingo 20:59 UTC
  assert.equal(isForexOpen('2026-03-15T21:01:00', 'UTC'), true); // domingo 21:01 UTC
  assert.equal(isForexOpen('2026-03-13T21:59:00', 'UTC'), true); // sexta 21:59 UTC
  assert.equal(isForexOpen('2026-03-13T22:01:00', 'UTC'), false); // sexta 22:01 UTC
});

test('isForexOpen - conversao de timezone local para UTC', () => {
  // 18:01 em Sao Paulo (UTC-3) = 21:01 UTC no domingo -> aberto.
  assert.equal(isForexOpen('2026-03-15T18:01:00', 'America/Sao_Paulo'), true);
});

test('isSessionOpen - Sydney', () => {
  assert.equal(isSessionOpen('sydney', '2026-03-15T21:30:00', 'UTC'), true);
  assert.equal(isSessionOpen('sydney', '2026-03-15T20:30:00', 'UTC'), false);
});

test('isSessionOpen - Tokyo', () => {
  assert.equal(isSessionOpen('tokyo', '2026-03-16T08:30:00', 'UTC'), true);
  assert.equal(isSessionOpen('tokyo', '2026-03-16T09:30:00', 'UTC'), false);
});

test('isSessionOpen - London', () => {
  assert.equal(isSessionOpen('london', '2026-03-16T10:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('london', '2026-03-16T06:30:00', 'UTC'), false);
});

test('isSessionOpen - New York', () => {
  assert.equal(isSessionOpen('new_york', '2026-03-16T16:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('new_york', '2026-03-16T12:30:00', 'UTC'), false);
});

test('isSessionOpen - respeita fechamento global do mercado', () => {
  // Sexta 22:30 UTC estaria na janela da sessao de Sydney, mas mercado global ja fechou.
  assert.equal(isSessionOpen('sydney', '2026-03-13T22:30:00', 'UTC'), false);
});

test('isSessionOpen aceita DateTime como entrada', () => {
  const dt = DateTime.fromISO('2026-03-16T13:30:00Z');
  assert.equal(isSessionOpen('new york', dt, 'UTC'), true);
});
