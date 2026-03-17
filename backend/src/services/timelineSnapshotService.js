const { DateTime } = require('luxon');

const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=\s]+)$/i;
const MAX_SNAPSHOT_BYTES = 8_000_000;

function normalizeIso(value) {
  if (!value || typeof value !== 'string') {
    return DateTime.now().toISO();
  }

  const parsed = DateTime.fromISO(value, { setZone: true });
  if (!parsed.isValid) {
    return DateTime.now().toISO();
  }

  return parsed.toISO();
}

function createTimelineSnapshotService(options = {}) {
  const logger = options.logger || console;
  let latestSnapshot = null;

  function setSnapshot(payload = {}) {
    const imageDataUrl = typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl.trim() : '';
    const match = DATA_URL_REGEX.exec(imageDataUrl);
    if (!match) {
      throw new Error('Formato de imagem invalido. Envie data URL PNG/JPEG em base64.');
    }

    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    const base64 = match[2].replace(/\s+/g, '');
    const sizeBytes = Buffer.byteLength(base64, 'base64');

    if (!sizeBytes || sizeBytes > MAX_SNAPSHOT_BYTES) {
      throw new Error(`Snapshot muito grande. Limite: ${MAX_SNAPSHOT_BYTES} bytes.`);
    }

    latestSnapshot = {
      mimeType,
      base64,
      sizeBytes,
      capturedAtIso: normalizeIso(payload.capturedAtIso),
      timezone: typeof payload.timezone === 'string' ? payload.timezone.trim() : '',
      locale: typeof payload.locale === 'string' ? payload.locale.trim() : ''
    };

    return {
      ok: true,
      capturedAtIso: latestSnapshot.capturedAtIso,
      sizeBytes: latestSnapshot.sizeBytes,
      mimeType: latestSnapshot.mimeType
    };
  }

  function getSnapshot(options = {}) {
    if (!latestSnapshot) {
      return null;
    }

    const maxAgeSeconds =
      Number.isFinite(options.maxAgeSeconds) && options.maxAgeSeconds > 0 ? Number(options.maxAgeSeconds) : 900;
    const now = DateTime.now();
    const capturedAt = DateTime.fromISO(latestSnapshot.capturedAtIso, { setZone: true });

    if (!capturedAt.isValid) {
      return null;
    }

    const ageSeconds = Math.max(0, now.diff(capturedAt, 'seconds').seconds);
    if (ageSeconds > maxAgeSeconds) {
      return null;
    }

    return {
      ...latestSnapshot,
      ageSeconds
    };
  }

  function getStatus() {
    if (!latestSnapshot) {
      return {
        available: false
      };
    }

    const snapshot = getSnapshot({ maxAgeSeconds: Number.MAX_SAFE_INTEGER });
    if (!snapshot) {
      return {
        available: false
      };
    }

    return {
      available: true,
      capturedAtIso: snapshot.capturedAtIso,
      sizeBytes: snapshot.sizeBytes,
      mimeType: snapshot.mimeType
    };
  }

  function toInlineAttachment(snapshot, cid = 'timeline-snapshot') {
    if (!snapshot?.base64 || !snapshot?.mimeType) {
      return null;
    }

    const extension = snapshot.mimeType === 'image/png' ? 'png' : 'jpg';
    const capturedAt = DateTime.fromISO(snapshot.capturedAtIso, { setZone: true });
    const stamp = capturedAt.isValid ? capturedAt.toFormat("yyyyLLdd-HHmmss") : DateTime.now().toFormat("yyyyLLdd-HHmmss");

    return {
      filename: `timeline-${stamp}.${extension}`,
      content: Buffer.from(snapshot.base64, 'base64'),
      contentType: snapshot.mimeType,
      cid,
      disposition: 'inline'
    };
  }

  return {
    setSnapshot,
    getSnapshot,
    getStatus,
    toInlineAttachment
  };
}

module.exports = {
  createTimelineSnapshotService
};
