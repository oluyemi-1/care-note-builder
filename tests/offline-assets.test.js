/* The app must keep working with the wifi off. Every file index.html loads has
   to be in the service worker's cache list, or that file is missing offline. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const loaded = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);
const cached = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/"\.\/([^"]*)"/g)].map(m => m[1]);

test("every local file the page loads is cached for offline use", () => {
  assert.ok(loaded.length > 3);
  for (const f of loaded) assert.ok(cached.includes(f), f + " is loaded by index.html but not cached by sw.js");
});

test("every cached file exists", () => {
  for (const f of cached.filter(Boolean)) assert.ok(fs.existsSync(path.join(root, f)), f + " is in sw.js but missing on disk");
});

test("the page makes no external requests", () => {
  assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//);
});
