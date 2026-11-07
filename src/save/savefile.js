import { crc32 } from "./crc32.js";

// Save files: every "bendingBoosters.*" and "bb.*" localStorage value in one checksummed JSON.
// `storage` is anything localStorage-shaped (length, key, getItem, setItem, removeItem).
export var SAVE_FILE_FORMAT = "bending-boosters-save";
export var SAVE_FILE_VERSION = 1;
var BACKUP_KEY = "bb.backup";
var MAIN_KEY = "bendingBoosters.v1";
export function saveKeys(storage) {
  const out = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if ((k.startsWith("bendingBoosters.") || k.startsWith("bb.")) && k !== BACKUP_KEY) out.push(k);
  }
  return out.sort();
}
// Anything that will be rendered must never carry markup: refuse any < or > in imported text.
var carriesMarkup = (raw) => {
  let v;
  try {
    v = JSON.parse(raw);
  } catch (e) {
    return /[<>]/.test(raw);
  }
  const walk = (x) => typeof x === "string" ? /[<>]/.test(x) : x && typeof x === "object" ? Object.entries(x).some(([k, y]) => /[<>]/.test(k) || walk(y)) : false;
  return walk(v);
};
var sortedKeys = (obj) => Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
var checksumOf = (keys) => crc32(JSON.stringify(sortedKeys(keys)));
export function exportSave(storage, now = Date.now()) {
  const keys = {};
  for (const k of saveKeys(storage)) keys[k] = storage.getItem(k);
  return { format: SAVE_FILE_FORMAT, version: SAVE_FILE_VERSION, exportedAt: new Date(now).toISOString(), keys, checksum: checksumOf(keys) };
}
export function parseSaveFile(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "This file isn't a save file." };
  }
  if (!file || file.format !== SAVE_FILE_FORMAT) return { ok: false, error: "This isn't a Bending Boosters save." };
  if (!(file.version <= SAVE_FILE_VERSION)) return { ok: false, error: "This save was made by a newer version of the game." };
  const keys = file.keys && typeof file.keys === "object" ? file.keys : {};
  const valid = Object.entries(keys).every(([k, v]) => typeof v === "string" && (k.startsWith("bendingBoosters.") || k.startsWith("bb.")));
  if (!valid || checksumOf(keys) !== file.checksum) return { ok: false, error: "This save file is damaged or was edited." };
  if (typeof keys[MAIN_KEY] !== "string") return { ok: false, error: "This save has no wallet or collection in it." };
  let main = null;
  try {
    main = JSON.parse(keys[MAIN_KEY]);
  } catch (e) {
  }
  if (!main || typeof main !== "object" || Array.isArray(main) || Object.values(keys).some(carriesMarkup)) {
    return { ok: false, error: "This save file is damaged or was edited." };
  }
  return { ok: true, keys };
}
export function importSave(storage, keys) {
  const previous = {};
  for (const k of saveKeys(storage)) previous[k] = storage.getItem(k);
  try {
    storage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), keys: previous }));
  } catch (e) {
    return { ok: false, error: "Couldn't import: browser storage is full or blocked. Your save was not changed." };
  }
  try {
    for (const k of Object.keys(previous)) if (!(k in keys)) storage.removeItem(k);
    for (const [k, v] of Object.entries(keys)) storage.setItem(k, v);
    return { ok: true };
  } catch (e) {
    for (const k of Object.keys(keys)) if (!(k in previous)) try { storage.removeItem(k); } catch (e2) {}
    for (const [k, v] of Object.entries(previous)) try { storage.setItem(k, v); } catch (e2) {}
    return { ok: false, error: "Couldn't import: browser storage is full or blocked. Your save was not changed." };
  }
}
