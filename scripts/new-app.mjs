#!/usr/bin/env node
// Rename this template into your own app in one step.
//   npm run new -- fractions "Fraction Pizza"
// Sets the Worker / package name, the page title and app name, the saved-progress key and the
// offline cache name. Safe to run once on a fresh copy.

import fs from "node:fs";

const [id, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ");
if (!id || !/^[a-z][a-z0-9-]{1,40}$/.test(id) || !name) {
  console.error('Usage: npm run new -- <id> "<App Name>"   (id: lowercase letters, numbers, dashes; e.g. fractions)');
  process.exit(1);
}
const key = id.replace(/-/g, ""); // localStorage / cache prefix
const htmlName = name.replace(/&/g, "&amp;");

const edits = [
  ["wrangler.jsonc", [[/"name": "my-app"/, `"name": "${id}"`], [/my-app/g, id], [/myapp:v1/g, `${key}:v1`]]],
  ["package.json", [[/"name": "my-app"/, `"name": "${id}"`]]],
  ["package-lock.json", [[/"name": "my-app"/g, `"name": "${id}"`]]],
  ["public/index.html", [[/My App/g, htmlName], [/myapp:v1/g, `${key}:v1`]]],
  ["public/manifest.webmanifest", [[/My App/g, name]]],
  ["public/js/app.js", [[/"myapp:v1"/, `"${key}:v1"`], [/My App/g, name]]],
  ["public/sw.js", [[/const APP = "myapp";/, `const APP = "${key}";`]]],
];
let changed = 0;
for (const [file, rules] of edits) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  for (const [re, to] of rules) s = s.replace(re, to);
  if (s !== before) { fs.writeFileSync(file, s); changed++; console.log("updated", file); }
}
if (!changed) console.log("Nothing to rename (already renamed?).");
console.log(`
Next:
  1. Draw your icon in public/icon.svg and public/icon-maskable.svg, then: npm run icons
  2. Build your app in public/js/app.js (replace the demo) and public/css/app.css
  3. npm test, then npm run dev (or: python3 -m http.server -d public 8787)
  4. npx wrangler deploy`);
