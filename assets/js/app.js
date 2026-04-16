/**
 * app.js — Bootstrap da aplicação
 *
 * Responsabilidades:
 *  - Verificar configuração do Firebase
 *  - Registrar rotas
 *  - Iniciar o roteador
 *  - Controlar visibilidade do shell vs. tela de login
 */

import { router }             from './router.js';
import { isFirebaseConfigured } from './firebase.js';

import { renderLogin }      from './views/login.js';
import { renderHome }       from './views/home.js';
import { renderDocumentos } from './views/documentos.js';
import { renderDocumento }  from './views/documento.js';
import { renderHistorico }  from './views/historico.js';

// ── Referências DOM ──────────────────────────────────────────────────────────
const shell         = document.getElementById('app-shell');
const configWarning = document.getElementById('config-warning');

// ── Modo configuração ────────────────────────────────────────────────────────
if (!isFirebaseConfigured()) {
  configWarning.classList.remove('hidden');
}

// ── Controle de shell (login oculta o topbar) ────────────────────────────────
function showShell(withTopbar = true) {
  shell.classList.remove('hidden');
  const topbar = shell.querySelector('.topbar');
  if (topbar) topbar.style.display = withTopbar ? '' : 'none';
}

// ── Rotas ────────────────────────────────────────────────────────────────────
router.register('#/login', () => {
  showShell(false); // login sem topbar
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

router.register('#/documento', () => {
  showShell(true);
  return renderDocumento();
});

router.register('#/historico', () => {
  showShell(true);
  return renderHistorico();
});

// Rota padrão — redireciona para login
router.register('*', () => {
  router.navigate('#/login');
});

// ── Iniciar ──────────────────────────────────────────────────────────────────
router.start();
