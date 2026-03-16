const { Router } = require('express');
const { z } = require('zod');

const checklistItem = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  done: z.boolean()
});

const plannerSchema = z.object({
  checklist: z.array(checklistItem).optional(),
  favorites: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
  lockoutEnabled: z.boolean().optional()
});

function createPlannerRoutes(store) {
  const router = Router();

  router.put('/planner', async (req, res, next) => {
    try {
      const parsed = plannerSchema.parse(req.body || {});
      const updated = await store.update('planner', parsed);
      res.json(updated.planner);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createPlannerRoutes
};
