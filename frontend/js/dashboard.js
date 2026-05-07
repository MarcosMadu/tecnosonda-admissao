/* =============== DASHBOARD RH =============== */

if (!localStorage.getItem('admin_token')) {
  window.location.href = '/admin/login';
}

let allEmployees = [];

document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  loadEmployees();

  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnNewEmployee').addEventListener('click', openNewEmployeeModal);
  document.getElementById('btnRefresh').addEventListener('click', loadEmployees);
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);
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

async function loadEmployees() {
  const tbody = document.getElementById('employeesTbody');
  tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:var(--gray-600);">Carregando...</td></tr>`;
  try {
    const data = await Api.get('/admin/employees');
    allEmployees = data.employees || [];
    renderStats();
    renderTable();
  } catch (err) {
    Toast.error(err.message);
    tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center; color:var(--danger);">Falha ao carregar.</td></tr>`;
  }
}

function renderStats() {
  const total = allEmployees.length;
  const aguardando = allEmployees.filter(e => e.status === 'aguardando_documentacao').length;
  const recebido   = allEmployees.filter(e => e.status === 'documentacao_recebida').length;
  const reaberto   = allEmployees.filter(e => e.status === 'reaberto_para_correcao').length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Total de processos</span>
        <div class="stat-card-icon primary">📊</div>
      </div>
      <div class="stat-card-value">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Aguardando documentação</span>
        <div class="stat-card-icon warning">⏳</div>
      </div>
      <div class="stat-card-value">${aguardando}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Documentação recebida</span>
        <div class="stat-card-icon success">✓</div>
      </div>
      <div class="stat-card-value">${recebido}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">Reabertos para correção</span>
        <div class="stat-card-icon info">↻</div>
      </div>
      <div class="stat-card-value">${reaberto}</div>
    </div>
  `;
}

function renderTable() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter').value;

  let list = allEmployees;
  if (statusFilter) list = list.filter(e => e.status === statusFilter);
  if (search) {
    list = list.filter(e =>
      (e.name || '').toLowerCase().includes(search) ||
      (e.fullName || '').toLowerCase().includes(search) ||
      (e.cpf || '').toLowerCase().includes(search) ||
      (e.contrato || '').toLowerCase().includes(search) ||
      (e.accessToken || '').toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById('employeesTbody');
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h4 style="margin-bottom:6px;">Nenhum colaborador encontrado</h4>
          <p>Cadastre um novo colaborador para iniciar.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(emp => `
    <tr>
      <td>
        <div class="row-name">
          <div class="row-avatar">${getInitials(emp.fullName || emp.name)}</div>
          <div>
            <div>${escapeHtml(emp.fullName || emp.name)}</div>
            ${emp.cpf ? `<div class="text-xs text-muted">CPF: ${escapeHtml(emp.cpf)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${escapeHtml(emp.contrato)}</td>
      <td>${escapeHtml(emp.responsavelAdmissao)}</td>
      <td><code style="font-family:'Courier New',monospace; font-size:0.8125rem; background:var(--gray-100); padding:3px 8px; border-radius:4px;">${escapeHtml(emp.accessToken)}</code></td>
      <td>${statusBadge(emp.status)}</td>
      <td class="text-sm text-muted">${formatDate(emp.createdAt)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-secondary btn-sm" data-action="view" data-id="${emp._id}">
            Detalhes
          </button>
          <button class="btn-icon btn-ghost" data-action="delete" data-id="${emp._id}" title="Excluir">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-action="view"]').forEach(b =>
    b.addEventListener('click', () => openDetailsModal(b.dataset.id)));
  tbody.querySelectorAll('[data-action="delete"]').forEach(b =>
    b.addEventListener('click', () => deleteEmployee(b.dataset.id)));
}

/* ===== Novo colaborador ===== */
function openNewEmployeeModal() {
  const m = Modal.open(`
    <div class="modal-header">
      <div class="modal-title">Cadastrar Novo Colaborador</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="newEmpForm">
      <div class="modal-body">
        <p class="text-sm text-muted mb-4">
          Preencha os dados básicos. Será gerado um link único de acesso para o colaborador.
        </p>
        <div class="form-group">
          <label class="form-label">Nome <span class="required">*</span></label>
          <input type="text" name="name" class="form-input" required placeholder="Nome completo do colaborador" />
        </div>
        <div class="form-group">
          <label class="form-label">Responsável pela admissão <span class="required">*</span></label>
          <input type="text" name="responsavelAdmissao" class="form-input" required placeholder="Nome do responsável (RH)" />
        </div>
        <div class="form-group">
          <label class="form-label">Contrato <span class="required">*</span></label>
          <input type="text" name="contrato" class="form-input" required placeholder="Tipo / número do contrato" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar e gerar link</button>
      </div>
    </form>
  `);

  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => m.remove()));
  m.querySelector('#newEmpForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Cadastrando...';
    try {
      const data = await Api.post('/admin/employees', {
        name: fd.get('name'),
        responsavelAdmissao: fd.get('responsavelAdmissao'),
        contrato: fd.get('contrato'),
      });
      m.remove();
      Toast.success('Colaborador cadastrado!');
      showAccessLinkModal(data.employee, data.accessLink);
      loadEmployees();
    } catch (err) {
      Toast.error(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cadastrar e gerar link';
    }
  });
}

function showAccessLinkModal(employee, accessLink) {
  const m = Modal.open(`
    <div class="modal-header">
      <div class="modal-title">✓ Colaborador cadastrado</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <p class="mb-4">Compartilhe o link de acesso ou o token único com <strong>${escapeHtml(employee.name)}</strong>:</p>

      <div class="form-group">
        <label class="form-label">Token único</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="form-input" id="tokenField" value="${escapeHtml(employee.accessToken)}" readonly style="font-family:'Courier New',monospace; font-weight:600; letter-spacing:0.1em;" />
          <button class="btn btn-secondary" data-copy="${escapeHtml(employee.accessToken)}">Copiar</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Link direto</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="form-input" id="linkField" value="${escapeHtml(accessLink)}" readonly />
          <button class="btn btn-primary" data-copy="${escapeHtml(accessLink)}">Copiar link</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" data-close>Concluir</button>
    </div>
  `);

  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => m.remove()));
  m.querySelectorAll('[data-copy]').forEach(b => {
    b.addEventListener('click', () => {
      copyToClipboard(b.dataset.copy).then(() => Toast.success('Copiado!'));
    });
  });
}

/* ===== Detalhes do colaborador ===== */
async function openDetailsModal(id) {
  const loader = document.createElement('div');
  loader.className = 'loader-screen';
  loader.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(loader);

  try {
    const data = await Api.get(`/admin/employees/${id}`);
    loader.remove();
    renderDetailsModal(data);
  } catch (err) {
    loader.remove();
    Toast.error(err.message);
  }
}

function renderDetailsModal(data) {
  const { employee, accessLink, requiredDocuments, optionalDocuments } = data;
  const uploadedTypes = employee.documents.map(d => d.type);

  const docHtml = (catalog, isRequired) => catalog.map(catDoc => {
    const uploaded = employee.documents.find(d => d.type === catDoc.type);
    if (uploaded) {
      return `
        <div class="doc-row">
          <div class="doc-row-icon">📄</div>
          <div class="doc-row-info">
            <div class="doc-row-label">${escapeHtml(catDoc.label)} ${isRequired ? '<span class="required-mark">*</span>' : '<span class="optional-tag">opcional</span>'}</div>
            <div class="doc-row-meta">${escapeHtml(uploaded.originalName || '')} • ${formatDate(uploaded.uploadedAt)}</div>
          </div>
          <div class="doc-row-actions"> 
           <button
              type="button"
              class="btn btn-secondary btn-sm"
              data-doc-download="${uploaded._id}"
            >
              ⬇ Baixar
            </button>
            <button class="btn-icon btn-ghost" data-doc-delete="${uploaded._id}" title="Excluir documento">🗑️</button>
          </div>
        </div>`;
    } else {
      return `
        <div class="doc-row empty">
          <div class="doc-row-icon">📋</div>
          <div class="doc-row-info">
            <div class="doc-row-label">${escapeHtml(catDoc.label)} ${isRequired ? '<span class="required-mark">*</span>' : '<span class="optional-tag">opcional</span>'}</div>
            <div class="doc-row-meta">Não enviado</div>
          </div>
        </div>`;
    }
  }).join('');

  const m = Modal.open(`
    <div class="modal-header">
      <div class="modal-title">Detalhes do Colaborador</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
        <div class="row-avatar" style="width:52px; height:52px; font-size:1rem;">${getInitials(employee.fullName || employee.name)}</div>
        <div style="flex:1;">
          <h3 style="margin-bottom:4px;">${escapeHtml(employee.fullName || employee.name)}</h3>
          <div class="text-sm text-muted">${escapeHtml(employee.contrato)} • ${escapeHtml(employee.responsavelAdmissao)}</div>
        </div>
        ${statusBadge(employee.status)}
      </div>

      ${employee.reopenReason ? `
        <div class="reopen-banner">
          <span>⚠️</span>
          <div><strong>Reaberto:</strong> ${escapeHtml(employee.reopenReason)}</div>
        </div>` : ''}

      <div class="access-link-box">
        <div style="font-size:0.75rem; color:var(--primary-dark); font-weight:600;">LINK</div>
        <code>${escapeHtml(accessLink)}</code>
        <button class="btn btn-primary btn-sm" data-copy="${escapeHtml(accessLink)}">Copiar</button>
      </div>

      <h4 style="margin-bottom:12px;">Dados Pessoais</h4>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">Nome completo</span><span class="detail-value">${escapeHtml(employee.fullName || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">CPF</span><span class="detail-value">${escapeHtml(employee.cpf || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Função</span><span class="detail-value">${escapeHtml(employee.funcao || '—')}</span></div>
        <div class="detail-item"><span class="detail-label">Data de Nascimento</span><span class="detail-value">${formatDateOnly(employee.dataNascimento)}</span></div>
        <div class="detail-item"><span class="detail-label">Cadastrado em</span><span class="detail-value">${formatDate(employee.createdAt)}</span></div>
        <div class="detail-item"><span class="detail-label">Enviado em</span><span class="detail-value">${employee.submittedAt ? formatDate(employee.submittedAt) : '—'}</span></div>
      </div>

      <div class="docs-section">
        <div class="docs-section-title">
          Documentos Obrigatórios
          <span class="text-sm text-muted">${employee.documents.filter(d => requiredDocuments.some(r => r.type === d.type)).length}/${requiredDocuments.length}</span>
        </div>
        ${docHtml(requiredDocuments, true)}
      </div>

      <div class="docs-section" style="margin-top:20px;">
        <div class="docs-section-title">Documentos Opcionais</div>
        ${docHtml(optionalDocuments, false)}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" data-action="delete" style="margin-right:auto;">Excluir cadastro</button>
      <button class="btn btn-secondary" data-close>Fechar</button>
      ${employee.status === 'documentacao_recebida' || employee.locked ? `
        <button class="btn btn-primary" data-action="reopen">↻ Reabrir formulário</button>` : ''}
    </div>
  `, { large: true });

  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => m.remove()));
  m.querySelectorAll('[data-copy]').forEach(b =>
    b.addEventListener('click', () => copyToClipboard(b.dataset.copy).then(() => Toast.success('Copiado!')))
  );


  m.querySelectorAll('[data-doc-download]').forEach(b => {
    b.addEventListener('click', async () => {
      await downloadDocument(employee._id, b.dataset.docDownload, b);
    });
  });

  m.querySelectorAll('[data-doc-delete]').forEach(b => {
    b.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Excluir documento',
        message: 'Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.',
        confirmText: 'Excluir', confirmClass: 'btn-danger'
      });
      if (!ok) return;
      try {
        await Api.del(`/admin/employees/${employee._id}/documents/${b.dataset.docDelete}`);
        Toast.success('Documento excluído.');
        m.remove();
        openDetailsModal(employee._id);
        loadEmployees();
      } catch (err) { Toast.error(err.message); }
    });
  });

  const reopenBtn = m.querySelector('[data-action="reopen"]');
  if (reopenBtn) {
    reopenBtn.addEventListener('click', async () => {
      m.remove();
      await openReopenModal(employee._id);
    });
  }

  m.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    m.remove();
    deleteEmployee(employee._id);
  });
}

async function openReopenModal(id) {
  const m = Modal.open(`
    <div class="modal-header">
      <div class="modal-title">Reabrir formulário</div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="reopenForm">
      <div class="modal-body">
        <p class="mb-4">O colaborador poderá editar todos os dados e reenviar a documentação.</p>
        <div class="form-group">
          <label class="form-label">Motivo da reabertura</label>
          <textarea name="reason" class="form-input" rows="3" placeholder="Ex.: documento ilegível, dados incompletos..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar reabertura</button>
      </div>
    </form>
  `);

  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => m.remove()));
  m.querySelector('#reopenForm').addEventListener('submit', async e => {
    e.preventDefault();
    const reason = e.target.reason.value.trim();
    try {
      await Api.post(`/admin/employees/${id}/reopen`, { reason });
      m.remove();
      Toast.success('Formulário reaberto com sucesso.');
      loadEmployees();
    } catch (err) { Toast.error(err.message); }
  });
}

async function deleteEmployee(id) {
  const ok = await confirmDialog({
    title: 'Excluir colaborador',
    message: 'Tem certeza que deseja excluir este colaborador? Todos os documentos enviados também serão removidos. Esta ação é irreversível.',
    confirmText: 'Excluir definitivamente', confirmClass: 'btn-danger'
  });
  if (!ok) return;

  try {
    await Api.del(`/admin/employees/${id}`);
    Toast.success('Colaborador excluído.');
    loadEmployees();
  } catch (err) { Toast.error(err.message); }
}



async function downloadDocument(employeeId, docId, button) {
  const originalText = button ? button.innerHTML : '';

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = 'Baixando...';
    }

    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/api/admin/employees/${employeeId}/documents/${docId}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let message = 'Erro ao baixar arquivo.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    let filename = 'arquivo';

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const normalMatch = disposition.match(/filename="?([^";]+)"?/i);

    if (utf8Match) {
      filename = decodeURIComponent(utf8Match[1]);
    } else if (normalMatch) {
      filename = normalMatch[1];
    }

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
    Toast.error(err.message || 'Erro ao baixar arquivo.');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}
