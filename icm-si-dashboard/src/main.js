/**
 * iCM SI Manager Dashboard — Main Application
 */
import { CONFIG } from './config.js';

/* ═══════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════ */
let currentUser = null;
let customersData = [];
let consentData = [];
let consentFilterCustomer = '';
let archivedData = [];

/* ═══════════════════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════════════════ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Screens
const loginScreen    = $('#login-screen');
const dashboardScreen = $('#dashboard-screen');

// Sidebar
const sidebarAvatar  = $('#sidebar-avatar');
const sidebarName    = $('#sidebar-name');
const sidebarEmail   = $('#sidebar-email');

// Pages
const pages = {
  'customers':   $('#page-customers'),
  'consent-log': $('#page-consent-log'),
  'account':     $('#page-account'),
  'archived':    $('#page-archived'),
};

/* ═══════════════════════════════════════════════════════
   AUTH — Simple mock for development, Google SSO for prod
   ═══════════════════════════════════════════════════════ */
function checkAuth() {
  // First, check if we're returning from Google OAuth
  if (handleOAuthCallback()) {
    showDashboard();
    return;
  }

  const stored = localStorage.getItem('icm_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    showDashboard();
    return;
  }
  showLogin();
}

function showLogin() {
  loginScreen.classList.add('active');
  dashboardScreen.classList.remove('active');
}

function showDashboard() {
  loginScreen.classList.remove('active');
  dashboardScreen.classList.add('active');
  updateUserUI();
  navigateTo(window.location.hash?.slice(1) || 'customers');
}

function handleGoogleLogin() {
  // For development: use a mock user
  // In production: integrate Google Identity Services
  if (CONFIG.GOOGLE_CLIENT_ID) {
    // Production Google SSO flow
    initGoogleSSO();
  } else {
    // Dev mock
    currentUser = {
      name: 'SI Manager',
      email: 'admin@icaremanager.com',
      picture: '',
    };
    localStorage.setItem('icm_user', JSON.stringify(currentUser));
    showDashboard();
  }
}

function initGoogleSSO() {
  // Use Google OAuth 2.0 redirect flow (most reliable)
  const params = new URLSearchParams({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    redirect_uri: CONFIG.GOOGLE_REDIRECT_URI,
    response_type: 'token id_token',
    scope: 'openid email profile',
    nonce: Math.random().toString(36).substring(2),
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function handleOAuthCallback() {
  // Check if we're returning from Google OAuth
  const hash = window.location.hash;
  if (!hash || !hash.includes('id_token=')) return false;

  const params = new URLSearchParams(hash.substring(1));
  const idToken = params.get('id_token');
  if (!idToken) return false;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));

    // Domain check — allow any domain for now, restrict later if needed
    // if (payload.hd !== 'icaremanager.com') {
    //   showToast('Access denied. Only @icaremanager.com accounts are authorized.');
    //   return true;
    // }

    currentUser = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
    localStorage.setItem('icm_user', JSON.stringify(currentUser));

    // Clean up URL hash
    history.replaceState(null, '', window.location.pathname);
    return true;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return false;
  }
}

function handleGoogleCredentialResponse(response) {
  // Decode JWT
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  
  // Check domain
  if (payload.hd !== 'icaremanager.com') {
    showToast('Access denied. Only @icaremanager.com accounts are authorized.');
    return;
  }

  currentUser = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture,
  };
  localStorage.setItem('icm_user', JSON.stringify(currentUser));
  showDashboard();
}

function handleSignOut() {
  localStorage.removeItem('icm_user');
  currentUser = null;
  showLogin();
}

function updateUserUI() {
  if (!currentUser) return;
  sidebarName.textContent = currentUser.name;
  sidebarEmail.textContent = currentUser.email;
  if (currentUser.picture) {
    sidebarAvatar.src = currentUser.picture;
  } else {
    sidebarAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=6366f1&color=fff&size=72`;
  }
  
  // Account page
  $('#account-name').textContent = currentUser.name;
  $('#account-email').textContent = currentUser.email;
  const accAvatar = $('#account-avatar');
  accAvatar.src = currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=6366f1&color=fff&size=192`;
  
  // Pre-fill SI manager email
  $('#input-si-email').value = currentUser.email;
}

/* ═══════════════════════════════════════════════════════
   ROUTING
   ═══════════════════════════════════════════════════════ */
function navigateTo(page) {
  // Handle consent-log with customer filter
  if (page.startsWith('consent-log?customer=')) {
    consentFilterCustomer = decodeURIComponent(page.split('customer=')[1]);
    page = 'consent-log';
  }

  const validPages = Object.keys(pages);
  if (!validPages.includes(page)) page = 'customers';

  // Update nav
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  
  // Update pages
  Object.entries(pages).forEach(([key, el]) => {
    el.classList.toggle('active', key === page);
  });

  // Load data
  if (page === 'customers') loadCustomers();
  if (page === 'consent-log') loadConsentLog();
  if (page === 'archived') loadArchived();
}

/* ═══════════════════════════════════════════════════════
   API HELPERS
   ═══════════════════════════════════════════════════════ */
async function apiGet(url) {
  const resp = await fetch(url, {
    headers: { 'X-ICM-Secret': CONFIG.N8N_SECRET },
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const text = await resp.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { return []; }
}

async function apiPost(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ICM-Secret': CONFIG.N8N_SECRET,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const text = await resp.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

/* ═══════════════════════════════════════════════════════
   CUSTOMERS PAGE
   ═══════════════════════════════════════════════════════ */
async function loadCustomers() {
  const skeleton = $('#customers-skeleton');
  const table = $('#customers-table');
  const empty = $('#customers-empty');

  skeleton.classList.remove('hidden');
  table.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    const data = await apiGet(CONFIG.N8N_GET_CUSTOMERS_URL);
    customersData = Array.isArray(data) ? data : [];
    
    if (customersData.length === 0) {
      skeleton.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    // Sort by date descending
    customersData.sort((a, b) => {
      const da = new Date(a['Date Created'] || 0);
      const db = new Date(b['Date Created'] || 0);
      return db - da;
    });

    renderCustomersTable(customersData);
    skeleton.classList.add('hidden');
    table.classList.remove('hidden');
  } catch (err) {
    console.error('Load customers error:', err);
    skeleton.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Failed to load customers. Please try again.';
  }
}

function renderCustomersTable(data) {
  const tbody = $('#customers-tbody');
  tbody.innerHTML = data.map(c => {
    const custKey = (c['Customer Name'] || '') + '|' + (c['PM Email'] || '');
    const isArchived = archivedData.some(a => a._archiveKey === custKey);
    if (isArchived) return ''; // hide archived from active list
    return `
    <tr>
      <td style="color:var(--text-primary);font-weight:500">${esc(c['Customer Name'])}</td>
      <td>${esc(c['PM Name'])}</td>
      <td>${esc(c['PM Email'])}</td>
      <td>${esc(c['SI Manager Email'])}</td>
      <td><span style="color:var(--accent-hover);font-weight:600">${c['Sessions Complete'] || 0}</span></td>
      <td>${esc(c['Date Created'])}</td>
      <td>
        <button class="btn-copy" onclick="copyLink('${esc(c['Full Link'])}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>
      </td>
      <td>
        <button class="btn-secondary" onclick="viewConsentLog('${esc(c['Customer Name'])}')">
          View Consent Log
        </button>
      </td>
      <td>
        <button class="btn-archive" onclick="archiveCustomer('${esc(custKey)}')" title="Archive this customer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          Archive
        </button>
      </td>
    </tr>
  `;
  }).join('');
}

function filterCustomersTable() {
  const query = $('#search-customers').value.toLowerCase();
  const filtered = customersData.filter(c =>
    (c['Customer Name'] || '').toLowerCase().includes(query)
  );
  renderCustomersTable(filtered);
}

/* ── Add Customer ── */
async function handleAddCustomer(e) {
  e.preventDefault();

  const btn = $('#btn-add-customer');
  const successBanner = $('#add-success-banner');
  const errorBanner = $('#add-error-banner');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinning">⟳</span> Creating...';
  successBanner.classList.add('hidden');
  errorBanner.classList.add('hidden');

  const body = {
    customerOrgName: $('#input-org-name').value.trim(),
    pmName: $('#input-pm-name').value.trim(),
    pmEmail: $('#input-pm-email').value.trim(),
    siManagerEmail: $('#input-si-email').value.trim(),
  };

  try {
    const result = await apiPost(CONFIG.N8N_ADD_CUSTOMER_URL, body);
    
    // Show success
    const link = result.fullLink || result['Full Link'] || 
      `https://onboarding.icaremanager.com/discovery?customer=${body.customerOrgName.replace(/[^a-zA-Z0-9\s]/g,'').split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('')}`;
    
    $('#success-message').textContent = `Customer added successfully. Copy the link below and send it to ${body.pmName} at ${body.pmEmail}.`;
    $('#success-link').value = link;
    successBanner.classList.remove('hidden');
    
    // Clear form
    $('#add-customer-form').reset();
    $('#input-si-email').value = currentUser?.email || '';
    
    // Reload table
    loadCustomers();
  } catch (err) {
    console.error('Add customer error:', err);
    $('#add-error-text').textContent = 'Failed to create customer. Please check your connection and try again.';
    errorBanner.classList.remove('hidden');
  }

  btn.disabled = false;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Generate Link & Create Customer`;
}

/* ═══════════════════════════════════════════════════════
   CONSENT LOG PAGE
   ═══════════════════════════════════════════════════════ */
async function loadConsentLog() {
  const skeleton = $('#consent-skeleton');
  const table = $('#consent-table');
  const empty = $('#consent-empty');
  const breadcrumb = $('#consent-breadcrumb');

  skeleton.classList.remove('hidden');
  table.classList.add('hidden');
  empty.classList.add('hidden');

  // Handle breadcrumb
  if (consentFilterCustomer) {
    breadcrumb.classList.remove('hidden');
    $('#breadcrumb-customer').textContent = consentFilterCustomer;
  } else {
    breadcrumb.classList.add('hidden');
  }

  try {
    let url = CONFIG.N8N_GET_CONSENT_LOG_URL;
    if (consentFilterCustomer) {
      url += `?customerName=${encodeURIComponent(consentFilterCustomer)}`;
    }
    const data = await apiGet(url);
    consentData = Array.isArray(data) ? data : [];

    // Check for "no records" response
    if (consentData.length === 1 && consentData[0].message === 'No records found') {
      consentData = [];
    }

    // Update stats
    updateConsentStats(consentData);

    if (consentData.length === 0) {
      skeleton.classList.add('hidden');
      empty.classList.remove('hidden');
      if (consentFilterCustomer) {
        $('#consent-empty-text').textContent = `No consent records yet for ${consentFilterCustomer}. Records will appear here as department heads complete their sessions.`;
      }
      return;
    }

    renderConsentTable(consentData);
    skeleton.classList.add('hidden');
    table.classList.remove('hidden');
  } catch (err) {
    console.error('Load consent error:', err);
    skeleton.classList.add('hidden');
    empty.classList.remove('hidden');
    $('#consent-empty-text').textContent = 'Failed to load consent log. Please try again.';
  }
}

function updateConsentStats(data) {
  $('#stat-total').textContent = data.length;
  
  const uniqueCustomers = new Set(data.map(d => d['Customer Name']).filter(Boolean));
  $('#stat-unique').textContent = uniqueCustomers.size;

  const today = new Date().toLocaleDateString('en-US');
  const todayCount = data.filter(d => {
    const ts = d['Timestamp'];
    if (!ts) return false;
    return new Date(ts).toLocaleDateString('en-US') === today;
  }).length;
  $('#stat-today').textContent = todayCount;
}

function renderConsentTable(data) {
  const tbody = $('#consent-tbody');
  tbody.innerHTML = data.map(c => {
    const ts = c['Timestamp'] ? formatTimestamp(c['Timestamp']) : '—';
    return `
    <tr>
      <td>${ts}</td>
      <td style="color:var(--text-primary);font-weight:500">${esc(c['Customer Name'])}</td>
      <td>${esc(c['First Name'])}</td>
      <td>${esc(c['Last Name'])}</td>
      <td>${esc(c['Email'])}</td>
      <td><code style="font-size:11px;color:var(--text-muted)">${esc((c['Session ID']||'').substring(0,12))}</code></td>
      <td>${esc(c['Consent Version'])}</td>
      <td><code style="font-size:11px;color:var(--text-muted)">${esc(c['IP Address'])}</code></td>
    </tr>
  `;
  }).join('');
}

function filterConsentTable() {
  const query = $('#search-consent').value.toLowerCase();
  const fromDate = $('#filter-date-from').value;
  const toDate = $('#filter-date-to').value;

  let filtered = consentData;

  if (query) {
    filtered = filtered.filter(c =>
      (c['Customer Name'] || '').toLowerCase().includes(query) ||
      (c['Email'] || '').toLowerCase().includes(query) ||
      (c['First Name'] || '').toLowerCase().includes(query) ||
      (c['Last Name'] || '').toLowerCase().includes(query)
    );
  }

  if (fromDate) {
    const from = new Date(fromDate);
    filtered = filtered.filter(c => new Date(c['Timestamp']) >= from);
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setDate(to.getDate() + 1); // Include the full day
    filtered = filtered.filter(c => new Date(c['Timestamp']) <= to);
  }

  updateConsentStats(filtered);
  if (filtered.length > 0) {
    renderConsentTable(filtered);
    $('#consent-table').classList.remove('hidden');
    $('#consent-empty').classList.add('hidden');
  } else {
    $('#consent-table').classList.add('hidden');
    $('#consent-empty').classList.remove('hidden');
    $('#consent-empty-text').textContent = 'No records match your filters.';
  }
}

function exportCSV() {
  const query = $('#search-consent').value.toLowerCase();
  let data = consentData;
  if (query) {
    data = data.filter(c =>
      (c['Customer Name'] || '').toLowerCase().includes(query) ||
      (c['Email'] || '').toLowerCase().includes(query)
    );
  }

  if (data.length === 0) {
    showToast('No data to export.');
    return;
  }

  const headers = ['Timestamp', 'Customer Name', 'First Name', 'Last Name', 'Email', 'Session ID', 'Consent Version', 'IP Address'];
  const rows = data.map(d => headers.map(h => `"${(d[h] || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consent-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('CSV downloaded successfully.');
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return ts; }
}

function showToast(msg) {
  const toast = $('#toast');
  $('#toast-text').textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

// Global functions for inline handlers
window.copyLink = function(link) {
  navigator.clipboard.writeText(link).then(() => showToast('Link copied to clipboard!'));
};

window.viewConsentLog = function(customerName) {
  consentFilterCustomer = customerName;
  window.location.hash = 'consent-log';
  navigateTo('consent-log');
};

/* ═══════════════════════════════════════════════════════
   ARCHIVE SYSTEM
   ═══════════════════════════════════════════════════════ */
function getArchivedFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('icm_archived') || '[]');
  } catch { return []; }
}

function saveArchivedToStorage(data) {
  localStorage.setItem('icm_archived', JSON.stringify(data));
}

function loadArchived() {
  archivedData = getArchivedFromStorage();
  const table = $('#archived-table');
  const empty = $('#archived-empty');

  if (archivedData.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  renderArchivedTable(archivedData);
  table.classList.remove('hidden');
  empty.classList.add('hidden');
}

function renderArchivedTable(data) {
  const tbody = $('#archived-tbody');
  tbody.innerHTML = data.map((c, idx) => `
    <tr>
      <td style="color:var(--text-primary);font-weight:500">${esc(c['Customer Name'])}</td>
      <td>${esc(c['PM Name'])}</td>
      <td>${esc(c['PM Email'])}</td>
      <td>${esc(c['SI Manager Email'])}</td>
      <td>${esc(c['Date Created'])}</td>
      <td>${esc(c._archivedOn || '—')}</td>
      <td class="archive-actions">
        <button class="btn-restore" onclick="restoreCustomer(${idx})" title="Restore to active">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          Restore
        </button>
        <button class="btn-delete" onclick="deleteArchivedCustomer(${idx})" title="Permanently delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function filterArchivedTable() {
  const query = $('#search-archived').value.toLowerCase();
  const filtered = archivedData.filter(c =>
    (c['Customer Name'] || '').toLowerCase().includes(query) ||
    (c['PM Name'] || '').toLowerCase().includes(query) ||
    (c['PM Email'] || '').toLowerCase().includes(query)
  );
  if (filtered.length > 0) {
    renderArchivedTable(filtered);
    $('#archived-table').classList.remove('hidden');
    $('#archived-empty').classList.add('hidden');
  } else {
    $('#archived-table').classList.add('hidden');
    $('#archived-empty').classList.remove('hidden');
    $('#archived-empty-text').textContent = 'No archived customers match your search.';
  }
}

window.archiveCustomer = function(custKey) {
  const customer = customersData.find(c => {
    const key = (c['Customer Name'] || '') + '|' + (c['PM Email'] || '');
    return key === custKey;
  });
  if (!customer) return;

  if (!confirm(`Archive "${customer['Customer Name']}"?\n\nThis will hide the customer from the active list. You can restore them anytime from the Archived page.`)) {
    return;
  }

  archivedData = getArchivedFromStorage();
  const archiveEntry = { ...customer, _archiveKey: custKey, _archivedOn: new Date().toLocaleDateString('en-US') };
  archivedData.push(archiveEntry);
  saveArchivedToStorage(archivedData);

  // Re-render customers table (archived ones will be hidden)
  renderCustomersTable(customersData);
  showToast(`"${customer['Customer Name']}" has been archived.`);
};

window.restoreCustomer = function(idx) {
  archivedData = getArchivedFromStorage();
  if (idx < 0 || idx >= archivedData.length) return;

  const customer = archivedData[idx];
  if (!confirm(`Restore "${customer['Customer Name']}" to active customers?`)) return;

  archivedData.splice(idx, 1);
  saveArchivedToStorage(archivedData);
  loadArchived();
  showToast(`"${customer['Customer Name']}" has been restored.`);
};

window.deleteArchivedCustomer = function(idx) {
  archivedData = getArchivedFromStorage();
  if (idx < 0 || idx >= archivedData.length) return;

  const customer = archivedData[idx];
  if (!confirm(`⚠️ Permanently delete "${customer['Customer Name']}"?\n\nThis action cannot be undone.`)) return;

  archivedData.splice(idx, 1);
  saveArchivedToStorage(archivedData);
  loadArchived();
  showToast(`"${customer['Customer Name']}" has been permanently deleted.`);
};

/* ═══════════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Auth
  $('#btn-google-login').addEventListener('click', handleGoogleLogin);
  $('#btn-sign-out').addEventListener('click', handleSignOut);

  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      consentFilterCustomer = ''; // Reset filter when navigating normally
      window.location.hash = page;
      navigateTo(page);
    });
  });

  // Hash change
  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash.slice(1) || 'customers');
  });

  // Add Customer form
  $('#add-customer-form').addEventListener('submit', handleAddCustomer);

  // Copy link in success banner
  $('#btn-copy-link').addEventListener('click', () => {
    const link = $('#success-link').value;
    navigator.clipboard.writeText(link).then(() => showToast('Link copied to clipboard!'));
  });

  // Search & Filter
  $('#search-customers').addEventListener('input', filterCustomersTable);
  $('#search-consent').addEventListener('input', filterConsentTable);
  $('#filter-date-from').addEventListener('change', filterConsentTable);
  $('#filter-date-to').addEventListener('change', filterConsentTable);

  // Refresh buttons
  $('#btn-refresh-customers').addEventListener('click', () => {
    const icon = $('#btn-refresh-customers').querySelector('svg');
    icon.classList.add('spinning');
    loadCustomers().finally(() => icon.classList.remove('spinning'));
  });
  $('#btn-refresh-consent').addEventListener('click', () => {
    const icon = $('#btn-refresh-consent').querySelector('svg');
    icon.classList.add('spinning');
    loadConsentLog().finally(() => icon.classList.remove('spinning'));
  });

  // Export CSV
  $('#btn-export-csv').addEventListener('click', exportCSV);

  // Retry add customer
  $('#btn-retry-add').addEventListener('click', () => {
    $('#add-error-banner').classList.add('hidden');
  });

  // Breadcrumb back link
  const backLink = document.querySelector('.breadcrumb-link');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      consentFilterCustomer = '';
      window.location.hash = 'customers';
      navigateTo('customers');
    });
  }

  // Archived search
  const searchArchived = $('#search-archived');
  if (searchArchived) {
    searchArchived.addEventListener('input', filterArchivedTable);
  }

  // Load archived data on startup
  archivedData = getArchivedFromStorage();

  // Check auth
  checkAuth();
});
