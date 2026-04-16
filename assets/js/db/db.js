/**
 * db.js — Camada base de acesso ao Realtime Database
 *
 * Encapsula todas as referências ao firebase.database().
 * Se o RTDB não estiver disponível, cada função falha de forma segura.
 */

import { db } from '../firebase.js';

// ── Utilitários internos ─────────────────────────────────────────────────────

function _ref(path) {
  if (!db) throw new Error('[RTDB] Banco de dados não disponível.');
  return db.ref(path);
}

// ── Leitura única (get) ──────────────────────────────────────────────────────

/**
 * Lê uma vez o valor em `path`.
 * @param {string} path
 * @returns {Promise<any>} valor já desempacotado (ou null)
 */
export async function dbGet(path) {
  const snap = await _ref(path).once('value');
  return snap.val();
}

// ── Escrita absoluta (set) ───────────────────────────────────────────────────

/**
 * Grava/sobrescreve completamente o nó em `path`.
 * @param {string} path
 * @param {object} data
 */
export async function dbSet(path, data) {
  return _ref(path).set(data);
}

// ── Escrita parcial (update) ─────────────────────────────────────────────────

/**
 * Atualiza apenas os campos informados em `path`.
 * @param {string} path
 * @param {object} updates  — objeto com os campos a atualizar
 */
export async function dbUpdate(path, updates) {
  return _ref(path).update(updates);
}

// ── Push (novo nó com ID gerado pelo Firebase) ───────────────────────────────

/**
 * Cria um filho com ID auto-gerado (push) em `path`.
 * @param {string} path
 * @param {object} data
 * @returns {Promise<string>} chave gerada (push key)
 */
export async function dbPush(path, data) {
  const ref = await _ref(path).push(data);
  return ref.key;
}

// ── Listener em tempo real ───────────────────────────────────────────────────

/**
 * Escuta mudanças em `path` em tempo real.
 * @param {string}   path
 * @param {function} callback  — chamado com o valor atual (já desempacotado)
 * @returns {function} unsubscribe
 */
export function dbOnValue(path, callback) {
  if (!db) {
    callback(null);
    return () => {};
  }
  const ref = db.ref(path);
  const handler = (snap) => callback(snap.val());
  ref.on('value', handler);
  return () => ref.off('value', handler);
}

// ── Timestamp servidor ───────────────────────────────────────────────────────

/**
 * Retorna o marcador de timestamp do servidor Firebase.
 * Use como valor de campo para createdAt / updatedAt.
 */
export function serverTimestamp() {
  return firebase.database.ServerValue.TIMESTAMP;
}

// ── Disponibilidade ──────────────────────────────────────────────────────────

export function isDbAvailable() {
  return db !== null;
}
