import { expect, test, type Page } from "@playwright/test";

// W45 C2 slice for /interference: interface-only checks (targets, text size, focus, contrast, overflow, state
// colours). Runs against the public route so it works on production builds as well as dev.
const open = async (page: Page, width: number, height: number, mode?: "light" | "dark") => {
  await page.setViewportSize({ width, height });
  await page.addInitScript((value) => {
    try {
      if (value) localStorage.setItem("mode", value);
      localStorage.setItem("kakau-lab-interference-plot-hint", "dismissed");
    } catch { /* storage may be unavailable */ }
  }, mode);
  await page.goto("/interference");
  await expect(page.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", /.+/);
};

const undersized = (page: Page) => page.evaluate(() => {
  const lab = document.querySelector(".interference-lab")!;
  const visible = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; };
  const bad: string[] = [];
  for (const e of lab.querySelectorAll("button,summary,select,input:not([type=hidden]),[data-interference-plot]")) {
    if (!visible(e)) continue;
    const target = e.matches("input[type=radio],input[type=checkbox]") ? e.closest("label") ?? e : e;
    const r = target.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) bad.push(`${target.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} ${(target.textContent ?? "").trim().slice(0, 16)}`);
  }
  return [...new Set(bad)];
});

const smallText = (page: Page) => page.evaluate(() => {
  const lab = document.querySelector(".interference-lab")!;
  const bad: string[] = [];
  const walker = document.createTreeWalker(lab, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement!;
    if (!n.textContent!.trim() || p.closest("svg,canvas,mjx-container,style,.sr-only")) continue;
    const r = p.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const size = parseFloat(getComputedStyle(p).fontSize);
    if (size < 12) bad.push(`${size}px "${n.textContent!.trim().slice(0, 20)}"`);
  }
  return bad;
});

const lowContrast = (page: Page) => page.evaluate(() => {
  const lab = document.querySelector(".interference-lab")!;
  const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const a = m[1].split(/[ ,/]+/).map(Number); return [a[0], a[1], a[2], a[3] ?? 1]; };
  const bgOf = (e: Element) => { const layers: number[][] = []; for (let x: Element | null = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255]; for (const c of layers.reverse()) base = base.map((v, i) => c[i] * c[3] + v * (1 - c[3])); return base; };
  const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const bad: string[] = [];
  const walker = document.createTreeWalker(lab, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement!;
    if (!n.textContent!.trim() || p.closest("svg,canvas,mjx-container,style,.sr-only,[data-interference-plot],[disabled]")) continue;
    const r = p.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const s = getComputedStyle(p); const fg = parse(s.color); const bg = bgOf(p);
    const mixed = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [hi, lo] = [lum(mixed), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + .05) / (lo + .05);
    if (ratio < 4.5) bad.push(`${ratio.toFixed(2)} "${n.textContent!.trim().slice(0, 20)}"`);
  }
  return bad;
});

for (const [width, height] of [[1440, 900], [1280, 800], [390, 844], [360, 740]] as const) {
  for (const mode of ["light", "dark"] as const) {
    test(`C2 ${width}px ${mode}: 44px targets, 12px text, AA contrast, no horizontal overflow @w45`, async ({ page }) => {
      await open(page, width, height, mode);
      for (const state of ["default", "advanced + more views"]) {
        if (state !== "default") { await page.locator(".if-segmented__more").click(); await page.locator("details.if-advanced summary").click(); }
        expect(await undersized(page), `targets (${state})`).toEqual([]);
        expect(await smallText(page), `text size (${state})`).toEqual([]);
        expect(await lowContrast(page), `contrast (${state})`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow (${state})`).toBe(true);
      }
    });
  }
}

test("C2: keyboard focus shows one 2px --lc-focus ring and the plot is reachable @w45 @a11y", async ({ page }) => {
  await open(page, 1440, 900, "light");
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(260); // the site's 160ms button transition must settle before the ring is read
    const ring = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      const lab = a.closest(".interference-lab");
      if (!lab) return null;
      const target = a.matches('input[type="radio"]') ? (a.nextElementSibling as HTMLElement) : a;
      const s = getComputedStyle(target);
      const focus = getComputedStyle(lab).getPropertyValue("--lc-focus").trim();
      const probe = document.createElement("i"); probe.style.color = focus; document.body.append(probe);
      const expected = getComputedStyle(probe).color; probe.remove();
      return { width: s.outlineWidth, style: s.outlineStyle, ok: s.outlineColor === expected, tag: `${a.tagName}${a.matches("[data-interference-plot]") ? "[plot]" : ""}` };
    });
    if (!ring) continue;
    expect(ring, ring.tag).toMatchObject({ width: "2px", style: "solid", ok: true });
    seen.add(ring.tag);
  }
  expect(seen.size).toBeGreaterThan(2);
});

test("C2: scientific colours stay independent of the interface accent @w45", async ({ page }) => {
  await open(page, 1440, 900, "light");
  const tokens = await page.evaluate(() => {
    const lab = getComputedStyle(document.querySelector(".interference-lab")!);
    return { constructive: lab.getPropertyValue("--if-constructive").trim(), destructive: lab.getPropertyValue("--if-destructive").trim(), accent: lab.getPropertyValue("--lc-accent").trim() };
  });
  expect(tokens.constructive).toBe("#e69a16");
  expect(tokens.destructive).toBe("#087d90");
  expect(tokens.accent).toBe("#216e84");
  const strokes = await page.evaluate(() => [...document.querySelectorAll('[data-layer="conditions"] path')].map((p) => p.getAttribute("stroke") ?? getComputedStyle(p).stroke));
  expect(strokes.length).toBeGreaterThan(0);
  for (const stroke of strokes) expect(stroke.toLowerCase()).not.toContain("33, 110, 132");
  // the canvas and the plot frame background are not styled by the C2 sheet
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".interference-plot")!).backgroundColor)).toBe("rgb(218, 226, 231)");
});

test("C2: selected view and projection toggle keep ARIA state; theme menu is the shared one @w45 @a11y", async ({ page }) => {
  await open(page, 1440, 900, "light");
  await expect(page.locator(".theme-menu")).toHaveCount(1);
  await expect(page.locator('input[name="interference-view"]:checked')).toHaveAttribute("value", "displacement");
  const projection = page.locator('[data-action="projection"]');
  await expect(projection).toHaveAttribute("aria-pressed", "false");
  await projection.click();
  await expect(projection).toHaveAttribute("aria-pressed", "true");
  await projection.click();
  await expect(projection).toHaveAttribute("aria-pressed", "false");
  const toggle = page.locator('[data-action="toggle-activities"]');
  await expect(toggle).toHaveAttribute("aria-expanded", /true|false/);
});

test("C2 mobile: the projection exit button stays hittable after P was placed @w45 @mobile-layout", async ({ page }) => {
  await open(page, 390, 844, "light");
  const plot = page.locator("[data-interference-plot]");
  const box = (await plot.boundingBox())!;
  await page.mouse.click(box.x + box.width * .62, box.y + box.height * .3);
  await page.locator('[data-action="projection"]').click();
  await page.waitForTimeout(300);
  const hit = await page.evaluate(() => {
    const b = document.querySelector('[data-action="projection"]')!.getBoundingClientRect();
    return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('[data-action="projection"]') !== null;
  });
  expect(hit).toBe(true);
});

test("C2: reduced motion removes button and summary transitions @w45 @a11y", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, 1440, 900, "light");
  const durations = await page.evaluate(() => [...new Set([...document.querySelectorAll(".interference-lab button, .interference-lab summary")].map((e) => getComputedStyle(e).transitionDuration))]);
  expect(durations).toEqual(["0s"]);
});

test("C2 1280x800: toolbar keeps 44px targets in two 44px rows and the plot is not smaller than main's 476px @w45", async ({ page }) => {
  await open(page, 1280, 800, "light");
  const box = (await page.locator("[data-interference-plot]").boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(476);
  expect(Math.abs(box.width - box.height)).toBeLessThan(2);
  const toolbar = (await page.locator(".interference-controls").boundingBox())!;
  expect(toolbar.height).toBeLessThanOrEqual(110);
  expect(await undersized(page)).toEqual([]);
});

test("C2 1440x900: plot stays at main's 623px @w45", async ({ page }) => {
  await open(page, 1440, 900, "light");
  const box = (await page.locator("[data-interference-plot]").boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(622);
});
