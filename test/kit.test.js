import { test } from "node:test";
import assert from "node:assert/strict";
import { spoken } from "../public/js/kit/speech.js";

test("spoken text reads math and drops emoji and html", () => {
  assert.equal(spoken("<b>3</b> + 2 = ? 🎉"), "3 plus 2 equals what?");
  assert.equal(spoken("7 − 4 = 3"), "7 minus 4 equals 3");
  assert.equal(spoken("2 × 3 ÷ 6"), "2 times 3 divided by 6");
});

// Add your app's own tests (pure logic: levels, question generators…) in test/app.test.js.

test("one sticker per level: mini with mistakes, grows giant after a perfect replay", async () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  const S = await import("../public/js/kit/store.js?stickers");
  S.init("demo:v1");
  let r = S.finishLevel("a", 2, "🦄", false);
  assert.deepEqual([r.e, r.big, r.isNew, r.grew], ["🦄", false, true, false]);
  r = S.finishLevel("a", 2, "🚀", false);
  assert.deepEqual([r.e, r.big, r.isNew, r.grew], ["🦄", false, false, false]);
  r = S.finishLevel("a", 3, "🚀", true);
  assert.deepEqual([r.e, r.big, r.isNew, r.grew], ["🦄", true, false, true]);
  assert.equal(S.stickers().length, 1);
  assert.deepEqual(JSON.parse(mem["angelio:stickers"])["demo/a"].big, true);
  delete globalThis.localStorage;
});
