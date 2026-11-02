# Handoff: run the apps' read-aloud voice on the owner's Mac Studio

**For:** Claude Code (or a person) running **on the owner's Mac Studio**, with permission to set this up end to end.
**Goal:** a free, unlimited, good-quality voice for the kids' learning apps (Regroup!, Snap & Split, and future apps from this template), served from the Mac and used by the apps' Cloudflare Workers.
**Time:** about 30–45 minutes.

## How it fits together (already built on the cloud side)

```
kid's iPad ──▶ regroup.shalonely.com / snap.shalonely.com   (Cloudflare Workers)
                    │  GET /api/tts?text=…
                    ├─▶ 1. TTS_ORIGIN  = the Mac's voice server, through a tunnel   ← you set this up
                    ├─▶ 2. Workers AI Aura-2 (free daily allowance)                  ← automatic fallback
                    └─▶ 3. error → the app uses the iPad's own voice                ← automatic fallback
```

Every clip is cached at Cloudflare's edge for 30 days, so each sentence is generated on the Mac only once. If the Mac is off or asleep, the apps keep working with the other voices (the Worker waits at most 8 seconds for the Mac).

The Worker code is **already deployed** for `regroup` and `snap-split` (see `worker/index.js` in each repo). It does nothing until the secrets in step 5 are set. It calls the Mac like this (the OpenAI-compatible speech API, which Kokoro-FastAPI provides):

```
POST {TTS_ORIGIN}/v1/audio/speech
Authorization: Bearer {TTS_TOKEN}                     (if TTS_TOKEN is set)
CF-Access-Client-Id / CF-Access-Client-Secret         (if TTS_ACCESS_ID / TTS_ACCESS_SECRET are set)
{ "model": "kokoro", "input": "Ten ones make one ten!", "voice": "af_heart", "response_format": "mp3", "speed": 1 }
→ 200, content-type audio/mpeg
```

## Rules

- **Don't change how Ollama is set up or exposed**, other than adding the voice next to it (for example, one more hostname on the same tunnel). Ollama must keep working exactly as before.
- **Never expose the voice server to the internet without protection.** Use a Cloudflare Access service token or a bearer token (step 3). Keep it bound to `127.0.0.1`.
- **Secrets go in with `npx wrangler secret put`,** never in a file or a commit.
- **Cloudflare account:** only the owner's (`npx wrangler whoami` → ariyandhamma@gmail.com, the account with the `regroup` and `snap-split` Workers). If it shows another account, stop and ask.
- The owner approved adding a hostname such as `voice.shalonely.com` for this. Don't change other DNS records, Workers or routes.
- Don't change the Mac's power or sleep settings without asking. (Ollama is already reachable "anytime", so the Mac is probably set to stay awake already. Just check.)

## Steps

### 1. Look at how Ollama is reachable today
Find out how the owner's server reaches Ollama, and reuse the same method for the voice:
- Cloudflare Tunnel? Check `cloudflared tunnel list`, `~/.cloudflared/config.yml` (or `/etc/cloudflared/config.yml`), and `launchctl list | grep -i cloudflared`.
- Tailscale (`tailscale status`, `tailscale serve status` / `funnel`), ngrok, a reverse proxy (Caddy or nginx), or port forwarding?

The Workers run on Cloudflare, so the voice must be reachable **from the public internet over HTTPS**. A Cloudflare Tunnel hostname is the easiest. A Tailscale-only address will **not** work from a Worker. If Ollama is Tailscale-only, add a Cloudflare Tunnel just for the voice.

### 2. Install and run Kokoro (the voice)
Use **Kokoro-FastAPI** (github.com/remsky/Kokoro-FastAPI), which serves the Kokoro-82M voice with the OpenAI-style `/v1/audio/speech` API and runs natively on Apple Silicon (GPU/MPS). Follow its README for a native macOS run, not Docker (Docker on a Mac can't use the GPU). Its default port is 8880.
- Bind it to `127.0.0.1` only.
- Check it: `curl -s -X POST http://127.0.0.1:8880/v1/audio/speech -H 'content-type: application/json' -d '{"model":"kokoro","input":"Ten ones make one ten!","voice":"af_heart","response_format":"mp3"}' -o /tmp/t.mp3 && afplay /tmp/t.mp3`
- Any other server works too, as long as it speaks that same API and returns mp3.

**Pick the voice with the owner** (it's for 3–8 year olds): make the same sentence, "Yes! Three and two make five. Tap the ones to trade ten of them for one ten.", in a few American voices (for example `af_heart`, `af_bella`, `af_nicole`, `af_sarah`, `am_michael`, `am_adam`), play them with `afplay`, and let the owner choose. Default: `af_heart`.

### 3. Make it reachable, with protection
With a Cloudflare Tunnel (recommended): add an ingress rule to the existing tunnel's config, **above** the catch-all rule:
```yaml
  - hostname: voice.shalonely.com
    service: http://127.0.0.1:8880
```
then `cloudflared tunnel route dns <tunnel-name> voice.shalonely.com` and restart cloudflared.

Protect it (choose one):
- **Cloudflare Access (preferred):** in Zero Trust, add an Application for `voice.shalonely.com` with a **Service Auth** policy and create a **service token**. Its Client ID and Secret become `TTS_ACCESS_ID` and `TTS_ACCESS_SECRET`.
- **Bearer token:** if Kokoro-FastAPI supports an API key, set one. Otherwise put a tiny check in front (for example Caddy with a header matcher) that rejects requests without `Authorization: Bearer <long random token>`. The token becomes `TTS_TOKEN`.

Check from outside: an unauthenticated request must be refused (401/403), and an authenticated one must return audio.

### 4. Keep it running
- Run the voice server as a **launchd** agent (`~/Library/LaunchAgents/…plist` with `RunAtLoad` and `KeepAlive`), so it starts at login and restarts if it crashes. Log to a file.
- cloudflared should already run as a service (it does for Ollama). If you added a new tunnel, `sudo cloudflared service install`.
- Reboot test, if the owner agrees: after a restart, both come back by themselves.

### 5. Point the apps at the Mac
For **each** app (`regroup` and `snap-split` today, and later apps made from the template): clone the repo (`https://github.com/shalone86/<repo>`), `npm install`, then:
```bash
npx wrangler whoami                        # must be ariyandhamma@gmail.com
npx wrangler secret put TTS_ORIGIN         # https://voice.shalonely.com
npx wrangler secret put TTS_VOICE          # the voice the owner picked, e.g. af_heart
npx wrangler secret put TTS_ACCESS_ID      # and TTS_ACCESS_SECRET   (or TTS_TOKEN)
```
Setting a secret takes effect right away. No code change or deploy is needed.

### 6. Verify
```bash
for h in regroup.shalonely.com snap.shalonely.com; do
  curl -s -D - -o /tmp/v.mp3 "https://$h/api/tts?text=Hello%20from%20the%20Mac%20$RANDOM&voice=thalia" | grep -i -E "^HTTP|x-voice-source|content-type"
  afplay /tmp/v.mp3
done
```
Expect `200`, `audio/mpeg` and **`x-voice-source: own`**. (The random number skips the cache.) Then stop the voice server and run it again: it should still answer, now with `x-voice-source: aura` (or a 502 if today's free Cloudflare allowance is used up, in which case the iPad's own voice takes over). Start the server again afterwards.

Finally, open https://snap.shalonely.com on a phone, play a level, and listen: it should be the Mac's voice.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `x-voice-source: aura` while the Mac is up | `npx wrangler tail <worker>` shows "voice server unavailable" and the reason. Check the tunnel hostname, the Access token, and that the server returns `content-type: audio/mpeg` |
| First word clipped, or slow first reply | Warm the model at startup (one request in the launchd script). Later replies are fast, and the edge cache serves repeats |
| 403 from Access | The service token isn't in the Access policy, or the secrets were swapped |
| Ollama stopped working | Undo the tunnel change (the new ingress rule must sit above the catch-all and must not replace Ollama's) |

## Report back to the owner
- Which voice was picked, and the hostname
- How it's protected (Access service token or bearer token; don't show the secret)
- The step 6 results for both apps, including the fallback test
- Anything changed on the Mac (launchd plist path, tunnel config lines)
