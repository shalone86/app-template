# Learning app template

A starter for **kids' learning web apps**: the pieces every app needs when the player is 4 to 9 years old and may not read yet. It's what the [Angelio](https://angelio.org) games (Regroup!, Snap & Split, Doubles, Grammar!) are built on, and you're welcome to build your own.

- **Plain web:** HTML, CSS and ES modules in `public/`. No build step, no framework. Open it with any static server.
- **Works without a server:** the app runs fully in the browser and offline. A small optional Cloudflare Worker adds a nicer read-aloud voice.
- **Kid-tested defaults:** everything said aloud, big tap targets, gentle mistakes, stars and stickers, no accounts.

## Quick start

```bash
# 1. Get a copy: "Use this template" on GitHub, or:
npx degit shalone86/app-template fraction-pizza && cd fraction-pizza

# 2. Name it (Worker name, title, saved-progress key, cache name)
npm install
npm run new -- fraction-pizza "Fraction Pizza"

# 3. Run it
python3 -m http.server -d public 8787        # then open http://localhost:8787
# or, with the voice API: npm run dev

# 4. Test and deploy
npm test
npx wrangler deploy                          # → https://fraction-pizza.<you>.workers.dev
```

Then draw your icon in `public/icon.svg` (rounded square) and `public/icon-maskable.svg` (full square, art in the middle 80%), and run `npm run icons` (needs Playwright's Chromium once: `npx -y playwright@1 install chromium`).

Replace the demo in `public/js/app.js` (a small "count the dots" level that shows every piece working) with your app.

## What's in the kit (`public/js/kit/`)

| Module | What it gives you |
|---|---|
| `store.js` | Settings and progress in `localStorage`. `init(key)`, `settings()`, `setSetting()`, `progress(id)`, `finishLevel(id, stars, sticker)` |
| `router.js` | Hash router: `createRouter([[/^play\/(\w+)$/, viewPlay], …])`. A view may return a cleanup function |
| `tts.js` | `speak(text)`: the Worker's voice when it's there, otherwise the device's voice, with fallbacks that never block the game |
| `sound.js` | `sfx.tap()`, `sfx.key(n)` (a note per digit), `sfx.snap()`, `sfx.crack()`, `sfx.right()`, `sfx.oops()`, `sfx.fanfare()` and more, made with Web Audio (no files) |
| `fx.js` | Motion: `capture()` + `flip()` to animate things to new places, `move()` along arcs, `pop()`, `shake()`, `vanish()`, `flyHtml()`, `confetti()` |
| `lesson.js` | `await showLesson(container, { title, rule, exampleHtml, voice })`: a "How it works" card with an animated example, read aloud, and Listen / Skip / Start |
| `vary.js` | Variety so kids don't hear the same line: `leadIn()` ("How about this one?"), `praise()`, `tryAgain()`, `vary(key, [...])` |
| `ui.js` | Speech bubble `say()`, `nextButton()`, `starsFor(mistakes)`, `showFinish()` with stickers, `stickerBook()`, the grown-ups page, click sounds |
| `dock.js` | `keepDockVisible()`: the bottom answer bar stays on screen when a child pinch-zooms |
| `speech.js` | `spoken(text)`: turns "3 + 2 = ?" into "3 plus 2 equals what?" for the voice |

`css/base.css` has the shared look (light and dark mode, chunky buttons, the bubble, the dock, the lesson card) and five colors: `--blue --green --red --purple --yellow`, each with `-soft` and `-ink`. Your styles go in `css/app.css`.

## The Worker (optional)

`worker/index.js` serves `public/` and two endpoints:

- `GET /api/health` → `{ tts: true, … }` when a voice is available
- `GET /api/tts?text=…&voice=helena` → a WAV clip from Cloudflare Workers AI (Deepgram Aura-2), cached at the edge so each sentence is made once

Without the Worker (or when it fails, or the daily free allowance is used up) the app uses the device's voice, so it never breaks. Costs: on Cloudflare's free plan there's a daily free allowance; beyond that Aura-2 is $0.03 per 1,000 characters. Set `npx wrangler secret put APP_PASSCODE` to keep strangers off your quota (players enter it on the grown-ups page).

**Optional safety caps and family codes** (`worker/codes.js`): bind a KV namespace as `CODES` and the voice gets a daily cap on new clips (`TTS_DAILY_CAP`, default 3000). If your app checks speech, `checkSpeech(request, env)` adds a few free tries a day and family codes with a monthly limit (turn on with var `REQUIRE_CODE = "true"`).

Other hosts: `public/` alone works on any static host (GitHub Pages, Netlify, a USB stick); you just get the device voice.

## Checklist for a new app

- **Unique names:** `npm run new` sets them. If several apps share one website (like angelio.org/regroup/ and /snap/), each needs its own saved-progress key (`S.init("…:v1")`) and cache name (`APP` in `sw.js`).
- **Offline:** list new files in `ASSETS` in `public/sw.js`, and bump `VERSION` when you deploy.
- **Pure logic in its own module** (levels, question generators) with tests in `test/`. Generate many questions in a test and check that every answer is among its choices; it catches more bugs than you'd think.
- **Moving to a new address later:** set `HOME_URL` and `STORE_KEY` in `wrangler.jsonc` vars, and the old address sends players to the new one with their saved progress (`worker/moved.js`).

## Lessons learned (please keep these)

- **Say everything aloud.** The youngest players can't read the instructions.
- **Make whole areas tappable.** Little fingers miss small targets ("tap anywhere in the lane takes one away"), and make things bigger while they're being tapped.
- **One tap beats "select, then place".** Tapping a word should put it in the next empty slot.
- **Mistakes are gentle:** a hint first; after a second try, show the answer and move on. Stars, not scores.
- **Vary the voice lines** (`vary.js`). Hearing the exact same sentence 20 times gets old fast.
- **Never reload the page mid-game** for an update, and not on the first visit.
- **iOS needs PNG icons;** SVG alone gives a blank home-screen icon.
- **Pinch-zoom hides fixed bars;** keep answer controls in `.dock`.
- **Test on a sideways phone (780×360).** Only 360 px tall: base.css moves the top buttons, bubble and `.dock` into a right-hand column there, so the game gets the full height. Don't let "wide screen" sizes kick in on short screens (use `min-height` in those media queries).
- **Safari is picky with tiny MP3 clips;** the Worker sends WAV.

## License

MIT, see [LICENSE](LICENSE). Build anything you like with it, including paid apps. The name "Angelio" and its logo are not part of the license.
