// js/app.js
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  console.log('[app] running page:', page);

  // simple auth guard: redirect to login if not signed in
  const user = localStorage.getItem('sml_user');
  if (!user && page !== 'login') {
    console.log('[app] no user, redirecting to login');
    window.location.href = 'login_screen.html';
    return;
  }

  // Page-specific initialisers
  const inits = {
    'login': initLogin,
    'new-brief': initNewBrief,
    'confirmation': initConfirmation,
    'list': initList,
    'dashboard': initDashboard
  };

  (inits[page] || (() => console.warn('[app] no init for page:', page)))();
});

/* ========== stubs to fill later ========== */

function initLogin() {
  console.log('[init] login page');
  // Example: handle simple demo login
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email-address')?.value || '';
    localStorage.setItem('sml_user', JSON.stringify({ email, createdAt: new Date().toISOString() }));
    window.location.href = 'dashboard_screen.html';
  });
}

function initNewBrief() {
  console.log('[init] new-brief page');
  // Prefill from draft (if exists) — simple helper
  try {
    const draft = JSON.parse(localStorage.getItem('brief_draft') || '{}');
    if (Object.keys(draft).length) {
      Object.keys(draft).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          el.value = draft[id];
        }
      });
      console.log('[init] loaded draft into form');
    }
  } catch (err) {
    console.warn('Could not parse draft', err);
  }

  // Basic save-draft on form submit (keeps you moving)
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    form.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => data[el.id] = el.value);
    localStorage.setItem('brief_draft', JSON.stringify(data));
    window.location.href = 'brief_confirmation_screen.html';
  });
}

function initConfirmation(){
  console.log('[init] confirmation page');

  const summary = document.getElementById('summary');
  if (!summary) {
    console.warn('[initConfirmation] #summary not found — aborting render.');
    return;
  }

  // load draft OR selected brief
  let draft = JSON.parse(localStorage.getItem('brief_draft') || '{}');
  const selectedId = localStorage.getItem('selected_brief_id');
  if (selectedId) {
    const briefs = JSON.parse(localStorage.getItem('briefs') || '[]');
    const found = briefs.find(b => String(b.id) === String(selectedId));
    if (found) draft = found.data || draft;
    localStorage.removeItem('selected_brief_id');
  }

  if (!Object.keys(draft).length) {
    summary.innerHTML = '<p class="text-sm text-gray-600">No data found. Go back to the form to create a brief.</p>';
    return;
  }

  // friendly label map (add more keys as needed)
  const labels = {
    'campaign-name': 'Campaign Name',
    'campaign-objective': 'Campaign Objective',
    'campaign-type': 'Campaign Type',
    'campaign-budget': 'Campaign Budget',
    'campaign-duration': 'Campaign Duration (days)',
    'campaign-description': 'Description',
    'captcha': 'Captcha'
  };

  let html = '<dl class="space-y-3">';
  for (const key of Object.keys(draft)) {
    const label = labels[key] || key.replace(/[-_]/g, ' ');
    html += `
      <div>
        <dt style="font-weight:600;margin-bottom:4px">${escapeHtml(label)}</dt>
        <dd style="margin:0">${escapeHtml(draft[key] ?? '')}</dd>
      </div>
    `;
  }
  html += '</dl>';
  summary.innerHTML = html;

  // adopt checkbox => enable submit
  const adopt = document.getElementById('adopt');
  const submitBtn = document.getElementById('submitBtn');
  if (adopt && submitBtn) {
    submitBtn.disabled = !adopt.checked;
    adopt.addEventListener('change', (e) => submitBtn.disabled = !e.target.checked);
    submitBtn.addEventListener('click', () => {
      const briefs = JSON.parse(localStorage.getItem('briefs') || '[]');
      briefs.push({ id: Date.now(), data: draft, createdAt: new Date().toISOString() });
      localStorage.setItem('briefs', JSON.stringify(briefs));
      localStorage.removeItem('brief_draft');
      window.location.href = 'brief_list_screen.html';
    });
  }
}

function initList() {
  console.log('[init] list page');
  const tbl = document.querySelector('table tbody');
  if (!tbl) return;
  const briefs = JSON.parse(localStorage.getItem('briefs') || '[]');
  if (!briefs.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-6 py-4" colspan="8">No briefs yet</td>`;
    tbl.appendChild(tr);
    return;
  }
  briefs.forEach(b => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-6 py-4 text-sm font-medium">${escapeHtml(b.data['campaign-name'] || b.data['campaignName'] || 'Untitled')}</td>
      <td class="px-6 py-4 text-sm">${new Date(b.createdAt).toLocaleString()}</td>
      <td class="px-6 py-4 text-sm"><button data-id="${b.id}" class="view-btn">View</button></td>
    `;
    tbl.appendChild(tr);
  });

  // view handler (delegation)
  tbl.addEventListener('click', (e) => {
    if (e.target.matches('.view-btn')) {
      const id = e.target.dataset.id;
      localStorage.setItem('selected_brief_id', id);
      // open confirmation page (it can load selected_brief_id)
      window.location.href = 'brief_confirmation_screen.html';
    }
  });
}

function initDashboard() {
  console.log('[init] dashboard page');

  // show total briefs count (if #brief-count exists)
  const briefs = JSON.parse(localStorage.getItem('briefs') || '[]');
  const el = document.querySelector('#brief-count');
  if (el) el.textContent = briefs.length;

  // handle New Campaign Brief button
  const newBtn = document.getElementById('newBriefBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      window.location.href = 'new_brief_form_screen.html';
    });
  }
}

/* helpers */
function escapeHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
