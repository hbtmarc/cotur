/**
 * components.js — Helpers de UI reutilizáveis (sem estado)
 * Retornam strings HTML prontas para injeção via innerHTML.
 */

// ── Estado: carregando ────────────────────────────────────────────────────────
export function renderLoading(msg = 'Carregando…') {
  return `<div class="state-box state-loading">
    <span class="spinner"></span>
    <span>${msg}</span>
  </div>`;
}

// ── Estado: vazio ─────────────────────────────────────────────────────────────
export function renderEmpty(msg = 'Nenhum item encontrado.', detail = '') {
  return `<div class="state-box state-empty">
    <span class="state-icon">📄</span>
    <p class="state-title">${msg}</p>
    ${detail ? `<p class="state-detail">${detail}</p>` : ''}
  </div>`;
}

// ── Estado: erro ──────────────────────────────────────────────────────────────
export function renderError(msg = 'Ocorreu um erro.') {
  return `<div class="state-box state-error">
    <span class="state-icon">⚠️</span>
    <p class="state-title">${msg}</p>
  </div>`;
}

// ── Estado: RTDB indisponível ─────────────────────────────────────────────────
export function renderDbUnavailable() {
  return renderError('Banco de dados indisponível. Verifique sua conexão ou a configuração do Firebase.');
}

// ── Badge de status de documento ─────────────────────────────────────────────
const STATUS_LABELS = {
  rascunho:   { label: 'Rascunho',    cls: 'badge-gray'   },
  em_revisao: { label: 'Em revisão',  cls: 'badge-yellow' },
  publicado:  { label: 'Publicado',   cls: 'badge-green'  },
  arquivado:  { label: 'Arquivado',   cls: 'badge-red'    },
};

export function statusBadge(status) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'badge-gray' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

// ── Formata timestamp para PT-BR ──────────────────────────────────────────────
export function formatDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit', month: '2-digit', year: 'numeric',
    hour:   '2-digit', minute: '2-digit',
  }).format(new Date(ts));
}

// ── Modal simples (título + conteúdo HTML) ────────────────────────────────────
export function openModal({ title, bodyHtml, onConfirm, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' }) {
  // Remove qualquer modal anterior
  document.getElementById('app-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'app-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <h2 class="modal-title">${title}</h2>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        <button class="btn-text" id="modal-cancel">${cancelLabel}</button>
        <button class="btn-primary" id="modal-confirm">${confirmLabel}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  modal.querySelector('#modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  if (onConfirm) {
    modal.querySelector('#modal-confirm').addEventListener('click', async () => {
      const btn = modal.querySelector('#modal-confirm');
      btn.disabled = true;
      btn.textContent = 'Aguarde…';
      try { await onConfirm(close); } finally { btn.disabled = false; }
    });
  } else {
    modal.querySelector('#modal-confirm').style.display = 'none';
  }

  modal.querySelector('#modal-cancel').focus();
  return close; // retorna função para fechar programaticamente
}
