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
