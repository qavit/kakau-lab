/* PROTOTYPE B (interaction part). Injected into the real page to demonstrate a one-tap "預設" entry in the tool bar
   (參數 | 預設 | 圖層 | 放大視圖). Tapping it opens the parameter panel if needed and opens the existing 教學預設 menu,
   so the student picks a preset in 2 taps instead of 3. A real implementation would be a state change in ProjectileLab.tsx (~30-50 lines);
   this script only simulates that interaction, so the step count is real but the code is throw-away. */
(() => {
  const mount = () => {
    const bar = document.querySelector(".projectile-panel-actions");
    if (!bar || bar.querySelector("[data-proto-preset]")) return;
    const params = [...bar.querySelectorAll("button")].find((b) => b.textContent.includes("參數"));
    if (!params) return;
    const btn = params.cloneNode(false);
    btn.className = params.className.replace(/\bactive\b/, "").trim();
    btn.setAttribute("data-proto-preset", "");
    btn.removeAttribute("aria-pressed"); btn.removeAttribute("aria-expanded");
    btn.textContent = "預設";
    btn.addEventListener("click", () => {
      const open = () => [...document.querySelectorAll(".projectile-setup button")].find((b) => b.textContent.includes("教學預設") && b.checkVisibility());
      if (!open()) params.click();
      let tries = 0;
      const t = setInterval(() => { const m = open(); if (m || ++tries > 20) { clearInterval(t); if (m) m.click(); } }, 50);
    });
    params.after(btn);
  };
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  mount();
})();
