# Entrega — Alterações + Migração Frontend (Vercel) / Backend (Render)

Projeto **Tecnosonda – Auto Admissão Digital**. As alterações foram feitas sobre a
estrutura existente, sem recriar o sistema e sem tocar em funcionalidades fora do escopo.

---

## 1. O que foi alterado (resumo)

### Etapa 1 — Dados do recém-contratado
- Removidos do formulário do colaborador: **CPF** e **Data de nascimento**.
- Adicionados (obrigatórios): **Tamanho do uniforme** e **Tamanho da bota** — campos de
  texto livre, sem tabela de numeração fixa.
- Seção "Dados Pessoais" agora: Nome completo, Função, Tamanho do uniforme, Tamanho da bota.
- Salvamento automático, validação de obrigatórios, barra de progresso e resumo pós-envio
  atualizados para os novos campos.
- Backend: `Employee` passou a armazenar `tamanhoUniforme` e `tamanhoBota`. O envio final
  (`submit`) **não exige mais** CPF nem data de nascimento.
- **Dados históricos preservados**: os campos `cpf` e `dataNascimento` continuam no schema
  (marcados como legados) e não são apagados. Ao reabrir/reacessar, os tamanhos já salvos
  reaparecem.

### Etapa 2 — CPF/CIN deixa de ser documento obrigatório
- `cpf_cin` removido da lista de documentos obrigatórios (agora **10 obrigatórios**).
- Não é mais solicitado no formulário nem aceito como novo upload.
- Progresso e validação de envio recalculados.
- **Preservação**: documentos CPF/CIN já enviados continuam no MongoDB e no Cloudinary.
  No painel RH aparecem em **"Outros documentos (histórico)"**, com download e exclusão,
  sem causar erro na tela de detalhes.

### Etapa 3 — Coluna "Função" no dashboard
- Nova coluna **Função** na tabela (entre Contrato e Responsável), lida de `employee.funcao`.
- Sem informação → **"Não informado"**. Filtros, busca, estatísticas e ações preservados.
- `colspan` das linhas de carregamento/erro/vazio ajustado de 7 para 8.
- A API administrativa (`GET /api/admin/employees`) já retorna `funcao`.

### Etapa 4 — Migração Frontend → Vercel / Backend → Render
- **URL-base da API centralizada** em `frontend/js/config.js` (`window.API_ORIGIN` + `apiUrl()`).
  - Local (ou backend servindo as páginas): mesma origem.
  - Produção: aponta para `https://tecnosonda-admissao.onrender.com`.
- Todas as chamadas `fetch`/upload/download passaram a usar essa base (não há mais `/api`
  relativo ao domínio da Vercel).
- `frontend/vercel.json` com rewrites das rotas: `/`, `/admin/login`, `/admin/dashboard`,
  `/admin/talentos`, `/admissao/:token`, `/vagas`.
- **CORS** no backend reescrito para allowlist: `localhost`, qualquer `*.vercel.app`
  (produção + previews) e origens extras via `CORS_ORIGINS`. Não libera qualquer origem.
- `APP_URL` passa a apontar para o frontend na Vercel (links de admissão gerados pelo RH).

---

## 2. Arquivos modificados / criados

**Backend**
- `backend/server.js` — CORS com allowlist (Vercel + local + `CORS_ORIGINS`).
- `backend/models/Employee.js` — `tamanhoUniforme`, `tamanhoBota`; `cpf`/`dataNascimento` legados.
- `backend/controllers/employeeController.js` — `savePersonalData`, `getByToken`, `submit`.
- `backend/services/documentsCatalog.js` — `cpf_cin` fora dos obrigatórios + rótulos legados.

**Frontend**
- `frontend/js/config.js` — **novo**: origem da API e helper `apiUrl()`.
- `frontend/js/utils.js` — `API_BASE` usa a origem configurada.
- `frontend/js/admission.js` — campos uniforme/bota, progresso, resumo, chamada via `apiUrl`.
- `frontend/js/dashboard.js` — coluna Função, `colspan`, tamanhos no detalhe, seção histórico, download via `apiUrl`.
- `frontend/js/talentos.js` — download de currículo via `apiUrl`.
- `frontend/pages/admin-dashboard.html` — cabeçalho da coluna Função + `colspan`.
- `frontend/pages/*.html` (6 páginas) — carregam `config.js` antes de `utils.js`.
- `frontend/vercel.json` — **novo**: rewrites das rotas.

**Config**
- `.env.example` — **novo**: variáveis documentadas (inclui `APP_URL` e `CORS_ORIGINS`).

---

## 3. Variáveis de ambiente

### Render (backend) — conferir/atualizar
| Variável | Ação |
|---|---|
| `MONGO_URI` | Manter (mesmo cluster/base — não recriar) |
| `JWT_SECRET` | Manter |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Manter |
| `APP_URL` | **Atualizar** para a URL do frontend na Vercel (ex.: `https://tecnosonda-admissao.vercel.app`) |
| `CORS_ORIGINS` | Opcional — só se usar domínio próprio do frontend |

> `*.vercel.app` já é aceito pelo CORS automaticamente; `CORS_ORIGINS` é necessário apenas
> para um domínio personalizado (ex.: `https://admissao.tecnosonda.com.br`).

### Vercel (frontend)
- Não há segredos no frontend. **Nenhuma** credencial de Mongo/Cloudinary/JWT vai para a Vercel.
- Se o domínio final do backend mudar, ajuste `PROD_API_ORIGIN` em `frontend/js/config.js`.

---

## 4. Como publicar na Vercel

1. Conecte o repositório do GitHub na Vercel.
2. Em **Project Settings → Root Directory**, selecione **`frontend`**.
3. **Framework Preset:** `Other`. **Build Command:** vazio. **Output Directory:** vazio
   (projeto 100% estático — não há build).
4. O `frontend/vercel.json` cuida das rotas amigáveis e do acesso direto às páginas
   (inclusive ao atualizar no navegador).
5. Deploy. Anote a URL final (ex.: `https://tecnosonda-admissao.vercel.app`).

## 5. Ajustes no Render após publicar na Vercel

1. Defina `APP_URL` com a URL da Vercel e faça redeploy do backend.
2. (Opcional) Defina `CORS_ORIGINS` se houver domínio próprio do frontend.
3. O backend continua servindo a API, uploads/downloads, JWT, Mongo e Cloudinary — sem mudança.

**Endereço final esperado**
- Frontend (Vercel): `https://SEU-FRONTEND.vercel.app`
- Backend (Render): `https://tecnosonda-admissao.onrender.com`

---

## 6. Testes

**Executados aqui (estáticos/lógicos):**
- `node --check` em todos os arquivos JS alterados (backend e frontend) — sem erros.
- `vercel.json` validado como JSON.
- Catálogo: 10 obrigatórios, `isRequired('cpf_cin') = false`, `isValidType('cpf_cin') = false`,
  `getLabelByType('cpf_cin') = 'CPF/CIN'` (rótulo legado preservado).
- Varredura confirmando ausência de `fetch('/api' …)` relativo e de referências órfãs
  (`fCpf`, `fDob`, `formatCPF`) no fluxo de admissão.

**Pendentes de validação em ambiente real (precisam de credenciais/hospedagem):**
- Fluxo fim-a-fim com MongoDB Atlas e Cloudinary (upload/download, salvamento, submit).
- Deploy na Vercel + comunicação Vercel → Render + CORS entre os domínios.
- Geração de links de admissão com `APP_URL` apontando para a Vercel.

> Não foi possível executar o fluxo em produção a partir deste ambiente porque isso depende
> das credenciais reais (Mongo/Cloudinary) e da publicação na Vercel/Render.

---

## 7. Observações de preservação

- Nenhum dado do MongoDB é apagado; `cpf` e `dataNascimento` antigos permanecem.
- Nenhum arquivo do Cloudinary é removido pelas alterações.
- Links individuais já gerados continuam válidos (a rota `/admissao/:token` é preservada;
  o domínio deles passa a ser o da Vercel conforme `APP_URL`).
- Layout, identidade visual e responsividade mantidos.
