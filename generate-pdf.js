/**
 * generate-pdf.js
 * Gerador de PDF de alta fidelidade usando Google Chrome headless diretamente.
 * Reproduz o visual exato do site — gradientes, fundos escuros, cores, tudo.
 * NÃO requer npm install — usa apenas Node.js built-in + Chrome do sistema.
 *
 * Uso:
 *   node generate-pdf.js               → gera PDF do Deadleg2.html (default)
 *   node generate-pdf.js Deadleg2       → mesmo que acima
 *   node generate-pdf.js <NomeArquivo>  → gera PDF de pages/<NomeArquivo>.html
 *
 * Saída: downloads/<NomeArquivo>_YYYY-MM-DD.pdf
 */

'use strict';
const { execSync } = require('child_process');
const path         = require('path');
const fs           = require('fs');

/* ── Caminhos do Chrome por sistema operacional ─────────────────── */
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
function findChrome() {
  for (const p of CHROME_PATHS) { if (fs.existsSync(p)) return p; }
  console.error('\n❌  Chrome não encontrado. Edite CHROME_PATHS em generate-pdf.js\n');
  process.exit(1);
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function resolveHtmlFile(name) {
  for (const c of [
    path.resolve(__dirname,'pages',`${capitalize(name)}.html`),
    path.resolve(__dirname,'pages',`${name}.html`),
    path.resolve(__dirname,'pages',`${name.toLowerCase()}.html`),
  ]) { if (fs.existsSync(c)) return c; }
  return null;
}

/* ── Config ──────────────────────────────────────────────────────── */
const CHROME_EXE = findChrome();
const PAGE_ARG   = process.argv[2] || 'Deadleg2';
const PAGE_NAME  = PAGE_ARG.replace(/\.html$/i, '');
const HTML_FILE  = resolveHtmlFile(PAGE_NAME);
if (!HTML_FILE) { console.error(`\n❌  Não encontrado: pages/${PAGE_NAME}.html\n`); process.exit(1); }
const DATE_STR  = new Date().toISOString().split('T')[0];
const SAFE_NAME = capitalize(PAGE_NAME);
const OUT_DIR   = path.resolve(__dirname, 'downloads');
const OUT_FILE  = path.join(OUT_DIR, `Alerta-Tecnico_${SAFE_NAME}_${DATE_STR}.pdf`);

/* ── Main ────────────────────────────────────────────────────────── */
fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('\n🖨   Gerando PDF com Chrome headless...');
console.log(`    Fonte : ${HTML_FILE}`);
console.log(`    Saída : ${OUT_FILE}\n`);

// Chrome CLI flags para PDF de alta fidelidade
const chromeArgs = [
  `"${CHROME_EXE}"`,
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=5000',
  `--print-to-pdf="${OUT_FILE}"`,
  '--print-to-pdf-no-header',   // sem header/footer padrão do Chrome
  `"file://${HTML_FILE}"`,
].join(' ');

try {
  execSync(chromeArgs, { stdio: 'pipe', timeout: 60000 });
} catch (e) {
  // Chrome pode retornar exit code != 0 mas ainda gerar o PDF
  if (!fs.existsSync(OUT_FILE)) {
    console.error('\n❌ Falha ao gerar PDF:\n', e.message, '\n');
    process.exit(1);
  }
}

const mb = (fs.statSync(OUT_FILE).size / 1048576).toFixed(2);
console.log(`✅  Concluído! ${mb} MB → ${OUT_FILE}\n`);

