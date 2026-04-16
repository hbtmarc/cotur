/**
 * documentos.js — Lista e criação de documentos
 * Usa listener em tempo real. Cleanup via _unsub armazenado no módulo.
 */

import { getCurrentUser }                        from '../auth.js';
import { isDbAvailable }                          from '../db/db.js';
import { listenDocumentsByOwner, createDocument } from '../db/documentRepo.js';
import { renderLoading, renderEmpty, renderDbUnavailable, statusBadge, formatDate } from '../ui/components.js';
import { openModal }                              from '../ui/components.js';
import { router }                                 from '../router.js';

let _unsub = null; // unsubscribe do listener ativo

/** Chamado pelo router quando a rota muda (cleanup) */
export function destroyDocumentos() {
  if (_unsub) { _unsub(); _unsub = null; }
}

export function renderDocumentos() {
  const user = getCurrentUser();
  if (!user) return '<p>Usuário não autenticado.</p>';

  if (!isDbAvailable()) return renderDbUnavailable();

  // Shell estático — a lista é injetada dinamicamente após montagem
  const shell = `
    <div class="view-header row-between">
      <div>
        <h1>Documentos</h1>
        <p>Seus documentos de trabalho.</p>
      </div>
      <button id="btn-novo-doc" class="btn-primary btn-sm">+ Novo documento</button>
    </div>
    <div id="doc-list-container">${renderLoading()}</div>`;

  // Aguarda DOM e então ativa listener + botão
  setTimeout(() => _mountDocumentos(user), 0);

  return shell;
}

function _mountDocumentos(user) {
  const container = document.getElementById('doc-list-container');
  const btnNovo   = document.getElementById('btn-novo-doc');
  if (!container) return;

  // Listener em tempo real
  _unsub = listenDocumentsByOwner(user.uid, (docs) => {
    if (!document.getElementById('doc-list-container')) {
      // View foi desmontada – cancela listener
      if (_unsub) { _unsub(); _unsub = null; }
      return;
    }
    _renderList(container, docs);
  });

  // Botão novo documento
  btnNovo?.addEventListener('click', () => _openNovoDocModal(user));
}

function _renderList(container, docs) {
  if (!docs || docs.length === 0) {
    container.innerHTML = renderEmpty(
      'Nenhum documento encontrado.',
      'Clique em "+ Novo documento" para começar.'
    );
    return;
  }

  // Ordena por updatedAt decrescente
  const sorted = [...docs].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  container.innerHTML = `
    <div class="doc-list">
      ${sorted.map(doc => `
        <div class="doc-card" data-id="${doc.id}">
          <div class="doc-card-main">
            <div class="doc-card-title">${_esc(doc.title)}</div>
            ${doc.description ? `<div class="doc-card-desc">${_esc(doc.description)}</div>` : ''}
          </div>
          <div class="doc-card-meta">
            ${statusBadge(doc.status)}
            <span class="doc-date">${formatDate(doc.updatedAt)}</span>
          </div>
        </div>`).join('')}
    </div>`;

  // Navegação ao clicar no card
  container.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', () => {
      router.navigate(`#/documento?id=${card.dataset.id}`);
    });
  });
}

function _openNovoDocModal(user) {
  openModal({
    title:        'Novo documento',
    confirmLabel: 'Criar',
    bodyHtml: `
      <div class="form-group">
        <label for="nd-titulo">Título <span class="req">*</span></label>
        <input id="nd-titulo" type="text" placeholder="Ex: Relatório Mensal" maxlength="120" />
      </div>
      <div class="form-group" style="margin-top:12px">
        <label for="nd-desc">Descrição</label>
        <input id="nd-desc" type="text" placeholder="Opcional" maxlength="240" />
      </div>
      <p id="nd-error" class="auth-error hidden" style="margin-top:10px"></p>`,
    onConfirm: async (close) => {
      const title = document.getElementById('nd-titulo')?.value.trim();
      const desc  = document.getElementById('nd-desc')?.value.trim();
      const errEl = document.getElementById('nd-error');

      if (!title) {
        errEl.textContent = 'O título é obrigatório.';
        errEl.classList.remove('hidden');
        throw new Error('validação');
      }

      try {
        const id = await createDocument(user.uid, { title, description: desc });
        close();
        router.navigate(`#/documento?id=${id}`);
      } catch (err) {
        errEl.textContent = 'Erro ao criar documento. Tente novamente.';
        errEl.classList.remove('hidden');
        throw err;
      }
    },
  });

  // Foca no campo após modal abrir
  setTimeout(() => document.getElementById('nd-titulo')?.focus(), 50);
}

function _esc(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

