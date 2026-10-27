-- 2026-10-27: persistent feedback rate limiting.
-- The public feedback endpoint keeps per-IP submissions in this table so the
-- limit survives new sessions (it previously lived in $_SESSION).
-- Run once on existing installs. New installs get it from schema.sql.

CREATE TABLE IF NOT EXISTS feedback_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY ip_time (ip, attempted_at)
);
