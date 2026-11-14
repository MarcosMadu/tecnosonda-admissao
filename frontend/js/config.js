/* ================== CONFIGURAÇÃO DE AMBIENTE ==================
 * Define a origem (host) do backend que o frontend deve chamar.
 *
 * - Em desenvolvimento local (ou quando o próprio backend serve as
 *   páginas), as chamadas são feitas na mesma origem (string vazia).
 * - Em produção, o frontend fica na Vercel e o backend no Render,
 *   então apontamos para a URL pública do Render.
 *
 * Para trocar o backend de produção, altere apenas PROD_API_ORIGIN
 * (ou defina window.API_ORIGIN antes de carregar este arquivo).
 * ============================================================== */
(function () {
  // URL pública do backend no Render (sem barra no final).
  var PROD_API_ORIGIN = 'https://tecnosonda-admissao.onrender.com';

  var host = window.location.hostname;
  var isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '';

  // Permite sobrescrever manualmente (ex.: testes) via window.API_ORIGIN.
  if (typeof window.API_ORIGIN !== 'string') {
    window.API_ORIGIN = isLocal ? '' : PROD_API_ORIGIN;
  }

  // Helper global: monta a URL absoluta de um caminho da API/backend.
  window.apiUrl = function (path) {
    return (window.API_ORIGIN || '') + (path || '');
  };
})();
