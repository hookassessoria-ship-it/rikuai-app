#!/usr/bin/env node
// Detecta strings de UI escritas direto em PT-BR nos componentes.
// Uso: node scripts/check-hardcoded-ptbr.mjs   (exit 1 se encontrar algo)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/components", "src/pages"];
const IGNORE = [/i18n\.ts$/, /\.test\.tsx?$/, /src\/components\/ui\//];

// Palavras/acentos típicos de PT-BR em texto de interface.
const PT_HINT = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(voc[eê]|saldo|conta[s]?|d[ií]vida[s]?|receita[s]?|despesa[s]?|m[eê]s|meta|sonho[s]?|pagar|pago|salvar|cancelar|adicionar|excluir|carregando)\b/i;

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!/\.(tsx|ts)$/.test(full)) continue;
    if (IGNORE.some((re) => re.test(full))) continue;
    check(full);
  }
}

function check(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;      // comentários
    if (/\bt\(\s*["'`]/.test(line)) return;            // já traduzido
    // Strings literais e texto JSX
    const literals = [
      ...line.matchAll(/"([^"\\]{3,})"|'([^'\\]{3,})'/g),
      ...line.matchAll(/>\s*([^<>{}\n]{3,})</g),
    ].map((m) => m[1] ?? m[2] ?? "");
    for (const lit of literals) {
      if (/^[a-z-]+(\s[a-z0-9:/[\]-]+)*$/.test(lit)) continue; // classes tailwind
      if (/^[\d\s.,%$€£R-]+$/.test(lit)) continue;
      if (PT_HINT.test(lit)) {
        offenders.push(`${relative(process.cwd(), file)}:${i + 1}  ${lit.trim()}`);
        break;
      }
    }
  });
}

for (const root of ROOTS) walk(root);

if (offenders.length) {
  console.log(`\n⚠️  ${offenders.length} possíveis strings PT-BR fixas (migrar para t("chave")):\n`);
  offenders.forEach((o) => console.log("  " + o));
  process.exit(1);
}
console.log("✅ Nenhuma string PT-BR fixa detectada.");
