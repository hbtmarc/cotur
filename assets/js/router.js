/**
 * router.js — Hash router simples
 *
 * Uso:
 *   router.register('#/home', renderHome);
 *   router.start();
 */

const routes = {};
let currentRoute = null;

/**
 * Registra uma rota.
 * @param {string}   hash     - e.g. '#/home'
 * @param {Function} handler  - função que retorna HTMLElement ou string HTML
 */
function register(hash, handler) {
  routes[hash] = handler;
}

/** Navega para um hash programaticamente */
function navigate(hash) {
  window.location.hash = hash;
}

/** Resolve a rota atual e injeta no #view-outlet */
async function resolve() {
  const hash    = window.location.hash || '#/login';
  const outlet  = document.getElementById('view-outlet');
  const handler = routes[hash] ?? routes['*'];

  // Atualiza link ativo na topbar
  document.querySelectorAll('.topbar-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });

  if (!outlet) return;

  if (!handler) {
    outlet.innerHTML = `
      <div class="view-header">
        <h1>Página não encontrada</h1>
        <p>A rota <code>${hash}</code> não existe.</p>
      </div>`;
    return;
  }

  currentRoute = hash;
  const result = await handler();

  if (result instanceof HTMLElement) {
    outlet.innerHTML = '';
    outlet.appendChild(result);
  } else if (typeof result === 'string') {
    outlet.innerHTML = result;
  }
}

/** Inicia o roteador escutando eventos de hash */
function start() {
  window.addEventListener('hashchange', resolve);
  resolve(); // resolve rota inicial
}

export const router = { register, navigate, start };
export function currentHash() { return currentRoute; }
