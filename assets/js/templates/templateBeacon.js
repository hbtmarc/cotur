/**
 * templateBeacon.js — Layout newsletter tipo boletim de segurança (CCPS Beacon)
 * Cabeçalho em banda colorida, corpo 2 colunas, callouts em destaque.
 */

import { formatDate } from '../ui/components.js';

export const TEMPLATE_ID    = 'beacon';
export const TEMPLATE_LABEL = 'Boletim';

// ── Paleta ────────────────────────────────────────────────────────────────────
const HEADER_BG   = '#c0392b';
const ACCENT      = '#e74c3c';
const HEADER_TEXT = '#ffffff';

// ── HTML ──────────────────────────────────────────────────────────────────────

export function buildHTML(doc, sections, blocksPerSection) {
  // Separa blocos destaque/quebra (ficam fora das colunas) de corpo normal
  const colSections = sections.filter((_, i) => {
    const blocks = blocksPerSection[i] ?? [];
    return blocks.every(b => b.type !== 'quebra');
  });

  const secCardsHTML = sections.map((sec, i) => {
    const blocks = blocksPerSection[i] ?? [];
    const blocksHTML = blocks.length
      ? blocks.map(b => _blockHTML(b)).join('')
      : `<p class="bn-no-content">Nenhum bloco.</p>`;
    const breakClass = sec.breakBefore ? ' bn-section--break' : '';
    return `
      <div class="bn-section${breakClass}">
        <h2 class="bn-section-title">${_esc(sec.title)}</h2>
        <div class="bn-blocks">${blocksHTML}</div>
      </div>`;
  }).join('');

  const dateStr = formatDate(doc.updatedAt);
  const STATUS_PT = {
    rascunho: 'Rascunho', em_revisao: 'Em Revisão',
    publicado: 'Publicado', arquivado: 'Arquivado',
  };
  const statusLabel = STATUS_PT[doc.status] ?? doc.status;

  return `
    <div class="a4-page tpl-beacon" id="print-area">
      <header class="bn-header">
        <div class="bn-header-label">Boletim</div>
        <h1 class="bn-doc-title">${_esc(doc.title)}</h1>
        ${doc.description ? `<p class="bn-doc-sub">${_esc(doc.description)}</p>` : ''}
        <div class="bn-header-meta">
          <span>${statusLabel}</span>
          <span>${dateStr}</span>
        </div>
      </header>

      <div class="bn-body">
        ${sections.length
          ? `<div class="bn-columns">${secCardsHTML}</div>`
          : `<p class="bn-no-content">Nenhuma seção adicionada.</p>`}
      </div>

      <footer class="bn-footer">
        <span class="bn-footer-brand">Cotur</span>
        <span>${_esc(doc.title)} · ${dateStr}</span>
      </footer>
    </div>`;
}

// ── Blocos ────────────────────────────────────────────────────────────────────

function _blockHTML(b) {
  if (b.type === 'quebra') {
    return `<div class="bn-block bn-quebra" aria-hidden="true">
      <span class="bn-quebra-label">— quebra —</span>
    </div>`;
  }
  if (b.type === 'lista') {
    const lines = (b.items ?? '').split('\n').filter(l => l.trim());
    const items = lines.length
      ? `<ul class="bn-list">${lines.map(l => `<li>${_esc(l)}</li>`).join('')}</ul>`
      : `<ul class="bn-list"><li class="bn-list-empty">Lista vazia.</li></ul>`;
    return `<div class="bn-block bn-block-lista">${items}</div>`;
  }
  if (b.type === 'destaque') {
    return `<div class="bn-block bn-callout">
      <p class="bn-callout-text">${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
    </div>`;
  }
  return `<div class="bn-block bn-block-texto">
    <p>${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
  </div>`;
}

// ── CSS (inline para download HTML) ──────────────────────────────────────────

export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#888;padding:24px 0}
.a4-page{background:#fff;color:#1a1a1a;width:210mm;min-height:297mm;margin:0 auto;
  font-family:system-ui,-apple-system,sans-serif;font-size:9.5pt;line-height:1.6;
  display:flex;flex-direction:column;position:relative}
.bn-header{background:${HEADER_BG};color:${HEADER_TEXT};padding:10mm 14mm 8mm;flex-shrink:0}
.bn-header-label{font-size:7pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
  opacity:.8;margin-bottom:2mm}
.bn-doc-title{font-size:26pt;font-weight:900;line-height:1.1;margin-bottom:2mm}
.bn-doc-sub{font-size:11pt;opacity:.9;font-style:italic;margin-bottom:3mm}
.bn-header-meta{font-size:7.5pt;opacity:.75;display:flex;gap:14px}
.bn-body{flex:1;padding:7mm 14mm 18mm;overflow:hidden}
.bn-columns{columns:2;column-gap:7mm;column-fill:balance}
.bn-section{break-inside:avoid;page-break-inside:avoid;margin-bottom:5mm}
.bn-section--break{break-before:page;page-break-before:always;column-span:all}
.bn-section-title{font-size:9.5pt;font-weight:700;color:${HEADER_BG};
  text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid ${ACCENT};
  padding-bottom:1mm;margin-bottom:3mm}
.bn-blocks{display:flex;flex-direction:column;gap:2.5mm}
.bn-block-texto p{font-size:9pt;white-space:pre-wrap;word-break:break-word}
.bn-callout{background:${HEADER_BG};color:#fff;padding:3mm 5mm;border-radius:2px;
  column-span:all;margin:3mm 0;break-inside:avoid}
.bn-callout-text{font-size:10pt;font-weight:600;line-height:1.45;font-style:italic;white-space:pre-wrap}
.bn-list{padding-left:4mm;list-style:none}
.bn-list li{font-size:9pt;margin-bottom:1.5mm;padding-left:3mm;position:relative}
.bn-list li::before{content:'▸';position:absolute;left:-2mm;color:${ACCENT};font-size:7pt}
.bn-list-empty{color:#aaa;font-style:italic}
.bn-list-empty::before{display:none}
.bn-quebra{break-before:page;page-break-before:always;column-span:all}
.bn-quebra-label{display:none}
.bn-no-content{color:#aaa;font-style:italic;font-size:9pt}
.bn-footer{background:#1a1a1a;color:#aaa;padding:2mm 14mm;display:flex;
  justify-content:space-between;font-size:7pt;flex-shrink:0}
.bn-footer-brand{font-weight:700;color:#fff;letter-spacing:.04em}
@page{size:A4 portrait;margin:0}
@media print{body{background:#fff;padding:0}
  .a4-page{margin:0;box-shadow:none}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
