import { test } from "node:test";
import assert from "node:assert/strict";
import { louder } from "../worker/loud.js";

function wav(samples) {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b), str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true); samples.forEach((s, i) => v.setInt16(44 + i * 2, s, true));
  return b;
}
const peak = (b) => Math.max(...Array.from(new Int16Array(b, 44), Math.abs));

test("quiet clips are raised to just under full scale", () => {
  const out = louder(wav([0, 9000, -12000, 3000]));
  assert.ok(peak(out) > 30000 && peak(out) <= 32767);
});
test("very quiet clips get at most 4× (no blasting noise)", () => {
  assert.equal(peak(louder(wav([100, -200]))), 800);
});
test("loud clips and non-WAV data are left alone", () => {
  const loud = wav([32000, -31000]);
  assert.equal(louder(loud), loud);
  const mp3 = new Uint8Array([0xff, 0xfb, 1, 2]).buffer;
  assert.equal(louder(mp3), mp3);
});
