import { createWorker, OEM } from 'tesseract.js';

// Fast tessdata (~8 MB/lang): LSTM engine, balanced speed/accuracy.
// Best tessdata (~15 MB/lang): highest accuracy, slower load.
const FAST_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast';
const BEST_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_best';

const ENGINES = [
  {
    id: 'eng-fast',
    label: 'Inglés — Rápido',
    size: '~8 MB',
    desc: 'LSTM rápido. Detección + reconocimiento full-page. Ideal para documentos, capturas y texto impreso.',
    langs: 'eng',
    langPath: FAST_LANG_PATH,
  },
  {
    id: 'spa-fast',
    label: 'Español — Rápido',
    size: '~8 MB',
    desc: 'LSTM rápido en español. Documentos, formularios, capturas de pantalla y texto general.',
    langs: 'spa',
    langPath: FAST_LANG_PATH,
  },
  {
    id: 'eng+spa',
    label: 'Inglés + Español',
    size: '~16 MB',
    desc: 'Bilingüe. Para documentos con mezcla de inglés y español o cuando el idioma es incierto.',
    langs: 'eng+spa',
    langPath: FAST_LANG_PATH,
  },
  {
    id: 'eng-best',
    label: 'Inglés — Alta Precisión',
    size: '~15 MB',
    desc: 'Tessdata best. Máxima precisión para texto de baja calidad, fuentes inusuales o resolución baja.',
    langs: 'eng',
    langPath: BEST_LANG_PATH,
  },
];

const STORAGE_KEY = 'ocr_selected_engine';
const engineCache = new Map(); // id → Tesseract.Worker

let currentFile = null;
let currentImageDataUrl = null;

// ── Tab routing ──────────────────────────────────────────────────────────────
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === target));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ── Engine Manager ───────────────────────────────────────────────────────────
const engineGrid = document.getElementById('engine-grid');

function buildEngineCards() {
  engineGrid.innerHTML = '';
  ENGINES.forEach(eng => {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.dataset.engineId = eng.id;
    card.innerHTML = `
      <div class="model-card-header">
        <span class="model-name">${eng.label}</span>
        <span class="model-size">${eng.size}</span>
      </div>
      <p class="model-desc">${eng.desc}</p>
      <span class="badge badge-missing" data-badge>No inicializado</span>
      <div class="progress-wrap" data-progress>
        <span class="progress-label" data-progress-label>Descargando…</span>
        <progress max="100" value="0" data-progress-bar></progress>
      </div>
      <p class="error-msg" data-error-msg hidden></p>
      <div class="card-actions">
        <button class="btn-primary" data-btn-init>Inicializar</button>
        <button class="btn-secondary" data-btn-select>Seleccionar</button>
      </div>
    `;

    card.querySelector('[data-btn-init]').addEventListener('click', () => initEngine(eng));
    card.querySelector('[data-btn-select]').addEventListener('click', () => setSelectedEngine(eng.id));

    engineGrid.appendChild(card);
  });
}

function getCard(engineId) {
  return engineGrid.querySelector(`[data-engine-id="${engineId}"]`);
}

function setCardState(engineId, state, errorMsg = '') {
  const card = getCard(engineId);
  if (!card) return;
  const badge    = card.querySelector('[data-badge]');
  const progWrap = card.querySelector('[data-progress]');
  const progBar  = card.querySelector('[data-progress-bar]');
  const errEl    = card.querySelector('[data-error-msg]');
  const btnInit  = card.querySelector('[data-btn-init]');

  badge.className = 'badge';
  progWrap.classList.remove('visible');
  errEl.hidden = true;
  errEl.textContent = '';
  btnInit.classList.remove('spinning');

  switch (state) {
    case 'loading':
      badge.className += ' badge-loading';
      badge.textContent = 'Cargando…';
      progWrap.classList.add('visible');
      progBar.value = 0;
      btnInit.disabled = true;
      btnInit.classList.add('spinning');
      break;
    case 'loaded':
      badge.className += ' badge-loaded';
      badge.textContent = 'Listo ✓';
      btnInit.disabled = false;
      btnInit.textContent = 'Reinicializar';
      break;
    case 'missing':
      badge.className += ' badge-missing';
      badge.textContent = 'No inicializado';
      btnInit.disabled = false;
      btnInit.textContent = 'Inicializar';
      break;
    case 'error':
      badge.className += ' badge-error';
      badge.textContent = 'Error';
      btnInit.disabled = false;
      btnInit.textContent = 'Reintentar';
      if (errorMsg) { errEl.textContent = errorMsg; errEl.hidden = false; }
      break;
  }
}

function setCardProgress(engineId, pct, status) {
  const card = getCard(engineId);
  if (!card) return;
  card.querySelector('[data-progress-bar]').value = pct;
  const label = card.querySelector('[data-progress-label]');
  label.textContent = status ? `${status} · ${pct}%` : `${pct}%`;
}

async function initEngine(eng) {
  // Terminate old worker if re-initializing
  if (engineCache.has(eng.id)) {
    try { await engineCache.get(eng.id).terminate(); } catch { /* ignore */ }
    engineCache.delete(eng.id);
  }

  setCardState(eng.id, 'loading');

  try {
    const worker = await createWorker(eng.langs, OEM.LSTM_ONLY, {
      langPath: eng.langPath,
      logger: (m) => {
        if (typeof m.progress === 'number') {
          setCardProgress(eng.id, Math.round(m.progress * 100), m.status);
        }
      },
    });
    engineCache.set(eng.id, worker);
    setCardState(eng.id, 'loaded');
    refreshOcrControls();
  } catch (err) {
    setCardState(eng.id, 'error', err.message);
  }
}

// ── OCR View ─────────────────────────────────────────────────────────────────
const engineSelect  = document.getElementById('engine-select');
const btnInitSel    = document.getElementById('btn-init-selected');
const loadStatus    = document.getElementById('load-status');
const dropzone      = document.getElementById('dropzone');
const fileInput     = document.getElementById('file-input');
const previewWrap   = document.getElementById('preview-wrap');
const previewImg    = document.getElementById('preview-img');
const btnClearImage = document.getElementById('btn-clear-image');
const ocrResult     = document.getElementById('ocr-result');
const btnRunOcr     = document.getElementById('btn-run-ocr');
const ocrStatus     = document.getElementById('ocr-status');
const btnCopy       = document.getElementById('btn-copy');

function buildEngineSelect() {
  engineSelect.innerHTML = '';
  ENGINES.forEach(eng => {
    const opt = document.createElement('option');
    opt.value = eng.id;
    opt.textContent = `${eng.label} (${eng.size})`;
    engineSelect.appendChild(opt);
  });
  engineSelect.value = getSelectedEngine();
}

function getSelectedEngine() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && ENGINES.some(e => e.id === stored) ? stored : ENGINES[0].id;
}

function setSelectedEngine(id) {
  localStorage.setItem(STORAGE_KEY, id);
  engineSelect.value = id;
  refreshOcrControls();
}

function refreshOcrControls() {
  const id = engineSelect.value;
  const ready = engineCache.has(id);
  btnRunOcr.disabled = !(ready && currentFile);
  loadStatus.textContent = ready ? 'Listo en memoria ✓' : 'No inicializado';
  loadStatus.style.color = ready ? 'var(--green)' : 'var(--text-muted)';
}

engineSelect.addEventListener('change', () => setSelectedEngine(engineSelect.value));

btnInitSel.addEventListener('click', () => {
  const eng = ENGINES.find(e => e.id === engineSelect.value);
  if (eng) initEngine(eng);
});

// Drag-and-drop
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

function loadImage(file) {
  currentFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    currentImageDataUrl = e.target.result;
    previewImg.src = currentImageDataUrl;
    previewWrap.hidden = false;
    dropzone.style.display = 'none';
    ocrResult.value = '';
    btnCopy.hidden = true;
    refreshOcrControls();
  };
  reader.readAsDataURL(file);
}

btnClearImage.addEventListener('click', () => {
  currentFile = null;
  currentImageDataUrl = null;
  previewImg.src = '';
  previewWrap.hidden = true;
  dropzone.style.display = '';
  fileInput.value = '';
  ocrResult.value = '';
  btnCopy.hidden = true;
  ocrStatus.textContent = '';
  ocrStatus.style.color = '';
  refreshOcrControls();
});

// Run OCR
btnRunOcr.addEventListener('click', async () => {
  const eng = ENGINES.find(e => e.id === engineSelect.value);
  const worker = engineCache.get(eng?.id);
  if (!worker || !currentFile) return;

  btnRunOcr.disabled = true;
  btnRunOcr.classList.add('spinning');
  ocrStatus.textContent = 'Ejecutando OCR…';
  ocrStatus.style.color = '';
  ocrResult.value = '';
  btnCopy.hidden = true;

  try {
    const { data } = await worker.recognize(currentFile);
    ocrResult.value = data.text?.trim() || '(Sin texto detectado)';
    const conf = data.confidence != null
      ? ` · Confianza: ${Math.round(data.confidence)}%`
      : '';
    ocrStatus.textContent = `Completado${conf}`;
    btnCopy.hidden = false;
  } catch (err) {
    ocrStatus.textContent = `Error: ${err.message}`;
    ocrStatus.style.color = 'var(--red)';
  } finally {
    btnRunOcr.disabled = false;
    btnRunOcr.classList.remove('spinning');
    refreshOcrControls();
  }
});

btnCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ocrResult.value);
    const prev = btnCopy.textContent;
    btnCopy.textContent = '¡Copiado!';
    setTimeout(() => { btnCopy.textContent = prev; }, 1500);
  } catch {
    ocrResult.select();
    document.execCommand('copy');
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
buildEngineCards();
buildEngineSelect();
refreshOcrControls();
