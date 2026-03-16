import { DateTime } from 'luxon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getSessionScheduleByDate, getSessionOverlapsByDate } = require('../src/services/marketTimeService');

const DATES = ['2026-02-15', '2026-03-15', '2026-04-10', '2026-08-15', '2026-10-30', '2026-11-10'];
const SESSIONS = ['sydney', 'tokyo', 'london', 'new_york'];

for (const date of DATES) {
  const reference = DateTime.fromISO(`${date}T12:00:00`, { zone: 'America/Sao_Paulo' });

  console.log(`\n=== ${date} (America/Sao_Paulo) ===`);

  for (const sessionId of SESSIONS) {
    const schedule = getSessionScheduleByDate(sessionId, reference);
    if (!schedule) {
      continue;
    }

    console.log(
      `${schedule.label.padEnd(18)} | Abre: ${schedule.openInSaoPaulo} | Fecha: ${schedule.closeInSaoPaulo} | DST: ${
        schedule.isDstNow ? 'SIM' : 'NAO'
      } | Offset: ${schedule.currentOffset}`
    );
  }

  const overlaps = getSessionOverlapsByDate(reference);
  const londonNy = overlaps.find((item) => item.id === 'london_newyork');
  const tokyoLondon = overlaps.find((item) => item.id === 'tokyo_london');
  const sydneyTokyo = overlaps.find((item) => item.id === 'sydney_tokyo');

  console.log(
    `Overlap Londres+NY : ${londonNy ? `${londonNy.startLabel} -> ${londonNy.endLabel}` : 'Sem overlap nessa referencia'}`
  );
  console.log(
    `Overlap Toquio+Londres: ${tokyoLondon ? `${tokyoLondon.startLabel} -> ${tokyoLondon.endLabel}` : 'Sem overlap nessa referencia'}`
  );
  console.log(
    `Overlap Sydney+Toquio : ${sydneyTokyo ? `${sydneyTokyo.startLabel} -> ${sydneyTokyo.endLabel}` : 'Sem overlap nessa referencia'}`
  );
}
