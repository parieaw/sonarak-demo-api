// npm test
// The collections in collections/ (to try Sonarak's Import) must point at routes this API has.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../src/app");
const dir = path.join(import.meta.dirname, "..", "collections");
let server;
let base;

before(async () => {
  console.log = () => {};
  await new Promise((done) => (server = app.listen(0, done)));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** method and path of every request in the three collections */
function requests() {
  const out = [];
  const openapi = JSON.parse(fs.readFileSync(path.join(dir, "openapi.json"), "utf8"));
  for (const [p, ops] of Object.entries(openapi.paths)) for (const m of Object.keys(ops)) out.push({ from: "openapi", method: m.toUpperCase(), path: p });
  const walk = (items) => {
    for (const it of items) {
      if (it.item) walk(it.item);
      else out.push({ from: "postman", method: it.request.method, path: it.request.url.raw.replace("{{baseUrl}}", "").split("?")[0] });
    }
  };
  walk(JSON.parse(fs.readFileSync(path.join(dir, "postman.json"), "utf8")).item);
  const bru = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && e.name !== "environments") bru(f);
      else if (e.name.endsWith(".bru")) {
        const m = /^(get|post|put|patch|delete) \{\n\s+url: \{\{baseUrl\}\}([^?\n]+)/m.exec(fs.readFileSync(f, "utf8"));
        if (m) out.push({ from: `bruno ${e.name}`, method: m[1].toUpperCase(), path: m[2] });
      }
    }
  };
  bru(path.join(dir, "bruno"));
  return out;
}

test("every request in collections/ reaches a route of this API", async () => {
  const list = requests();
  assert.ok(list.length >= 14, `${list.length} requests`);
  for (const r of list) {
    const res = await fetch(base + r.path, { method: r.method, headers: { "content-type": "application/json" }, body: r.method === "GET" ? undefined : "{}" });
    const body = await res.text();
    assert.notEqual(res.status, 404, `${r.from}: ${r.method} ${r.path} → ${res.status} ${body.slice(0, 80)}`);
  }
});
