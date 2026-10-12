import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import {
  DEFAULT_SETTINGS,
  PLATFORM_SETTINGS_TARGET_ID,
} from "../../utils/settings/platformDefaults.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  createSettingsVersion,
  findCurrentSettings,
  findSettingsHistory,
  lockCurrentSettings,
} from "../../repositories/platformSetting.repository.js";

// The platform settings in force [AC-SADM-02, AC-SADM-03].
// Read often (every checkout, every rider search), changed rarely. So the current version is
// kept in Redis; a change deletes that copy, and the next read on ANY server or the worker
// gets the new values at once: no restart, no redeploy.
const CACHE_KEY = "platform-settings:current";
// A safety net: even if a deletion were missed, a stale copy lasts at most this long
const CACHE_SECONDS = 5 * 60;
const HISTORY_SIZE = 20;

// { version, values, changedAt }: what is in force now
export const getSettings = async () => {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn({ err: error }, "Settings cache unavailable; reading MySQL");
  }

  const row = await findCurrentSettings();
  // No row yet (should not happen after the migration): the starting values
  const current = row
    ? { version: row.id, values: { ...DEFAULT_SETTINGS, ...row.values }, changedAt: row.createdAt }
    : { version: 0, values: { ...DEFAULT_SETTINGS }, changedAt: null };

  try {
    await redis.set(CACHE_KEY, JSON.stringify(current), "EX", CACHE_SECONDS);
  } catch {
    // Reading MySQL again next time is fine
  }
  return current;
};

// Change some settings [AC-SADM-02]. A new version holds every value (the unchanged ones
// copied over); the audit log records only what changed, old and new. Super admins only.
//   changes: e.g. { commissionPercent: 12 }; reason: why, for the history
export const updateSettings = async (superAdmin, changes, reason) => {
  const result = await sequelize.transaction(async (transaction) => {
    const currentRow = await lockCurrentSettings(transaction);
    const before = { ...DEFAULT_SETTINGS, ...(currentRow ? currentRow.values : {}) };
    const after = { ...before, ...changes };

    // A wider second search must really be wider
    if (after.widenedRadiusKm < after.searchRadiusKm) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
        { field: "widenedRadiusKm", message: "Must be at least the first search radius" },
      ]);
    }

    // Only the values that really changed
    const changedKeys = Object.keys(changes).filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );
    if (changedKeys.length === 0) {
      throw new AppError(409, "NOTHING_CHANGED", "These are already the current settings");
    }

    const version = await createSettingsVersion(
      { values: after, changedBy: superAdmin.id, reason },
      transaction,
    );
    await saveAuditLog(
      {
        actorId: superAdmin.id,
        action: "SETTINGS_CHANGED",
        targetType: "setting",
        targetId: PLATFORM_SETTINGS_TARGET_ID,
        before: Object.fromEntries(changedKeys.map((key) => [key, before[key]])),
        after: {
          ...Object.fromEntries(changedKeys.map((key) => [key, after[key]])),
          version: version.id,
        },
        reason,
        ipAddress: superAdmin.ipAddress,
      },
      transaction,
    );
    return { version: version.id, values: after, changedAt: version.createdAt };
  });

  // Every server and the worker read the new values from now on [AC-SADM-03]
  await redis.del(CACHE_KEY);
  return result;
};

// The latest versions: when, who, why
export const listSettingsHistory = async () => {
  const rows = await findSettingsHistory(HISTORY_SIZE);
  return rows.map((row) => ({
    version: row.id,
    values: row.values,
    reason: row.reason,
    changedAt: row.createdAt,
    changedBy: row.changer ? row.changer.fullName : null,
  }));
};
