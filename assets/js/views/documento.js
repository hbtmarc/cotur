/**
 * documento.js — Editor de documento: metadados, seções e blocos
 * Rota: #/documento?id=...
 *
 * Tipos de bloco suportados: texto | destaque | lista
 */

import { getCurrentUser }  from '../auth.js';
import { isDbAvailable }   from '../db/db.js';
import {
  getDocument, getSections, updateDocument,
  addSection, updateSection, deleteSection,
  createBlock, getBlocks, updateBlock, deleteBlock,
  addHistoryEntry,
}                          from '../db/documentRepo.js';
import {
  renderLoading, renderEmpty, renderDbUnavailable,
  renderError, statusBadge, formatDate, openModal,
}                          from '../ui/components.js';
import { TEMPLATE_ID as ID_EDITORIAL, TEMPLATE_LABEL as LBL_EDITORIAL,
         buildHTML as buildEditorial, CSS as cssEditorial }
  from '../templates/templateEditorial.js';
import { TEMPLATE_ID as ID_BEACON, TEMPLATE_LABEL as LBL_BEACON,
         buildHTML as buildBeacon, CSS as cssBeacon }
  from '../templates/templateBeacon.js';
import { TEMPLATE_ID as ID_FICHA, TEMPLATE_LABEL as LBL_FICHA,
         buildHTML as buildFicha, CSS as cssFicha }
  from '../templates/templateFicha.js';

// ── Constantes ────────────────────────────────────────────────────────────────

// ── Estado de template ───────────────────────────────────────────────────────

let _currentTemplate = ID_EDITORIAL;

const _TEMPLATES = {
  [ID_EDITORIAL]: { label: LBL_EDITORIAL, buildHTML: buildEditorial, css: cssEditorial },
  [ID_BEACON]:    { label: LBL_BEACON,    buildHTML: buildBeacon,    css: cssBeacon    },
  [ID_FICHA]:     { label: LBL_FICHA,     buildHTML: buildFicha,     css: cssFicha     },
};

const STATUS_OPTIONS = [
  { value: 'rascunho',   label: 'Rascunho'   },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'publicado',  label: 'Publicado'  },
  { value: 'arquivado',  label: 'Arquivado'  },
];

const BLOCK_TYPES = [
  { value: 'texto',    label: 'Texto'    },
  { value: 'destaque', label: 'Destaque' },
  { value: 'lista',    label: 'Lista'    },
];

// ── Entrada da view ───────────────────────────────────────────────────────────

export function renderDocumento() {
  const user = getCurrentUser();
  if (!user) return '<p>Usuário não autenticado.</p>';
  if (!isDbAvailable()) return renderDbUnavailable();

  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id     = params.get('id');
  if (!id) return renderError('ID do documento não informado.');

  setTimeout(() => _load(id, user), 0);
  return `<div id="doc-view">${renderLoading('Carregando documento…')}</div>`;
}

// ── Carregamento ──────────────────────────────────────────────────────────────

async function _load(id, user) {
  const root = document.getElementById('doc-view');
  if (!root) return;
  try {
    const [doc, sections] = await Promise.all([getDocument(id), getSections(id)]);
    if (!doc)                       { root.innerHTML = renderError('Documento não encontrado.'); return; }
    if (doc.ownerUid !== user.uid)  { root.innerHTML = renderError('Você não tem acesso a este documento.'); return; }
    await _renderEditor(root, doc, sections, user);
  } catch (err) {
    console.warn('[documento] Erro ao carregar:', err);
    root.innerHTML = renderError('Erro ao carregar o documento.');
  }
}

// ── Shell do editor ───────────────────────────────────────────────────────────

async function _renderEditor(root, doc, sections, user) {
  root.setAttribute('data-mode', 'edit');

  root.innerHTML = `
    <div class="view-header row-between">
      <div style="min-width:0;flex:1">
        <a href="#/documentos" class="back-link">← Documentos</a>
        <h1 class="doc-editor-title">${_esc(doc.title)}</h1>
        <p class="view-subtitle">${_esc(doc.description ?? '')}</p>
      </div>
      <div class="doc-actions">
        <span id="doc-status-badge">${statusBadge(doc.status)}</span>
        <button class="btn-outline btn-sm edit-only" id="btn-edit-doc">Editar metadados</button>
        <button class="btn-outline btn-sm edit-only" id="btn-preview">Visualizar</button>
        <button class="btn-outline btn-sm preview-only" id="btn-edit-mode">← Editar</button>
        <button class="btn-primary btn-sm preview-only" id="btn-export-pdf">Exportar PDF</button>
        <button class="btn-outline btn-sm preview-only" id="btn-download-html">⬇ HTML</button>
        <button class="btn-outline btn-sm preview-only" id="btn-copy-link">🔗 Copiar link</button>
      </div>
    </div>

    <div class="meta-row edit-only">
      <span>Criado em: ${formatDate(doc.createdAt)}</span>
      <span>Atualizado em: <span id="doc-updated-at">${formatDate(doc.updatedAt)}</span></span>
    </div>

    <div class="section-header row-between edit-only" style="margin-top:28px;margin-bottom:14px">
      <h2 class="section-list-title">Seções</h2>
      <button class="btn-outline btn-sm" id="btn-add-section">+ Adicionar seção</button>
    </div>

    <div id="sections-root"></div>
    <div id="preview-root" class="preview-only" style="display:none">
      <div class="tpl-switcher">
        ${Object.entries(_TEMPLATES).map(([k, t]) =>
          `<button class="btn-tpl${k === _currentTemplate ? ' active' : ''}" data-tpl="${k}">${t.label}</button>`
        ).join('')}
      </div>
      <div id="tpl-content"></div>
    </div>`;

  root.querySelector('#btn-edit-doc').addEventListener('click',
    () => _openEditDocModal(doc, user, root));

  root.querySelector('#btn-add-section').addEventListener('click',
    () => _openAddSectionModal(doc, user));

  // Carrega cada seção com seus blocos em paralelo
  const secRoot = root.querySelector('#sections-root');
  if (!sections.length) {
    secRoot.innerHTML = renderEmpty('Nenhuma seção adicionada.', 'Clique em "+ Adicionar seção" para começar.');
  } else {
    const blocksPerSection = await Promise.all(sections.map(s => getBlocks(doc.id, s.id)));
    sections.forEach((sec, i) => {
      const el = _buildSectionEl(doc, sec, blocksPerSection[i], user);
      secRoot.appendChild(el);
    });
  }

  // ── Preview toggle (always wired) ──────────────────────────────
  root.querySelector('#btn-preview').addEventListener('click', async () => {
    const [freshDoc, freshSecs] = await Promise.all([getDocument(doc.id), getSections(doc.id)]);
    const freshBlocks = await Promise.all(freshSecs.map(s => getBlocks(doc.id, s.id)));
    _renderPreview(root, freshDoc, freshSecs, freshBlocks);
    _setMode(root, 'preview');
  });
  root.querySelector('#btn-edit-mode').addEventListener('click',  () => _setMode(root, 'edit'));
  root.querySelector('#btn-export-pdf').addEventListener('click', () => window.print());

  // ── Download HTML ──────────────────────────────────────────────
  root.querySelector('#btn-download-html').addEventListener('click', async () => {
    const [freshDoc, freshSecs] = await Promise.all([getDocument(doc.id), getSections(doc.id)]);
    const freshBlocks = await Promise.all(freshSecs.map(s => getBlocks(doc.id, s.id)));
    _downloadDocHTML(freshDoc, freshSecs, freshBlocks, _currentTemplate);
    _showToast(root, 'Download iniciado!');
  });

  // ── Copiar link público ────────────────────────────────────────
  root.querySelector('#btn-copy-link').addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#/viewer?id=${doc.id}`;
    navigator.clipboard.writeText(url).then(
      () => _showToast(root, 'Link copiado!'),
      () => _showToast(root, url),
    );
  });

  // ── Tpl switcher ──────────────────────────────────────────────
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-tpl]');
    if (!btn) return;
    const tplKey = btn.dataset.tpl;
    if (!_TEMPLATES[tplKey] || tplKey === _currentTemplate) return;
    _currentTemplate = tplKey;
    root.querySelectorAll('.btn-tpl').forEach(b => b.classList.toggle('active', b.dataset.tpl === tplKey));
    const [freshDoc, freshSecs] = await Promise.all([getDocument(doc.id), getSections(doc.id)]);
    const freshBlocks = await Promise.all(freshSecs.map(s => getBlocks(doc.id, s.id)));
    _renderPreview(root, freshDoc, freshSecs, freshBlocks);
  });
}

// ── Render preview via template ───────────────────────────────────────────────

function _renderPreview(root, doc, sections, blocksPerSection) {
  const tpl = _TEMPLATES[_currentTemplate] ?? _TEMPLATES[ID_EDITORIAL];
  root.querySelector('#tpl-content').innerHTML = tpl.buildHTML(doc, sections, blocksPerSection);
}

// ── Modo toggle ───────────────────────────────────────────────────────────────

function _setMode(root, mode) {
  root.setAttribute('data-mode', mode);
  // Visibility is handled entirely by CSS selectors on [data-mode]
  // We only need to explicitly show/hide #preview-root and #sections-root
  // because they share the same slot and both use default display:block
  const previewRoot  = root.querySelector('#preview-root');
  const sectionsRoot = root.querySelector('#sections-root');
  if (mode === 'preview') {
    previewRoot.style.display  = '';
    sectionsRoot.style.display = 'none';
  } else {
    previewRoot.style.display  = 'none';
    sectionsRoot.style.display = '';
  }
}

// ── Preview HTML ──────────────────────────────────────────────────────────────

function _buildPreviewHTML(doc, sections, blocksPerSection) {
  const secHTML = sections.length
    ? sections.map((sec, i) => {
        const blocks = blocksPerSection[i] ?? [];
        const blocksHTML = blocks.length
          ? blocks.map(b => _previewBlockHTML(b)).join('')
          : `<p class="preview-no-blocks">Nenhum bloco nesta seção.</p>`;
        const breakClass = sec.breakBefore ? ' preview-section--break-before' : '';
        return `
          <section class="preview-section${breakClass}">
            <h2 class="preview-section-title">${_esc(sec.title)}</h2>
            <div class="preview-blocks">${blocksHTML}</div>
          </section>`;
      }).join('')
    : `<p class="preview-no-content">Nenhuma seção adicionada.</p>`;

  const createdStr = formatDate(doc.createdAt);
  const updatedStr = formatDate(doc.updatedAt);

  return `
    <div class="a4-page" id="print-area">
      <header class="preview-doc-header">
        <div class="preview-cover">
          <div class="preview-cover-accent"></div>
          <h1 class="preview-doc-title">${_esc(doc.title)}</h1>
          ${doc.description ? `<p class="preview-doc-desc">${_esc(doc.description)}</p>` : ''}
          <div class="preview-doc-meta">
            ${statusBadge(doc.status)}
            <span class="preview-meta-item">Criado em: ${createdStr}</span>
            <span class="preview-meta-item">Atualizado em: ${updatedStr}</span>
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

function _previewBlockHTML(b) {
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

// ── Seção element builder ─────────────────────────────────────────────────────

function _buildSectionEl(doc, sec, blocks, user) {
  const el = document.createElement('div');
  el.className = 'editor-section';
  el.dataset.secId = sec.id;

  const breakActive = sec.breakBefore ? ' sec-break-active' : '';
  el.innerHTML = `
    <div class="editor-section-header">
      <span class="editor-section-title" data-editing="false">${_esc(sec.title)}</span>
      <div class="editor-section-actions">
        <button class="btn-icon btn-break-toggle${breakActive}" title="Iniciar em nova página" data-action="break">${sec.breakBefore ? '⏎' : '⏎'}</button>
        <button class="btn-icon" title="Renomear seção" data-action="rename">✏️</button>
        <button class="btn-icon" title="Excluir seção"  data-action="delete">🗑️</button>
      </div>
    </div>
    <div class="block-list" id="blocks-${sec.id}">
      ${_renderBlocksHTML(blocks)}
    </div>
    <div class="add-block-bar">
      <span class="add-block-label">Adicionar bloco:</span>
      ${BLOCK_TYPES.map(t =>
        `<button class="btn-block-type" data-type="${t.value}">${t.label}</button>`
      ).join('')}
      <button class="btn-block-type btn-block-type--break" data-type="quebra" title="Inserir quebra de página manual">↵ Quebra</button>
    </div>`;

  // Toggle: iniciar seção em nova página
  el.querySelector('[data-action="break"]').addEventListener('click', async (e) => {
    sec.breakBefore = !sec.breakBefore;
    await updateSection(doc.id, sec.id, { breakBefore: sec.breakBefore });
    const btn = e.currentTarget;
    btn.classList.toggle('sec-break-active', sec.breakBefore);
    btn.title = sec.breakBefore ? 'Remover nova página antes da seção' : 'Iniciar em nova página';
  });

  // Renomear seção inline
  el.querySelector('[data-action="rename"]').addEventListener('click', () =>
    _inlineRenameSection(el, doc, sec, user));

  // Excluir seção
  el.querySelector('[data-action="delete"]').addEventListener('click', () =>
    _confirmDeleteSection(el, doc, sec, user));

  // Adicionar bloco (quebra: sem modal)
  el.querySelectorAll('.btn-block-type').forEach(btn =>
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      if (type === 'quebra') {
        await createBlock(doc.id, sec.id, { type: 'quebra', content: '', items: '', order: blocks.length });
        await addHistoryEntry(doc.id, user.uid, 'adicionou bloco', `Quebra de página inserida em "${sec.title}".`);
        await _refreshBlocks(doc, sec, user, el, blocks);
      } else {
        _openAddBlockModal(doc, sec, type, blocks.length, user, el);
      }
    }));

  // Delegar eventos de editar/excluir blocos
  el.querySelector(`#blocks-${sec.id}`).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-block-action]');
    if (!btn) return;
    const blockId = btn.closest('[data-block-id]')?.dataset.blockId;
    if (!blockId) return;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    if (btn.dataset.blockAction === 'edit')   _openEditBlockModal(doc, sec, block, user, el, blocks);
    if (btn.dataset.blockAction === 'delete') _confirmDeleteBlock(doc, sec, block, user, el, blocks);
  });

  return el;
}

// ── Renderização de blocos ────────────────────────────────────────────────────

function _renderBlocksHTML(blocks) {
  if (!blocks.length) return `<p class="blocks-empty">Nenhum bloco. Adicione um abaixo.</p>`;
  return blocks.map(b => _blockHTML(b)).join('');
}

function _blockHTML(b) {
  if (b.type === 'quebra') {
    return `
      <div class="block block-quebra" data-block-id="${b.id}">
        <div class="block-body block-quebra-label">— quebra de página —</div>
        <div class="block-controls">
          <button class="btn-icon btn-icon-sm" data-block-action="delete" title="Remover">🗑️</button>
        </div>
      </div>`;
  }
  const content = _renderBlockContent(b);
  return `
    <div class="block block-${b.type}" data-block-id="${b.id}">
      <div class="block-body">${content}</div>
      <div class="block-controls">
        <button class="btn-icon btn-icon-sm" data-block-action="edit"   title="Editar">✏️</button>
        <button class="btn-icon btn-icon-sm" data-block-action="delete" title="Excluir">🗑️</button>
      </div>
    </div>`;
}

function _renderBlockContent(b) {
  if (b.type === 'lista') {
    const lines = (b.items ?? '').split('\n').filter(l => l.trim());
    if (!lines.length) return '<ul class="block-list-ul"><li class="block-list-empty">Lista vazia.</li></ul>';
    return `<ul class="block-list-ul">${lines.map(l => `<li>${_esc(l)}</li>`).join('')}</ul>`;
  }
  return `<p class="block-text">${_esc(b.content ?? '').replace(/\n/g, '<br>')}</p>`;
}

// ── Recarrega blocos de uma seção no DOM ──────────────────────────────────────

async function _refreshBlocks(doc, sec, user, secEl, blocksRef) {
  const updated = await getBlocks(doc.id, sec.id);
  blocksRef.length = 0;
  updated.forEach(b => blocksRef.push(b));
  secEl.querySelector(`#blocks-${sec.id}`).innerHTML = _renderBlocksHTML(updated);

  // Re-bind delegated listener (substituí o innerHTML, então rebind)
  const newList = secEl.querySelector(`#blocks-${sec.id}`);
  newList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-block-action]');
    if (!btn) return;
    const blockId = btn.closest('[data-block-id]')?.dataset.blockId;
    const block   = blocksRef.find(b => b.id === blockId);
    if (!block) return;
    if (btn.dataset.blockAction === 'edit')   _openEditBlockModal(doc, sec, block, user, secEl, blocksRef);
    if (btn.dataset.blockAction === 'delete') _confirmDeleteBlock(doc, sec, block, user, secEl, blocksRef);
  });
}

// ── Rename seção inline ───────────────────────────────────────────────────────

function _inlineRenameSection(secEl, doc, sec, user) {
  const titleSpan = secEl.querySelector('.editor-section-title');
  if (titleSpan.dataset.editing === 'true') return;
  titleSpan.dataset.editing = 'true';

  const original = sec.title;
  titleSpan.innerHTML = `
    <input class="inline-input" value="${_esc(original)}" maxlength="120" />
    <button class="btn-inline-save">Salvar</button>
    <button class="btn-inline-cancel">Cancelar</button>`;

  const input = titleSpan.querySelector('input');
  input.focus();
  input.select();

  const cancel = () => {
    titleSpan.innerHTML = _esc(sec.title);
    titleSpan.dataset.editing = 'false';
  };

  const save = async () => {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    try {
      await updateSection(doc.id, sec.id, { title: val });
      await addHistoryEntry(doc.id, user.uid, 'editou seção', `Seção renomeada para "${val}".`);
      sec.title = val;
    } catch { /* silently keep original */ }
    titleSpan.innerHTML = _esc(sec.title);
    titleSpan.dataset.editing = 'false';
  };

  titleSpan.querySelector('.btn-inline-save').addEventListener('click', save);
  titleSpan.querySelector('.btn-inline-cancel').addEventListener('click', cancel);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  });
}

// ── Confirmar exclusão de seção ───────────────────────────────────────────────

function _confirmDeleteSection(secEl, doc, sec, user) {
  openModal({
    title:        'Excluir seção',
    confirmLabel: 'Excluir',
    cancelLabel:  'Cancelar',
    bodyHtml: `<p>Tem certeza que deseja excluir a seção <strong>${_esc(sec.title)}</strong> e todos os seus blocos? Esta ação não pode ser desfeita.</p>`,
    onConfirm: async (close) => {
      await deleteSection(doc.id, sec.id, user.uid);
      secEl.remove();
      const root = document.getElementById('sections-root');
      if (root && !root.querySelector('.editor-section')) {
        root.innerHTML = renderEmpty('Nenhuma seção adicionada.', 'Clique em "+ Adicionar seção" para começar.');
      }
      close();
    },
  });
}

// ── Modal: nova seção ─────────────────────────────────────────────────────────

function _openAddSectionModal(doc, user) {
  openModal({
    title:        'Nova seção',
    confirmLabel: 'Adicionar',
    bodyHtml: `
      <div class="form-group">
        <label for="ns-titulo">Título da seção <span class="req">*</span></label>
        <input id="ns-titulo" type="text" placeholder="Ex: Introdução" maxlength="120" />
      </div>
      <p id="ns-error" class="auth-error hidden" style="margin-top:10px"></p>`,
    onConfirm: async (close) => {
      const title = document.getElementById('ns-titulo')?.value.trim();
      const errEl = document.getElementById('ns-error');
      if (!title) {
        errEl.textContent = 'O título é obrigatório.'; errEl.classList.remove('hidden');
        throw new Error('validação');
      }
      try {
        const sections = await getSections(doc.id);
        const secId    = await addSection(doc.id, { title, order: sections.length });
        const newSec   = { id: secId, documentId: doc.id, title, order: sections.length };
        close();
        // Monta o novo element de seção sem recarregar tudo
        const secRoot = document.getElementById('sections-root');
        if (secRoot) {
          const emptyMsg = secRoot.querySelector('.state-box');
          if (emptyMsg) secRoot.innerHTML = '';
          const el = _buildSectionEl(doc, newSec, [], user);
          secRoot.appendChild(el);
        }
      } catch (err) {
        if (err.message !== 'validação') {
          errEl.textContent = 'Erro ao adicionar seção.'; errEl.classList.remove('hidden');
        }
        throw err;
      }
    },
  });
  setTimeout(() => document.getElementById('ns-titulo')?.focus(), 50);
}

// ── Modal: editar metadados do documento ──────────────────────────────────────

function _openEditDocModal(doc, user, root) {
  openModal({
    title:        'Editar metadados',
    confirmLabel: 'Salvar',
    bodyHtml: `
      <div class="form-group">
        <label for="ed-titulo">Título <span class="req">*</span></label>
        <input id="ed-titulo" type="text" value="${_esc(doc.title)}" maxlength="120" />
      </div>
      <div class="form-group" style="margin-top:12px">
        <label for="ed-desc">Descrição</label>
        <input id="ed-desc" type="text" value="${_esc(doc.description ?? '')}" maxlength="240" />
      </div>
      <div class="form-group" style="margin-top:12px">
        <label for="ed-status">Status</label>
        <select id="ed-status">
          ${STATUS_OPTIONS.map(o =>
            `<option value="${o.value}" ${doc.status === o.value ? 'selected' : ''}>${o.label}</option>`
          ).join('')}
        </select>
      </div>
      <p id="ed-error" class="auth-error hidden" style="margin-top:10px"></p>`,
    onConfirm: async (close) => {
      const title  = document.getElementById('ed-titulo')?.value.trim();
      const desc   = document.getElementById('ed-desc')?.value.trim();
      const status = document.getElementById('ed-status')?.value;
      const errEl  = document.getElementById('ed-error');
      if (!title) {
        errEl.textContent = 'O título é obrigatório.'; errEl.classList.remove('hidden');
        throw new Error('validação');
      }
      try {
        await updateDocument(doc.id, user.uid, { title, description: desc, status },
          `Metadados editados — status: ${status}`);
        // Atualiza DOM local sem recarregar toda a view
        doc.title       = title;
        doc.description = desc;
        doc.status      = status;
        root.querySelector('.doc-editor-title').textContent     = title;
        root.querySelector('.view-subtitle').textContent        = desc ?? '';
        root.querySelector('#doc-status-badge').innerHTML       = statusBadge(status);
        root.querySelector('#doc-updated-at').textContent       = formatDate(Date.now());
        close();
      } catch (err) {
        if (err.message !== 'validação') {
          errEl.textContent = 'Erro ao salvar.'; errEl.classList.remove('hidden');
        }
        throw err;
      }
    },
  });
  setTimeout(() => document.getElementById('ed-titulo')?.focus(), 50);
}

// ── Modal: adicionar bloco ────────────────────────────────────────────────────

function _openAddBlockModal(doc, sec, type, currentCount, user, secEl) {
  const isLista = type === 'lista';
  openModal({
    title:        `Novo bloco — ${BLOCK_TYPES.find(t => t.value === type)?.label}`,
    confirmLabel: 'Adicionar',
    bodyHtml: `
      <div class="form-group">
        ${isLista
          ? `<label for="bl-content">Itens <span class="req">*</span> <small>(um por linha)</small></label>
             <textarea id="bl-content" rows="5" placeholder="Item 1\nItem 2\nItem 3"></textarea>`
          : `<label for="bl-content">Conteúdo <span class="req">*</span></label>
             <textarea id="bl-content" rows="4" placeholder="${type === 'destaque' ? 'Texto em destaque…' : 'Texto do bloco…'}"></textarea>`
        }
      </div>
      <p id="bl-error" class="auth-error hidden" style="margin-top:10px"></p>`,
    onConfirm: async (close) => {
      const raw   = document.getElementById('bl-content')?.value ?? '';
      const errEl = document.getElementById('bl-error');
      if (!raw.trim()) {
        errEl.textContent = 'O conteúdo é obrigatório.'; errEl.classList.remove('hidden');
        throw new Error('validação');
      }
      try {
        const payload = isLista
          ? { type, content: '', items: raw.trim(), order: currentCount }
          : { type, content: raw.trim(), items: '', order: currentCount };
        await createBlock(doc.id, sec.id, payload);
        await addHistoryEntry(doc.id, user.uid, 'adicionou bloco', `Bloco "${type}" adicionado em "${sec.title}".`);
        close();
        // Atualiza a lista de blocos da seção
        const blocksRef = [];
        await _refreshBlocks(doc, sec, user, secEl, blocksRef);
      } catch (err) {
        if (err.message !== 'validação') {
          errEl.textContent = 'Erro ao adicionar bloco.'; errEl.classList.remove('hidden');
        }
        throw err;
      }
    },
  });
  setTimeout(() => document.getElementById('bl-content')?.focus(), 50);
}

// ── Modal: editar bloco ───────────────────────────────────────────────────────

function _openEditBlockModal(doc, sec, block, user, secEl, blocksRef) {
  const isLista = block.type === 'lista';
  const current = isLista ? (block.items ?? '') : (block.content ?? '');
  openModal({
    title:        `Editar bloco — ${BLOCK_TYPES.find(t => t.value === block.type)?.label}`,
    confirmLabel: 'Salvar',
    bodyHtml: `
      <div class="form-group">
        ${isLista
          ? `<label for="ebl-content">Itens <span class="req">*</span> <small>(um por linha)</small></label>
             <textarea id="ebl-content" rows="5">${_esc(current)}</textarea>`
          : `<label for="ebl-content">Conteúdo <span class="req">*</span></label>
             <textarea id="ebl-content" rows="4">${_esc(current)}</textarea>`
        }
      </div>
      <p id="ebl-error" class="auth-error hidden" style="margin-top:10px"></p>`,
    onConfirm: async (close) => {
      const raw   = document.getElementById('ebl-content')?.value ?? '';
      const errEl = document.getElementById('ebl-error');
      if (!raw.trim()) {
        errEl.textContent = 'O conteúdo é obrigatório.'; errEl.classList.remove('hidden');
        throw new Error('validação');
      }
      try {
        const updates = isLista
          ? { items: raw.trim(), content: '' }
          : { content: raw.trim(), items: '' };
        await updateBlock(doc.id, sec.id, block.id, updates);
        await addHistoryEntry(doc.id, user.uid, 'editou bloco', `Bloco "${block.type}" editado em "${sec.title}".`);
        close();
        await _refreshBlocks(doc, sec, user, secEl, blocksRef);
      } catch (err) {
        if (err.message !== 'validação') {
          errEl.textContent = 'Erro ao salvar bloco.'; errEl.classList.remove('hidden');
        }
        throw err;
      }
    },
  });
  setTimeout(() => document.getElementById('ebl-content')?.focus(), 50);
}

// ── Confirmar exclusão de bloco ───────────────────────────────────────────────

function _confirmDeleteBlock(doc, sec, block, user, secEl, blocksRef) {
  openModal({
    title:        'Excluir bloco',
    confirmLabel: 'Excluir',
    cancelLabel:  'Cancelar',
    bodyHtml: `<p>Excluir este bloco de <strong>${BLOCK_TYPES.find(t => t.value === block.type)?.label}</strong>? Esta ação não pode ser desfeita.</p>`,
    onConfirm: async (close) => {
      await deleteBlock(doc.id, sec.id, block.id);
      await addHistoryEntry(doc.id, user.uid, 'excluiu bloco', `Bloco "${block.type}" removido de "${sec.title}".`);
      close();
      await _refreshBlocks(doc, sec, user, secEl, blocksRef);
    },
  });
}

// ── Utilitário ────────────────────────────────────────────────────────────────
function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Download HTML autônomo ────────────────────────────────────────────────────
function _downloadDocHTML(doc, sections, blocksPerSection, tplKey) {
  const tpl     = _TEMPLATES[tplKey] ?? _TEMPLATES[ID_EDITORIAL];
  const bodyHTML = tpl.buildHTML(doc, sections, blocksPerSection);
  const safeName = doc.title.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'documento';
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
  a.download = `${safeName}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Toast inline ──────────────────────────────────────────────────────────────
function _showToast(root, msg) {
  let el = root.querySelector('.doc-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast doc-toast';
    root.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}
