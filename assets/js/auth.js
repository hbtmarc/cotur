/**
 * auth.js — Camada de autenticação Firebase
 *
 * Exporta funções de alto nível para login, cadastro, logout e
 * escuta de estado. Isola o restante do app da API do Firebase Auth.
 */

import { auth, isFirebaseConfigured } from './firebase.js';

/**
 * Escuta mudanças de estado de autenticação.
 * @param {function} callback - chamado com (user | null)
 * @returns {function} unsubscribe
 */
export function onAuthChanged(callback) {
  if (!isFirebaseConfigured() || !auth) {
    // Modo placeholder: nunca autenticado
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
}

/**
 * Retorna o usuário atual (ou null).
 */
export function getCurrentUser() {
  if (!auth) return null;
  return auth.currentUser;
}

/**
 * Login com e-mail e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase não configurado.');
  return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Cadastro com e-mail e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export async function signUp(email, password) {
  if (!auth) throw new Error('Firebase não configurado.');
  return auth.createUserWithEmailAndPassword(email, password);
}

/**
 * Logout do usuário atual.
 * @returns {Promise<void>}
 */
export async function signOut() {
  if (!auth) return;
  return auth.signOut();
}

/**
 * Traduz códigos de erro do Firebase Auth para PT-BR.
 * @param {string} code
 * @returns {string}
 */
export function authErrorMessage(code) {
  const map = {
    'auth/invalid-email':             'E-mail inválido.',
    'auth/user-disabled':             'Conta desativada. Contate o suporte.',
    'auth/user-not-found':            'Nenhum usuário encontrado com este e-mail.',
    'auth/wrong-password':            'Senha incorreta.',
    'auth/email-already-in-use':      'Este e-mail já está em uso.',
    'auth/weak-password':             'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':         'Muitas tentativas. Aguarde um momento e tente novamente.',
    'auth/network-request-failed':    'Falha de rede. Verifique sua conexão.',
    'auth/invalid-credential':        'Credenciais inválidas. Verifique e-mail e senha.',
  };
  return map[code] ?? 'Ocorreu um erro inesperado. Tente novamente.';
}
