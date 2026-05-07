/* ================== UTILITIES ================== */

const API_BASE = '/api';

const Toast = {
  show(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fading');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(m, d) { this.show(m, 'success', d); },
  error(m, d)   { this.show(m, 'error', d); },
  warning(m, d) { this.show(m, 'warning', d); },
  info(m, d)    { this.show(m, 'info', d); },
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return '';
  return date.toISOString().split('T')[0];
}

function formatCPF(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14);
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  ta.remove();
  return Promise.resolve();
}

const StatusMap = {
  aguardando_documentacao: { label: 'Aguardando Documentação', class: 'badge-warning' },
  documentacao_recebida:   { label: 'Documentação Recebida',   class: 'badge-success' },
  reaberto_para_correcao:  { label: 'Reaberto para Correção',  class: 'badge-info' },
};

function statusBadge(status) {
  const s = StatusMap[status] || { label: status, class: 'badge-info' };
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

/* ================== HTTP CLIENT ================== */
async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem('admin_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('admin_token');
    if (window.location.pathname.startsWith('/admin/') &&
        !window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.message || `Erro ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const Api = {
  get:  (p)         => apiRequest(p),
  post: (p, body)   => apiRequest(p, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body || {}) }),
  put:  (p, body)   => apiRequest(p, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del:  (p)         => apiRequest(p, { method: 'DELETE' }),
  upload: (p, formData) => apiRequest(p, { method: 'POST', body: formData }),
};

/* ================== MODAL HELPER ================== */
const Modal = {
  open(html, opts = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${opts.large ? 'modal-lg' : ''}">
        ${html}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && opts.dismissible !== false) overlay.remove();
    });
    return overlay;
  },
  close(el) {
    if (el && el.remove) el.remove();
    else document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
  }
};

/* ================== CONFIRM DIALOG ================== */
function confirmDialog({ title, message, confirmText = 'Confirmar', confirmClass = 'btn-primary', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const m = Modal.open(`
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="modal-close" data-act="cancel">✕</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--gray-700); line-height:1.5;">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-act="cancel">${escapeHtml(cancelText)}</button>
        <button class="btn ${confirmClass}" data-act="confirm">${escapeHtml(confirmText)}</button>
      </div>
    `);
    m.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        m.remove();
        resolve(act === 'confirm');
      });
    });
  });
}
