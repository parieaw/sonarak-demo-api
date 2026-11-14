// npm test
// Starts the API on a free port and walks through everything it offers. Also a list of what to try in Sonarak.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../src/app");
let server;
let base;
const quiet = console.error;

before(async () => {
  console.log = () => {};
  await new Promise((done) => (server = app.listen(0, done)));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** A client with its own cookie jar, like one browser or one Sonarak environment */
function client() {
  const jar = new Map();
  const call = async (method, path, { body, headers = {}, form, raw } = {}) => {
    const h = { ...headers };
    if (jar.size) h.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    let payload;
    if (raw) payload = raw;
    else if (form) {
      h["content-type"] = "application/x-www-form-urlencoded";
      payload = new URLSearchParams(form).toString();
    } else if (body !== undefined) {
      h["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + path, { method, headers: h, body: payload, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [name, ...value] = pair.split("=");
      if (/max-age=0/i.test(c)) jar.delete(name);
      else jar.set(name, value.join("="));
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* a page or a redirect */
    }
    return { status: res.status, json, text, location: res.headers.get("location") };
  };
  return { jar, call, get: (p, o) => call("GET", p, o), post: (p, o) => call("POST", p, o), del: (p, o) => call("DELETE", p, o) };
}

async function signedIn(email) {
  const c = client();
  const login = await c.post("/api/auth/login", { body: { email, password: "demo1234" } });
  const csrf = (await c.get("/api/auth/csrf")).json.csrfToken;
  return { ...c, token: login.json.accessToken, csrf: { "x-csrf-token": csrf } };
}

test("signing in with a password gives a cookie and a token; a wrong password is a business failure", async () => {
  const c = client();
  const ok = await c.post("/api/auth/login", { body: { email: "admin@demo.test", password: "demo1234" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.status, true);
  assert.match(ok.json.accessToken, /^demo_[0-9a-f]{32}$/);
  assert.deepEqual(ok.json.user, { id: "u_admin", email: "admin@demo.test", name: "Ada Admin", role: "admin", permissions: ["orders.read", "orders.write", "orders.refund", "products.write"] });
  assert.ok(c.jar.has("demo_session"));
  assert.equal((await c.get("/api/auth/me")).json.user.email, "admin@demo.test");

  const wrong = await client().post("/api/auth/login", { body: { email: "admin@demo.test", password: "nope-nope" } });
  assert.deepEqual([wrong.status, wrong.json], [200, { status: false, msg: "WRONG_EMAIL_OR_PASSWORD" }], "HTTP 200, and the body says no");
  const invalid = await client().post("/api/auth/login", { body: { email: "not-an-email", password: "x" } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.json.errors.map((e) => e.field), ["email", "password"]);

  assert.equal((await client().get("/api/auth/me")).status, 401);
  assert.equal((await c.post("/api/auth/logout")).json.signedOut, true);
  assert.equal((await c.get("/api/auth/me")).status, 401);
});

test("orders: the session cookie, the CSRF header, validation and business failures", async () => {
  const staff = await signedIn("staff@demo.test");
  const list = await staff.get("/api/orders?status=paid&page=1&limit=5");
  assert.equal(list.json.status, true);
  assert.equal(list.json.msg, "SUCCESS");
  assert.ok(list.json.result.items.every((o) => o.status === "paid"));
  assert.deepEqual(Object.keys(list.json.result), ["items", "page", "limit", "total", "hasMore"]);
  assert.equal((await staff.get("/api/orders?status=shipped")).status, 400);
  assert.equal((await staff.get("/api/orders/nope")).status, 400);
  assert.deepEqual((await staff.get("/api/orders/o_9999")).json, { status: false, msg: "ORDER_NOT_FOUND" });

  const order = { items: [{ productId: "p_latte", quantity: 1 }], note: "to go" };
  assert.deepEqual([(await staff.post("/api/orders", { body: order })).status, (await staff.post("/api/orders", { body: order })).json.msg], [403, "CSRF_TOKEN_MISMATCH"]);
  const made = await staff.post("/api/orders", { body: order, headers: staff.csrf });
  assert.equal(made.status, 200);
  assert.equal(made.json.result.total, 95);
  assert.equal(made.json.result.status, "pending");
  const id = made.json.result.id;

  const bad = await staff.post("/api/orders", { body: { items: [] }, headers: staff.csrf });
  assert.equal(bad.status, 400);
  const out = await staff.post("/api/orders", { body: { items: [{ productId: "p_scone", quantity: 1 }] }, headers: staff.csrf });
  assert.deepEqual([out.status, out.json], [200, { status: false, msg: "OUT_OF_STOCK" }]);

  assert.equal((await staff.post(`/api/orders/${id}/pay`, { headers: staff.csrf })).json.result.status, "paid");
  assert.deepEqual((await staff.post(`/api/orders/${id}/pay`, { headers: staff.csrf })).json, { status: false, msg: "ORDER_ALREADY_PAID" });
  assert.deepEqual((await staff.del(`/api/orders/${id}`, { headers: staff.csrf })).json, { status: false, msg: "ORDER_ALREADY_PAID" });
});

test("roles: what an admin, a staff member and a guest each get", async () => {
  const [admin, staff, guest] = await Promise.all(["admin@demo.test", "staff@demo.test", "guest@demo.test"].map(signedIn));
  const bearer = (c) => ({ headers: { authorization: `Bearer ${c.token}` } });
  // the admin area signs in with the token
  assert.equal((await admin.get("/api/admin/users", bearer(admin))).json.total, 3);
  assert.deepEqual([(await staff.get("/api/admin/users", bearer(staff))).status, (await staff.get("/api/admin/users", bearer(staff))).json.msg], [403, "NO_PERMISSION"]);
  assert.equal((await admin.get("/api/admin/users")).status, 401, "the cookie alone does not open the admin area");
  assert.deepEqual((await admin.get("/api/admin/reports/sales", bearer(admin))).json.result.currency, "THB");
  // a guest reads only their own orders and cannot place one
  assert.equal((await guest.get("/api/orders")).json.result.total, 0);
  assert.deepEqual([(await guest.get("/api/orders/o_1001")).status, (await guest.get("/api/orders/o_1001")).json.msg], [403, "NOT_YOUR_ORDER"]);
  assert.equal((await guest.post("/api/orders", { body: { items: [{ productId: "p_latte", quantity: 1 }] }, headers: guest.csrf })).status, 403);
  // only who may write products can upload
  const fd = () => {
    const f = new FormData();
    f.set("caption", "new cup");
    f.set("image", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "cup.png");
    return f;
  };
  assert.equal((await staff.post("/api/products/p_latte/image", { raw: fd(), headers: staff.csrf })).status, 403);
  const up = await admin.post("/api/products/p_latte/image", { raw: fd(), headers: admin.csrf });
  assert.equal(up.status, 200);
  assert.deepEqual([up.json.result.id, up.json.result.size, up.json.result.caption], ["p_latte", 4, "new cup"]);
  const none = new FormData();
  none.set("caption", "no file");
  assert.deepEqual((await admin.post("/api/products/p_latte/image", { raw: none, headers: admin.csrf })).json, { status: false, msg: "IMAGE_REQUIRED" });
});

test("the open routes: health, the menu, a form post, the webhook's key", async () => {
  const c = client();
  assert.equal((await c.get("/api/health")).json.ok, true);
  const menu = await c.get("/api/products?inStock=true");
  assert.ok(menu.json.result.items.length >= 2 && menu.json.result.items.every((p) => p.stock > 0));
  const fb = await c.post("/api/feedback", { form: { name: "Kit", message: "Nice latte", rating: "5" } });
  assert.equal(fb.status, 201);
  assert.deepEqual(fb.json.result, { id: 1, name: "Kit", message: "Nice latte", rating: 5 });
  assert.equal((await c.post("/api/feedback", { form: { name: "Kit" } })).status, 400);
  // PAYMENT_API_KEY is not set when the tests run: the webhook says so instead of letting anyone in
  const hook = await c.post("/api/webhooks/payment", { body: { orderId: "o_1002" }, headers: { "x-api-key": "anything" } });
  assert.deepEqual([hook.status, hook.json.msg], [500, "PAYMENT_KEY_NOT_CONFIGURED"]);
});

test("the report with a bug answers 500 and logs the stack", async () => {
  const admin = await signedIn("admin@demo.test");
  const logged = [];
  console.error = (e) => logged.push(e);
  const r = await admin.get("/api/admin/reports/daily", { headers: { authorization: `Bearer ${admin.token}` } });
  console.error = quiet;
  assert.deepEqual([r.status, r.json], [500, { status: false, msg: "Internal Server Error" }]);
  assert.ok(logged[0] instanceof TypeError);
  assert.match(logged[0].stack, /report\.service\.js/);
});

test("signing in through the provider: a redirect a browser follows to the end", async () => {
  const browser = client();
  const start = await browser.get("/api/auth/oauth");
  assert.equal(start.status, 307);
  const to = new URL(start.location);
  assert.equal(to.pathname, "/oauth/authorize");
  assert.deepEqual([to.searchParams.get("client_id"), to.searchParams.get("response_type")], ["sonarak-demo", "code"]);
  assert.ok(browser.jar.has("demo_oauth_state"));
  // the provider's page, then the choice of account
  const picker = await browser.get(to.pathname + to.search);
  assert.match(picker.text, /Choose who to continue as/);
  const cont = await browser.get(`/oauth/continue?as=u_staff&redirect_uri=${encodeURIComponent(to.searchParams.get("redirect_uri"))}&state=${to.searchParams.get("state")}`);
  assert.equal(cont.status, 302);
  const back = new URL(cont.location);
  const done = await browser.get(back.pathname + back.search);
  assert.deepEqual([done.status, done.location], [302, "/signed-in"]);
  assert.equal((await browser.get("/api/auth/me")).json.user.email, "staff@demo.test");
  assert.match((await browser.get("/signed-in")).text, /Signed in as Sam Staff/);

  // the same callback from something that never started the sign-in (another client, with no state cookie) is refused
  const other = client();
  const again = await browser.get(`/oauth/continue?as=u_admin&redirect_uri=${encodeURIComponent(to.searchParams.get("redirect_uri"))}&state=whatever`);
  const stolen = new URL(again.location);
  assert.deepEqual((await other.get(stolen.pathname + stolen.search)).json, { status: false, msg: "OAUTH_STATE_MISMATCH" });
  // and the provider only sends people back to this app
  assert.equal((await browser.get("/oauth/continue?as=u_admin&redirect_uri=https%3A%2F%2Fevil.example%2Fcb&state=x")).status, 400);
});

test("refunds: off until FEATURE_REFUNDS is set, then only for who may refund", async () => {
  const config = require("../src/config");
  const admin = await signedIn("admin@demo.test");
  const staff = await signedIn("staff@demo.test");
  const reason = { reason: "customer changed their mind" };
  assert.deepEqual((await admin.post("/api/orders/o_1001/refund", { body: reason, headers: admin.csrf })).json, { status: false, msg: "REFUNDS_ARE_OFF" });
  config.refundsEnabled = "1";
  assert.equal((await staff.post("/api/orders/o_1001/refund", { body: reason, headers: staff.csrf })).status, 403);
  assert.equal((await admin.post("/api/orders/o_1001/refund", { body: { reason: "no" }, headers: admin.csrf })).status, 400);
  const done = await admin.post("/api/orders/o_1001/refund", { body: reason, headers: admin.csrf });
  assert.deepEqual(done.json.result, { id: "o_1001", status: "refunded", refunded: 190, reason: reason.reason });
  assert.deepEqual((await admin.post("/api/orders/o_1001/refund", { body: reason, headers: admin.csrf })).json, { status: false, msg: "ORDER_NOT_PAID" });
  assert.equal((await admin.get("/api/orders?status=refunded")).json.result.hasMore, false);
  config.refundsEnabled = undefined;
});
