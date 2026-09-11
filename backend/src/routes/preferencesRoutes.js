const { Router } = require('express');
const { z } = require('zod');

const preferencesSchema = z.object({
  baseTimezone: z.string().min(3).optional(),
  lockBaseTimezone: z.boolean().optional()
});

function createPreferencesRoutes(store) {
  const router = Router();

  router.put('/preferences', async (req, res, next) => {
    try {
      const parsed = preferencesSchema.parse(req.body || {});
      const updated = await store.update('preferences', parsed);
      res.json(updated.preferences);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createPreferencesRoutes
};
