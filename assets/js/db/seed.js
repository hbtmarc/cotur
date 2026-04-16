/**
 * seed.js — Utilitário de seed para validação em desenvolvimento
 *
 * NÃO inclua este módulo em produção via import automático.
 * Ative manualmente no console do navegador:
 *
 *   import('/assets/js/db/seed.js').then(m => m.runSeed(firebase.auth().currentUser))
 *
 * ou via DevTools snippet.
 */

import { ensureUserProfile }                    from './userRepo.js';
import { createDocument, addSection, getDocument, getSections, getDocumentHistory } from './documentRepo.js';

/**
 * Executa o seed de desenvolvimento.
 * Cria um documento de exemplo com duas seções e verifica o histórico.
 *
 * @param {firebase.User} user — usuário autenticado
 */
export async function runSeed(user) {
  if (!user) {
    console.warn('[Seed] Nenhum usuário autenticado. Faça login antes de rodar o seed.');
    return;
  }

  console.group('[Seed] Iniciando seed de desenvolvimento…');

  // 1) Garante perfil
  await ensureUserProfile(user);
  console.info('[Seed] ✓ Perfil garantido para:', user.email);

  // 2) Cria documento de exemplo
  const docId = await createDocument(user.uid, {
    title:       'Documento de Exemplo',
    description: 'Criado automaticamente pelo seed de desenvolvimento.',
  });
  console.info('[Seed] ✓ Documento criado — ID:', docId);

  // 3) Adiciona seções
  await addSection(docId, {
    title: 'Introdução',
    body:  'Esta é a seção de introdução do documento.',
    order: 0,
  });
  await addSection(docId, {
    title: 'Desenvolvimento',
    body:  'Conteúdo principal do documento.',
    order: 1,
  });
  console.info('[Seed] ✓ Seções criadas.');

  // 4) Lê e exibe resultado
  const doc      = await getDocument(docId);
  const sections = await getSections(docId);
  const history  = await getDocumentHistory(docId);

  console.info('[Seed] Documento lido:', doc);
  console.info('[Seed] Seções lidas:', sections);
  console.info('[Seed] Histórico:', history);
  console.info('[Seed] ✓ Seed concluído com sucesso.');
  console.groupEnd();

  return { docId, doc, sections, history };
}
