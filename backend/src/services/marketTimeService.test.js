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

test('isSessionOpen - Hong Kong', () => {
  assert.equal(isSessionOpen('hong_kong', '2026-03-16T02:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('hong_kong', '2026-03-16T01:00:00', 'UTC'), false);
  assert.equal(isSessionOpen('hong_kong', '2026-03-16T22:30:00', 'America/Sao_Paulo'), true);
  assert.equal(isSessionOpen('hong_kong', '2026-03-16T22:00:00', 'America/Sao_Paulo'), false);
});

test('isSessionOpen - Shanghai', () => {
  assert.equal(isSessionOpen('shanghai', '2026-03-16T02:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('shanghai', '2026-03-16T07:30:00', 'UTC'), false);
  assert.equal(isSessionOpen('xangai', '2026-03-16T22:30:00', 'America/Sao_Paulo'), true);
});

test('isSessionOpen - Brazil', () => {
  assert.equal(isSessionOpen('brazil', '2026-03-16T12:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('brazil', '2026-03-16T11:59:00', 'UTC'), false);
  assert.equal(isSessionOpen('brazil', '2026-03-16T14:00:00', 'UTC'), true);
  assert.equal(isSessionOpen('b3', '2026-03-16T09:00:00', 'America/Sao_Paulo'), true);
  assert.equal(isSessionOpen('ibovespa', '2026-03-16T08:30:00', 'America/Sao_Paulo'), false);
  assert.equal(isSessionOpen('ibovespa', '2026-03-16T09:30:00', 'America/Sao_Paulo'), true);
  assert.equal(isSessionOpen('ibovespa', '2026-03-16T18:30:00', 'America/Sao_Paulo'), false);
});

test('isSessionOpen - respeita fechamento global do mercado', () => {
  // Sexta 22:30 UTC estaria na janela da sessao de Sydney, mas mercado global ja fechou.
  assert.equal(isSessionOpen('sydney', '2026-03-13T22:30:00', 'UTC'), false);
});

test('isSessionOpen aceita DateTime como entrada', () => {
  const dt = DateTime.fromISO('2026-03-16T13:30:00Z');
  assert.equal(isSessionOpen('new york', dt, 'UTC'), true);
});
