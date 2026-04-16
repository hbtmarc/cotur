/**
 * login.js — View de autenticação
 *
 * Suporta dois modos: entrar (login) e cadastrar (signup).
 * Importa as funções de auth e isFirebaseConfigured para controle graceful.
 */

import { signIn, signUp, authErrorMessage } from '../auth.js';
import { isFirebaseConfigured }             from '../firebase.js';

export function renderLogin() {
  const configured = isFirebaseConfigured();

  const html = `
    <div class="login-wrapper">
      <div class="login-box">
        <div class="login-logo">Cotur</div>

        ${!configured ? `
          <div class="auth-notice">
            ⚙️ Modo configuração — autenticação indisponível.
          </div>` : ''}

        <div class="login-tabs" role="tablist">
          <button class="login-tab active" data-tab="login" role="tab">Entrar</button>
          <button class="login-tab"        data-tab="signup" role="tab">Cadastrar</button>
        </div>

        <form id="auth-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="auth-email">E-mail</label>
            <input id="auth-email" type="email" placeholder="seu@email.com"
                   autocomplete="email" required ${!configured ? 'disabled' : ''} />
          </div>

          <div class="form-group">
            <label for="auth-password">Senha</label>
            <input id="auth-password" type="password" placeholder="••••••••"
                   autocomplete="current-password" required ${!configured ? 'disabled' : ''} />
          </div>

          <p id="auth-error" class="auth-error hidden"></p>

          <button type="submit" id="auth-submit" class="btn-primary"
                  ${!configured ? 'disabled' : ''}>
            Entrar
          </button>
        </form>
      </div>
    </div>`;

  // Cria elemento para poder adicionar listeners após injeção
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  if (!configured) return wrapper.innerHTML;

  // ── Montar após a view ser inserida no DOM ──
  // Usa setTimeout 0 para garantir que o outlet já recebeu o HTML
  setTimeout(() => _bindLoginEvents(), 0);

  return html;
}

/** Vincula eventos ao formulário após renderização */
function _bindLoginEvents() {
  const form     = document.getElementById('auth-form');
  const tabs     = document.querySelectorAll('.login-tab');
  const submitEl = document.getElementById('auth-submit');
  const errorEl  = document.getElementById('auth-error');
  const emailEl  = document.getElementById('auth-email');
  const passEl   = document.getElementById('auth-password');

  if (!form) return;

  let mode = 'login'; // 'login' | 'signup'

  // Troca de aba
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.tab;

      // Atualiza rótulo do botão e autocomplete da senha
      submitEl.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
      passEl.autocomplete  = mode === 'login' ? 'current-password' : 'new-password';

      _clearError(errorEl);
    });
  });

  // Envio do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _clearError(errorEl);

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      _showError(errorEl, 'Preencha e-mail e senha.');
      return;
    }

    _setLoading(submitEl, true, mode);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // onAuthStateChanged no app.js cuidará do redirecionamento
    } catch (err) {
      _showError(errorEl, authErrorMessage(err.code));
    } finally {
      _setLoading(submitEl, false, mode);
    }
  });
}

function _showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function _clearError(el) {
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

function _setLoading(btn, loading, mode) {
  btn.disabled = loading;
  if (loading) {
    btn.textContent = mode === 'login' ? 'Entrando…' : 'Criando conta…';
  } else {
    btn.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  }
}

