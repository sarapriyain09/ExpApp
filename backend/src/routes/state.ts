import { Router, Response } from "express";
import db from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/state", requireAuth, (req: AuthRequest, res: Response): void => {
  const row = db
    .prepare("SELECT state FROM user_state WHERE user_id = ?")
    .get(req.userId) as { state: string } | undefined;

  if (!row) {
    res.json(null);
    return;
  }
  res.json(JSON.parse(row.state));
});

router.put("/state", requireAuth, (req: AuthRequest, res: Response): void => {
  const state = req.body;
  db.prepare(`
    INSERT INTO user_state (user_id, state, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
  `).run(req.userId, JSON.stringify(state), new Date().toISOString());
  res.json({ ok: true });
});

export default router;
