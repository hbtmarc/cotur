/**
 * viewer.js — Visualizador público de documentos
 * Rota: #/viewer?id=...
 *
 * Acesso permitido se:
 *  - doc.status === 'publicado'  (qualquer visitante)
 *  - OU usuário autenticado é o ownerUid
 */

import { getCurrentUser }      from '../auth.js';
import { isDbAvailable }       from '../db/db.js';
import { getDocument, getSections, getBlocks } from '../db/documentRepo.js';
import { renderLoading, renderError }          from '../ui/components.js';

import { TEMPLATE_ID as ID_EDITORIAL, buildHTML as buildEditorial, CSS as cssEditorial }
  from '../templates/templateEditorial.js';
import { TEMPLATE_ID as ID_BEACON,   buildHTML as buildBeacon,   CSS as cssBeacon   }
  from '../templates/templateBeacon.js';
import { TEMPLATE_ID as ID_FICHA,    buildHTML as buildFicha,    CSS as cssFicha    }
  from '../templates/templateFicha.js';

// ── Mapa de templates ─────────────────────────────────────────────────────────

const TEMPLATES = {
  [ID_EDITORIAL]: { buildHTML: buildEditorial, css: cssEditorial },
  [ID_BEACON]:    { buildHTML: buildBeacon,    css: cssBeacon    },
  [ID_FICHA]:     { buildHTML: buildFicha,     css: cssFicha     },
};

// ── Entrada da view ───────────────────────────────────────────────────────────

export function renderViewer() {
  if (!isDbAvailable()) return renderError('Banco de dados indisponível.');

  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id     = params.get('id');
  if (!id) return renderError('ID do documento não informado.');

  setTimeout(() => _loadViewer(id), 0);
  return `<div id="viewer-view">${renderLoading('Carregando documento…')}</div>`;
}

// ── Carregamento ──────────────────────────────────────────────────────────────

async function _loadViewer(id) {
  const root = document.getElementById('viewer-view');
  if (!root) return;

  try {
    const [doc, sections] = await Promise.all([getDocument(id), getSections(id)]);
    if (!doc) { root.innerHTML = renderError('Documento não encontrado.'); return; }

    const user = getCurrentUser();
    const isOwner     = user && user.uid === doc.ownerUid;
    const isPublished = doc.status === 'publicado';

    if (!isPublished && !isOwner) {
      root.innerHTML = renderError('Este documento não está disponível publicamente.');
      return;
    }

    const blocksPerSection = await Promise.all(sections.map(s => getBlocks(id, s.id)));
    const tplKey = doc.template && TEMPLATES[doc.template] ? doc.template : ID_EDITORIAL;

    root.innerHTML = _buildViewerShell(doc, sections, blocksPerSection, tplKey, isOwner);
    _wireViewer(root, doc, sections, blocksPerSection, tplKey);
  } catch (err) {
    console.warn('[viewer] Erro:', err);
    root.innerHTML = renderError('Erro ao carregar o documento.');
  }
}

// ── Shell HTML ────────────────────────────────────────────────────────────────

function _buildViewerShell(doc, sections, blocksPerSection, tplKey, isOwner) {
  const tpl = TEMPLATES[tplKey];
  const docHTML = tpl.buildHTML(doc, sections, blocksPerSection);

  return `
    <div class="viewer-toolbar">
      <div class="viewer-toolbar-left">
        ${isOwner
          ? `<a href="#/documento?id=${doc.id}" class="btn-outline btn-sm">← Editar</a>`
          : `<a href="#/login" class="btn-outline btn-sm">← Entrar</a>`
        }
        <span class="viewer-doc-title">${_esc(doc.title)}</span>
      </div>
      <div class="viewer-toolbar-right">
        <button class="btn-outline btn-sm" id="btn-viewer-print">Imprimir / PDF</button>
        <button class="btn-primary btn-sm"  id="btn-viewer-download">⬇ Baixar HTML</button>
      </div>
    </div>
    <div class="viewer-body">
      ${docHTML}
    </div>
    <div id="viewer-toast" class="toast" aria-live="polite"></div>`;
}

// ── Wiring de eventos ─────────────────────────────────────────────────────────

function _wireViewer(root, doc, sections, blocksPerSection, tplKey) {
  root.querySelector('#btn-viewer-print').addEventListener('click', () => window.print());

  root.querySelector('#btn-viewer-download').addEventListener('click', () => {
    _downloadHTML(doc, sections, blocksPerSection, tplKey);
    _showToast(root, 'Download iniciado!');
  });
}

// ── Download HTML autônomo ────────────────────────────────────────────────────

function _downloadHTML(doc, sections, blocksPerSection, tplKey) {
  const tpl     = TEMPLATES[tplKey];
  const bodyHTML = tpl.buildHTML(doc, sections, blocksPerSection);
  const safeTitle = doc.title.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'documento';

  const fullHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${_esc(doc.title)}</title>
<style>
${tpl.css}
</style>
</head>
<body>
${bodyHTML}
</body>
</html>`;

  const blob = new Blob([fullHTML], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${safeTitle}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function _showToast(root, msg) {
  const el = root.querySelector('#viewer-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Util ──────────────────────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
