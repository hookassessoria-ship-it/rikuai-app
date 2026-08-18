import * as add from "./add";
import * as plan from "./plan";
import * as pages from "./pages";
import * as settings from "./settings";
import * as categories from "./categories";
import * as ui2 from "./ui2";

/** Chaves extra por área, mescladas ao dicionário base. */
export const partsPt: Record<string, string> = {
  ...add.pt, ...plan.pt, ...pages.pt, ...settings.pt, ...categories.pt, ...ui2.pt,
};
export const partsEn: Record<string, string> = {
  ...add.en, ...plan.en, ...pages.en, ...settings.en, ...categories.en, ...ui2.en,
};

/** Chaves da redesign traduzidas por idioma (aplicadas após localeOverrides). */
export const extraLocales: Record<string, Record<string, string>> = {
  es: ui2.es, fr: ui2.fr, de: ui2.de, it: ui2.it, ja: ui2.ja,
};
