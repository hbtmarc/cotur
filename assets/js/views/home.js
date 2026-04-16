/** view: home.js */
import { isDbAvailable } from '../db/db.js';

export function renderHome() {
  const dbStatus = isDbAvailable()
    ? `<span style="color:#1e8e3e">● Banco de dados conectado</span>`
    : `<span style="color:#d93025">● Banco de dados indisponível</span>`;

  return `
    <div class="view-header">
      <h1>Início</h1>
      <p>Bem-vindo ao Cotur. Selecione uma seção no menu acima.</p>
    </div>
    <div class="card">
      <p style="font-size:.825rem;color:var(--color-muted);margin-bottom:8px">
        Status: ${dbStatus}
      </p>
      <p style="color:var(--color-muted);font-size:.875rem">
        Conteúdo da tela inicial será implementado na Etapa 4.
      </p>
    </div>`;
}
