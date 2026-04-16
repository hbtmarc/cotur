/** view: documento.js — exibe um único documento (rota #/documento?id=...) */
export function renderDocumento() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id     = params.get('id') ?? '—';
  return `
    <div class="view-header">
      <h1>Documento <span class="placeholder-badge">placeholder</span></h1>
      <p>Visualizando ID: <code>${id}</code></p>
    </div>
    <div class="card">
      <p style="color:var(--color-muted);font-size:.875rem">
        Detalhes e ações do documento serão implementados na Etapa 2.
      </p>
    </div>`;
}
