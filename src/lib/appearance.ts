// Modo de aparência (claro / escuro / automático).
// Aplicado no <html> via data-appearance, lido pelos tokens em index.css.
export type Appearance = "dark" | "light" | "auto";

const KEY = "riku_appearance";

function systemPrefersLight() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: light)").matches;
}

export function resolveAppearance(mode: Appearance): "dark" | "light" {
  if (mode === "auto") return systemPrefersLight() ? "light" : "dark";
  return mode;
}

export function applyAppearance(mode: Appearance) {
  const resolved = resolveAppearance(mode);
  const html = document.documentElement;
  html.setAttribute("data-appearance", resolved);
  html.classList.toggle("dark", resolved === "dark");
  html.style.colorScheme = resolved;
}

export function getStoredAppearance(): Appearance {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "auto" ? v : "dark";
}

export function setStoredAppearance(mode: Appearance) {
  localStorage.setItem(KEY, mode);
  applyAppearance(mode);
}

/** Chamado uma vez no boot; mantém "auto" sincronizado com o sistema. */
export function initAppearance() {
  applyAppearance(getStoredAppearance());
  window.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => {
    if (getStoredAppearance() === "auto") applyAppearance("auto");
  });
}
