// CRC-32 (IEEE) over the UTF-8 bytes of a string. Detects typos and damage, not tampering.
var CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(text) {
  const bytes = unescape(encodeURIComponent(text));
  let c = 4294967295;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes.charCodeAt(i)) & 255] ^ c >>> 8;
  return ((c ^ 4294967295) >>> 0).toString(16).padStart(8, "0");
}
