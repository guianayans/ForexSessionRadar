const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { DEFAULT_STORE } = require('../types/constants');
const { computeDashboard, getAlertTriggerCandidates } = require('./sessionService');

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(DEFAULT_STORE));
}

function buildPayload(nowIso, preferencePatch = {}) {
  const payload = cloneDefaultStore();
  payload.preferences = {
    ...payload.preferences,
    alertLeadMinutes: 15,
    alertOnSessionOpen: false,
    alertOnOverlapStart: false,
    alertOnIdealWindowEnd: false,
    sessionAlarms: {},
    eventAlarms: {},
    ...preferencePatch
  };
  const dashboard = computeDashboard(payload, DateTime.fromISO(nowIso, { setZone: true }), 'America/Sao_Paulo');
  return { payload, dashboard };
}

function getCandidates(payload, dashboard) {
  return getAlertTriggerCandidates(dashboard.upcomingEvents, payload.preferences, dashboard.nowIso);
}

test('eventAlarms: aceita IDs decorados de overlap da timeline (com timestamp)', () => {
  const nowIso = '2026-03-17T07:00:00-03:00';
  const { payload, dashboard } = buildPayload(nowIso);
  const overlapStart = dashboard.upcomingEvents.find((event) => event.id.startsWith('london_newyork-start-'));
  assert.ok(overlapStart, 'Deveria existir overlap_start de Londres + Nova York nesse horario');

  const millis = DateTime.fromISO(overlapStart.timeIso, { setZone: true }).toMillis();
  const frontendDecoratedId = `london_newyork_${millis}-start-${overlapStart.timeIso}`;

  payload.preferences.eventAlarms = {
    [frontendDecoratedId]: {
      enabled: true,
      beforeMinutes: [10]
    }
  };

  const candidates = getCandidates(payload, dashboard).filter(
    (candidate) => candidate.id === overlapStart.id && candidate.leadMinutes === 10
  );
  assert.equal(candidates.length, 1, 'Overlap decorado deveria gerar trigger de email');
});

test('eventAlarms: aceita ID de Janela de Ouro da timeline para overlap_start', () => {
  const nowIso = '2026-03-17T07:00:00-03:00';
  const { payload, dashboard } = buildPayload(nowIso);
  const overlapStart = dashboard.upcomingEvents.find((event) => event.id.startsWith('london_newyork-start-'));
  assert.ok(overlapStart, 'Deveria existir overlap_start de Londres + Nova York nesse horario');

  const millis = DateTime.fromISO(overlapStart.timeIso, { setZone: true }).toMillis();
  const goldenWindowId = `golden_window_london_newyork_${millis}-start-${overlapStart.timeIso}`;

  payload.preferences.eventAlarms = {
    [goldenWindowId]: {
      enabled: true,
      beforeMinutes: [5]
    }
  };

  const candidates = getCandidates(payload, dashboard).filter(
    (candidate) => candidate.id === overlapStart.id && candidate.leadMinutes === 5
  );
  assert.equal(candidates.length, 1, 'Alarme da Janela de Ouro deveria refletir em trigger de email');
});

test('sessionAlarms: open/close/beforeMinutes da sessao refletem em triggers de email', () => {
  const nowIso = '2026-03-17T07:00:00-03:00';
  const { payload, dashboard } = buildPayload(nowIso, {
    sessionAlarms: {
      sydney: {
        open: true,
        close: true,
        beforeMinutes: [5, 10]
      }
    }
  });

  const sydneyOpen = dashboard.upcomingEvents.find((event) => event.id.startsWith('sydney-open-'));
  const sydneyClose = dashboard.upcomingEvents.find((event) => event.id.startsWith('sydney-close-'));
  assert.ok(sydneyOpen, 'Esperado evento futuro de abertura de Sydney');
  assert.ok(sydneyClose, 'Esperado evento futuro de fechamento de Sydney');

  const candidates = getCandidates(payload, dashboard);

  const openImmediate = candidates.find((candidate) => candidate.id === sydneyOpen.id && candidate.leadMinutes === 0);
  const openLead5 = candidates.find((candidate) => candidate.id === sydneyOpen.id && candidate.leadMinutes === 5);
  const openLead10 = candidates.find((candidate) => candidate.id === sydneyOpen.id && candidate.leadMinutes === 10);
  const closeImmediate = candidates.find((candidate) => candidate.id === sydneyClose.id && candidate.leadMinutes === 0);

  assert.ok(openImmediate, 'Abertura de sessao com open=true deveria gerar trigger imediato');
  assert.ok(openLead5, 'beforeMinutes 5 deveria gerar trigger de email para abertura');
  assert.ok(openLead10, 'beforeMinutes 10 deveria gerar trigger de email para abertura');
  assert.ok(closeImmediate, 'Fechamento de sessao com close=true deveria gerar trigger imediato');
});

test('toggles globais continuam gerando triggers de email da timeline', () => {
  const nowIso = '2026-03-17T07:00:00-03:00';
  const { payload, dashboard } = buildPayload(nowIso, {
    alertLeadMinutes: 30,
    alertOnSessionOpen: true,
    alertOnOverlapStart: true,
    alertOnIdealWindowEnd: true
  });

  const candidates = getCandidates(payload, dashboard);

  const hasSessionOpen = candidates.some((candidate) => candidate.type === 'session_open' && candidate.leadMinutes === 30);
  const hasOverlapStart = candidates.some((candidate) => candidate.type === 'overlap_start' && candidate.leadMinutes === 30);
  const hasIdealWindowEnd = candidates.some((candidate) => candidate.type === 'ideal_window_end' && candidate.leadMinutes === 30);

  assert.ok(hasSessionOpen, 'alertOnSessionOpen deveria gerar triggers de email');
  assert.ok(hasOverlapStart, 'alertOnOverlapStart deveria gerar triggers de email');
  assert.ok(hasIdealWindowEnd, 'alertOnIdealWindowEnd deveria gerar triggers de email');
});

