const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const {
  enrichRadarWithActiveExchanges,
  getBrazilRadar,
  getRadarForContext,
  isBrazilFuturesMorningWindow
} = require('./radarService');

test('getBrazilRadar coloca WINFUT e WDOFUT como ideais antes das 12h em Brasilia', () => {
  const now = DateTime.fromISO('2026-03-17T11:30:00', { zone: 'America/Sao_Paulo' });
  const radar = getBrazilRadar(now);

  assert.equal(isBrazilFuturesMorningWindow(now), true);
  assert.ok(radar.recommended.includes('IBOVESPA'));
  assert.ok(radar.recommended.includes('WINFUT'));
  assert.ok(radar.recommended.includes('WDOFUT'));
  assert.equal(radar.neutral.includes('WINFUT'), false);
  assert.equal(radar.neutral.includes('WDOFUT'), false);
});

test('getBrazilRadar move WINFUT e WDOFUT para aceitavel a partir das 12h em Brasilia', () => {
  const now = DateTime.fromISO('2026-03-17T12:00:00', { zone: 'America/Sao_Paulo' });
  const radar = getBrazilRadar(now);

  assert.equal(isBrazilFuturesMorningWindow(now), false);
  assert.ok(radar.recommended.includes('IBOVESPA'));
  assert.equal(radar.recommended.includes('WINFUT'), false);
  assert.equal(radar.recommended.includes('WDOFUT'), false);
  assert.ok(radar.neutral.includes('WINFUT'));
  assert.ok(radar.neutral.includes('WDOFUT'));
});

test('enrichRadarWithActiveExchanges inclui futuros brasileiros no radar principal', () => {
  const now = DateTime.fromISO('2026-03-17T10:30:00', { zone: 'America/Sao_Paulo' });
  const primary = getRadarForContext('gold');
  const sessions = [{ id: 'brazil', isActive: true }, { id: 'london', isActive: true }];
  const merged = enrichRadarWithActiveExchanges(primary, sessions, now);

  assert.ok(merged.recommended.includes('XAUUSD'));
  assert.ok(merged.recommended.includes('IBOVESPA'));
  assert.ok(merged.recommended.includes('WINFUT'));
  assert.ok(merged.recommended.includes('WDOFUT'));
});
