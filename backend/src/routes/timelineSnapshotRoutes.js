const { Router } = require('express');
const { z } = require('zod');

const timelineSnapshotSchema = z.object({
  imageDataUrl: z.string().min(1),
  capturedAtIso: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional()
});

function createTimelineSnapshotRoutes(options = {}) {
  const router = Router();
  const snapshotService = options.snapshotService || null;

  router.get('/timeline-snapshot', (_req, res) => {
    const status = snapshotService?.getStatus?.() || { available: false };
    res.json(status);
  });

  router.post('/timeline-snapshot', (req, res, next) => {
    try {
      if (!snapshotService?.setSnapshot) {
        return res.status(503).json({
          ok: false,
          message: 'Servico de snapshot indisponivel.'
        });
      }

      const parsed = timelineSnapshotSchema.parse(req.body || {});
      const result = snapshotService.setSnapshot(parsed);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = {
  createTimelineSnapshotRoutes
};
