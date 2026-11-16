# sonarak-demo-api

A small API with a bit of everything, made to try [Sonarak](https://sonarak.parieaw.cloud) on. It runs on any machine with Node 20 or later: no database, no accounts, no network. The data is kept in memory and is the same every time the server starts.

It is a pretend café: people sign in, look at the menu, place orders. What matters is that it does each thing a real backend does in a way you can see in Sonarak.

## Run it

```bash
npm install
```

```bash
npm run dev
```

It listens on `http://localhost:4100`. In Sonarak: **Add project**, pick this folder, and set the environment's base URL to `http://localhost:4100`. Or start it from Sonarak's Server panel, which also shows its log.

Three accounts, all with the password `demo1234`:

| Email | Role | Can |
|---|---|---|
| `admin@demo.test` | admin | everything, including the admin area and product images |
| `staff@demo.test` | staff | read and place orders |
| `guest@demo.test` | guest | read their own orders |

## Things to try in Sonarak

1. **Routes from the code.** 24 routes appear with no setup. Open `POST /api/orders`: the body is filled in from the validation rules (`items` is one to ten, `quantity` is 1 to 20).
2. **Sign in once.** Send `POST /api/auth/login`. Its body starts with the admin account, from the example in the route's docs. Sonarak keeps the session cookie and the `accessToken`. `GET /api/auth/me` now works, and so does the admin area, which reads the token.
3. **CSRF without thinking about it.** `POST /api/orders` needs an `x-csrf-token` header that matches a cookie. Sonarak fetches it from `/api/auth/csrf` and adds it.
4. **An error, traced to its line.** Sign out and send `GET /api/orders`: 401, with the line in `src/middlewares/auth.js` that sent it.
5. **HTTP status and business status.** Order a `p_scone` (out of stock): the answer is HTTP 200 with `{ "status": false, "msg": "OUT_OF_STOCK" }`. Sonarak shows the two results apart.
6. **A crash, with its stack trace.** Start the server from the Server panel, sign in as the admin, send `GET /api/admin/reports/daily`. It answers 500, and the card shows the `TypeError` from `src/services/report.service.js`.
7. **Roles.** Record a flow (log in, list orders, open the admin users), give it the roles admin, staff and guest under **Run as**, and run it: one column per role.
8. **A file upload.** `POST /api/products/:id/image` is multipart, with the file in `image`.
9. **A sign-in that needs a browser.** `GET /api/auth/oauth` answers with a redirect to a pretend provider, the way "Sign in with Google" does. Sonarak explains it and offers the two steps.
10. **Check .env.** In the Server panel: three variables the code reads are not set (one of them, `FEATURE_REFUNDS`, is not even in `.env.example`), and one in the example is read nowhere. Each shows who added it.
11. **Compare branches.** Compare with `feature/refunds`: one new route, and changes to two others.
12. **From an AI agent.** With MCP on in Sonarak, ask Claude Code "which routes need the admin role?" or "why did my last request to /api/admin/reports/daily fail?".
13. **Why the server didn't start.** Rename `node_modules` (or run Sonarak's Server panel before `npm install`) and press **Run**. Under the bar Sonarak says what went wrong, here "express is not installed", with a button that installs the packages and starts the server. Start the server twice (once in your own terminal) for "port 4100 is already in use".
14. **The Terminal tab.** In the Server panel, switch **Log** to **Terminal**: your own shell in this folder. Run `npm install`, `git status`, anything.
15. **Paste a curl command.** **+ Add** in the Endpoints list, then paste a command copied from a browser's developer tools (Copy as cURL), for example:
    ```bash
    curl 'http://localhost:4100/api/auth/login' -H 'content-type: application/json' --data-raw '{"email":"staff@demo.test","password":"demo1234"}'
    ```
    It becomes an endpoint with its headers and body.
16. **A project without code.** **Add project › New without code…**, then **Import a collection**: pick `collections/openapi.json`, `collections/postman.json`, or the folder `collections/bruno`. The requests arrive with their bodies, and the base URL is set to `http://localhost:4100`.
17. **Expect.** Open `POST /api/auth/login`, go to the **Expect** tab, add "Status is 200" and "Body value `user.role` equals `admin`". Send it: a green badge. Change the email to the guest account and send again: the badge says which check failed.
18. **As code.** **Code ▾** beside **curl** copies the request as fetch, axios or Python requests, with the token and cookies Sonarak would send.
19. **Where the time went.** Start the server from Sonarak's Server panel, send `GET /api/products/prices`, and open **Timeline** beside Pretty: about 100 ms, nearly all of it three calls to the pricing service made one after another from `src/routes/product.routes.js`, one per product. Sonarak says the same call went out three times in one request. Press **Measure** for its typical and slow times; change the loop to `Promise.all` and measure again to see the difference.

## What is where

| Route | Sign-in | Shows |
|---|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | none / cookie | cookie and token, validation, a business failure |
| `GET /api/auth/csrf` | none | double-submit CSRF |
| `GET /api/auth/oauth`, `GET /api/auth/oauth/callback` | none | a redirect sign-in |
| `GET /api/orders`, `GET /api/orders/:id` | cookie + `orders.read` | query validation, 404, 403 |
| `POST /api/orders`, `POST /api/orders/:id/pay`, `DELETE /api/orders/:id` | cookie + CSRF + `orders.write` | body validation, business failures |
| `GET /api/products` | none | an open route |
| `GET /api/products/prices`, `GET /api/products/:id/price` | none | a slow route: one call per product (see 19) |
| `POST /api/products/:id/image` | cookie + CSRF + `products.write` | multipart upload |
| `GET /api/admin/users`, `GET /api/admin/reports/sales` | bearer token + admin | role guard |
| `GET /api/admin/reports/daily` | bearer token + admin | a 500 with a stack trace |
| `POST /api/feedback` | none | a urlencoded form |
| `POST /api/webhooks/payment` | `x-api-key` | an API key, and a setting that is missing |
| `GET /api/health` | none | the simplest one |

`collections/` holds a few of these routes as an OpenAPI file, a Postman collection and a Bruno collection folder, to try importing (see 16).

`/oauth/authorize`, `/oauth/continue` and `/signed-in` are pages of the pretend sign-in provider, for a browser.

Successes are `{ "status": true, "msg": "SUCCESS", ... }`. A business failure is HTTP 200 with `{ "status": false, "msg": "CODE" }`. A problem with the request keeps its status: 400, 401, 403, 404.

## Tests

```bash
npm test
```

They start the API on a free port and walk through everything above.

## Licence

MIT. The accounts, passwords and keys in this repository are for the demo only and open nothing.
