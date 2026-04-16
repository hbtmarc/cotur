/**
 * templateFicha.js — Ficha Técnica / IDS corporativo
 * Header em banda preta, grid de metadados, seções em caixas estruturadas.
 */

import { formatDate } from '../ui/components.js';

export const TEMPLATE_ID    = 'ficha';
export const TEMPLATE_LABEL = 'Ficha Técnica';

// ── HTML ──────────────────────────────────────────────────────────────────────

export function buildHTML(doc, sections, blocksPerSection) {
  const STATUS_PT = {
    rascunho:   'Rascunho',
    em_revisao: 'Em Revisão',
    publicado:  'Publicado',
    arquivado:  'Arquivado',
  };
  const statusLabel = STATUS_PT[doc.status] ?? doc.status;
  const dateStr     = formatDate(doc.updatedAt);
  const createdStr  = formatDate(doc.createdAt);
  // Gera um número de documento curto a partir do ID
  const docRef      = (doc.id ?? '').slice(-6).toUpperCase();

  const secHTML = sections.length
    ? sections.map((sec, i) => {
        const blocks     = blocksPerSection[i] ?? [];
        const breakClass = sec.breakBefore ? ' ft-section--break' : '';
        const blocksHTML = blocks.length
          ? blocks.map(b => _blockHTML(b)).join('')
          : `<p class="ft-no-content">Sem conteúdo.</p>`;
        return `
          <div class="ft-section${breakClass}">
            <div class="ft-section-header">${_esc(sec.title)}</div>
            <div class="ft-section-body">${blocksHTML}</div>
          </div>`;
      }).join('')
    : `<p class="ft-no-content">Nenhuma seção adicionada.</p>`;

  return `
    <div class="a4-page tpl-ficha" id="print-area">

      <header class="ft-header">
        <div class="ft-header-brand">COTUR</div>
        <div class="ft-header-type">FICHA TÉCNICA</div>
      </header>

      <div class="ft-meta-grid">
        <div class="ft-meta-cell ft-meta-title" style="grid-column:1/-1">
          <span class="ft-meta-label">Título</span>
          <span class="ft-meta-value ft-title-value">${_esc(doc.title)}</span>
        </div>
        ${doc.description ? `
        <div class="ft-meta-cell" style="grid-column:1/-1">
          <span class="ft-meta-label">Descrição</span>
          <span class="ft-meta-value">${_esc(doc.description)}</span>
        </div>` : ''}
        <div class="ft-meta-cell">
          <span class="ft-meta-label">Referência</span>
          <span class="ft-meta-value ft-mono">CTR-${docRef}</span>
        </div>
        <div class="ft-meta-cell">
          <span class="ft-meta-label">Status</span>
          <span class="ft-meta-value">${statusLabel}</span>
        </div>
        <div class="ft-meta-cell">
          <span class="ft-meta-label">Criação</span>
          <span class="ft-meta-value">${createdStr}</span>
        </div>
        <div class="ft-meta-cell">
          <span class="ft-meta-label">Atualização</span>
          <span class="ft-meta-value">${dateStr}</span>
        </div>
      </div>

      <div class="ft-body">${secHTML}</div>

      <footer class="ft-footer">
        <span>Cotur · CTR-${docRef}</span>
        <span>${_esc(doc.title)}</span>
        <span>${dateStr}</span>
      </footer>

    </div>`;
}

// ── Blocos ────────────────────────────────────────────────────────────────────

function _blockHTML(b) {
  if (b.type === 'quebra') {
    return `<div class="ft-block ft-quebra" aria-hidden="true">
      <span class="ft-quebra-label">— quebra de página —</span>
    </div>`;
  }
  if (b.type === 'lista') {
    const lines = (b.items ?? '').split('\n').filter(l => l.trim());
    const items = lines.length
      ? `<ul class="ft-checklist">${lines.map(l => `<li><span class="ft-check">☐</span>${_esc(l)}</li>`).join('')}</ul>`
      : `<ul class="ft-checklist"><li class="ft-no-content">Lista vazia.</li></ul>`;
    return `<div class="ft-block ft-block-lista">${items}</div>`;
  }
  if (b.type === 'destaque') {
    return `<div class="ft-block ft-aviso">
      <span class="ft-aviso-icon">⚠</span>
      <div class="ft-aviso-body">
        <span class="ft-aviso-label">ATENÇÃO</span>
        <p>${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
      </div>
    </div>`;
  }
  return `<div class="ft-block ft-block-texto">
    <p>${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
  </div>`;
}

// ── CSS (inline para download HTML) ──────────────────────────────────────────

export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#ccc;padding:24px 0}
.a4-page{background:#fff;color:#1a1a1a;width:210mm;min-height:297mm;margin:0 auto;
  font-family:system-ui,-apple-system,sans-serif;font-size:9pt;line-height:1.55;
  display:flex;flex-direction:column;position:relative}
.ft-header{background:#1a1a1a;color:#fff;display:flex;align-items:stretch;flex-shrink:0}
.ft-header-brand{padding:4mm 8mm;font-size:18pt;font-weight:900;letter-spacing:.04em;
  background:#e74c3c;min-width:40mm;display:flex;align-items:center;justify-content:center}
.ft-header-type{padding:4mm 8mm;font-size:9pt;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;display:flex;align-items:center;opacity:.85}
.ft-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid #1a1a1a;flex-shrink:0}
.ft-meta-cell{padding:2.5mm 3mm;border-right:1px solid #ddd;border-bottom:1px solid #ddd;
  display:flex;flex-direction:column;gap:1mm}
.ft-meta-cell:last-child{border-right:none}
.ft-meta-label{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#666}
.ft-meta-value{font-size:9pt;color:#111;font-weight:500}
.ft-title-value{font-size:11pt;font-weight:700;color:#1a1a1a}
.ft-mono{font-family:monospace;font-size:8.5pt;letter-spacing:.04em}
.ft-body{flex:1;padding:6mm 8mm 18mm;display:flex;flex-direction:column;gap:5mm}
.ft-section{border:1.5px solid #1a1a1a;break-inside:avoid;page-break-inside:avoid}
.ft-section--break{break-before:page;page-break-before:always}
.ft-section-header{background:#1a1a1a;color:#fff;padding:2mm 4mm;font-size:8pt;
  font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.ft-section-body{padding:3mm 4mm;display:flex;flex-direction:column;gap:2.5mm}
.ft-block-texto p{font-size:9pt;white-space:pre-wrap;word-break:break-word}
.ft-aviso{display:flex;align-items:flex-start;gap:4mm;background:#fff8e1;
  border:1.5px solid #f39c12;padding:3mm 4mm}
.ft-aviso-icon{font-size:14pt;color:#e67e22;flex-shrink:0;line-height:1.3}
.ft-aviso-body{flex:1;display:flex;flex-direction:column;gap:1mm}
.ft-aviso-label{font-size:7pt;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#e67e22}
.ft-aviso-body p{font-size:9pt;white-space:pre-wrap;word-break:break-word;color:#5d4000}
.ft-checklist{list-style:none;padding-left:0;display:flex;flex-direction:column;gap:1.5mm}
.ft-checklist li{display:flex;align-items:flex-start;gap:2.5mm;font-size:9pt}
.ft-check{font-size:10pt;line-height:1.35;flex-shrink:0;color:#555}
.ft-quebra{break-before:page;page-break-before:always}
.ft-quebra-label{display:none}
.ft-no-content{color:#aaa;font-style:italic;font-size:8.5pt}
.ft-footer{background:#f0f0f0;border-top:2px solid #1a1a1a;padding:2mm 8mm;display:flex;
  justify-content:space-between;font-size:7pt;color:#555;flex-shrink:0}
@page{size:A4 portrait;margin:0}
@media print{body{background:#fff;padding:0}
  .a4-page{margin:0;box-shadow:none}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
