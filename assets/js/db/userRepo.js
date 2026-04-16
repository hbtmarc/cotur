/**
 * userRepo.js — Repositório de perfis de usuário
 *
 * Caminho RTDB:  users/{uid}
 *
 * Estrutura do nó:
 * {
 *   uid:         string,
 *   email:       string,
 *   displayName: string | null,
 *   createdAt:   number  (timestamp servidor),
 *   updatedAt:   number  (timestamp servidor)
 * }
 */

import { dbGet, dbSet, dbUpdate, serverTimestamp, isDbAvailable } from './db.js';

const PATH = (uid) => `users/${uid}`;

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Garante que o perfil do usuário existe no RTDB.
 * Se já existir, não sobrescreve. Se não, cria pelo modelo mínimo.
 *
 * Chamado logo após onAuthStateChanged detectar um usuário.
 *
 * @param {firebase.User} user
 */
export async function ensureUserProfile(user) {
  if (!isDbAvailable() || !user) return;

  try {
    const existing = await dbGet(PATH(user.uid));

    if (!existing) {
      // Cria o perfil pela primeira vez
      await dbSet(PATH(user.uid), {
        uid:         user.uid,
        email:       user.email ?? '',
        displayName: user.displayName ?? null,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      console.info('[userRepo] Perfil criado para:', user.email);
    } else if (user.displayName && existing.displayName !== user.displayName) {
      // Mantém displayName sincronizado se foi atualizado no Auth
      await dbUpdate(PATH(user.uid), {
        displayName: user.displayName,
        updatedAt:   serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[userRepo] Erro ao garantir perfil:', err.message);
  }
}

/**
 * Lê o perfil de um usuário.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (!isDbAvailable()) return null;
  try {
    return await dbGet(PATH(uid));
  } catch (err) {
    console.warn('[userRepo] Erro ao ler perfil:', err.message);
    return null;
  }
}

/**
 * Atualiza campos do perfil do usuário.
 * Apenas os campos informados em `updates` são alterados.
 *
 * @param {string} uid
 * @param {object} updates  — e.g. { displayName: 'Novo Nome' }
 */
export async function updateUserProfile(uid, updates) {
  if (!isDbAvailable()) return;
  try {
    return await dbUpdate(PATH(uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[userRepo] Erro ao atualizar perfil:', err.message);
  }
}
