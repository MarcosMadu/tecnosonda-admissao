/* =============== BANCO DE TALENTOS — PAINEL RH =============== */

if (!localStorage.getItem('admin_token')) {
  window.location.href = '/admin/login';
}

let allJobs = [];
let allCandidates = [];
let statsData = null;

const CandidateStatusMap = {
  recebido:   { label: 'Currículo Recebido', class: 'badge-info' },
  em_analise: { label: 'Em Análise',         class: 'badge-warning' },
  aprovado:   { label: 'Aprovado',           class: 'badge-success' },
  reprovado:  { label: 'Reprovado',          class: 'badge-danger' },
};

const SexoMap = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro',
  nao_informar: 'Prefiro não informar',
};

function candidateBadge(status) {
  const s = CandidateStatusMap[status] || { label: status, class: 'badge-info' };
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  loadAll();

  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnNewJob').addEventListener('click', () => openJobModal());
  document.getElementById('btnRefresh').addEventListener('click', loadAll);
  document.getElementById('searchCandidato').addEventListener('input', renderCandidates);
  document.getElementById('jobFilter').addEventListener('change', renderCandidates);
  document.getElementById('statusFilter').addEventListener('change', renderCandidates);

  document.getElementById('btnCopyPortal').addEventListener('click', () => {
    copyToClipboard(`${window.location.origin}/vagas`).then(() =>
      Toast.success('Link do portal de vagas copiado!')
    );
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
});

function loadUser() {
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
  document.getElementById('userName').textContent = user.name || '-';
  document.getElementById('userEmail').textContent = user.email || '-';
  document.getElementById('userAvatar').textContent = getInitials(user.name);
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/admin/login';
}

/* =============== CARREGAMENTO =============== */
async function loadAll() {
  try {
    const [jobsData, candidatesData, stats] = await Promise.all([
      Api.get('/talent/jobs'),
      Api.get('/talent/candidates'),
      Api.get('/talent/stats'),
    ]);

    allJobs = jobsData.jobs || [];
    allCandidates = candidatesData.candidates || [];
    statsData = stats;

    renderStats();
    renderJobFilter();
    renderCandidates();
    renderJobs();
    renderCharts();
  } catch (err) {
    Toast.error(err.message);
  }
}

function renderStats() {
  const s = statsData || {};
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Total de candidatos</span>
        <div class="stat-card-icon primary">👥</div>
      </div>
      <div class="stat-card-value">${s.totalCandidatos || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Vagas abertas</span>
        <div class="stat-card-icon success">📢</div>
      </div>
      <div class="stat-card-value">${s.vagasAbertas || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Em análise</span>
        <div class="stat-card-icon warning">🔍</div>
      </div>
      <div class="stat-card-value">${s.porStatus?.em_analise || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Recebidos (7 dias)</span>
        <div class="stat-card-icon info">📥</div>
      </div>
      <div class="stat-card-value">${s.ultimos7Dias || 0}</div>
    </div>
  `;
}

function renderJobFilter() {
  const select = document.getElementById('jobFilter');
  const atual = select.value;
  select.innerHTML =
    `<option value="">Todas as vagas</option>` +
    allJobs
      .map((j) => `<option value="${j._id}">${escapeHtml(j.titulo)} (${j.totalCandidatos})</option>`)
      .join('');
  select.value = atual;
}

/* =============== CANDIDATOS =============== */
function renderCandidates() {
  const search = document.getElementById('searchCandidato').value.toLowerCase().trim();
  const jobId = document.getElementById('jobFilter').value;
  const status = document.getElementById('statusFilter').value;

  let list = allCandidates;
  if (jobId) list = list.filter((c) => String(c.job?._id || c.job) === jobId);
  if (status) list = list.filter((c) => c.status === status);
  if (search) {
    list = list.filter(
      (c) =>
        (c.nome || '').toLowerCase().includes(search) ||
        (c.email || '').toLowerCase().includes(search) ||
        (c.telefone || '').toLowerCase().includes(search) ||
        (c.jobTitulo || '').toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById('candidatesTbody');
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h4 style="margin-bottom:6px;">Nenhum candidato encontrado</h4>
          <p>Abra uma vaga e divulgue o link do portal para receber currículos.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (c) => `
    <tr class="clickable-row" data-id="${c._id}">
      <td>
        <div class="row-name">
          <div class="row-avatar">${getInitials(c.nome)}</div>
          <div>
            <div>${escapeHtml(c.nome)}</div>
            ${c.cidade ? `<div class="text-xs text-muted">${escapeHtml(c.cidade)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${escapeHtml(c.jobTitulo || c.job?.titulo || '—')}</td>
      <td class="text-sm">${c.idade} anos • ${escapeHtml(SexoMap[c.sexo] || '—')}</td>
      <td class="text-sm">
        <div>${escapeHtml(c.telefone || '—')}</div>
        ${c.email ? `<div class="text-xs text-muted">${escapeHtml(c.email)}</div>` : ''}
      </td>
      <td>${candidateBadge(c.status)}</td>
      <td class="text-sm text-muted">${formatDate(c.createdAt)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-action="view" data-id="${c._id}">Detalhes</button>
          <button class="btn-icon btn-ghost" data-action="delete" data-id="${c._id}" title="Excluir">🗑️</button>
        </div>
      </td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-action="view"]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      openCandidateModal(b.dataset.id);
    })
  );
  tbody.querySelectorAll('[data-action="delete"]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCandidate(b.dataset.id);
    })
  );
  tbody.querySelectorAll('.clickable-row').forEach((row) =>
    row.addEventListener('click', () => openCandidateModal(row.dataset.id))
  );
}

async function openCandidateModal(id) {
  const loader = document.createElement('div');
  loader.className = 'loader-screen';
  loader.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(loader);

  try {
    const { candidate } = await Api.get(`/talent/candidates/${id}`);
    loader.remove();
    renderCandidateModal(candidate);
  } catch (err) {
    loader.remove();
    Toast.error(err.message);
  }
}

function renderCandidateModal(c) {
  const cv = c.curriculo || {};
  const jaAprovado = c.status === 'aprovado';

  const m = Modal.open(
    `
    <div class="modal-header">
      <div class="modal-title">Detalhes do Candidato</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
        <div class="row-avatar" style="width:52px; height:52px; font-size:1rem;">${getInitials(c.nome)}</div>
        <div style="flex:1;">
          <h3 style="margin-bottom:4px;">${escapeHtml(c.nome)}</h3>
          <div class="text-sm text-muted">Candidato à vaga de <strong>${escapeHtml(c.jobTitulo || '—')}</strong></div>
        </div>
        ${candidateBadge(c.status)}
      </div>

      <h4 style="margin-bottom:12px;">Dados do Candidato</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">Nome</span><span class="detail-value">${escapeHtml(c.nome)}</span></div>
        <div class="detail-item"><span class="detail-label">Idade</span><span class="detail-value">${c.idade} anos</span></div>
        <div class="detail-item"><span class="detail-label">Sexo</span><span class="detail-value">${escapeHtml(SexoMap[c.sexo] || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Telefone</span><span class="detail-value">${escapeHtml(c.telefone || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">E-mail</span><span class="detail-value">${escapeHtml(c.email || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Cidade</span><span class="detail-value">${escapeHtml(c.cidade || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Vaga</span><span class="detail-value">${escapeHtml(c.jobTitulo || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Recebido em</span><span class="detail-value">${formatDate(c.createdAt)}</span></div>
      </div>

      <div class="docs-section" style="margin-top:20px;">
        <div class="docs-section-title">Currículo</div>
        ${
          cv.originalName
            ? `<div class="doc-row">
                 <div class="doc-row-icon">📄</div>
                 <div class="doc-row-info">
                   <div class="doc-row-label">${escapeHtml(cv.originalName)}</div>
                   <div class="doc-row-meta">${((cv.size || 0) / 1024 / 1024).toFixed(2)} MB • ${formatDate(cv.uploadedAt)}</div>
                 </div>
                 <div class="doc-row-actions">
                   <button type="button" class="btn btn-secondary btn-sm" data-cv-download>⬇ Baixar currículo</button>
                 </div>
               </div>`
            : `<div class="doc-row empty">
                 <div class="doc-row-icon">📋</div>
                 <div class="doc-row-info">
                   <div class="doc-row-label">Currículo</div>
                   <div class="doc-row-meta">Não enviado</div>
                 </div>
               </div>`
        }
      </div>

      <div class="form-group" style="margin-top:20px;">
        <label class="form-label">Status do candidato</label>
        <select class="form-select" id="candStatus">
          <option value="recebido"   ${c.status === 'recebido' ? 'selected' : ''}>Currículo recebido</option>
          <option value="em_analise" ${c.status === 'em_analise' ? 'selected' : ''}>Em análise</option>
          <option value="aprovado"   ${c.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
          <option value="reprovado"  ${c.status === 'reprovado' ? 'selected' : ''}>Reprovado</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Observações internas do RH</label>
        <textarea class="form-input" id="candObs" rows="3" placeholder="Anotações sobre a entrevista, perfil, etc.">${escapeHtml(c.observacoes || '')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" data-action="delete" style="margin-right:auto;">Excluir candidato</button>
      <button class="btn btn-secondary" data-close>Fechar</button>
      <button class="btn btn-secondary" data-action="save">Salvar alterações</button>
      <button class="btn btn-success" data-action="approve">
        ✓ ${jaAprovado ? 'Iniciar auto admissão' : 'Aprovar e iniciar auto admissão'}
      </button>
    </div>
  `,
    { large: true }
  );

  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => m.remove()));

  const btnCv = m.querySelector('[data-cv-download]');
  if (btnCv) {
    btnCv.addEventListener('click', () => downloadCurriculo(c._id, btnCv));
  }

  m.querySelector('[data-action="save"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await Api.put(`/talent/candidates/${c._id}/status`, {
        status: m.querySelector('#candStatus').value,
        observacoes: m.querySelector('#candObs').value,
      });
      Toast.success('Candidato atualizado.');
      m.remove();
      loadAll();
    } catch (err) {
      Toast.error(err.message);
      btn.disabled = false;
    }
  });

  m.querySelector('[data-action="delete"]').addEventListener('click', () => {
    m.remove();
    deleteCandidate(c._id);
  });

  m.querySelector('[data-action="approve"]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Iniciar auto admissão',
      message: `O candidato ${c.nome} será marcado como APROVADO e você será direcionado ao painel de Admissões, com o cadastro do colaborador já pré-preenchido para gerar o link de auto admissão.`,
      confirmText: 'Aprovar e continuar',
      confirmClass: 'btn-success',
    });
    if (!ok) return;

    try {
      await Api.put(`/talent/candidates/${c._id}/status`, {
        status: 'aprovado',
        observacoes: m.querySelector('#candObs').value,
      });
      Toast.success('Candidato aprovado! Redirecionando para a admissão...');

      const params = new URLSearchParams({
        novo: '1',
        nome: c.nome,
        funcao: c.jobTitulo || '',
        candidato: c._id,
      });
      setTimeout(() => {
        window.location.href = `/admin/dashboard?${params.toString()}`;
      }, 700);
    } catch (err) {
      Toast.error(err.message);
    }
  });
}

async function deleteCandidate(id) {
  const ok = await confirmDialog({
    title: 'Excluir candidato',
    message: 'Tem certeza que deseja excluir este candidato? O currículo anexado também será removido. Esta ação é irreversível.',
    confirmText: 'Excluir definitivamente',
    confirmClass: 'btn-danger',
  });
  if (!ok) return;

  try {
    await Api.del(`/talent/candidates/${id}`);
    Toast.success('Candidato excluído.');
    loadAll();
  } catch (err) {
    Toast.error(err.message);
  }
}

async function downloadCurriculo(candidateId, button) {
  const originalText = button ? button.innerHTML : '';
  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = 'Baixando...';
    }

    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/api/talent/candidates/${candidateId}/curriculo/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let message = 'Erro ao baixar currículo.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    let filename = 'curriculo';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const normalMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
    else if (normalMatch) filename = normalMatch[1];

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    Toast.success('Download iniciado.');
  } catch (err) {
    Toast.error(err.message || 'Erro ao baixar currículo.');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

/* =============== VAGAS =============== */
function renderJobs() {
  const grid = document.getElementById('jobsGrid');

  if (allJobs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">📢</div>
        <h4 style="margin-bottom:6px;">Nenhuma vaga cadastrada</h4>
        <p>Clique em "Abrir Vaga" para publicar a primeira oportunidade.</p>
      </div>`;
    return;
  }

  grid.innerHTML = allJobs
    .map((j) => {
      const limite = j.quantidadeVagas;
      const pct = limite ? Math.min((j.totalCandidatos / limite) * 100, 100) : 0;

      return `
      <div class="job-card ${j.status === 'fechada' ? 'closed' : ''}">
        <div class="job-card-top">
          <div>
            <div class="job-card-title">${escapeHtml(j.titulo)}</div>
            <div class="job-card-sub">
              ${escapeHtml(j.setor || 'Sem setor')} • ${escapeHtml(j.local || 'Local não informado')} • ${escapeHtml(j.tipoContrato || '')}
            </div>
          </div>
          <span class="badge ${j.status === 'aberta' ? 'badge-success' : 'badge-danger'}">
            ${j.status === 'aberta' ? 'Aberta' : 'Fechada'}
          </span>
        </div>

        ${j.descricao ? `<p class="job-card-desc">${escapeHtml(j.descricao)}</p>` : ''}

        <div class="job-card-metrics">
          <div>
            <span class="job-metric-value">${j.totalCandidatos}</span>
            <span class="job-metric-label">Candidatos</span>
          </div>
          <div>
            <span class="job-metric-value">${limite ? limite : '∞'}</span>
            <span class="job-metric-label">Limite de vagas</span>
          </div>
          <div>
            <span class="job-metric-value">${limite ? j.vagasRestantes : '—'}</span>
            <span class="job-metric-label">Restantes</span>
          </div>
        </div>

        ${
          limite
            ? `<div class="job-progress"><div class="job-progress-bar" style="width:${pct}%"></div></div>
               ${j.limiteAtingido ? `<div class="job-warning">⚠️ Limite atingido — a vaga não recebe mais currículos.</div>` : ''}`
            : ''
        }

        <div class="job-card-actions">
          <button class="btn btn-secondary btn-sm" data-job-view="${j._id}">Ver candidatos</button>
          <button class="btn btn-secondary btn-sm" data-job-edit="${j._id}">Editar</button>
          <button class="btn btn-secondary btn-sm" data-job-toggle="${j._id}">
            ${j.status === 'aberta' ? 'Fechar vaga' : 'Reabrir vaga'}
          </button>
          <button class="btn-icon btn-ghost" data-job-delete="${j._id}" title="Excluir vaga">🗑️</button>
        </div>
      </div>`;
    })
    .join('');

  grid.querySelectorAll('[data-job-view]').forEach((b) =>
    b.addEventListener('click', () => {
      document.getElementById('jobFilter').value = b.dataset.jobView;
      document.querySelector('.tab[data-tab="candidatos"]').click();
      renderCandidates();
    })
  );
  grid.querySelectorAll('[data-job-edit]').forEach((b) =>
    b.addEventListener('click', () => openJobModal(allJobs.find((j) => j._id === b.dataset.jobEdit)))
  );
  grid.querySelectorAll('[data-job-toggle]').forEach((b) =>
    b.addEventListener('click', () => toggleJob(allJobs.find((j) => j._id === b.dataset.jobToggle)))
  );
  grid.querySelectorAll('[data-job-delete]').forEach((b) =>
    b.addEventListener('click', () => deleteJob(allJobs.find((j) => j._id === b.dataset.jobDelete)))
  );
}

function openJobModal(job = null) {
  const editando = !!job;
  const tipos = ['CLT', 'PJ', 'Temporário', 'Estágio', 'Aprendiz', 'Banco de Talentos'];

  const m = Modal.open(
    `
    <div class="modal-header">
      <div class="modal-title">${editando ? 'Editar Vaga' : 'Abrir Nova Vaga'}</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="jobForm">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Função / Título da vaga <span class="required">*</span></label>
          <input type="text" name="titulo" class="form-input" required placeholder="Ex.: Sondador, Auxiliar de Sonda, Técnico de Segurança"
            value="${editando ? escapeHtml(job.titulo) : ''}" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="form-group">
            <label class="form-label">Setor</label>
            <input type="text" name="setor" class="form-input" placeholder="Ex.: Operação"
              value="${editando ? escapeHtml(job.setor || '') : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Local</label>
            <input type="text" name="local" class="form-input" placeholder="Ex.: Canaã dos Carajás - PA"
              value="${editando ? escapeHtml(job.local || '') : ''}" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="form-group">
            <label class="form-label">Tipo de contrato</label>
            <select name="tipoContrato" class="form-select">
              ${tipos
                .map(
                  (t) =>
                    `<option value="${t}" ${editando && job.tipoContrato === t ? 'selected' : ''}>${t}</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantidade de vagas</label>
            <input type="number" name="quantidadeVagas" class="form-input" min="1" placeholder="Deixe vazio = ilimitado"
              value="${editando && job.quantidadeVagas ? job.quantidadeVagas : ''}" />
            <div class="form-hint">Ao atingir esse número de currículos, a vaga fecha automaticamente.</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descrição da vaga</label>
          <textarea name="descricao" class="form-input" rows="3" placeholder="Atividades, jornada, benefícios...">${editando ? escapeHtml(job.descricao || '') : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Requisitos</label>
          <textarea name="requisitos" class="form-input" rows="3" placeholder="Escolaridade, experiência, certificações (NR-35, CNH...)">${editando ? escapeHtml(job.requisitos || '') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Salvar alterações' : 'Abrir vaga'}</button>
      </div>
    </form>
  `,
    { large: true }
  );

  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => m.remove()));

  m.querySelector('#jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';

    const payload = {
      titulo: fd.get('titulo'),
      setor: fd.get('setor'),
      local: fd.get('local'),
      tipoContrato: fd.get('tipoContrato'),
      descricao: fd.get('descricao'),
      requisitos: fd.get('requisitos'),
      quantidadeVagas: fd.get('quantidadeVagas') || null,
    };

    try {
      if (editando) await Api.put(`/talent/jobs/${job._id}`, payload);
      else await Api.post('/talent/jobs', payload);

      m.remove();
      Toast.success(editando ? 'Vaga atualizada!' : 'Vaga aberta com sucesso!');
      loadAll();
    } catch (err) {
      Toast.error(err.message);
      btn.disabled = false;
      btn.textContent = editando ? 'Salvar alterações' : 'Abrir vaga';
    }
  });
}

async function toggleJob(job) {
  if (!job) return;
  const novoStatus = job.status === 'aberta' ? 'fechada' : 'aberta';
  try {
    await Api.put(`/talent/jobs/${job._id}`, { status: novoStatus });
    Toast.success(novoStatus === 'aberta' ? 'Vaga reaberta.' : 'Vaga fechada.');
    loadAll();
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteJob(job) {
  if (!job) return;
  const ok = await confirmDialog({
    title: 'Excluir vaga',
    message: `A vaga "${job.titulo}" e todas as ${job.totalCandidatos} candidatura(s) vinculadas serão excluídas, incluindo os currículos anexados. Esta ação é irreversível.`,
    confirmText: 'Excluir definitivamente',
    confirmClass: 'btn-danger',
  });
  if (!ok) return;

  try {
    const data = await Api.del(`/talent/jobs/${job._id}`);
    Toast.success(data.message || 'Vaga excluída.');
    loadAll();
  } catch (err) {
    Toast.error(err.message);
  }
}

/* =============== ESTATÍSTICAS =============== */
function renderCharts() {
  const s = statsData || {};

  const funcoes = s.porFuncao || [];
  const maxFuncao = Math.max(1, ...funcoes.map((f) => f.total));
  document.getElementById('chartFuncao').innerHTML = funcoes.length
    ? funcoes
        .map(
          (f) => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(f.funcao)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(f.total / maxFuncao) * 100}%"></div>
        </div>
        <div class="bar-value">${f.total}</div>
      </div>`
        )
        .join('')
    : '<div style="color:var(--gray-600);">Nenhum candidato registrado ainda.</div>';

  const statusList = [
    { key: 'recebido', label: 'Currículo recebido', color: 'var(--info)' },
    { key: 'em_analise', label: 'Em análise', color: 'var(--warning)' },
    { key: 'aprovado', label: 'Aprovado', color: 'var(--success)' },
    { key: 'reprovado', label: 'Reprovado', color: 'var(--danger)' },
  ];
  const maxStatus = Math.max(1, ...statusList.map((st) => s.porStatus?.[st.key] || 0));

  document.getElementById('chartStatus').innerHTML = statusList
    .map((st) => {
      const total = s.porStatus?.[st.key] || 0;
      return `
      <div class="bar-row">
        <div class="bar-label">${st.label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(total / maxStatus) * 100}%; background:${st.color};"></div>
        </div>
        <div class="bar-value">${total}</div>
      </div>`;
    })
    .join('');
}
