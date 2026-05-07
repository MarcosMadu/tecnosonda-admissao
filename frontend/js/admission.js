/* =============== TELA DE ADMISSÃO (COLABORADOR) =============== */

const token = window.location.pathname.split('/').pop();
let state = { employee: null, requiredDocuments: [], optionalDocuments: [] };
const debounceTimers = {};

document.addEventListener('DOMContentLoaded', () => {
  loadAdmission();
});

async function loadAdmission() {
  try {
    const data = await fetch(`/api/admission/${token}`).then(r => r.json().then(j => ({ ok: r.ok, j })));
    if (!data.ok) throw new Error(data.j.message || 'Token inválido');
    state.employee = data.j.employee;
    state.requiredDocuments = data.j.requiredDocuments;
    state.optionalDocuments = data.j.optionalDocuments;
    render();
  } catch (err) {
    document.getElementById('container').innerHTML = `
      <div class="card" style="margin-top:60px;">
        <div class="card-body" style="text-align:center; padding:60px 24px;">
          <div style="font-size:4rem; margin-bottom:16px;">🔒</div>
          <h2 style="margin-bottom:8px;">Acesso negado</h2>
          <p style="color:var(--gray-700); margin-bottom:24px;">${escapeHtml(err.message)}</p>
          <a href="/" class="btn btn-primary">Voltar ao início</a>
        </div>
      </div>`;
  }
}

function render() {
  const emp = state.employee;
  const isLocked = emp.locked;

  document.getElementById('headerStatus').innerHTML = statusBadge(emp.status);

  // Documentação enviada — tela de sucesso
  if (emp.status === 'documentacao_recebida' && isLocked) {
    document.getElementById('container').innerHTML = `
      <div class="submitted-banner">
        <div class="submitted-banner-icon">✓</div>
        <h2>Documentação enviada com sucesso!</h2>
        <p>
          Sua documentação foi recebida e está em análise pelo RH da Tecnosonda.
          Em caso de necessidade de correção, você será notificado e poderá editar
          este formulário novamente.
        </p>
      </div>
      <div class="card">
        <div class="card-body">
          <h3 style="margin-bottom:16px;">Resumo do envio</h3>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Nome</span><span class="detail-value">${escapeHtml(emp.fullName || emp.name)}</span></div>
            <div class="detail-item"><span class="detail-label">CPF</span><span class="detail-value">${escapeHtml(emp.cpf || '-')}</span></div>
            <div class="detail-item"><span class="detail-label">Função</span><span class="detail-value">${escapeHtml(emp.funcao || '-')}</span></div>
            <div class="detail-item"><span class="detail-label">Documentos enviados</span><span class="detail-value">${emp.documents.length}</span></div>
          </div>
        </div>
      </div>`;
    return;
  }

  document.getElementById('container').innerHTML = `
    <div class="welcome-card">
      <div class="welcome-card-content">
        <h1>Olá, ${escapeHtml((emp.fullName || emp.name).split(' ')[0])}! 👋</h1>
        <p>
          Bem-vindo(a) à Tecnosonda. Para finalizar seu processo de admissão,
          preencha seus dados e envie os documentos solicitados abaixo.
          Após o envio, sua documentação será analisada pelo RH.
        </p>
      </div>
    </div>

    ${emp.status === 'reaberto_para_correcao' ? `
      <div class="reopen-alert">
        <span class="reopen-alert-icon">⚠️</span>
        <div>
          <h4>Formulário reaberto pelo RH</h4>
          <p>${escapeHtml(emp.reopenReason || 'Você pode editar seus dados e reenviar a documentação.')}</p>
        </div>
      </div>` : ''}

    <div class="progress-card" id="progressCard"></div>

    <section class="section">
      <div class="section-header">
        <div class="section-number">1</div>
        <div class="section-title-block">
          <div class="section-title">Dados Pessoais</div>
          <div class="section-subtitle">Preencha as informações abaixo</div>
        </div>
      </div>
      <div class="section-body">
        <div class="field-grid">
          <div class="form-group">
            <label class="form-label">CPF <span class="required">*</span></label>
            <input type="text" id="fCpf" class="form-input" maxlength="14" value="${escapeHtml(emp.cpf || '')}" placeholder="000.000.000-00" />
          </div>
          <div class="form-group">
            <label class="form-label">Nome Completo <span class="required">*</span></label>
            <input type="text" id="fName" class="form-input" value="${escapeHtml(emp.fullName || '')}" placeholder="Nome completo" />
          </div>
          <div class="form-group">
            <label class="form-label">Função <span class="required">*</span></label>
            <input type="text" id="fFuncao" class="form-input" value="${escapeHtml(emp.funcao || '')}" placeholder="Cargo / função" />
          </div>
          <div class="form-group">
            <label class="form-label">Data de Nascimento <span class="required">*</span></label>
            <input type="date" id="fDob" class="form-input" value="${formatDateInput(emp.dataNascimento)}" />
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div class="section-number">2</div>
        <div class="section-title-block">
          <div class="section-title">Documentos Obrigatórios</div>
          <div class="section-subtitle">Anexe todos os documentos abaixo (PDF, JPG ou PNG · até 30MB)</div>
        </div>
      </div>
      <div class="section-body">
        <div class="docs-grid" id="requiredDocsGrid"></div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div class="section-number">3</div>
        <div class="section-title-block">
          <div class="section-title">Documentos Opcionais</div>
          <div class="section-subtitle">Anexe apenas se aplicável ao seu caso</div>
        </div>
      </div>
      <div class="section-body">
        <div class="docs-grid" id="optionalDocsGrid"></div>
      </div>
    </section>

    <div class="action-bar">
      <div class="action-bar-info" id="actionBarInfo">
        <strong>Confira tudo antes de enviar.</strong>
        <div class="text-sm text-muted mt-2">Após o envio, edição será bloqueada até nova reabertura pelo RH.</div>
      </div>
      <button class="btn btn-success btn-lg" id="btnSubmit" disabled>
        ✓ Enviar Documentação
      </button>
    </div>
  `;

  attachPersonalDataListeners();
  renderDocuments();
  updateProgress();
}

/* ===== Dados pessoais ===== */
function attachPersonalDataListeners() {
  const fields = ['fCpf', 'fName', 'fFuncao', 'fDob'];
  const cpfInput = document.getElementById('fCpf');
  cpfInput.addEventListener('input', e => {
    e.target.value = formatCPF(e.target.value);
  });
  fields.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(debounceTimers.personal);
      debounceTimers.personal = setTimeout(savePersonalData, 700);
      updateProgress();
    });
  });
}

async function savePersonalData() {
  const data = {
    cpf: document.getElementById('fCpf').value.trim(),
    fullName: document.getElementById('fName').value.trim(),
    funcao: document.getElementById('fFuncao').value.trim(),
    dataNascimento: document.getElementById('fDob').value || null,
  };
  try {
    const res = await Api.put(`/admission/${token}/personal-data`, data);
    state.employee = { ...state.employee, ...data };
  } catch (err) {
    Toast.error(err.message);
  }
}

/* ===== Documentos ===== */
function renderDocuments() {
  document.getElementById('requiredDocsGrid').innerHTML =
    state.requiredDocuments.map(d => docCard(d, true)).join('');
  document.getElementById('optionalDocsGrid').innerHTML =
    state.optionalDocuments.map(d => docCard(d, false)).join('');
  attachDocListeners();
}

function docCard(catDoc, isRequired) {
  const uploaded = state.employee.documents.find(d => d.type === catDoc.type);
  const cardClass = `doc-card ${isRequired ? 'required' : 'optional'} ${uploaded ? 'uploaded' : ''}`;
  return `
    <div class="${cardClass}" data-doc-card="${catDoc.type}">
      <div class="doc-card-header">
        <div class="doc-card-icon">${uploaded ? '✓' : '📄'}</div>
        <div class="doc-card-info">
          <div class="doc-card-label">
            ${escapeHtml(catDoc.label)}
            ${isRequired ? '<span class="required-mark">*</span>' : '<span class="optional-tag">opcional</span>'}
          </div>
          <div class="doc-card-status">
            ${uploaded
              ? escapeHtml(uploaded.originalName || 'Enviado')
              : 'Nenhum arquivo enviado'}
          </div>
        </div>
      </div>
      <div class="doc-card-actions">
        <input type="file" class="file-input" id="file-${catDoc.type}" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
        <label for="file-${catDoc.type}" class="file-button">
          ${uploaded ? '↻ Substituir' : '⬆ Enviar arquivo'}
        </label>
        ${uploaded ? `<button class="btn-remove-doc" data-remove-doc="${uploaded._id}" title="Remover">🗑</button>` : ''}
      </div>
    </div>
  `;
}

function attachDocListeners() {
  state.requiredDocuments.concat(state.optionalDocuments).forEach(catDoc => {
    const input = document.getElementById(`file-${catDoc.type}`);
    if (input) {
      input.addEventListener('change', e => handleFileUpload(e, catDoc.type));
    }
  });
  document.querySelectorAll('[data-remove-doc]').forEach(b => {
    b.addEventListener('click', () => removeDocument(b.dataset.removeDoc));
  });
}

async function handleFileUpload(event, documentType) {
  const file = event.target.files[0];
  if (!file) return;

  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    Toast.error('Formato inválido. Use apenas PDF, JPG ou PNG.');
    event.target.value = '';
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    Toast.error('Arquivo muito grande. Limite: 30MB.');
    event.target.value = '';
    return;
  }

  const card = document.querySelector(`[data-doc-card="${documentType}"]`);
  const actions = card.querySelector('.doc-card-actions');
  const originalActions = actions.innerHTML;
  actions.innerHTML = `<div class="file-uploading"><span class="spinner spinner-dark"></span> Enviando...</div>`;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('documentType', documentType);

  try {
    const data = await Api.upload(`/admission/${token}/documents`, fd);
    state.employee.documents = state.employee.documents.filter(d => d.type !== documentType);
    state.employee.documents.push({
      _id: data.document._id,
      type: data.document.type,
      label: data.document.label,
      originalName: data.document.originalName,
      uploadedAt: data.document.uploadedAt,
    });
    Toast.success('Documento enviado!');
    renderDocuments();
    updateProgress();
  } catch (err) {
    Toast.error(err.message);
    actions.innerHTML = originalActions;
    attachDocListeners();
  }
  event.target.value = '';
}

async function removeDocument(docId) {
  const ok = await confirmDialog({
    title: 'Remover documento',
    message: 'Deseja remover este documento? Você poderá enviar outro em seguida.',
    confirmText: 'Remover', confirmClass: 'btn-danger',
  });
  if (!ok) return;

  try {
    await Api.del(`/admission/${token}/documents/${docId}`);
    state.employee.documents = state.employee.documents.filter(d => d._id !== docId);
    Toast.success('Documento removido.');
    renderDocuments();
    updateProgress();
  } catch (err) {
    Toast.error(err.message);
  }
}

/* ===== Progresso e envio ===== */
function updateProgress() {
  const total = state.requiredDocuments.length;
  const uploadedRequired = state.requiredDocuments.filter(rd =>
    state.employee.documents.some(d => d.type === rd.type)
  ).length;

  const personalOk = !!(
    document.getElementById('fCpf')?.value.trim() &&
    document.getElementById('fName')?.value.trim() &&
    document.getElementById('fFuncao')?.value.trim() &&
    document.getElementById('fDob')?.value
  );

  const totalSteps = total + 4; // 4 campos pessoais
  const completedSteps =
    uploadedRequired +
    (document.getElementById('fCpf')?.value.trim() ? 1 : 0) +
    (document.getElementById('fName')?.value.trim() ? 1 : 0) +
    (document.getElementById('fFuncao')?.value.trim() ? 1 : 0) +
    (document.getElementById('fDob')?.value ? 1 : 0);

  const percent = Math.round((completedSteps / totalSteps) * 100);

  const progressCard = document.getElementById('progressCard');
  if (progressCard) {
    progressCard.innerHTML = `
      <div class="progress-info">
        <div class="progress-label">Progresso da admissão</div>
        <div class="progress-value">${uploadedRequired} de ${total} documentos obrigatórios anexados</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
      </div>
      <div class="progress-percent">${percent}%</div>
    `;
  }

  const allDone = personalOk && uploadedRequired === total;
  const btn = document.getElementById('btnSubmit');
  if (btn) btn.disabled = !allDone;

  const info = document.getElementById('actionBarInfo');
  if (info) {
    if (!allDone) {
      const missing = [];
      if (!personalOk) missing.push('preencha todos os dados pessoais');
      const missingDocs = total - uploadedRequired;
      if (missingDocs > 0) missing.push(`anexe ${missingDocs} documento(s) obrigatório(s)`);
      info.innerHTML = `
        <strong>Faltam algumas pendências</strong>
        <div class="text-sm text-muted mt-2">Para enviar: ${missing.join(' e ')}.</div>
      `;
    } else {
      info.innerHTML = `
        <strong>✓ Tudo pronto para envio!</strong>
        <div class="text-sm text-muted mt-2">Confira seus dados antes de prosseguir. Após o envio a edição é bloqueada.</div>
      `;
    }
  }

  const submitBtn = document.getElementById('btnSubmit');
  if (submitBtn && !submitBtn.dataset.bound) {
    submitBtn.dataset.bound = '1';
    submitBtn.addEventListener('click', submitAdmission);
  }
}

async function submitAdmission() {
  const ok = await confirmDialog({
    title: 'Confirmar envio',
    message: 'Deseja enviar a documentação ao RH? Após o envio, a edição será bloqueada até nova reabertura.',
    confirmText: 'Sim, enviar', confirmClass: 'btn-success',
  });
  if (!ok) return;

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Enviando...';

  try {
    await savePersonalData();
    await Api.post(`/admission/${token}/submit`, {});
    Toast.success('Documentação enviada com sucesso!');
    setTimeout(loadAdmission, 600);
  } catch (err) {
    Toast.error(err.message);
    btn.disabled = false;
    btn.innerHTML = '✓ Enviar Documentação';
  }
}
