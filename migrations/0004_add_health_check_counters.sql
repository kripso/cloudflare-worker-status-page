-- Migration number: 0004 	2026-06-13T00:00:00.000Z
ALTER TABLE services ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN consecutive_successes INTEGER NOT NULL DEFAULT 0;
