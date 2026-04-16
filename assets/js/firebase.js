/**
 * firebase.js — Camada de configuração Firebase
 *
 * Substitua os valores em firebaseConfig com os dados do seu projeto.
 * Enquanto não configurado, o app roda em "modo placeholder" sem travar.
 */

  const firebaseConfig = {
    apiKey: "AIzaSyAuZ_RWLLn26CqUy3zpyz75_IuQSVQti2k",
    authDomain: "projectshub-marc35.firebaseapp.com",
    databaseURL: "https://projectshub-marc35-default-rtdb.firebaseio.com",
    projectId: "projectshub-marc35",
    storageBucket: "projectshub-marc35.firebasestorage.app",
    messagingSenderId: "949883815683",
    appId: "1:949883815683:web:3b2287d1f19da19fb34b36",
    measurementId: "G-B0WP1DLTQ8"
  };

/** Retorna true se a config mínima estiver preenchida */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId
  );
}

/** Instância firebase.app (ou null em modo placeholder) */
let _app  = null;
let _auth = null;
let _db   = null;

if (isFirebaseConfigured()) {
  try {
    _app  = firebase.initializeApp(firebaseConfig);
    _auth = firebase.auth();
    _db   = firebase.database();
  } catch (err) {
    console.warn("[Firebase] Erro ao inicializar:", err.message);
  }
} else {
  console.info("[Firebase] Modo placeholder — configure firebaseConfig em assets/js/firebase.js");
}

export const auth = _auth;
export const db   = _db;
