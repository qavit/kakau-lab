import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("the built Doppler routes server-render in both locales, unindexed, with locale alternates", async () => {
  const zh = await render("/doppler");
  assert.equal(zh.status, 200);
  const zhHtml = await zh.text();
  assert.match(zhHtml, /<html lang="zh-Hant">/);
  assert.match(zhHtml, /<title>聲音的都普勒效應｜Kakau Lab<\/title>/);
  assert.match(zhHtml, /name="robots" content="noindex, follow"/);
  assert.match(zhHtml, /hrefLang="en" href="[^"]*\/en\/doppler"|hreflang="en" href="[^"]*\/en\/doppler"/i);
  assert.match(zhHtml, /自由探索/);
  assert.match(zhHtml, /探索任務/);
  assert.match(zhHtml, /等待相鄰兩次接收/);
  const en = await render("/en/doppler");
  assert.equal(en.status, 200);
  const enHtml = await en.text();
  assert.match(enHtml, /<html lang="en">/);
  assert.match(enHtml, /<title>Doppler Effect of Sound \| Kakau Lab<\/title>/);
  assert.match(enHtml, /Free exploration/);
  assert.match(enHtml, /Waiting for two adjacent receptions/);
});

test("an unreadable or foreign-version share renders the default experiment with the reason on the server", async () => {
  const html = await (await render(`/doppler?s=${encodeURIComponent("{\"v\":2}")}`)).text();
  assert.match(html, /格式版本不相容/);
  assert.match(html, /aria-pressed="true"[^>]*>都靜止/);
  const model = await (await render(`/doppler?s=${encodeURIComponent(JSON.stringify({ v: 1, model: "other", mode: "free" }))}`)).text();
  assert.match(model, /不同版本的模型/);
  const clean = await (await render("/doppler")).text();
  assert.doesNotMatch(clean, /分享連結無法讀取|格式版本不相容/);
});
