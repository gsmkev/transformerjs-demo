import { pipeline, env } from '@huggingface/transformers';

env.useBrowserCache = true;
env.allowLocalModels = false;

const pipelineCache = new Map();

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  switch (type) {
    case 'CHECK_CACHE': await handleCheckCache(payload); break;
    case 'LOAD_MODEL':  await handleLoadModel(payload);  break;
    case 'RUN_OCR':     await handleRunOcr(payload);     break;
  }
});

async function handleCheckCache({ modelId }) {
  try {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    const cached = keys.some(req => req.url.includes(encodeURIComponent(modelId)) || req.url.includes(modelId));
    self.postMessage({ type: 'CACHE_STATUS', payload: { modelId, cached } });
  } catch {
    self.postMessage({ type: 'CACHE_STATUS', payload: { modelId, cached: false } });
  }
}

async function handleLoadModel({ modelId }) {
  if (pipelineCache.has(modelId)) {
    self.postMessage({ type: 'LOAD_COMPLETE', payload: { modelId } });
    return;
  }

  const fileProgress = new Map();

  try {
    const pipe = await pipeline('image-to-text', modelId, {
      progress_callback: (info) => {
        if (info.status === 'progress') {
          fileProgress.set(info.file, { loaded: info.loaded ?? 0, total: info.total ?? 0 });
          const totalLoaded = [...fileProgress.values()].reduce((s, f) => s + f.loaded, 0);
          const totalSize   = [...fileProgress.values()].reduce((s, f) => s + f.total, 0);
          const progress = totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;
          self.postMessage({ type: 'LOAD_PROGRESS', payload: { modelId, progress, status: 'progress' } });
        } else if (info.status === 'initiate') {
          self.postMessage({ type: 'LOAD_PROGRESS', payload: { modelId, progress: 0, status: 'initiate', file: info.file } });
        } else if (info.status === 'done') {
          self.postMessage({ type: 'LOAD_PROGRESS', payload: { modelId, progress: 100, status: 'done', file: info.file } });
        } else if (info.status === 'ready') {
          fileProgress.clear();
          pipelineCache.set(modelId, pipe);
          self.postMessage({ type: 'LOAD_COMPLETE', payload: { modelId } });
        }
      },
    });

    // Fallback: if 'ready' callback didn't fire, store it here
    if (!pipelineCache.has(modelId)) {
      pipelineCache.set(modelId, pipe);
      self.postMessage({ type: 'LOAD_COMPLETE', payload: { modelId } });
    }
  } catch (err) {
    self.postMessage({ type: 'LOAD_ERROR', payload: { modelId, error: err.message } });
  }
}

async function handleRunOcr({ modelId, imageDataUrl }) {
  const pipe = pipelineCache.get(modelId);
  if (!pipe) {
    self.postMessage({ type: 'OCR_ERROR', payload: { error: 'El modelo no está cargado en memoria. Descárgalo y espera que termine.' } });
    return;
  }
  try {
    self.postMessage({ type: 'OCR_PROGRESS', payload: { status: 'running' } });
    const result = await pipe(imageDataUrl);
    const text = Array.isArray(result) ? result.map(r => r.generated_text).join('\n') : result.generated_text ?? '';
    self.postMessage({ type: 'OCR_RESULT', payload: { text } });
  } catch (err) {
    self.postMessage({ type: 'OCR_ERROR', payload: { error: err.message } });
  }
}
