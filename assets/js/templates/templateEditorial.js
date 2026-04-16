/**
 * templateEditorial.js — Layout editorial A4 clássico
 * Seções numeradas, tipografia sérica, rodapé de assinatura.
 */

import { statusBadge, formatDate } from '../ui/components.js';

export const TEMPLATE_ID    = 'editorial';
export const TEMPLATE_LABEL = 'Editorial';

// ── HTML ──────────────────────────────────────────────────────────────────────

export function buildHTML(doc, sections, blocksPerSection) {
  const secHTML = sections.length
    ? sections.map((sec, i) => {
        const blocks      = blocksPerSection[i] ?? [];
        const breakClass  = sec.breakBefore ? ' preview-section--break-before' : '';
        const blocksHTML  = blocks.length
          ? blocks.map(b => _blockHTML(b)).join('')
          : `<p class="preview-no-blocks">Nenhum bloco nesta seção.</p>`;
        return `
          <section class="preview-section${breakClass}">
            <h2 class="preview-section-title">${_esc(sec.title)}</h2>
            <div class="preview-blocks">${blocksHTML}</div>
          </section>`;
      }).join('')
    : `<p class="preview-no-content">Nenhuma seção adicionada.</p>`;

  return `
    <div class="a4-page tpl-editorial" id="print-area">
      <header class="preview-doc-header">
        <div class="preview-cover">
          <div class="preview-cover-accent"></div>
          <h1 class="preview-doc-title">${_esc(doc.title)}</h1>
          ${doc.description ? `<p class="preview-doc-desc">${_esc(doc.description)}</p>` : ''}
          <div class="preview-doc-meta">
            ${statusBadge(doc.status)}
            <span class="preview-meta-item">Criado em: ${formatDate(doc.createdAt)}</span>
            <span class="preview-meta-item">Atualizado em: ${formatDate(doc.updatedAt)}</span>
          </div>
        </div>
        <div class="preview-cover-rule"></div>
      </header>
      <div class="preview-content">${secHTML}</div>
      <footer class="preview-doc-footer">
        <span class="preview-footer-brand">Cotur</span>
        <span class="preview-footer-title">${_esc(doc.title)}</span>
      </footer>
    </div>`;
}

// ── Blocos ────────────────────────────────────────────────────────────────────

function _blockHTML(b) {
  if (b.type === 'quebra') {
    return `<div class="preview-block preview-block-quebra" aria-hidden="true">
      <span class="preview-quebra-label">— quebra de página —</span>
    </div>`;
  }
  if (b.type === 'lista') {
    const lines = (b.items ?? '').split('\n').filter(l => l.trim());
    const items = lines.length
      ? `<ul class="preview-list">${lines.map(l => `<li>${_esc(l)}</li>`).join('')}</ul>`
      : `<ul class="preview-list"><li class="preview-list-empty">Lista vazia.</li></ul>`;
    return `<div class="preview-block preview-block-lista">${items}</div>`;
  }
  if (b.type === 'destaque') {
    return `<div class="preview-block preview-block-destaque">
      <div class="preview-destaque-icon">💡</div>
      <p>${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
    </div>`;
  }
  return `<div class="preview-block preview-block-texto">
    <p>${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>
  </div>`;
}

// ── CSS (inline para download HTML) ──────────────────────────────────────────

export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f0f0;padding:24px 0}
.a4-page{background:#fff;color:#1a1a1a;width:210mm;min-height:297mm;margin:0 auto;
  padding:14mm 18mm 22mm;font-family:Georgia,'Times New Roman',serif;font-size:10.5pt;
  line-height:1.7;position:relative}
.preview-cover-accent{width:40px;height:4px;background:#1a56db;border-radius:2px;margin-bottom:5mm}
.preview-doc-title{font-family:system-ui,sans-serif;font-size:24pt;font-weight:800;
  line-height:1.15;letter-spacing:-.01em;color:#0d0d0d;margin-bottom:3mm}
.preview-doc-desc{font-size:11.5pt;color:#555;margin-bottom:5mm;font-style:italic}
.preview-doc-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;
  font-family:system-ui,sans-serif;font-size:8pt;color:#777;margin-bottom:4mm}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;
  font-family:system-ui,sans-serif;font-size:8pt;font-weight:600}
.badge-gray{background:#f1f5f9;color:#475569}.badge-green{background:#dcfce7;color:#166534}
.badge-yellow{background:#fef9c3;color:#854d0e}.badge-red{background:#fee2e2;color:#991b1b}
.preview-cover-rule{height:2px;background:linear-gradient(90deg,#1a56db 0%,#d0d0d0 60%,transparent 100%);margin-bottom:10mm}
.preview-content{counter-reset:sec-counter}
.preview-section{margin-bottom:9mm;break-inside:avoid;page-break-inside:avoid}
.preview-section--break-before{break-before:page;page-break-before:always}
.preview-section-title{font-family:system-ui,sans-serif;font-size:12.5pt;font-weight:700;
  color:#0d0d0d;margin-bottom:4mm;padding-bottom:2mm;border-bottom:1.5px solid #d0d0d0;
  display:flex;align-items:baseline;gap:8px;counter-increment:sec-counter}
.preview-section-title::before{content:counter(sec-counter,decimal-leading-zero);
  font-size:8pt;font-weight:400;color:#1a56db;letter-spacing:.04em;flex-shrink:0}
.preview-blocks{display:flex;flex-direction:column;gap:3.5mm}
.preview-block{break-inside:avoid;page-break-inside:avoid}
.preview-block-texto p{white-space:pre-wrap;word-break:break-word;orphans:3;widows:3}
.preview-block-destaque{display:flex;gap:4mm;align-items:flex-start;background:#fef9ed;
  border-left:3px solid #e69a0a;padding:3.5mm 5mm;border-radius:0 3px 3px 0;font-style:italic}
.preview-destaque-icon{font-size:11pt;flex-shrink:0;opacity:.75}
.preview-block-destaque p{white-space:pre-wrap;word-break:break-word;color:#4a3a00}
.preview-list{margin:0;padding-left:7mm;list-style:none}
.preview-list li{margin-bottom:1.5mm;padding-left:2mm;position:relative}
.preview-list li::before{content:'–';position:absolute;left:-4mm;color:#1a56db;font-weight:700}
.preview-block-quebra{break-before:page;page-break-before:always}
.preview-quebra-label{display:none}
.preview-doc-footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;
  justify-content:space-between;font-family:system-ui,sans-serif;font-size:7.5pt;
  color:#bbb;border-top:1px solid #e8e8e8;padding-top:2.5mm}
.preview-footer-brand{font-weight:700;letter-spacing:.04em;color:#1a56db}
.preview-footer-title{font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
@page{size:A4 portrait;margin:0}
@media print{body{background:#fff;padding:0}
  .a4-page{margin:0;box-shadow:none}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
