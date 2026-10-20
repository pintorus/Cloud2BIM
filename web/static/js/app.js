// ── State ─────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  uploadId: null,
  networkPath: null,
  sourceJobId: null,
  sourceType: 'upload',
  jobId: null,
  jobStatus: null,
  progressStage: 'pending',
};
window._state = state; // expose for console debugging

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

// ── DOM helpers ───────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function fmt_bytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

// ── Job progress bar ──────────────────────────────────────────────────────
function resetProgressBar() {
  const wrap = document.getElementById('job-progress');
  if (!wrap) return;
  wrap.classList.remove('visible');
  const fill = document.getElementById('job-progress-fill');
  fill.style.width = '0%';
  fill.classList.remove('done', 'failed');
  document.getElementById('job-pct').textContent = '0 %';
  document.getElementById('job-stage').textContent = t('progress.stage.pending');
}

function updateProgressBar(progress) {
  const wrap = document.getElementById('job-progress');
  if (!wrap || !progress) return;
  wrap.classList.add('visible');
  const pct = Math.max(0, Math.min(100, progress.pct || 0));
  const fill = document.getElementById('job-progress-fill');
  fill.style.width = pct + '%';
  document.getElementById('job-pct').textContent = pct + ' %';
  state.progressStage = progress.stage;
  document.getElementById('job-stage').textContent =
    t('progress.stage.' + progress.stage) || progress.stage;
}

function finishProgressBar(status) {
  const wrap = document.getElementById('job-progress');
  if (!wrap) return;
  wrap.classList.add('visible');
  state.progressStage = (status === 'completed') ? 'done' : 'failed';
  const fill = document.getElementById('job-progress-fill');
  fill.classList.remove('done', 'failed');
  if (status === 'completed') {
    fill.style.width = '100%';
    fill.classList.add('done');
    document.getElementById('job-pct').textContent = '100 %';
    document.getElementById('job-stage').textContent = t('progress.stage.done');
  } else {
    fill.classList.add('failed');
    document.getElementById('job-stage').textContent = t('progress.stage.failed');
  }
}

// ── Step navigation ───────────────────────────────────────────────────────
// The "cleaning" step is dynamic: it only exists when the checkbox in Settings
// is enabled, so the logical step list is computed from the current state.
const ALL_PANELS = ['step-1', 'step-2', 'step-clean', 'step-3', 'step-4'];

function cleaningEnabled() {
  const el = document.getElementById('clean-enabled');
  return !!(el && el.checked);
}

function stepList() {
  const steps = [
    { id: 'step-1', key: 'step.1' },
    { id: 'step-2', key: 'step.2' },
  ];
  if (cleaningEnabled()) steps.push({ id: 'step-clean', key: 'step.clean' });
  steps.push({ id: 'step-3', key: 'step.3' });
  steps.push({ id: 'step-4', key: 'step.4' });
  return steps;
}

function renderStepper() {
  const steps = stepList();
  const nav = document.querySelector('.stepper');
  if (!nav) return;
  nav.innerHTML = '';
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    div.dataset.step = i + 1;
    div.dataset.id = s.id;
    div.innerHTML = '<div class="num">' + (i + 1) + '</div>' +
      '<span>' + t(s.key) + '</span>';
    div.addEventListener('click', () => {
      if (i + 1 < state.currentStep) goTo(i + 1);
    });
    nav.appendChild(div);
  });
}

function goTo(n) {
  const steps = stepList();
  n = Math.max(1, Math.min(n, steps.length));
  console.log('[goTo]', n, steps[n - 1] && steps[n - 1].id);
  state.currentStep = n;

  const activeId = steps[n - 1].id;
  ALL_PANELS.forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.style.display = (id === activeId) ? 'block' : 'none';
  });

  $$('.stepper .step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });

  if (activeId === 'step-clean') onEnterCleanStep();
  if (activeId === 'step-4') setupResults();
}

function goToId(id) {
  const i = stepList().findIndex(s => s.id === id);
  if (i >= 0) goTo(i + 1);
}

function goNext() { goTo(state.currentStep + 1); }
function goBack() { goTo(state.currentStep - 1); }

window.goTo = goTo;
window.goToId = goToId;
window.goNext = goNext;
window.goBack = goBack;

// ── Reset state for new job ───────────────────────────────────────────────
function resetJob() {
  state.jobId = null;
  state.jobStatus = null;
  state.uploadId = null;
  state.networkPath = null;
  state.sourceJobId = null;

  clearUploadError();
  document.getElementById('upload-progress').classList.remove('visible');
  document.getElementById('upload-fill').style.width = '0%';
  document.getElementById('upload-name').textContent = '—';
  document.getElementById('upload-label').textContent = '0 B';
  document.getElementById('drop-zone').querySelector('strong').textContent = t('s1.drop.title');
  document.getElementById('drop-zone').querySelector('p').textContent = t('s1.drop.hint');
  document.getElementById('btn-next-1').disabled = true;

  document.getElementById('log-console').innerHTML =
    '<div class="log-line" style="color:var(--text-dim)">' + t('s3.log.placeholder') + '</div>';
  document.getElementById('btn-run').disabled = false;
  document.getElementById('btn-back-3').disabled = false;
  setBadge('pending');

  document.getElementById('btn-download').style.display = 'none';
  const viewBtn = document.getElementById('btn-open-viewer');
  if (viewBtn) viewBtn.style.display = 'none';
  const pcBtn = document.getElementById('btn-open-pc');
  if (pcBtn) pcBtn.style.display = 'none';
  const previewBtn = document.getElementById('btn-preview-1');
  if (previewBtn) previewBtn.style.display = 'none';
  document.getElementById('result-stats').innerHTML = '';

  // Reset the cleaning preview
  _cleanPreviewDone = false;
  const cleanFrame = document.getElementById('clean-preview-frame');
  if (cleanFrame) { cleanFrame.src = 'about:blank'; cleanFrame.style.display = 'none'; }
  const cleanEmpty = document.getElementById('clean-preview-empty');
  if (cleanEmpty) cleanEmpty.style.display = 'flex';

  resetProgressBar();
}
window.newFile = function() { resetJob(); goTo(1); };

// ── Point cloud preview (step 1) ──────────────────────────────────────────
window.openPreview3D = function() {
  const lang = window.getLang() === 'fr' ? '&lang=fr' : '';
  let url = '/static/bim-viewer.html?';
  if (state.sourceType === 'network' && state.networkPath) {
    url += 'path=' + encodeURIComponent(state.networkPath) + lang;
  } else if (state.sourceType === 'reuse' && state.sourceJobId) {
    url += 'job=' + encodeURIComponent(state.sourceJobId) + '&view=points' + lang;
  } else if (state.uploadId) {
    url += 'upload=' + encodeURIComponent(state.uploadId) + lang;
  } else {
    return;
  }
  window.open(url, '_blank');
};

// (Stepper click handling is wired inside renderStepper().)

// ── Upload error helpers ──────────────────────────────────────────────────
function showUploadError(msg) {
  const el = document.getElementById('upload-error');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.style.display = 'block';
}
function clearUploadError() {
  const el = document.getElementById('upload-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ── Step 1: Upload ────────────────────────────────────────────────────────
$$('.upload-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.upload-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.sourceType = tab.dataset.tab;
    document.getElementById('upload-panel').style.display =
      tab.dataset.tab === 'upload' ? 'block' : 'none';
    document.getElementById('network-panel').style.display =
      tab.dataset.tab === 'network' ? 'block' : 'none';
    document.getElementById('reuse-panel').style.display =
      tab.dataset.tab === 'reuse' ? 'block' : 'none';
    if (tab.dataset.tab === 'network') loadDrives();
    if (tab.dataset.tab === 'reuse') loadReusableJobs();
  });
});

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) startUpload(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) startUpload(fileInput.files[0]);
});

async function startUpload(file) {
  clearUploadError();
  state.uploadId = null;
  document.getElementById('btn-next-1').disabled = true;

  const progressWrap = document.getElementById('upload-progress');
  progressWrap.classList.add('visible');
  const fill = document.getElementById('upload-fill');
  const label = document.getElementById('upload-label');
  document.getElementById('upload-name').textContent = file.name;
  fill.style.width = '0%';
  label.textContent = '0 B / ' + fmt_bytes(file.size);

  // Init
  let upload_id;
  try {
    const initRes = await fetch('/api/upload/init', {
      method: 'POST',
      body: new URLSearchParams({ filename: file.name, total_size: file.size }),
    });
    if (!initRes.ok) throw new Error('HTTP ' + initRes.status + ': ' + await initRes.text());
    const data = await initRes.json();
    if (!data.upload_id) throw new Error(t('s1.upload.no.id') + JSON.stringify(data));
    upload_id = data.upload_id;
    console.log('[upload] init OK, id =', upload_id);
  } catch (err) {
    console.error('[upload init]', err);
    showUploadError(t('s1.upload.init.fail') + err.message);
    progressWrap.classList.remove('visible');
    return;
  }

  // Chunks
  let offset = 0;
  try {
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const fd = new FormData();
      fd.append('offset', offset);
      fd.append('chunk', chunk, file.name);
      const chunkRes = await fetch('/api/upload/' + upload_id + '/chunk', { method: 'POST', body: fd });
      if (!chunkRes.ok) throw new Error('Chunk HTTP ' + chunkRes.status + ': ' + await chunkRes.text());
      offset += CHUNK_SIZE;
      const pct = Math.min(100, Math.round((offset / file.size) * 100));
      fill.style.width = pct + '%';
      label.textContent = fmt_bytes(Math.min(offset, file.size)) + ' / ' + fmt_bytes(file.size);
    }
  } catch (err) {
    console.error('[upload chunk]', err);
    showUploadError(t('s1.upload.aborted') + err.message);
    return;
  }

  // Done
  state.uploadId = upload_id;
  fill.style.width = '100%';
  label.textContent = t('s1.upload.done');
  dropZone.querySelector('strong').textContent = file.name;
  dropZone.querySelector('p').textContent = fmt_bytes(file.size) + t('s1.upload.done.sub');
  // Format auto-detected on backend — no manual toggle needed

  document.getElementById('btn-next-1').disabled = false;
  const previewBtn = document.getElementById('btn-preview-1');
  if (previewBtn && ['.e57', '.las', '.laz', '.xyz'].some(ext => file.name.toLowerCase().endsWith(ext))) {
    previewBtn.style.display = 'inline-flex';
  }
  console.log('[upload] KLAR — state.uploadId =', state.uploadId);
}

// Next button — uses onclick in HTML, but also wired here as fallback
function onNext1() {
  if (state.sourceType === 'upload' && !state.uploadId) {
    showUploadError(t('s1.error.not.uploaded')); return;
  }
  if (state.sourceType === 'network' && !state.networkPath) {
    showUploadError(t('s1.error.no.network')); return;
  }
  if (state.sourceType === 'reuse' && !state.sourceJobId) {
    showUploadError(t('s1.error.no.job')); return;
  }
  goTo(2);
}

async function loadReusableJobs() {
  const list = document.getElementById('reuse-list');
  list.innerHTML = '<div style="color:var(--text-dim);font-size:13px">' + t('s1.loading') + '</div>';
  try {
    const res = await fetch('/api/jobs/reusable');
    const jobs = await res.json();
    if (!jobs.length) {
      list.innerHTML = '<div style="color:var(--text-dim);font-size:13px">' + t('s1.reuse.empty') + '</div>';
      return;
    }
    list.innerHTML = '';
    jobs.forEach(job => {
      const row = document.createElement('div');
      row.className = 'browser-item';
      row.style.cssText = 'cursor:pointer;padding:8px 10px;border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;background:var(--surface2)';
      const date = job.created_at ? new Date(job.created_at).toLocaleString(locale()) : '—';
      row.innerHTML = `
        <div style="flex:1;min-width:0" class="reuse-select-area">
          <div style="font-weight:600;font-size:13px">${job.original_filename}</div>
          <div style="font-size:11px;color:var(--text-dim)">${date} &nbsp;·&nbsp; ${job.xyz_size_mb} MB XYZ &nbsp;·&nbsp; ${job.job_id.slice(0,8)}…</div>
        </div>
        <button class="btn-delete-job" data-i18n-title="s1.reuse.delete.title" title="${t('s1.reuse.delete.title')}"
          style="margin-left:10px;background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:16px;padding:4px 6px;border-radius:4px;flex-shrink:0">🗑</button>`;
      row.querySelector('.reuse-select-area').addEventListener('click', () => {
        $$('#reuse-list .browser-item').forEach(r => {
          r.classList.remove('selected');
          r.style.background = 'var(--surface2)';
          r.style.color = '';
        });
        row.classList.add('selected');
        row.style.background = 'var(--accent, #4f6ef7)';
        row.style.color = 'white';
        state.sourceJobId = job.job_id;
        document.getElementById('btn-next-1').disabled = false;
      });
      row.querySelector('.btn-delete-job').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(t('s1.reuse.delete.confirm') + '\n' + job.original_filename)) return;
        try {
          const res = await fetch(`/api/jobs/${job.job_id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
          row.remove();
          if (state.sourceJobId === job.job_id) {
            state.sourceJobId = null;
            document.getElementById('btn-next-1').disabled = true;
          }
        } catch (err) {
          alert(t('s1.reuse.delete.error') + err.message);
        }
      });
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = '<div style="color:var(--danger)">' + t('s1.reuse.load.error') + '</div>';
  }
}
window.onNext1 = onNext1;

// ── Network browser ───────────────────────────────────────────────────────
let browserHistory = [];

async function loadDrives() {
  const res = await fetch('/api/browse');
  const data = await res.json();
  const panel = document.getElementById('network-panel');
  panel.innerHTML = '';
  if (!data.drives || data.drives.length === 0) {
    panel.innerHTML = '<p class="no-drives">' + t('s1.no.drives') + '</p>';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'drives-grid';
  data.drives.forEach(drive => {
    const card = document.createElement('div');
    card.className = 'drive-card';
    card.innerHTML = '<div class="drive-icon">🗂️</div><div>' + drive.name + '</div>';
    card.addEventListener('click', () => browseDir(drive.path));
    grid.appendChild(card);
  });
  panel.appendChild(grid);
}

async function browseDir(path) {
  const res = await fetch('/api/browse?path=' + encodeURIComponent(path));
  if (!res.ok) { alert(t('s1.error.read.dir')); return; }
  const data = await res.json();
  browserHistory.push(path);
  const panel = document.getElementById('network-panel');
  panel.innerHTML = '';
  if (browserHistory.length > 1) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn btn-outline';
    back.textContent = t('s1.back');
    back.style.marginBottom = '10px';
    back.addEventListener('click', () => {
      browserHistory.pop();
      const prev = browserHistory.pop();
      if (prev) browseDir(prev); else loadDrives();
    });
    panel.appendChild(back);
  }
  const pathEl = document.createElement('div');
  pathEl.className = 'browser-path';
  pathEl.textContent = data.current;
  panel.appendChild(pathEl);
  const list = document.createElement('div');
  list.className = 'browser-list';
  data.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'browser-item';
    row.innerHTML = '<span class="item-icon">' + (item.type === 'dir' ? '📁' : '📄') + '</span>' +
      '<span>' + item.name + '</span>' +
      '<span class="item-size">' + (item.type === 'file' ? fmt_bytes(item.size) : '') + '</span>';
    if (item.type === 'dir') {
      row.addEventListener('click', () => browseDir(item.path));
    } else {
      row.addEventListener('click', () => {
        $$('.browser-item').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        state.networkPath = item.path;
        document.getElementById('btn-next-1').disabled = false;
        const previewBtn = document.getElementById('btn-preview-1');
        if (previewBtn) previewBtn.style.display = '';
      });
    }
    list.appendChild(row);
  });
  panel.appendChild(list);
}

// ── Step 2 ────────────────────────────────────────────────────────────────
$$('.collapsible-header').forEach(header => {
  header.addEventListener('click', () => {
    header.classList.toggle('open');
    header.nextElementSibling.classList.toggle('open');
  });
});

// ── Point cloud cleaning step (dynamic) ───────────────────────────────────
// Toggle in Settings decides whether the step exists at all.
const cleanEnabledInput = document.getElementById('clean-enabled');
if (cleanEnabledInput) {
  cleanEnabledInput.addEventListener('change', () => {
    const hint = document.getElementById('clean-hint');
    if (hint) hint.style.display = cleanEnabledInput.checked ? 'block' : 'none';
    renderStepper();
    // Keep the current panel valid when the step list changes.
    goTo(state.currentStep);
  });
}

function cleanSourceQuery() {
  if (state.sourceType === 'network' && state.networkPath) {
    return 'path=' + encodeURIComponent(state.networkPath);
  }
  if (state.sourceType === 'reuse' && state.sourceJobId) {
    return 'job=' + encodeURIComponent(state.sourceJobId);
  }
  if (state.uploadId) {
    return 'upload=' + encodeURIComponent(state.uploadId);
  }
  return null;
}

function cleanSourceApiQuery() {
  if (state.sourceType === 'network' && state.networkPath) {
    return 'path=' + encodeURIComponent(state.networkPath);
  }
  if (state.sourceType === 'reuse' && state.sourceJobId) {
    return 'job_id=' + encodeURIComponent(state.sourceJobId);
  }
  if (state.uploadId) {
    return 'upload_id=' + encodeURIComponent(state.uploadId);
  }
  return null;
}

function cleanParamsQuery() {
  const v = id => (document.getElementById(id) || {}).value || '';
  const b = id => !!(document.getElementById(id) || {}).checked;
  const on = cleaningEnabled();
  const voxel = on ? (parseFloat(v('voxel-size')) || 0) : 0;
  const sorK = (on && b('clean-sor')) ? (parseInt(v('sor-k')) || 8) : 0;
  const sorStd = parseFloat(v('sor-std')) || 2.0;
  const rorR = (on && b('clean-ror')) ? (parseFloat(v('ror-radius')) || 0.05) : 0;
  const rorMin = parseInt(v('ror-min')) || 4;
  return [
    'voxel_size=' + voxel,
    'sor_k=' + sorK,
    'sor_std_ratio=' + sorStd,
    'ror_radius=' + rorR,
    'ror_min_neighbors=' + rorMin,
  ].join('&');
}

let _cleanPreviewDone = false;
function onEnterCleanStep() {
  if (_cleanPreviewDone) return;
  if (!cleanSourceQuery()) return;
  _cleanPreviewDone = true;
  refreshCleanPreview();
}

window.refreshCleanPreview = function () {
  const source = cleanSourceQuery();
  const empty = document.getElementById('clean-preview-empty');
  const frame = document.getElementById('clean-preview-frame');
  if (!source) {
    if (empty) empty.textContent = t('sc.preview.nosource');
    return;
  }
  const lang = window.getLang() === 'fr' ? '&lang=fr' : '';
  const url = '/static/pointcloud-clean.html?' + source + '&' + cleanParamsQuery() + lang;
  if (empty) { empty.style.display = 'none'; }
  if (frame) {
    frame.style.display = 'block';
    frame.src = url;
  }
};

function setCleanField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}
function setCleanToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.checked = !!on;
}

window.optimizeClean = function () {
  const source = cleanSourceApiQuery();
  const btn = document.getElementById('btn-clean-optimize');
  const hint = document.getElementById('clean-optimize-hint');
  if (!source) {
    if (hint) { hint.style.display = 'inline'; hint.textContent = t('sc.preview.nosource'); }
    return;
  }
  const label = btn ? btn.querySelector('span') : null;
  const prevLabel = label ? label.textContent : '';
  if (btn) btn.disabled = true;
  if (label) label.textContent = t('sc.optimizing');
  if (hint) { hint.style.display = 'inline'; hint.textContent = t('sc.optimizing'); }

  fetch('/api/pointcloud/clean/suggest?' + source)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      const p = data.params || {};
      setCleanField('voxel-size', p.voxel_size != null ? p.voxel_size : 0);
      setCleanField('sor-k', p.sor_k || 8);
      setCleanField('sor-std', p.sor_std_ratio != null ? p.sor_std_ratio : 2.0);
      setCleanField('ror-radius', p.ror_radius || 0.05);
      setCleanField('ror-min', p.ror_min_neighbors || 4);
      setCleanToggle('clean-sor', (p.sor_k || 0) > 0);
      setCleanToggle('clean-ror', (p.ror_radius || 0) > 0);
      const d = data.diagnostics || {};
      if (hint) {
        hint.style.display = 'inline';
        hint.textContent = t('sc.optimize.info', {
          spacing: (d.spacing_m || 0).toFixed(4),
          noise: ((d.noise_fraction || 0) * 100).toFixed(2),
          iso: ((d.isolated_fraction || 0) * 100).toFixed(2),
        });
      }
      window.refreshCleanPreview();
    })
    .catch(err => {
      if (hint) { hint.style.display = 'inline'; hint.textContent = t('sc.optimize.error') + err.message; }
    })
    .finally(() => {
      if (btn) btn.disabled = false;
      if (label) label.textContent = prevLabel || t('sc.optimize');
    });
};

// ── Step 3: Run ───────────────────────────────────────────────────────────
document.getElementById('btn-run').addEventListener('click', async () => {
  document.getElementById('btn-run').disabled = true;
  document.getElementById('btn-back-3').disabled = true;
  const logEl = document.getElementById('log-console');
  logEl.innerHTML = '';
  resetProgressBar();
  updateProgressBar({ stage: 'import', pct: 0 });

  function appendLog(text) {
    const line = document.createElement('div');
    line.className = 'log-line';
    if (text.startsWith('---') || text.startsWith('===')) line.classList.add('section');
    else if (/error|exception/i.test(text)) line.classList.add('error');
    else if (/saved|complete|done/i.test(text)) line.classList.add('success');
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  const cfg = collectConfig();
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) {
    const err = await res.json();
    appendLog(t('s3.job.error') + ': ' + (err.detail || ''));
    document.getElementById('btn-run').disabled = false;
    return;
  }
  const { job_id } = await res.json();
  state.jobId = job_id;
  appendLog('[Job ' + job_id.slice(0, 8) + '] ' + t('s3.starting'));
  setBadge('running');

  const sse = new EventSource('/api/jobs/' + job_id + '/logs');
  sse.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.line !== undefined) appendLog(msg.line);
    if (msg.progress) updateProgressBar(msg.progress);
    if (msg.done) {
      sse.close();
      state.jobStatus = msg.status;
      setBadge(msg.status);
      finishProgressBar(msg.status);
      if (msg.status === 'completed') {
        appendLog(t('s3.saved'));
        setTimeout(() => goToId('step-4'), 800);
      } else {
        appendLog(t('s3.failed'));
        document.getElementById('btn-run').disabled = false;
        document.getElementById('btn-back-3').disabled = false;
      }
    }
  };
  sse.onerror = () => {
    sse.close();
    appendLog(t('s3.lost'));
    document.getElementById('btn-run').disabled = false;
  };
});

function setBadge(status) {
  const badge = document.getElementById('status-badge');
  badge.className = 'status-badge ' + status;
  badge.textContent = t('s3.badge.' + status) || status;
}

// ── Step 4: Results ───────────────────────────────────────────────────────
async function setupResults() {
  const dlBtn = document.getElementById('btn-download');
  dlBtn.href = '/api/jobs/' + state.jobId + '/download';
  dlBtn.style.display = 'inline-flex';
  const viewBtn = document.getElementById('btn-open-viewer');
  if (viewBtn) viewBtn.style.display = 'inline-flex';
  const pcBtn = document.getElementById('btn-open-pc');
  if (pcBtn) pcBtn.style.display = 'inline-flex';
  const job = await fetch('/api/jobs/' + state.jobId).then(r => r.json());
  renderStats(parseStats(job.log_lines || []));
  if (typeof window.loadViewer === 'function') window.loadViewer(state.jobId);
}

function parseStats(lines) {
  const s = { walls: 0, slabs: 0, windows: 0, doors: 0, storeys: 0 };
  lines.forEach(line => {
    let m;
    // "Creating hull for slab no. 2 of 3" → slabs = 3
    if ((m = line.match(/slab no\.\s*\d+\s+of\s+(\d+)/i)))
      s.slabs = Math.max(s.slabs, +m[1]);
    // "Wall 5:" — one line printed per wall
    if ((m = line.match(/^\s*Wall\s+(\d+)\s*:/)))
      s.walls = Math.max(s.walls, +m[1]);
    // "Opening (window):" and "Opening (door):" — one per opening
    if (/^\s*Opening\s*\(window\)/i.test(line)) s.windows++;
    if (/^\s*Opening\s*\(door\)/i.test(line)) s.doors++;
  });
  s.storeys = s.slabs > 1 ? s.slabs - 1 : Math.min(s.slabs, 1);
  return s;
}

function renderStats(s) {
  document.getElementById('result-stats').innerHTML =
    [[t('s4.stat.storeys'), s.storeys], [t('s4.stat.walls'), s.walls], [t('s4.stat.slabs'), s.slabs],
     [t('s4.stat.windows'), s.windows], [t('s4.stat.doors'), s.doors]]
    .map(([l, n]) => '<div class="stat-box"><div class="stat-num">' + n +
      '</div><div class="stat-label">' + l + '</div></div>').join('');
}

// ── Config collector ──────────────────────────────────────────────────────
function collectConfig() {
  const v = id => (document.getElementById(id) || {}).value || '';
  const n = id => parseFloat(v(id)) || 0;
  const b = id => !!(document.getElementById(id) || {}).checked;
  return {
    upload_id: state.sourceType === 'upload' ? state.uploadId : null,
    network_path: state.sourceType === 'network' ? state.networkPath : null,
    source_job_id: state.sourceType === 'reuse' ? state.sourceJobId : null,
    e57_input: false,  // auto-detected on backend from file extension
    exterior_scan: v('scan-type') || 'auto',
    dilute: false, dilution_factor: 10,
    clean_enabled: b('clean-enabled'),
    voxel_size: b('clean-enabled') ? (n('voxel-size') || 0) : 0,
    sor_k: (b('clean-enabled') && b('clean-sor')) ? (parseInt(v('sor-k')) || 8) : 0,
    sor_std_ratio: n('sor-std') || 2.0,
    ror_radius: (b('clean-enabled') && b('clean-ror')) ? (n('ror-radius') || 0.05) : 0,
    ror_min_neighbors: parseInt(v('ror-min')) || 4,
    pc_resolution: n('pc-resolution'), grid_coefficient: parseInt(v('grid-coefficient')) || 5,
    bfs_thickness: n('bfs-thickness'), tfs_thickness: n('tfs-thickness'),
    min_wall_length: n('min-wall-length'), min_wall_thickness: n('min-wall-thickness'),
    max_wall_thickness: n('max-wall-thickness'), exterior_walls_thickness: n('ext-wall-thickness'),
    ifc_project_name: v('ifc-project-name'), ifc_project_long_name: v('ifc-project-long-name'),
    ifc_project_version: v('ifc-project-version'), ifc_author_name: v('ifc-author-name'),
    ifc_author_surname: v('ifc-author-surname'), ifc_author_organization: v('ifc-author-org'),
    ifc_building_name: v('ifc-building-name'), ifc_building_type: v('ifc-building-type'),
    ifc_building_phase: v('ifc-building-phase'),
    ifc_site_latitude: [0, 0, 0], ifc_site_longitude: [0, 0, 0],
    ifc_site_elevation: n('ifc-elevation'), material_for_objects: v('material'),
  };
}

// ── Init ──────────────────────────────────────────────────────────────────
renderStepper();
goTo(1);

// ── Re-render dynamic strings on language change ──────────────────────────
document.addEventListener('langchange', () => {
  // Rebuild the dynamic stepper labels and restore the active/done marks
  renderStepper();
  $$('.stepper .step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === state.currentStep);
    el.classList.toggle('done', s < state.currentStep);
  });

  // Badge text (static label is handled by data-i18n; re-apply via t for current status)
  setBadge(state.jobStatus || 'pending');

  // Progress bar stage label
  const progWrap = document.getElementById('job-progress');
  if (progWrap && progWrap.classList.contains('visible')) {
    const stageEl = document.getElementById('job-stage');
    if (state.jobStatus === 'failed') {
      stageEl.textContent = t('progress.stage.failed');
    } else if (state.jobStatus === 'completed') {
      stageEl.textContent = t('progress.stage.done');
    } else {
      stageEl.textContent = t('progress.stage.' + (state.progressStage || 'pending'));
    }
  }

  // Drop zone / log placeholder only when not yet in use
  if (!state.uploadId && state.sourceType === 'upload') {
    const dz = document.getElementById('drop-zone');
    if (dz && !dz.querySelector('strong').textContent.match(/\.(xyz|e57|las|laz)/i)) {
      dz.querySelector('strong').textContent = t('s1.drop.title');
      dz.querySelector('p').textContent = t('s1.drop.hint');
    }
  }
  const logEl = document.getElementById('log-console');
  if (logEl && logEl.children.length === 1 &&
      logEl.firstElementChild.style.color) {
    logEl.firstElementChild.textContent = t('s3.log.placeholder');
  }

  // Stats boxes (step 4)
  const statsEl = document.getElementById('result-stats');
  if (statsEl && statsEl.children.length) {
    const labels = ['s4.stat.storeys', 's4.stat.walls', 's4.stat.slabs',
                    's4.stat.windows', 's4.stat.doors'];
    Array.from(statsEl.children).forEach((box, i) => {
      if (labels[i]) {
        const lbl = box.querySelector('.stat-label');
        if (lbl) lbl.textContent = t(labels[i]);
      }
    });
  }

  // Preview loading text
  const previewLoading = document.getElementById('preview-loading');
  if (previewLoading && previewLoading.style.display !== 'none') {
    previewLoading.textContent = t('s4.preview.loading');
  }
});
