# Learning app template

The starting point for our kids' learning apps (Regroup!, Snap & Split, …). Everything Regroup taught us is already here, so a new app starts with the boring parts done:

- **Read-aloud voice:** the Cloudflare voice (Workers AI, Deepgram Aura-2) when it's available, otherwise the device's own voice. If the Cloudflare voice fails (for example, the free daily allowance is used up), the device voice takes over for 10 minutes.
- **Sound effects** for every kind of press: number notes, select, delete, check, tap, lift, land, slide, snap, crack, take-away, right, oops, win, fanfare (`kit/sound.js`).
- **Motion helpers** for moving things between places: ghosts, FLIP moves, arcs, pop, shake, vanish, confetti (`kit/fx.js`).
- **"How it works" cards** before a level: a rule, an animated example, read aloud, with Listen / Skip / Start (`kit/lesson.js`).
- **Varied prompts** so kids don't hear the same line every time: `leadIn()`, `praise()`, `tryAgain()` and `vary(key, [...])` (`kit/vary.js`).
- **The answer bar stays visible when kids pinch-zoom** (`kit/dock.js`).
- **Progress, stars and stickers** saved in the browser only (`kit/store.js`, `kit/ui.js`).
- **Hash router** whose views can return a cleanup function (`kit/router.js`).
- **Grown-ups page** with voice, sounds and passcode settings (`kit/ui.js → viewGrownups`).
- **Shared look:** big tap targets, dark mode, and the colors `--blue --green --red --purple --yellow` (`css/base.css`).
- **Installable and offline:** service worker, manifest, and PNG icons for iOS and Android.
- **Cloudflare Worker** serving the app plus `/api/health` and `/api/tts`, with a passcode option. The voice is all Cloudflare Workers AI: Aura-2 for single words and numbers, MeloTTS (about 100× cheaper) for sentences of three or more words.

No build step: plain ES modules in `public/`.

## Start a new app

1. On GitHub, open this repo and press **Use this template → Create a new repository** (for example `snap-split`).
2. Rename it (search for `my-app`, `My App`, `myapp:v1`):
   - `wrangler.jsonc` → `"name"` (the Worker name) and, if wanted, the custom domain line
   - `package.json` → `"name"`
   - `public/index.html` → `<title>`, description, `apple-mobile-web-app-title`, the brand text
   - `public/manifest.webmanifest` → `name`, `short_name`, `description`
   - `public/js/app.js` → `S.init("myapp:v1")`. **Every app needs its own key**, or apps on the same domain could share saved progress.
3. Draw the icon in `public/icon.svg` (rounded) and `public/icon-maskable.svg` (full square, art in the middle 80%), then run `node scripts/make-icons.cjs`.
4. Replace the demo in `public/js/app.js` and `public/css/app.css` with the app. Put pure logic (levels, question generators) in its own module and test it in `test/`.
5. When you add files, list them in `ASSETS` in `public/sw.js`, and bump `VERSION` whenever you deploy changes.

## Run, test, deploy

```bash
npm install
npm test                       # node:test, no dependencies
python3 -m http.server -d public 8787    # or: npx wrangler dev
npx wrangler deploy            # → https://<name>.<you>.workers.dev
```

The voice API is open unless you set a passcode: `npx wrangler secret put APP_PASSCODE` (then enter it on the grown-ups page). On Cloudflare's free plan the voice costs nothing and falls back to the device voice after the daily allowance; on the paid plan, words cost $0.03 per 1,000 characters and sentences a tiny fraction of that.

## Lessons learned (please keep)

- **iOS needs PNG icons.** SVG alone shows a blank icon on the home screen.
- **Views may be async;** the router only keeps real cleanup functions (an async view once froze Regroup's navigation).
- **Little fingers miss small targets.** Make the whole area a tap target (e.g. "tap anywhere in the lane takes one away") and make things bigger while they're being tapped.
- **Pinch-zoom hides fixed bars;** `keepDockVisible()` handles the bottom bar. Put the controls kids need in `.dock`.
- **Everything is said aloud,** and nothing should require reading for the youngest kids.
- **Wrong answers are gentle:** a hint first, then show the answer after a second try. Stars, not scores.
