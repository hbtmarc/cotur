/**
 * documentRepo.js — Repositório de documentos, seções e histórico
 *
 * Caminhos RTDB:
 *   documents/{documentId}
 *   documentSections/{documentId}/{sectionId}
 *   documentHistory/{documentId}/{historyId}
 *
 * Modelo — documento:
 * {
 *   id:          string  (push key),
 *   ownerUid:    string,
 *   title:       string,
 *   description: string,
 *   status:      'rascunho' | 'em_revisao' | 'publicado' | 'arquivado',
 *   createdAt:   number,
 *   updatedAt:   number
 * }
 *
 * Modelo — seção:
 * {
 *   id:        string  (push key),
 *   documentId: string,
 *   title:     string,
 *   body:      string,
 *   order:     number,
 *   createdAt: number,
 *   updatedAt: number
 * }
 *
 * Modelo — registro de histórico:
 * {
 *   id:         string  (push key),
 *   documentId: string,
 *   uid:        string,
 *   action:     string,   // e.g. 'criou', 'editou', 'publicou', 'arquivou'
 *   detail:     string,   // descrição legível opcional
 *   timestamp:  number
 * }
 */

import {
  dbGet, dbSet, dbUpdate, dbPush, dbOnValue,
  serverTimestamp, isDbAvailable
} from './db.js';

// ──────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cria um novo documento.
 * @param {string} ownerUid
 * @param {{ title: string, description?: string }} data
 * @returns {Promise<string>}  ID do documento criado
 */
export async function createDocument(ownerUid, { title, description = '' }) {
  if (!isDbAvailable()) throw new Error('[RTDB] indisponível.');

  const id = await dbPush('documents', {
    ownerUid,
    title,
    description,
    status:    'rascunho',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Corrige o campo id após push (o Firebase não armazena a key automaticamente)
  await dbUpdate(`documents/${id}`, { id });

  await addHistoryEntry(id, ownerUid, 'criou', `Documento "${title}" criado.`);

  return id;
}

/**
 * Lê um único documento.
 * @param {string} documentId
 * @returns {Promise<object|null>}
 */
export async function getDocument(documentId) {
  if (!isDbAvailable()) return null;
  try {
    return await dbGet(`documents/${documentId}`);
  } catch (err) {
    console.warn('[documentRepo] Erro ao ler documento:', err.message);
    return null;
  }
}

/**
 * Lista documentos de um usuário (leitura única).
 * Nota: em Step 4 isso será substituído por query com orderByChild.
 * @param {string} ownerUid
 * @returns {Promise<object[]>}
 */
export async function listDocumentsByOwner(ownerUid) {
  if (!isDbAvailable()) return [];
  try {
    const snap = await firebase.database().ref('documents')
      .orderByChild('ownerUid').equalTo(ownerUid).once('value');
    const val = snap.val();
    if (!val) return [];
    return Object.values(val);
  } catch (err) {
    console.warn('[documentRepo] Erro ao listar documentos:', err.message);
    return [];
  }
}

/**
 * Atualiza campos de um documento.
 * @param {string} documentId
 * @param {string} uid           usuário que fez a alteração (para histórico)
 * @param {object} updates       campos a atualizar
 * @param {string} [historyNote] descrição opcional para o registro de histórico
 */
export async function updateDocument(documentId, uid, updates, historyNote = '') {
  if (!isDbAvailable()) return;
  try {
    await dbUpdate(`documents/${documentId}`, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    const action = updates.status ? updates.status : 'editou';
    const detail = historyNote || `Campo(s) alterado(s).`;
    await addHistoryEntry(documentId, uid, action, detail);
  } catch (err) {
    console.warn('[documentRepo] Erro ao atualizar documento:', err.message);
  }
}

/**
 * Escuta documentos de um usuário em tempo real.
 * @param {string}   ownerUid
 * @param {function} callback  — chamado com object[] de documentos
 * @returns {function} unsubscribe
 */
export function listenDocumentsByOwner(ownerUid, callback) {
  if (!isDbAvailable()) { callback([]); return () => {}; }

  const ref = firebase.database().ref('documents')
    .orderByChild('ownerUid').equalTo(ownerUid);

  const handler = (snap) => {
    const val = snap.val();
    callback(val ? Object.values(val) : []);
  };

  ref.on('value', handler);
  return () => ref.off('value', handler);
}

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÕES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Adiciona uma seção a um documento.
 * @param {string} documentId
 * @param {{ title: string, body?: string, order?: number }} data
 * @returns {Promise<string>} ID da seção
 */
export async function addSection(documentId, { title, body = '', order = 0 }) {
  if (!isDbAvailable()) throw new Error('[RTDB] indisponível.');

  const id = await dbPush(`documentSections/${documentId}`, {
    documentId,
    title,
    body,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await dbUpdate(`documentSections/${documentId}/${id}`, { id });
  return id;
}

/**
 * Lê todas as seções de um documento (leitura única).
 * @param {string} documentId
 * @returns {Promise<object[]>} ordenadas por `order`
 */
export async function getSections(documentId) {
  if (!isDbAvailable()) return [];
  try {
    const val = await dbGet(`documentSections/${documentId}`);
    if (!val) return [];
    return Object.values(val).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.warn('[documentRepo] Erro ao ler seções:', err.message);
    return [];
  }
}

/**
 * Atualiza campos de uma seção.
 * @param {string} documentId
 * @param {string} sectionId
 * @param {object} updates
 */
export async function updateSection(documentId, sectionId, updates) {
  if (!isDbAvailable()) return;
  try {
    await dbUpdate(`documentSections/${documentId}/${sectionId}`, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[documentRepo] Erro ao atualizar seção:', err.message);
  }
}

/**
 * Remove uma seção e todos os seus blocos.
 * @param {string} documentId
 * @param {string} sectionId
 * @param {string} uid         — para o registro de histórico
 */
export async function deleteSection(documentId, sectionId, uid) {
  if (!isDbAvailable()) return;
  try {
    // Remove seção e blocos simultaneamente com multi-path update
    await firebase.database().ref().update({
      [`documentSections/${documentId}/${sectionId}`]: null,
      [`documentBlocks/${documentId}/${sectionId}`]:   null,
    });
    await addHistoryEntry(documentId, uid, 'excluiu seção', `Seção ${sectionId} removida.`);
  } catch (err) {
    console.warn('[documentRepo] Erro ao excluir seção:', err.message);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// BLOCOS
//
// Caminho: documentBlocks/{documentId}/{sectionId}/{blockId}
//
// Modelo:
// {
//   id:         string  (push key),
//   sectionId:  string,
//   documentId: string,
//   type:       'texto' | 'destaque' | 'lista',
//   content:    string,   // texto / destaque
//   items:      string,   // lista — itens separados por \n
//   order:      number,
//   createdAt:  number,
//   updatedAt:  number
// }
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cria um bloco de conteúdo em uma seção.
 * @param {string} documentId
 * @param {string} sectionId
 * @param {{ type: string, content?: string, items?: string, order?: number }} data
 * @returns {Promise<string>} ID do bloco
 */
export async function createBlock(documentId, sectionId, { type, content = '', items = '', order = 0 }) {
  if (!isDbAvailable()) throw new Error('[RTDB] indisponível.');

  const id = await dbPush(`documentBlocks/${documentId}/${sectionId}`, {
    documentId,
    sectionId,
    type,
    content,
    items,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await dbUpdate(`documentBlocks/${documentId}/${sectionId}/${id}`, { id });
  return id;
}

/**
 * Lê todos os blocos de uma seção (leitura única), ordenados por `order`.
 * @param {string} documentId
 * @param {string} sectionId
 * @returns {Promise<object[]>}
 */
export async function getBlocks(documentId, sectionId) {
  if (!isDbAvailable()) return [];
  try {
    const val = await dbGet(`documentBlocks/${documentId}/${sectionId}`);
    if (!val) return [];
    return Object.values(val).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.warn('[documentRepo] Erro ao ler blocos:', err.message);
    return [];
  }
}

/**
 * Atualiza campos de um bloco.
 * @param {string} documentId
 * @param {string} sectionId
 * @param {string} blockId
 * @param {object} updates
 */
export async function updateBlock(documentId, sectionId, blockId, updates) {
  if (!isDbAvailable()) return;
  try {
    await dbUpdate(`documentBlocks/${documentId}/${sectionId}/${blockId}`, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[documentRepo] Erro ao atualizar bloco:', err.message);
    throw err;
  }
}

/**
 * Remove um bloco.
 * @param {string} documentId
 * @param {string} sectionId
 * @param {string} blockId
 */
export async function deleteBlock(documentId, sectionId, blockId) {
  if (!isDbAvailable()) return;
  try {
    await dbSet(`documentBlocks/${documentId}/${sectionId}/${blockId}`, null);
  } catch (err) {
    console.warn('[documentRepo] Erro ao excluir bloco:', err.message);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// HISTÓRICO
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Registra uma entrada de histórico para um documento.
 * Chamado internamente por createDocument e updateDocument.
 *
 * @param {string} documentId
 * @param {string} uid
 * @param {string} action   — verbo curto: 'criou', 'editou', 'publicou'…
 * @param {string} detail   — descrição legível
 * @returns {Promise<string>} ID do registro
 */
export async function addHistoryEntry(documentId, uid, action, detail = '') {
  if (!isDbAvailable()) return null;
  try {
    const id = await dbPush(`documentHistory/${documentId}`, {
      documentId,
      uid,
      action,
      detail,
      timestamp: serverTimestamp(),
    });
    await dbUpdate(`documentHistory/${documentId}/${id}`, { id });
    return id;
  } catch (err) {
    console.warn('[documentRepo] Erro ao registrar histórico:', err.message);
    return null;
  }
}

/**
 * Lê o histórico completo de um documento (leitura única).
 * @param {string} documentId
 * @returns {Promise<object[]>} ordenado do mais recente ao mais antigo
 */
export async function getDocumentHistory(documentId) {
  if (!isDbAvailable()) return [];
  try {
    const val = await dbGet(`documentHistory/${documentId}`);
    if (!val) return [];
    return Object.values(val).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  } catch (err) {
    console.warn('[documentRepo] Erro ao ler histórico:', err.message);
    return [];
  }
}
