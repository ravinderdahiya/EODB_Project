import "./styles/splash.css";

const BASE =
    import.meta.env.BASE_URL;

export function mountSplash() {
    if (document.getElementById("app-loader")) return;

    const loader = document.createElement("div");
    loader.id = "app-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "Loading EODB Portal");

    loader.innerHTML = `
    <div class="apl-watermark" aria-hidden="true"></div>
    <div class="apl-card">
      <div class="apl-brand">
        <img class="apl-emblem" src="${BASE}branding/Emblem_of_Haryana.svg" alt="" aria-hidden="true" />
        <div class="apl-brand-sep" aria-hidden="true"></div>
        <img class="apl-logo" src="${BASE}branding/continuity.png" alt="" aria-hidden="true" />
      </div>
      <h1 class="apl-title">Digital Land Record</h1>
      <p class="apl-state">Haryana</p>
      <div class="apl-divider" aria-hidden="true"></div>
      <p class="apl-portal">EODB Portal</p>
      <div class="apl-spinner" aria-hidden="true"></div>
      <p class="apl-loading">Loading EODB Portal…</p>
    </div>
    <p class="apl-footer">HARSAC — Haryana Space Applications Centre</p>
  `;

    // Hide images gracefully if they fail to load (network/path issue)
    loader.querySelectorAll("img").forEach((img) => {
        img.onerror = () => { img.style.visibility = "hidden"; };
    });

    document.body.appendChild(loader);
}

export function removeSplash() {
    const el = document.getElementById("app-loader");
    if (!el) return;
    el.classList.add("app-loader--done");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    // Safety fallback: remove after transition time even if transitionend never fires
    setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
}