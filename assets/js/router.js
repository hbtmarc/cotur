/**
 * router.js — Hash router simples
 *
 * Uso:
 *   router.register('#/home', renderHome);
 *   router.start();
 */

const routes    = {};
const leaveHooks  = {}; // hash → cleanup function
let currentRoute  = null;
let _guardFn      = null;

/**
 * Registra uma função chamada ao SAIR de uma rota.
 * @param {string}   hash
 * @param {function} fn
 */
export function registerLeave(hash, fn) {
  leaveHooks[hash] = fn;
}

/**
 * Registra uma função de guarda.
 * Chamada antes de cada resolução de rota.
 * Deve retornar null (permitir) ou uma string hash (redirecionar).
 * @param {function} fn
 */
export function setGuardFn(fn) {
  _guardFn = fn;
}

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
  const hash = window.location.hash || '#/login';
  const base = hash.split('?')[0];

  // Chama hook de saída da rota anterior
  if (currentRoute && leaveHooks[currentRoute]) {
    try { leaveHooks[currentRoute](); } catch (_) {}
  }
  const outlet  = document.getElementById('view-outlet');
  const handler = routes[base] ?? routes['*'];

  // Atualiza link ativo na topbar
  document.querySelectorAll('.topbar-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === base);
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

  // Aplica guarda de rota
  if (_guardFn) {
    const redirect = _guardFn(hash);
    if (redirect && redirect !== hash) {
      window.location.hash = redirect;
      return;
    }
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
