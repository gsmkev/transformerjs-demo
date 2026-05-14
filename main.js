const MODELS = [
  {
    id: 'Xenova/trocr-small-printed',
    label: 'TrOCR Small — Impreso',
    size: '~40 MB',
    desc: 'Rápido. Ideal para texto impreso limpio, capturas de pantalla y documentos digitales.',
  },
  {
    id: 'Xenova/trocr-small-handwritten',
    label: 'TrOCR Small — Manuscrito',
    size: '~40 MB',
    desc: 'Rápido. Optimizado para texto manuscrito y notas a mano.',
  },
  {
    id: 'Xenova/trocr-base-printed',
    label: 'TrOCR Base — Impreso',
    size: '~350 MB',
    desc: 'Alta precisión para texto impreso denso. Más lento en primera carga.',
  },
  {
    id: 'Xenova/trocr-base-handwritten',
    label: 'TrOCR Base — Manuscrito',
    size: '~350 MB',
    desc: 'Máxima calidad para texto manuscrito. Requiere más memoria.',
  },
];

const STORAGE_KEY = 'ocr_selected_model';

// ── Worker ──────────────────────────────────────────────────────────────────
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

// Tracks which models are loaded in the worker's in-memory pipeline cache
const loadedModels = new Set();

worker.addEventListener('message', ({ data }) => {
  const { type, payload } = data;
  switch (type) {
    case 'CACHE_STATUS':  onCacheStatus(payload);  break;
    case 'LOAD_PROGRESS': onLoadProgress(payload); break;
    case 'LOAD_COMPLETE': onLoadComplete(payload); break;
    case 'LOAD_ERROR':    onLoadError(payload);    break;
    case 'OCR_PROGRESS':  onOcrProgress(payload);  break;
    case 'OCR_RESULT':    onOcrResult(payload);    break;
    case 'OCR_ERROR':     onOcrError(payload);     break;
  }
});

// ── Tab routing ──────────────────────────────────────────────────────────────
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === target));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ── Model Manager ────────────────────────────────────────────────────────────
const modelGrid = document.getElementById('model-grid');

function buildModelCards() {
  modelGrid.innerHTML = '';
  MODELS.forEach(model => {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.dataset.modelId = model.id;
    card.innerHTML = `
      <div class="model-card-header">
        <span class="model-name">${model.label}</span>
        <span class="model-size">${model.size}</span>
      </div>
      <p class="model-desc">${model.desc}</p>
      <span class="badge badge-checking" data-badge>Verificando…</span>
      <div class="progress-wrap" data-progress>
        <span class="progress-label" data-progress-label>Descargando…</span>
        <progress max="100" value="0" data-progress-bar></progress>
      </div>
      <div class="card-actions">
        <button class="btn-primary" data-btn-download disabled>Descargar</button>
        <button class="btn-secondary" data-btn-select>Seleccionar</button>
      </div>
    `;

    card.querySelector('[data-btn-download]').addEventListener('click', () => {
      worker.postMessage({ type: 'LOAD_MODEL', payload: { modelId: model.id } });
      setCardState(model.id, 'loading', 0);
    });

    card.querySelector('[data-btn-select]').addEventListener('click', () => {
      setSelectedModel(model.id);
    });

    modelGrid.appendChild(card);
    worker.postMessage({ type: 'CHECK_CACHE', payload: { modelId: model.id } });
  });
}

function getCard(modelId) {
  return modelGrid.querySelector(`[data-model-id="${modelId}"]`);
}

function setCardState(modelId, state, progress = 0) {
  const card = getCard(modelId);
  if (!card) return;
  const badge    = card.querySelector('[data-badge]');
  const progWrap = card.querySelector('[data-progress]');
  const progBar  = card.querySelector('[data-progress-bar]');
  const progLbl  = card.querySelector('[data-progress-label]');
  const btnDl    = card.querySelector('[data-btn-download]');

  badge.className = 'badge';
  progWrap.classList.remove('visible');

  switch (state) {
    case 'checking':
      badge.className += ' badge-checking'; badge.textContent = 'Verificando…';
      btnDl.disabled = true;
      break;
    case 'cached':
      badge.className += ' badge-cached'; badge.textContent = 'Cacheado';
      btnDl.disabled = false; btnDl.textContent = 'Recargar';
      break;
    case 'missing':
      badge.className += ' badge-missing'; badge.textContent = 'No descargado';
      btnDl.disabled = false; btnDl.textContent = 'Descargar';
      break;
    case 'loading':
      badge.className += ' badge-loading'; badge.textContent = 'Descargando…';
      progWrap.classList.add('visible');
      progBar.value = progress;
      progLbl.textContent = `${progress}%`;
      btnDl.disabled = true;
      break;
    case 'loaded':
      badge.className += ' badge-loaded'; badge.textContent = 'Cargado ✓';
      btnDl.disabled = false; btnDl.textContent = 'Recargar';
      progWrap.classList.remove('visible');
      break;
    case 'error':
      badge.className += ' badge-error'; badge.textContent = 'Error';
      btnDl.disabled = false; btnDl.textContent = 'Reintentar';
      break;
  }
}

function onCacheStatus({ modelId, cached }) {
  setCardState(modelId, cached ? 'cached' : 'missing');
}

function onLoadProgress({ modelId, progress, status }) {
  if (status === 'progress' || status === 'initiate') {
    setCardState(modelId, 'loading', progress);
  }
}

function onLoadComplete({ modelId }) {
  loadedModels.add(modelId);
  setCardState(modelId, 'loaded');
  refreshOcrControls();
}

function onLoadError({ modelId, error }) {
  setCardState(modelId, 'error');
  console.error(`Error cargando ${modelId}:`, error);
}

// ── OCR View ─────────────────────────────────────────────────────────────────
const modelSelect    = document.getElementById('model-select');
const btnLoadSel     = document.getElementById('btn-load-selected');
const loadStatus     = document.getElementById('load-status');
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('file-input');
const previewWrap    = document.getElementById('preview-wrap');
const previewImg     = document.getElementById('preview-img');
const btnClearImage  = document.getElementById('btn-clear-image');
const ocrResult      = document.getElementById('ocr-result');
const btnRunOcr      = document.getElementById('btn-run-ocr');
const ocrStatus      = document.getElementById('ocr-status');
const btnCopy        = document.getElementById('btn-copy');

let currentImageDataUrl = null;

function buildModelSelect() {
  modelSelect.innerHTML = '';
  MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.label} (${m.size})`;
    modelSelect.appendChild(opt);
  });
  modelSelect.value = getSelectedModel();
}

function getSelectedModel() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && MODELS.some(m => m.id === stored) ? stored : MODELS[0].id;
}

function setSelectedModel(modelId) {
  localStorage.setItem(STORAGE_KEY, modelId);
  modelSelect.value = modelId;
  refreshOcrControls();
}

function refreshOcrControls() {
  const modelId = modelSelect.value;
  const isLoaded = loadedModels.has(modelId);
  btnRunOcr.disabled = !(isLoaded && currentImageDataUrl);
  loadStatus.textContent = isLoaded ? 'Listo en memoria ✓' : 'No cargado en memoria';
  loadStatus.style.color = isLoaded ? 'var(--green)' : 'var(--text-muted)';
}

modelSelect.addEventListener('change', () => {
  setSelectedModel(modelSelect.value);
});

btnLoadSel.addEventListener('click', () => {
  const modelId = modelSelect.value;
  if (loadedModels.has(modelId)) {
    loadStatus.textContent = 'Ya está en memoria ✓';
    return;
  }
  loadStatus.textContent = 'Cargando…';
  worker.postMessage({ type: 'LOAD_MODEL', payload: { modelId } });
  setCardState(modelId, 'loading', 0);
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
  currentImageDataUrl = null;
  previewImg.src = '';
  previewWrap.hidden = true;
  dropzone.style.display = '';
  fileInput.value = '';
  ocrResult.value = '';
  btnCopy.hidden = true;
  refreshOcrControls();
});

// Run OCR
btnRunOcr.addEventListener('click', () => {
  const modelId = modelSelect.value;
  if (!loadedModels.has(modelId) || !currentImageDataUrl) return;
  btnRunOcr.disabled = true;
  btnRunOcr.classList.add('spinning');
  ocrStatus.textContent = 'Ejecutando inferencia…';
  ocrResult.value = '';
  worker.postMessage({ type: 'RUN_OCR', payload: { modelId, imageDataUrl: currentImageDataUrl } });
});

function onOcrProgress() {
  ocrStatus.textContent = 'Procesando imagen…';
}

function onOcrResult({ text }) {
  ocrResult.value = text || '(Sin texto detectado)';
  ocrStatus.textContent = 'Completado';
  btnCopy.hidden = false;
  btnRunOcr.disabled = false;
  btnRunOcr.classList.remove('spinning');
}

function onOcrError({ error }) {
  ocrStatus.textContent = `Error: ${error}`;
  ocrStatus.style.color = 'var(--red)';
  btnRunOcr.disabled = false;
  btnRunOcr.classList.remove('spinning');
}

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
buildModelCards();
buildModelSelect();
refreshOcrControls();
