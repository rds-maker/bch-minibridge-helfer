// ============================================================
//  MINI-BRIDGE HELFER – Hauptapplikation
// ============================================================

const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS         = ['So','Mo','Di','Mi','Do','Fr','Sa'];

let currentUser = null;
let currentStandortId = null;
let toastTimer = null;
let adminMode = false;
let adminTab = 'standorte';

// ---- Utilities ------------------------------------------------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function parseDatum(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function formatDatum(dateStr) {
  const d = parseDatum(dateStr);
  return `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(n=>n[0]).join('').toUpperCase().slice(0,2);
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  const icons = { success:'ti-circle-check', error:'ti-circle-x', info:'ti-info-circle' };
  t.className = `toast toast-${type} show`;
  t.innerHTML = `<i class="ti ${icons[type]||icons.info}"></i> ${msg}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function render(html) {
  document.getElementById('app').innerHTML = html;
}

// ---- Loading spinner ------------------------------------------
function showLoading(msg='Lade…') {
  render(`<div class="loading"><i class="ti ti-loader-2 spin"></i> ${msg}</div>`);
}

// ==============================================================
//  SCREEN: LOGIN
// ==============================================================

function screenLogin() {
  adminMode = false;
  currentUser = null;
  render(`
    <div class="screen-center">
      <div class="login-card">
        <div class="brand" style="margin-bottom:1.8rem">
          <div class="brand-icon"><i class="ti ti-cards"></i></div>
          <div>
            <h1>${esc(CONFIG.APP_TITLE)}</h1>
            <p>Einführungskurse — Helfer-Eintragung</p>
          </div>
        </div>
        <div class="form-group">
          <label for="inp-v">Vorname</label>
          <input type="text" id="inp-v" placeholder="z.B. Anna" autocomplete="given-name">
        </div>
        <div class="form-group">
          <label for="inp-n">Nachname</label>
          <input type="text" id="inp-n" placeholder="z.B. Müller" autocomplete="family-name">
        </div>
        <p class="error-msg" id="login-err" style="display:none">Bitte Vor- und Nachname eingeben.</p>
        <button class="btn-primary" id="login-btn">Weiter <i class="ti ti-arrow-right"></i></button>
        <div class="admin-link">
          <a href="#" id="admin-link"><i class="ti ti-shield-lock"></i> Admin-Bereich</a>
        </div>
      </div>
    </div>`);

  const doLogin = () => {
    const v = document.getElementById('inp-v').value.trim();
    const n = document.getElementById('inp-n').value.trim();
    if (!v || !n) { document.getElementById('login-err').style.display='block'; return; }
    currentUser = { vorname:v, nachname:n, full:`${v} ${n}` };
    screenStandorte();
  };
  document.getElementById('login-btn').onclick = doLogin;
  document.getElementById('inp-v').onkeydown = e => { if(e.key==='Enter') document.getElementById('inp-n').focus(); };
  document.getElementById('inp-n').onkeydown = e => { if(e.key==='Enter') doLogin(); };
  document.getElementById('admin-link').onclick = e => { e.preventDefault(); screenAdminLogin(); };
  document.getElementById('inp-v').focus();
}

// ==============================================================
//  SCREEN: STANDORTE
// ==============================================================

async function screenStandorte() {
  showLoading('Lade Standorte…');
  const data = await Storage.getData();

  const cards = data.standorte.map(s => {
    const termine = data.termine.filter(t => t.standortId === s.id);
    const myCount = termine.filter(t => (data.anmeldungen[t.id]||[]).includes(currentUser.full)).length;
    const badge = myCount > 0
      ? `<span class="badge badge-green"><i class="ti ti-check"></i> ${myCount} eingetragen</span>`
      : `<span class="badge badge-gray">${termine.length} Termin${termine.length!==1?'e':''}</span>`;
    return `
      <div class="standort-card" data-id="${esc(s.id)}">
        <div class="standort-icon"><i class="ti ti-map-pin"></i></div>
        <div class="standort-body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.beschreibung||'')}</p>
        </div>
        ${badge}
        <i class="ti ti-chevron-right standort-arrow"></i>
      </div>`;
  }).join('');

  render(`
    <div class="page">
      <header class="topbar">
        <div class="brand-sm">
          <div class="brand-icon-sm"><i class="ti ti-cards"></i></div>
          <span>${esc(CONFIG.APP_TITLE)}</span>
        </div>
        <div class="user-chip">
          <div class="avatar">${getInitials(currentUser.full)}</div>
          <span>${esc(currentUser.full)}</span>
          <button class="icon-btn" id="logout-btn" title="Abmelden"><i class="ti ti-logout"></i></button>
        </div>
      </header>
      <div class="content">
        <p class="section-title">Standort wählen</p>
        <div class="standort-list">
          ${cards || '<p class="empty">Noch keine Standorte vorhanden.</p>'}
        </div>
      </div>
    </div>`);

  document.getElementById('logout-btn').onclick = screenLogin;
  document.querySelectorAll('.standort-card').forEach(el => {
    el.onclick = () => { currentStandortId = el.dataset.id; screenTermine(); };
  });
}

// ==============================================================
//  SCREEN: TERMINE
// ==============================================================

async function screenTermine() {
  showLoading('Lade Termine…');
  const data = await Storage.getData();
  const standort = data.standorte.find(s => s.id === currentStandortId);
  if (!standort) { screenStandorte(); return; }

  const termine = data.termine
    .filter(t => t.standortId === currentStandortId)
    .sort((a,b) => a.datum.localeCompare(b.datum));

  // My registrations block
  const myTermine = termine.filter(t => (data.anmeldungen[t.id]||[]).includes(currentUser.full));
  const myBlock = myTermine.length ? `
    <div class="my-registrations">
      <h4><i class="ti ti-circle-check"></i> Deine Eintragungen</h4>
      ${myTermine.map(t=>`<div class="my-reg-item"><i class="ti ti-clock"></i>${formatDatum(t.datum)} — ${t.zeit} Uhr</div>`).join('')}
    </div>` : '';

  const rows = termine.map(t => {
    const regs = data.anmeldungen[t.id] || [];
    const isMe = regs.includes(currentUser.full);
    const isFull = regs.length >= t.maxHelfer && !isMe;
    const d = parseDatum(t.datum);
    const chips = regs.map(r =>
      `<span class="helfer-chip${r===currentUser.full?' is-me':''}">${esc(r)}</span>`
    ).join('');
    const slotBadge = isMe
      ? `<span class="badge badge-green">Eingetragen</span>`
      : isFull
        ? `<span class="badge badge-red">Besetzt</span>`
        : `<span class="badge badge-gray">${regs.length}/${t.maxHelfer}</span>`;
    const btn = isMe
      ? `<button class="reg-btn austragen" data-id="${esc(t.id)}"><i class="ti ti-x"></i> Austragen</button>`
      : `<button class="reg-btn eintragen" data-id="${esc(t.id)}" ${isFull?'disabled':''}><i class="ti ti-plus"></i> Eintragen</button>`;

    return `
      <div class="termin-row ${isMe?'is-mine':''} ${isFull&&!isMe?'is-full':''}">
        <div class="date-block">
          <div class="date-day">${d.getDate()}</div>
          <div class="date-mon">${MONTHS_SHORT[d.getMonth()]}</div>
          <div class="date-dow">${DAYS[d.getDay()]}</div>
        </div>
        <div class="termin-info">
          <div class="termin-title">${esc(t.titel||'Kurs')} — ${esc(t.zeit)} Uhr</div>
          <div class="termin-meta">${esc(standort.name)} &middot; max. ${t.maxHelfer} Helfer</div>
          <div class="helfer-chips">${chips}</div>
        </div>
        ${slotBadge}
        ${btn}
      </div>`;
  }).join('');

  render(`
    <div class="page">
      <header class="topbar">
        <button class="back-btn" id="back-btn"><i class="ti ti-arrow-left"></i> Standorte</button>
        <div class="user-chip">
          <div class="avatar">${getInitials(currentUser.full)}</div>
          <span>${esc(currentUser.full)}</span>
        </div>
      </header>
      <div class="content">
        <p class="section-title">${esc(standort.name)}</p>
        ${myBlock}
        <div class="termine-list">
          ${rows || '<p class="empty">Noch keine Termine für diesen Standort.</p>'}
        </div>
      </div>
    </div>`);

  document.getElementById('back-btn').onclick = screenStandorte;

  document.querySelectorAll('.reg-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      await Storage.setData(d => {
        if (!d.anmeldungen[id]) d.anmeldungen[id] = [];
        const list = d.anmeldungen[id];
        const idx = list.indexOf(currentUser.full);
        if (idx >= 0) { list.splice(idx,1); }
        else { list.push(currentUser.full); }
      });
      showToast(btn.classList.contains('austragen') ? 'Austragung gespeichert' : 'Erfolgreich eingetragen!');
      screenTermine();
    };
  });
}

// ==============================================================
//  SCREEN: ADMIN LOGIN
// ==============================================================

function screenAdminLogin() {
  render(`
    <div class="screen-center">
      <div class="login-card">
        <div class="brand" style="margin-bottom:1.8rem">
          <div class="brand-icon" style="background:#1C1C1A"><i class="ti ti-shield-lock"></i></div>
          <div><h1>Admin</h1><p>${esc(CONFIG.APP_TITLE)}</p></div>
        </div>
        <div class="form-group">
          <label>Passwort</label>
          <input type="password" id="admin-pw" placeholder="••••••••">
        </div>
        <p class="error-msg" id="admin-err" style="display:none">Falsches Passwort.</p>
        <button class="btn-primary" id="admin-login-btn">Anmelden</button>
        <div class="admin-link">
          <a href="#" id="back-to-login"><i class="ti ti-arrow-left"></i> Zurück</a>
        </div>
      </div>
    </div>`);

  const doAdminLogin = () => {
    if (document.getElementById('admin-pw').value === CONFIG.ADMIN_PASSWORD) {
      adminMode = true;
      screenAdmin();
    } else {
      document.getElementById('admin-err').style.display = 'block';
    }
  };
  document.getElementById('admin-login-btn').onclick = doAdminLogin;
  document.getElementById('admin-pw').onkeydown = e => { if(e.key==='Enter') doAdminLogin(); };
  document.getElementById('back-to-login').onclick = e => { e.preventDefault(); screenLogin(); };
  document.getElementById('admin-pw').focus();
}

// ==============================================================
//  SCREEN: ADMIN
// ==============================================================

async function screenAdmin(tab) {
  if (tab) adminTab = tab;
  showLoading('Lade Admin-Bereich…');
  const data = await Storage.getData(true);

  const tabs = [
    { id:'standorte', icon:'ti-map-pin',    label:'Standorte' },
    { id:'termine',   icon:'ti-calendar',   label:'Termine' },
    { id:'helfer',    icon:'ti-users',       label:'Helfer' },
    { id:'export',    icon:'ti-download',   label:'Export' },
  ].map(t => `
    <button class="admin-tab ${adminTab===t.id?'active':''}" data-tab="${t.id}">
      <i class="ti ${t.icon}"></i> ${t.label}
    </button>`).join('');

  const content = adminTab === 'standorte' ? adminTabStandorte(data)
    : adminTab === 'termine'  ? adminTabTermine(data)
    : adminTab === 'helfer'   ? adminTabHelfer(data)
    : adminTabExport(data);

  render(`
    <div class="page">
      <header class="topbar admin-topbar">
        <div class="brand-sm">
          <div class="brand-icon-sm" style="background:#1D9E75"><i class="ti ti-shield-lock"></i></div>
          <span>Admin — ${esc(CONFIG.APP_TITLE)}</span>
        </div>
        <button class="icon-btn" id="admin-logout" title="Admin abmelden"><i class="ti ti-logout"></i></button>
      </header>
      <div class="admin-tabs">${tabs}</div>
      <div class="content">${content}</div>
    </div>`);

  document.getElementById('admin-logout').onclick = screenLogin;
  document.querySelectorAll('.admin-tab').forEach(el => {
    el.onclick = () => screenAdmin(el.dataset.tab);
  });
  attachAdminHandlers(data);
}

// ---- Tab: Standorte -------------------------------------------

function adminTabStandorte(data) {
  const rows = data.standorte.map(s => {
    const count = data.termine.filter(t=>t.standortId===s.id).length;
    return `<tr>
      <td><strong>${esc(s.name)}</strong></td>
      <td>${esc(s.beschreibung||'—')}</td>
      <td><span class="badge badge-gray">${count} Termine</span></td>
      <td class="td-actions">
        <button class="btn-secondary btn-edit-standort" data-id="${esc(s.id)}"><i class="ti ti-edit"></i></button>
        <button class="btn-danger btn-del-standort" data-id="${esc(s.id)}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <p class="section-title" style="margin:0">Standorte</p>
      <button class="btn-secondary" id="btn-add-standort"><i class="ti ti-plus"></i> Standort hinzufügen</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Beschreibung</th><th>Termine</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="empty">Noch keine Standorte.</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ---- Tab: Termine ---------------------------------------------

function adminTabTermine(data) {
  const sorted = [...data.termine].sort((a,b)=>a.datum.localeCompare(b.datum));
  const rows = sorted.map(t => {
    const s = data.standorte.find(s=>s.id===t.standortId);
    const regs = (data.anmeldungen[t.id]||[]).length;
    return `<tr>
      <td>${esc(t.titel||'—')}</td>
      <td>${esc(s?s.name:'?')}</td>
      <td>${formatDatum(t.datum)}</td>
      <td>${esc(t.zeit)} Uhr</td>
      <td><span class="badge ${regs>=t.maxHelfer?'badge-red':'badge-gray'}">${regs}/${t.maxHelfer}</span></td>
      <td class="td-actions">
        <button class="btn-secondary btn-edit-termin" data-id="${esc(t.id)}"><i class="ti ti-edit"></i></button>
        <button class="btn-danger btn-del-termin" data-id="${esc(t.id)}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  const standortOpts = data.standorte.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <p class="section-title" style="margin:0">Termine</p>
      <button class="btn-secondary" id="btn-add-termin"><i class="ti ti-plus"></i> Termin hinzufügen</button>
    </div>
    <div id="standort-opts-hidden" style="display:none">${standortOpts}</div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Titel</th><th>Standort</th><th>Datum</th><th>Zeit</th><th>Helfer</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">Noch keine Termine.</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ---- Tab: Helfer ----------------------------------------------

function adminTabHelfer(data) {
  const sorted = [...data.termine].sort((a,b)=>a.datum.localeCompare(b.datum));
  const rows = sorted.flatMap(t => {
    const s = data.standorte.find(s=>s.id===t.standortId);
    const regs = data.anmeldungen[t.id] || [];
    if (!regs.length) return [];
    return regs.map((r,i) => `<tr>
      <td>${i===0 ? esc(s?s.name:'?') : ''}</td>
      <td>${i===0 ? formatDatum(t.datum) : ''}</td>
      <td>${i===0 ? esc(t.zeit)+' Uhr' : ''}</td>
      <td><div class="user-chip" style="gap:8px"><div class="avatar" style="width:26px;height:26px;font-size:10px">${getInitials(r)}</div><span>${esc(r)}</span></div></td>
      <td><button class="btn-danger btn-del-reg" data-tid="${esc(t.id)}" data-name="${esc(r)}"><i class="ti ti-trash"></i></button></td>
    </tr>`);
  }).join('');

  const total = Object.values(data.anmeldungen).reduce((s,v)=>s+v.length, 0);
  const uniqueNames = [...new Set(Object.values(data.anmeldungen).flat())];
  return `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">Eintragungen total</div></div>
      <div class="stat-card"><div class="stat-num">${uniqueNames.length}</div><div class="stat-lbl">Verschiedene Helfer</div></div>
      <div class="stat-card"><div class="stat-num">${data.termine.length}</div><div class="stat-lbl">Termine total</div></div>
      <div class="stat-card"><div class="stat-num">${data.standorte.length}</div><div class="stat-lbl">Standorte</div></div>
    </div>
    <p class="section-title">Alle Eintragungen</p>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Standort</th><th>Datum</th><th>Zeit</th><th>Helfer</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty">Noch keine Eintragungen.</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ---- Tab: Export ----------------------------------------------

function adminTabExport(data) {
  return `
    <p class="section-title">Daten exportieren</p>
    <div class="export-section">
      <h3><i class="ti ti-file-spreadsheet" style="margin-right:6px"></i>CSV — Alle Eintragungen</h3>
      <p>Alle Helfer-Eintragungen als CSV-Datei (Excel-kompatibel).</p>
      <button class="btn-secondary" id="btn-export-csv"><i class="ti ti-download"></i> CSV herunterladen</button>
    </div>
    <div class="export-section">
      <h3><i class="ti ti-file-code" style="margin-right:6px"></i>JSON — Rohdaten</h3>
      <p>Komplette Datensicherung aller Standorte, Termine und Anmeldungen.</p>
      <button class="btn-secondary" id="btn-export-json"><i class="ti ti-download"></i> JSON herunterladen</button>
    </div>`;
}

// ---- Attach handlers -----------------------------------------

function attachAdminHandlers(data) {
  // Add Standort
  const btnAddS = document.getElementById('btn-add-standort');
  if (btnAddS) btnAddS.onclick = () => modalStandort(null, data);

  // Edit/Delete Standort
  document.querySelectorAll('.btn-edit-standort').forEach(btn => {
    btn.onclick = () => {
      const s = data.standorte.find(s=>s.id===btn.dataset.id);
      if (s) modalStandort(s, data);
    };
  });
  document.querySelectorAll('.btn-del-standort').forEach(btn => {
    btn.onclick = () => {
      const s = data.standorte.find(s=>s.id===btn.dataset.id);
      if (!s) return;
      const termCount = data.termine.filter(t=>t.standortId===s.id).length;
      const msg = termCount > 0
        ? `Standort „${s.name}" und alle ${termCount} Termine dazu wirklich löschen?`
        : `Standort „${s.name}" wirklich löschen?`;
      if (!confirm(msg)) return;
      Storage.setData(d => {
        d.standorte = d.standorte.filter(x=>x.id!==s.id);
        const ids = d.termine.filter(t=>t.standortId===s.id).map(t=>t.id);
        d.termine = d.termine.filter(t=>t.standortId!==s.id);
        ids.forEach(id => delete d.anmeldungen[id]);
      }).then(() => { showToast('Standort gelöscht'); screenAdmin(); });
    };
  });

  // Add Termin
  const btnAddT = document.getElementById('btn-add-termin');
  if (btnAddT) btnAddT.onclick = () => modalTermin(null, data);

  // Edit/Delete Termin
  document.querySelectorAll('.btn-edit-termin').forEach(btn => {
    btn.onclick = () => {
      const t = data.termine.find(t=>t.id===btn.dataset.id);
      if (t) modalTermin(t, data);
    };
  });
  document.querySelectorAll('.btn-del-termin').forEach(btn => {
    btn.onclick = async () => {
      const t = data.termine.find(t=>t.id===btn.dataset.id);
      if (!t || !confirm('Termin wirklich löschen?')) return;
      await Storage.setData(d => {
        d.termine = d.termine.filter(x=>x.id!==t.id);
        delete d.anmeldungen[t.id];
      });
      showToast('Termin gelöscht');
      screenAdmin();
    };
  });

  // Delete registration
  document.querySelectorAll('.btn-del-reg').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Eintragung von „${btn.dataset.name}" wirklich entfernen?`)) return;
      await Storage.setData(d => {
        const list = d.anmeldungen[btn.dataset.tid] || [];
        d.anmeldungen[btn.dataset.tid] = list.filter(n=>n!==btn.dataset.name);
      });
      showToast('Eintragung entfernt');
      screenAdmin();
    };
  });

  // Export CSV
  const btnCsv = document.getElementById('btn-export-csv');
  if (btnCsv) btnCsv.onclick = () => exportCsv(data);

  // Export JSON
  const btnJson = document.getElementById('btn-export-json');
  if (btnJson) btnJson.onclick = () => exportJson(data);
}

// ---- Modals --------------------------------------------------

function modalStandort(standort, data) {
  const isNew = !standort;
  openModal(isNew ? 'Standort hinzufügen' : 'Standort bearbeiten', `
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="m-name" value="${esc(standort?.name||'')}" placeholder="z.B. Zürich">
    </div>
    <div class="form-group">
      <label>Beschreibung (optional)</label>
      <input type="text" id="m-desc" value="${esc(standort?.beschreibung||'')}" placeholder="z.B. Innenstadt">
    </div>
    <p class="error-msg" id="m-err" style="display:none">Name ist erforderlich.</p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn-primary" style="width:auto" id="m-save">
        <i class="ti ti-check"></i> ${isNew?'Hinzufügen':'Speichern'}
      </button>
    </div>`);

  document.getElementById('m-name').focus();
  document.getElementById('m-save').onclick = async () => {
    const name = document.getElementById('m-name').value.trim();
    const beschreibung = document.getElementById('m-desc').value.trim();
    if (!name) { document.getElementById('m-err').style.display='block'; return; }
    await Storage.setData(d => {
      if (isNew) {
        d.standorte.push({ id: uid(), name, beschreibung });
      } else {
        const s = d.standorte.find(s=>s.id===standort.id);
        if (s) { s.name = name; s.beschreibung = beschreibung; }
      }
    });
    closeModal();
    showToast(isNew ? 'Standort hinzugefügt' : 'Standort gespeichert');
    screenAdmin();
  };
}

function modalTermin(termin, data) {
  const isNew = !termin;
  const opts = data.standorte.map(s =>
    `<option value="${esc(s.id)}" ${termin?.standortId===s.id?'selected':''}>${esc(s.name)}</option>`
  ).join('');

  if (!data.standorte.length) {
    showToast('Zuerst einen Standort anlegen.', 'error'); return;
  }

  openModal(isNew ? 'Termin hinzufügen' : 'Termin bearbeiten', `
    <div class="form-group">
      <label>Titel</label>
      <input type="text" id="m-titel" value="${esc(termin?.titel||'')}" placeholder="z.B. Einführungskurs Mini-Bridge">
    </div>
    <div class="form-group">
      <label>Standort</label>
      <select id="m-standort">${opts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Datum</label>
        <input type="date" id="m-datum" value="${esc(termin?.datum||'')}">
      </div>
      <div class="form-group">
        <label>Zeit</label>
        <input type="time" id="m-zeit" value="${esc(termin?.zeit||'18:30')}">
      </div>
    </div>
    <div class="form-group">
      <label>Maximale Helferanzahl</label>
      <input type="number" id="m-max" value="${termin?.maxHelfer||CONFIG.DEFAULT_MAX_HELFER}" min="1" max="20">
    </div>
    <p class="error-msg" id="m-err" style="display:none">Bitte alle Felder ausfüllen.</p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn-primary" style="width:auto" id="m-save">
        <i class="ti ti-check"></i> ${isNew?'Hinzufügen':'Speichern'}
      </button>
    </div>`);

  document.getElementById('m-save').onclick = async () => {
    const titel     = document.getElementById('m-titel').value.trim();
    const standortId = document.getElementById('m-standort').value;
    const datum      = document.getElementById('m-datum').value;
    const zeit       = document.getElementById('m-zeit').value;
    const maxHelfer  = parseInt(document.getElementById('m-max').value) || CONFIG.DEFAULT_MAX_HELFER;
    if (!datum || !zeit) { document.getElementById('m-err').style.display='block'; return; }
    await Storage.setData(d => {
      if (isNew) {
        d.termine.push({ id: uid(), standortId, titel, datum, zeit, maxHelfer });
      } else {
        const t = d.termine.find(t=>t.id===termin.id);
        if (t) { t.standortId=standortId; t.titel=titel; t.datum=datum; t.zeit=zeit; t.maxHelfer=maxHelfer; }
      }
    });
    closeModal();
    showToast(isNew ? 'Termin hinzugefügt' : 'Termin gespeichert');
    screenAdmin();
  };
}

// ---- Export --------------------------------------------------

function exportCsv(data) {
  const rows = [['Standort','Datum','Wochentag','Zeit','Helfer']];
  const sorted = [...data.termine].sort((a,b)=>a.datum.localeCompare(b.datum));
  sorted.forEach(t => {
    const s = data.standorte.find(s=>s.id===t.standortId);
    const regs = data.anmeldungen[t.id] || [];
    const d = parseDatum(t.datum);
    if (!regs.length) {
      rows.push([s?.name||'', t.datum, DAYS[d.getDay()], t.zeit, '']);
    } else {
      regs.forEach(r => rows.push([s?.name||'', t.datum, DAYS[d.getDay()], t.zeit, r]));
    }
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  download('minibridge-helfer.csv', 'text/csv;charset=utf-8;', '\uFEFF' + csv);
  showToast('CSV heruntergeladen');
}

function exportJson(data) {
  download('minibridge-backup.json', 'application/json', JSON.stringify(data, null, 2));
  showToast('JSON heruntergeladen');
}

function download(filename, mime, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}

// ---- Start ---------------------------------------------------
screenLogin();
