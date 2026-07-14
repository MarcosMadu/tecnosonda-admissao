/* =============== PORTAL PÚBLICO DE VAGAS =============== */

let vagas = [];
let vagaSelecionada = null;
let arquivoCurriculo = null;

const MAX_CV_SIZE = 10 * 1024 * 1024; // 10MB
const CV_EXT = ['pdf', 'doc', 'docx'];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  loadVagas();

  document.getElementById('btnBack').addEventListener('click', () => showStep('jobs'));
  document.getElementById('btnNewApply').addEventListener('click', () => {
    document.getElementById('applyForm').reset();
    resetUpload();
    loadVagas();
    showStep('jobs');
  });

  document.getElementById('jobSelect').addEventListener('change', (e) => {
    const vaga = vagas.find((v) => v._id === e.target.value);
    if (vaga) selecionarVaga(vaga, false);
  });

  document.getElementById('telefoneInput').addEventListener('input', (e) => {
    e.target.value = maskTelefone(e.target.value);
  });

  setupUpload();
  document.getElementById('applyForm').addEventListener('submit', enviarCandidatura);
});

function showStep(step) {
  ['jobs', 'form', 'success'].forEach((s) => {
    const el = document.getElementById(`step${s.charAt(0).toUpperCase() + s.slice(1)}`);
    el.classList.toggle('hidden', s !== step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =============== VAGAS =============== */
async function loadVagas() {
  const list = document.getElementById('vagasList');
  list.innerHTML = '<div class="vagas-loading"><div class="spinner"></div> Carregando vagas...</div>';

  try {
    const data = await Api.get('/vagas');
    vagas = data.jobs || [];
    renderVagas();
    renderJobSelect();
  } catch (err) {
    list.innerHTML = `<div class="vagas-empty">Não foi possível carregar as vagas no momento. Tente novamente mais tarde.</div>`;
  }
}

function renderVagas() {
  const list = document.getElementById('vagasList');

  if (vagas.length === 0) {
    list.innerHTML = `
      <div class="vagas-empty">
        <div style="font-size:2.5rem; margin-bottom:10px;">📭</div>
        <h3 style="margin-bottom:6px;">Nenhuma vaga aberta no momento</h3>
        <p>Volte em breve — novas oportunidades são publicadas com frequência.</p>
      </div>`;
    return;
  }

  list.innerHTML = vagas
    .map(
      (v) => `
    <article class="vaga-card" data-id="${v._id}">
      <div class="vaga-card-head">
        <h3>${escapeHtml(v.titulo)}</h3>
        ${
          v.vagasRestantes !== null
            ? `<span class="badge badge-warning">${v.vagasRestantes} vaga(s) restante(s)</span>`
            : `<span class="badge badge-success">Vagas abertas</span>`
        }
      </div>
      <div class="vaga-card-meta">
        ${v.setor ? `<span>🏢 ${escapeHtml(v.setor)}</span>` : ''}
        ${v.local ? `<span>📍 ${escapeHtml(v.local)}</span>` : ''}
        ${v.tipoContrato ? `<span>📄 ${escapeHtml(v.tipoContrato)}</span>` : ''}
      </div>
      ${v.descricao ? `<p class="vaga-card-desc">${escapeHtml(v.descricao)}</p>` : ''}
      ${
        v.requisitos
          ? `<div class="vaga-card-req"><strong>Requisitos:</strong> ${escapeHtml(v.requisitos)}</div>`
          : ''
      }
      <button class="btn btn-primary btn-block" data-apply="${v._id}">Candidatar-se a esta vaga</button>
    </article>`
    )
    .join('');

  list.querySelectorAll('[data-apply]').forEach((b) =>
    b.addEventListener('click', () => {
      const vaga = vagas.find((v) => v._id === b.dataset.apply);
      selecionarVaga(vaga, true);
    })
  );
}

function renderJobSelect() {
  const select = document.getElementById('jobSelect');
  select.innerHTML =
    `<option value="">Selecione a vaga...</option>` +
    vagas.map((v) => `<option value="${v._id}">${escapeHtml(v.titulo)}</option>`).join('');
}

function selecionarVaga(vaga, irParaForm) {
  if (!vaga) return;
  vagaSelecionada = vaga;

  document.getElementById('jobSelect').value = vaga._id;
  document.getElementById('selectedJobTitle').textContent = vaga.titulo;
  document.getElementById('selectedJobSub').textContent = [
    vaga.setor,
    vaga.local,
    vaga.tipoContrato,
  ]
    .filter(Boolean)
    .join(' • ');

  if (irParaForm) showStep('form');
}

/* =============== UPLOAD =============== */
function setupUpload() {
  const box = document.getElementById('uploadBox');
  const input = document.getElementById('curriculoInput');

  input.addEventListener('change', () => {
    if (input.files[0]) validarArquivo(input.files[0]);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    box.addEventListener(ev, (e) => {
      e.preventDefault();
      box.classList.add('dragging');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    box.addEventListener(ev, (e) => {
      e.preventDefault();
      box.classList.remove('dragging');
    })
  );

  box.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    validarArquivo(file);
  });
}

function validarArquivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (!CV_EXT.includes(ext)) {
    Toast.error('Formato inválido. Envie o currículo em PDF, DOC ou DOCX.');
    resetUpload();
    return;
  }
  if (file.size > MAX_CV_SIZE) {
    Toast.error('Arquivo muito grande. O limite é 10MB.');
    resetUpload();
    return;
  }

  arquivoCurriculo = file;
  document.getElementById('uploadBox').classList.add('filled');
  document.getElementById('uploadText').innerHTML = `
    <strong>${escapeHtml(file.name)}</strong><br />
    <span class="text-sm text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB — clique para trocar</span>
  `;
}

function resetUpload() {
  arquivoCurriculo = null;
  const input = document.getElementById('curriculoInput');
  input.value = '';
  document.getElementById('uploadBox').classList.remove('filled');
  document.getElementById('uploadText').innerHTML =
    '<strong>Clique para anexar</strong> ou arraste seu currículo aqui';
}

/* =============== ENVIO =============== */
async function enviarCandidatura(e) {
  e.preventDefault();

  const form = e.target;
  const btn = document.getElementById('btnSubmit');

  if (!arquivoCurriculo) {
    Toast.error('Anexe o seu currículo antes de enviar.');
    return;
  }
  if (!form.jobId.value) {
    Toast.error('Selecione a vaga desejada.');
    return;
  }

  const fd = new FormData();
  fd.append('nome', form.nome.value.trim());
  fd.append('idade', form.idade.value);
  fd.append('sexo', form.sexo.value);
  fd.append('telefone', form.telefone.value.trim());
  fd.append('email', form.email.value.trim());
  fd.append('cidade', form.cidade.value.trim());
  // jobId precisa ir ANTES do arquivo (usado para definir a pasta no Cloudinary)
  fd.append('jobId', form.jobId.value);
  fd.append('curriculo', arquivoCurriculo);

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Enviando...';

  try {
    const data = await Api.upload('/vagas/candidatar', fd);
    document.getElementById('successMsg').textContent =
      `Recebemos sua candidatura para a vaga de ${data.candidate.jobTitulo}. Nosso RH entrará em contato caso seu perfil seja selecionado.`;
    form.reset();
    resetUpload();
    showStep('success');
  } catch (err) {
    Toast.error(err.message || 'Erro ao enviar candidatura.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Enviar candidatura';
  }
}

/* =============== MÁSCARA =============== */
function maskTelefone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
}
