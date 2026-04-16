/**
 * historico.js — Histórico de atividades dos documentos do usuário
 *
 * Lê até os 5 documentos mais recentes do usuário e
 * agrega todas as entradas de documentHistory, ordenadas por timestamp.
 */

import { getCurrentUser }          from '../auth.js';
import { isDbAvailable }           from '../db/db.js';
import { listDocumentsByOwner,
         getDocumentHistory }      from '../db/documentRepo.js';
import { renderLoading, renderEmpty,
         renderDbUnavailable,
         renderError, formatDate } from '../ui/components.js';
import { router }                  from '../router.js';

export function renderHistorico() {
  const user = getCurrentUser();
  if (!user) return '<p>Usuário não autenticado.</p>';
  if (!isDbAvailable()) return renderDbUnavailable();

  setTimeout(() => _loadHistorico(user), 0);

  return `
    <div class="view-header">
      <h1>Histórico</h1>
      <p>Registro de atividades nos seus documentos.</p>
    </div>
    <div id="hist-container">${renderLoading('Carregando histórico…')}</div>`;
}

async function _loadHistorico(user) {
  const container = document.getElementById('hist-container');
  if (!container) return;

  try {
    // Busca os documentos do usuário (single read)
    const docs = await listDocumentsByOwner(user.uid);
    if (!docs || docs.length === 0) {
      container.innerHTML = renderEmpty('Nenhuma atividade registrada ainda.');
      return;
    }

    // Limita aos 10 documentos mais recentes para evitar leitura excessiva
    const recent = [...docs]
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 10);

    // Busca histórico de todos em paralelo
    const histArrays = await Promise.all(recent.map(d => getDocumentHistory(d.id)));

    // Mescla e ordena por timestamp decrescente (limita a 50 entradas)
    const docMap = Object.fromEntries(recent.map(d => [d.id, d]));
    const all    = histArrays
      .flat()
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, 50);

    if (all.length === 0) {
      container.innerHTML = renderEmpty('Nenhuma atividade registrada ainda.');
      return;
    }

    _renderHistList(container, all, docMap);
  } catch (err) {
    console.warn('[historico] Erro ao carregar:', err);
    container.innerHTML = renderError('Erro ao carregar o histórico.');
  }
}

function _renderHistList(container, entries, docMap) {
  container.innerHTML = `
    <div class="hist-list">
      ${entries.map(e => {
        const doc = docMap[e.documentId];
        const docTitle = doc ? _esc(doc.title) : `<code>${e.documentId}</code>`;
        return `
          <div class="hist-item">
            <div class="hist-item-action">
              <span class="hist-verb hist-verb-${_esc(e.action)}">${_esc(e.action)}</span>
              <span class="hist-doc-link"
                    data-id="${e.documentId}"
                    title="Ir para o documento">${docTitle}</span>
            </div>
            ${e.detail ? `<p class="hist-detail">${_esc(e.detail)}</p>` : ''}
            <span class="hist-date">${formatDate(e.timestamp)}</span>
          </div>`;
      }).join('')}
    </div>`;

  // Navega ao documento ao clicar no título
  container.querySelectorAll('.hist-doc-link').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => router.navigate(`#/documento?id=${el.dataset.id}`));
  });
}

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

