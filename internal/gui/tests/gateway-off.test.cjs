// Run with Node's test runner and Playwright on the module path; see README.md.
// The Gateway card's switch: off, the card says off with what that means and
// no fix button, and On serves it again at once; a turn-on that didn't take
// the port is said under the card. Another magpie holding the port while it
// is off is still said, with the state it runs under. In English and
// Chinese, in both engines.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { test } = require("node:test");
const { chromium, webkit } = require("playwright");

const assets = path.resolve(__dirname, "../assets");

function fixture(lang, world, theme = "light") {
  const state = { agents: [], profiles: [], settings: { lang, theme } };
  return async (route) => {
    const url = new URL(route.request().url());
    const json = (data) => route.fulfill({ json: data });
    if (url.pathname === "/boot.js") return route.fulfill({ contentType: "text/javascript", body: `window.bootPrefs = {lang:"${lang}",theme:"${theme}",web:true};` });
    if (url.pathname === "/wails/runtime.js") return route.fulfill({ contentType: "text/javascript", body: "export const Window = {};" });
    if (route.request().method() === "POST" && url.pathname.startsWith("/api/gateway/")) {
      world.posts.push(url.pathname + " " + route.request().postData());
      return json(world.answer(url.pathname));
    }
    if (route.request().method() !== "GET" && url.pathname.startsWith("/api/")) return json({});
    if (url.pathname === "/api/state") return json(state);
    if (url.pathname === "/api/providers") {
      const models = Array.from({ length: 3 }, (_, i) => ({ id: `model-${i}`, name: `Model ${i}`, on: true }));
      return json({
        providers: [{ id: "fixture", name: "Fixture", icon: "generic", models, agents: [] }],
        gateway: { running: true, window: true, url: "http://127.0.0.1:3999", calls: [], groups: [], models: 3, ...world.gateway },
      });
    }
    if (url.pathname === "/api/groups") return json({ groups: [] });
    if (url.pathname === "/api/gateway/trace") return json({ mine: false, now: new Date().toISOString(), seq: 1, totals: { requests: 0, rerouted: 0, errors: 0 }, routes: [] });
    if (url.pathname.startsWith("/api/")) return json({});
    const file = path.join(assets, url.pathname === "/" ? "index.html" : url.pathname);
    const contentType = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" }[path.extname(file)];
    await route.fulfill({ body: await fs.readFile(file), contentType });
  };
}

const words = {
  en: { off: "off", on: "running", offSub: /The gateway is off\./, taken: /Port 3999 is in use by another program/ },
  zh: { off: "关闭", on: "运行中", offSub: /网关已关闭。/, taken: /端口 3999 被其他程序占用/ },
};

for (const engine of (process.env.BROWSER ? [process.env.BROWSER] : ["chromium", "webkit"])) {
  for (const lang of ["en", "zh"]) {
    const w = words[lang];
    test(`${engine} ${lang}: the gateway card's switch turns the gateway off and on`, async (t) => {
      assert(["chromium", "webkit"].includes(engine), "BROWSER must be chromium or webkit");
      const browser = await (engine === "webkit" ? webkit.launch() : chromium.launch());
      t.after(() => browser.close());
      const errors = [];
      const open = async (world) => {
        const context = await browser.newContext({ viewport: { width: 420, height: 520 }, reducedMotion: "reduce" });
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", fixture(lang, world));
        await page.goto("http://magpie.test/?view=gateway");
        await page.locator("#gateway .state").waitFor();
        return { context, page };
      };

      // off: the card says so, no fix button, and the switch says Off
      {
        const world = { posts: [], gateway: { off: true, running: false, mine: false }, answer: () => ({ ok: true }) };
        const { context, page } = await open(world);
        assert.equal((await page.locator("#gateway .state").textContent()).trim(), w.off);
        assert.match(await page.locator("#gateway .sub").textContent(), w.offSub);
        assert.equal(await page.locator("#gateway .gw-fix").count(), 0);
        // On serves it again at once
        world.gateway = { off: false, running: true, mine: true };
        await page.locator("#gateway .segs .opt").nth(0).click();
        await page.waitForFunction((r) => document.querySelector("#gateway .state")?.textContent.trim() === r, w.on);
        assert.deepEqual(world.posts, ["/api/gateway/off {\"off\":false}"]);
        await context.close();
      }

      // a turn-on that didn't take the port is said under the card, the
      // switch back at Off
      {
        const world = { posts: [], gateway: { off: true, running: false, mine: false } };
        world.answer = () => ({ ok: false, reason: "taken", port: "3999" });
        const { context, page } = await open(world);
        await page.locator("#gateway .segs .opt").nth(0).click();
        await page.locator("#gateway .sub.err").waitFor();
        assert.match(await page.locator("#gateway .sub.err").textContent(), w.taken);
        assert.equal((await page.locator("#gateway .state").textContent()).trim(), w.off);
        assert.equal(await page.locator("#gateway .gw-fix").count(), 0);
        await context.close();
      }

      // another magpie on the port while this one is off: said, with no
      // button to quit it (not this off magpie's to take)
      {
        const world = { posts: [], gateway: { off: true, running: true, mine: false, version: "0.1.630" }, answer: () => ({ ok: true }) };
        const { context, page } = await open(world);
        assert.match(await page.locator("#gateway .state").textContent(), /0\.1\.630|magpie/);
        assert.equal(await page.locator("#gateway .gw-fix").count(), 0);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "the page scrolls sideways");
        await context.close();
      }

      // on and running, the switch and the Restart button share the card's
      // line, centred alike (segs start at their row's top by default)
      {
        const world = { posts: [], gateway: { off: false, running: true, mine: true }, answer: () => ({ ok: true }) };
        const context = await browser.newContext({ viewport: { width: 900, height: 520 }, reducedMotion: "reduce" });
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", fixture(lang, world));
        await page.goto("http://magpie.test/?view=gateway");
        await page.locator("#gateway .segs").waitFor();
        await page.locator("#gateway .gw-fix").waitFor();
        const gap = await page.evaluate(() => {
          const a = document.querySelector("#gateway .segs").getBoundingClientRect();
          const b = document.querySelector("#gateway .gw-fix").getBoundingClientRect();
          return { line: Math.abs(a.top - b.top), centre: Math.abs((a.top + a.bottom) - (b.top + b.bottom)) / 2 };
        });
        assert.ok(gap.line < 1, `the switch and the button sit on different lines: ${JSON.stringify(gap)}`);
        assert.ok(gap.centre <= 1, `the switch and the button are not centred alike: ${JSON.stringify(gap)}`);
        await context.close();
      }
      assert.deepEqual(errors, []);
    });
  }
}
