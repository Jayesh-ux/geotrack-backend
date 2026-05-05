// services/session-cleanup.service.js
// Auto clock-out for stale sessions + cleanup duplicate sessions
import { pool } from "../db.js";
import { SESSION_STATES } from "./tracking.service.js";

/**
 * Auto clock-out sessions that have been:
 * 1. Active for more than 24 hours (safety net)
 * 2. Have no location logs for more than 4 hours (stale)
 */
export async function autoClockOutStaleSessions() {
  try {
    console.log("🧹 Running auto clock-out for stale sessions...");

    // 1. Close sessions active for more than 24 hours
    const staleResult = await pool.query(
      `UPDATE user_tracking_sessions 
       SET session_state = $1, ended_at = NOW(), clock_out_location = $2
       WHERE session_state = 'ACTIVE' 
         AND started_at < NOW() - INTERVAL '24 hours'
       RETURNING id, user_id, started_at`,
      [SESSION_STATES.ENDED, JSON.stringify({ autoClockOut: true, reason: "24h_max_exceeded" })]
    );

    if (staleResult.rows.length > 0) {
      console.log(`⚠️ Auto clocked-out ${staleResult.rows.length} sessions (24h limit):`);
      staleResult.rows.forEach(row => {
        console.log(`  - User ${row.user_id}: session ${row.id} started at ${row.started_at}`);
      });

      // Update users table
      await pool.query(
        `UPDATE users SET session_state = $1, current_session_id = NULL 
         WHERE id IN (SELECT user_id FROM unnest($2::uuid[]) as t(id))`,
        [SESSION_STATES.ENDED, staleResult.rows.map(r => r.user_id)]
      );
    }

    // 2. Close sessions with no location logs for more than 4 hours
    const noLogsResult = await pool.query(
      `UPDATE user_tracking_sessions 
       SET session_state = $1, ended_at = NOW(), clock_out_location = $2
       WHERE session_state = 'ACTIVE'
         AND NOT EXISTS (
           SELECT 1 FROM location_logs 
           WHERE location_logs.user_id = user_tracking_sessions.user_id
             AND location_logs.timestamp > NOW() - INTERVAL '4 hours'
             AND location_logs.activity IN ('ON_DUTY', 'MEETING_START', 'JOURNEY_START')
         )
         AND started_at < NOW() - INTERVAL '4 hours'
       RETURNING id, user_id`,
      [SESSION_STATES.ENDED, JSON.stringify({ autoClockOut: true, reason: "no_recent_logs" })]
    );

    if (noLogsResult.rows.length > 0) {
      console.log(`⚠️ Auto clocked-out ${noLogsResult.rows.length} sessions (no recent logs):`);
      noLogsResult.rows.forEach(row => {
        console.log(`  - User ${row.user_id}: session ${row.id}`);
      });
    }

    console.log(`✅ Auto clock-out completed. Closed ${staleResult.rows.length + noLogsResult.rows.length} stale sessions.`);
    return {
      staleSessions: staleResult.rows.length,
      noLogsSessions: noLogsResult.rows.length
    };

  } catch (error) {
    console.error("❌ Auto clock-out failed:", error.message);
    throw error;
  }
}

/**
 * Clean up duplicate active sessions (safety net)
 * Keeps the earliest session, closes the rest
 */
export async function cleanupDuplicateSessions() {
  try {
    console.log("🧹 Cleaning up duplicate active sessions...");

    // Find users with multiple active sessions
    const duplicates = await pool.query(
      `SELECT user_id, array_agg(id ORDER BY started_at ASC) as session_ids
       FROM user_tracking_sessions
       WHERE session_state = 'ACTIVE' AND ended_at IS NULL
       GROUP BY user_id
       HAVING COUNT(*) > 1`
    );

    if (duplicates.rows.length === 0) {
      console.log("✅ No duplicate sessions found.");
      return { cleaned: 0 };
    }

    let cleanedCount = 0;
    for (const row of duplicates.rows) {
      const sessions = row.session_ids;
      // Keep the first (earliest) session, close the rest
      const toClose = sessions.slice(1);

      await pool.query(
        `UPDATE user_tracking_sessions
         SET session_state = $1, ended_at = started_at, clock_out_location = clock_in_location
         WHERE id = ANY($2::uuid[])`,
        [SESSION_STATES.ENDED, toClose]
      );

      cleanedCount += toClose.length;
      console.log(`  - User ${row.user_id}: Kept session ${sessions[0]}, closed ${toClose.length} duplicate(s)`);
    }

    // Update users table to point to the correct session
    await pool.query(
      `UPDATE users u SET current_session_id = (
        SELECT id FROM user_tracking_sessions 
        WHERE user_tracking_sessions.user_id = u.id 
          AND session_state = 'ACTIVE' 
        ORDER BY started_at ASC LIMIT 1
      ) WHERE u.id IN (SELECT user_id FROM unnest($1::uuid[]) as t(user_id))`,
      [duplicates.rows.map(r => r.user_id)]
    );

    console.log(`✅ Cleaned up ${cleanedCount} duplicate sessions.`);
    return { cleaned: cleanedCount };

  } catch (error) {
    console.error("❌ Duplicate cleanup failed:", error.message);
    throw error;
  }
}

/**
 * Get session health report
 */
export async function getSessionHealth() {
  const result = await pool.query(
    `SELECT 
       COUNT(CASE WHEN session_state = 'ACTIVE' AND ended_at IS NULL THEN 1 END) as active_sessions,
       COUNT(CASE WHEN session_state = 'ACTIVE' AND ended_at IS NULL AND started_at < NOW() - INTERVAL '24 hours' THEN 1 END) as stale_sessions,
       COUNT(CASE WHEN session_state = 'ACTIVE' AND ended_at IS NULL GROUP BY user_id HAVING COUNT(*) > 1 THEN 1 END) as users_with_duplicates
     FROM user_tracking_sessions`
  );

  return result.rows[0];
}
