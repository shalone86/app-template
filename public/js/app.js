// APP NAME: a short description. Plain ES modules, no build step.
// This demo shows the pieces: a home screen, a level of questions with the speech bubble,
// the dock, motion, stars and stickers, and the grown-ups page. Replace it with your app.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("myapp:v1", {}); // ← change the key for every app (and add app-specific settings here)

import { createRouter } from "./kit/router.js";
import { stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { showLesson } from "./kit/lesson.js";
import { leadIn, praise, tryAgain } from "./kit/vary.js";
import { esc, pick, starsHtml, starsFor, nextButton, say, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";

const app = document.getElementById("app");

const LEVELS = [
  { id: "count-5", title: "Count to 5", emoji: "🐣", max: 5 },
  { id: "count-10", title: "Count to 10", emoji: "🐥", max: 10 },
];
const QUESTIONS = 5;

const route = createRouter([
  [/^$/, viewHome],
  [/^play\/([\w-]+)$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: "<p>Describe how this app teaches.</p>" })],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game"); },
});

function viewHome() {
  const next = LEVELS.find((l) => !S.progress(l.id).done) ?? LEVELS[0];
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">My App</h1>
      <p class="lede">One sentence about what kids do here.</p>
      <a class="btn big primary play-btn" href="#/play/${next.id}">▶ Play</a>
    </section>
    <div class="level-grid">
      ${LEVELS.map((l) => `<a class="level-card${l.id === next.id ? " next" : ""}" href="#/play/${l.id}"><span class="emoji">${l.emoji}</span>${esc(l.title)}${starsHtml(S.progress(l.id).stars)}</a>`).join("")}
    </div>
    ${stickerBook()}`;
}

function viewPlay(id) {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) { location.hash = "#/"; return; }
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Exit">✕</a>
        <div class="dots">${Array.from({ length: QUESTIONS }, (_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${level.emoji}</span><p class="say"></p></div>
      <div class="card demo-stage"></div>
    </section>
    <div class="dock"></div>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const bubble = app.querySelector(".bubble"), dock = app.querySelector(".dock"), stage = app.querySelector(".demo-stage");
  let alive = true, mistakes = 0;

  (async () => {
    // "How it works" card before the first question (Listen / Skip / Start).
    await showLesson(stage, {
      emoji: level.emoji, title: "Counting dots",
      rule: "Touch each dot as you count. The <b>last number</b> you say is how many!",
      exampleHtml: `<div class="demo-dots"><i></i><i></i><i></i></div><p class="center"><span class="lesson-focus">1, 2, 3 → <b>3 dots</b></span></p>`,
      voice: "Touch each dot as you count. One, two, three. The last number you say is how many. Three dots!",
    });
    for (let k = 0; k < QUESTIONS && alive; k++) {
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      const before = mistakes;
      const n = 1 + Math.floor(Math.random() * level.max);
      stage.innerHTML = `<div class="demo-dots">${"<i></i>".repeat(n)}</div>`;
      // Vary the prompt so it isn't the same line every time.
      say(bubble, k === 0 ? "How many dots?" : `${leadIn()} How many dots?`);
      const opts = [...new Set([n, Math.max(1, n - 1), Math.min(level.max, n + 1), 1 + Math.floor(Math.random() * level.max)])].slice(0, 3).sort(() => Math.random() - 0.5);
      if (!opts.includes(n)) opts[0] = n;
      dock.innerHTML = `<div class="choices">${opts.map((v) => `<button class="choice-card" data-v="${v}">${v}</button>`).join("")}</div>`;
      await new Promise((resolve) => {
        dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
          sfx.select();
          if (+b.dataset.v === n) { b.classList.add("right"); sfx.right(); FX.confetti(15); resolve(); }
          else { mistakes++; b.classList.add("wrong"); b.disabled = true; FX.shake(b); sfx.oops(); say(bubble, `${tryAgain()} Count one at a time.`); }
        });
      });
      if (!alive) return;
      say(bubble, `${praise()} ${n}!`);
      markDot(app, k, mistakes > before); // yellow if it took a mistake
      S.solvedOne();
      await nextButton(dock, k < QUESTIONS - 1 ? "Next ▶" : "Finish 🏁");
    }
    if (!alive) return;
    const i = LEVELS.indexOf(level), nx = LEVELS[i + 1];
    showFinish(app, {
      id: level.id, stars: starsFor(mistakes), mistakes, title: "You did it!", done: `${QUESTIONS} done.`,
      again: `#/play/${level.id}`, onAgain: route,
      next: nx ? { href: `#/play/${nx.id}`, label: `Next: ${nx.emoji} ${nx.title} ▶` } : null,
    });
  })();
  return () => { alive = false; };
}

installClickSounds();
jingleOnce("demo", () => S.settings().sounds); // the app's little logo sound, on the first tap
route();
keepDockVisible();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
