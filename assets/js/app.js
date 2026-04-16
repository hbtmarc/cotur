/**
 * app.js — Bootstrap da aplicação
 *
 * Responsabilidades:
 *  - Verificar configuração do Firebase
 *  - Iniciar escuta de estado de autenticação
 *  - Registrar rotas com guardas
 *  - Atualizar shell com dados do usuário autenticado
 *  - Controlar visibilidade do topbar vs. tela de login
 */

import { router, setGuardFn, registerLeave } from './router.js';
import { isFirebaseConfigured }              from './firebase.js';
import { onAuthChanged, signOut }            from './auth.js';
import { ensureUserProfile }                 from './db/userRepo.js';

import { renderLogin }                         from './views/login.js';
import { renderHome }                          from './views/home.js';
import { renderDocumentos, destroyDocumentos } from './views/documentos.js';
import { renderDocumento }                     from './views/documento.js';
import { renderHistorico }                     from './views/historico.js';
import { renderViewer }                        from './views/viewer.js';

// ── Referências DOM ──────────────────────────────────────────────────────────
const shell         = document.getElementById('app-shell');
const configWarning = document.getElementById('config-warning');
const userNameEl    = document.getElementById('user-name');
const btnLogout     = document.getElementById('btn-logout');

// ── Rotas protegidas ─────────────────────────────────────────────────────────
const GUEST_ONLY = new Set(['#/login']);
const AUTH_ONLY  = new Set(['#/home', '#/documentos', '#/documento', '#/historico']);

// ── Estado de autenticação (atualizado pelo onAuthChanged) ───────────────────
let currentUser = null;
let routerStarted = false;

// ── Modo configuração ────────────────────────────────────────────────────────
if (!isFirebaseConfigured()) {
  configWarning.classList.remove('hidden');
}

// ── Controle de shell (login oculta o topbar) ────────────────────────────────
function showShell(withTopbar = true) {
  shell.classList.remove('hidden');
  const topbar = shell.querySelector('.topbar');
  const outlet = document.getElementById('view-outlet');
  if (topbar) topbar.style.display = withTopbar ? '' : 'none';
  if (outlet) outlet.classList.toggle('outlet-full', !withTopbar);
}

// ── Atualiza info do usuário no topbar ───────────────────────────────────────
function updateShellUser(user) {
  if (user) {
    const display = user.displayName || user.email || '';
    userNameEl.textContent = display;
    btnLogout.classList.remove('hidden');
  } else {
    userNameEl.textContent = '';
    btnLogout.classList.add('hidden');
  }
}

// ── Guarda de rota ───────────────────────────────────────────────────────────
setGuardFn((hash) => {
  // Normaliza: ignora query string para comparação da guarda
  const base = hash.split('?')[0];

  if (AUTH_ONLY.has(base) && !currentUser) return '#/login';
  if (GUEST_ONLY.has(base) && currentUser)  return '#/home';
  return null; // permitido
});

// ── Logout ───────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', async () => {
  btnLogout.disabled = true;
  btnLogout.textContent = 'Saindo…';
  try {
    await signOut();
    // onAuthChanged vai disparar e o roteador vai redirecionar
  } catch (err) {
    console.error('[Auth] Erro ao sair:', err);
    btnLogout.disabled = false;
    btnLogout.textContent = 'Sair';
  }
});

// ── Rotas ────────────────────────────────────────────────────────────────────
router.register('#/login', () => {
  showShell(false);
  return renderLogin();
});

router.register('#/home', () => {
  showShell(true);
  return renderHome();
});

router.register('#/documentos', () => {
  showShell(true);
  return renderDocumentos();
});

registerLeave('#/documentos', destroyDocumentos);

router.register('#/documento', () => {
  showShell(true);
  return renderDocumento();
});

router.register('#/historico', () => {
  showShell(true);
  return renderHistorico();
});

router.register('#/viewer', () => {
  showShell(false);
  return renderViewer();
});

// Rota padrão — redireciona para login
router.register('*', () => {
  router.navigate('#/login');
});

// ── Inicialização via onAuthStateChanged ─────────────────────────────────────
onAuthChanged((user) => {
  currentUser = user;
  updateShellUser(user);

  // Garante registro de perfil no RTDB na primeira autenticação
  if (user) ensureUserProfile(user);

  if (!routerStarted) {
    // Primeira chamada: inicia o roteador agora que o estado auth é conhecido
    routerStarted = true;
    router.start();
  } else {
    // Mudança posterior (login/logout): re-resolve a rota atual
    const hash = window.location.hash || '#/login';
    const base = hash.split('?')[0];

    if (user && GUEST_ONLY.has(base)) {
      router.navigate('#/home');
    } else if (!user && AUTH_ONLY.has(base)) {
      router.navigate('#/login');
    } else {
      // Re-renderiza a view atual (ex.: atualiza nome após signup)
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }
});

