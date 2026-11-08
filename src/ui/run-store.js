import { deserialize } from "../engine/run.js";

// Where the active Journey run is saved, and a read-only peek at it for the home screen.
export var RUN_KEY = "bb.run";
export function readSavedRun(epoch) {
  try {
    const s = localStorage.getItem(RUN_KEY);
    const run = s ? deserialize(s) : null;
    if (!run || (run.epoch || null) !== (epoch || null)) return null;
    return run;
  } catch (e) {
    return null;
  }
}
// The last v2 run seen, kept before this build rewrites it as v3.
export var RUN_BACKUP_KEY = "bb.backup.run-v2";
export function backupLegacyRun(raw) {
  try {
    const r = JSON.parse(raw);
    if (!r || r.v !== 2) return false;
    localStorage.setItem(RUN_BACKUP_KEY, raw);
    return true;
  } catch (e) {
    return false;
  }
}
