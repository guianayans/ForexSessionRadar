const { Router } = require('express');
const { z } = require('zod');

const leadMinutesSchema = z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]);

const sessionAlarmSchema = z.object({
  open: z.boolean().optional(),
  close: z.boolean().optional(),
  favorite: z.boolean().optional(),
  beforeMinutes: z.array(leadMinutesSchema).max(4).optional()
});

const eventAlarmSchema = z.object({
  enabled: z.boolean().optional(),
  leadMinutes: leadMinutesSchema.optional(),
  beforeMinutes: z.array(leadMinutesSchema).max(4).optional()
});

const preferencesSchema = z.object({
  baseTimezone: z.string().min(3).optional(),
  lockBaseTimezone: z.boolean().optional(),
  alertLeadMinutes: leadMinutesSchema.optional(),
  alertOnSessionOpen: z.boolean().optional(),
  alertOnOverlapStart: z.boolean().optional(),
  alertOnIdealWindowEnd: z.boolean().optional(),
  sessionAlarms: z.record(z.string(), sessionAlarmSchema).optional(),
  eventAlarms: z.record(z.string(), eventAlarmSchema).optional()
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
