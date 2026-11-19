// Vice City Cover Studio — page wiring.
// Owns the editor state (photos, layout, panels, caption, grade, export size),
// the panel controls, drag-to-pan on the preview, and PNG export. The drawing
// itself lives in poster.js; fixed screenshot scenes live in shots.js.
import { drawPoster, panelRects, renderPoster, LAYOUTS, SIZES } from './poster.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const photoStrip = document.getElementById('photoStrip');
const panelEditors = document.getElementById('panelEditors');
const panelCount = document.getElementById('panelCount');

const state = {
  layout: 'hero',
  grade: 'sunset',
  sun: true,
  title: 'SUNSET HEIST',
  subtitle: 'VICE CITY',
  size: '1080x1080',
  photos: [],
  panels: [{ photo: -1 }, { photo: -1 }, { photo: -1 }],
  selected: 0,
};

let redrawQueued = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function panelCountFor(layout) {
  return LAYOUTS[layout].panels.length;
}

function syncPanelsToLayout() {
  const n = panelCountFor(state.layout);
  const next = [];
  for (let i = 0; i < n; i++) {
    const old = state.panels[i];
    next.push({ photo: old ? old.photo : (state.photos.length ? i % state.photos.length : -1) });
  }
  state.panels = next;
  state.selected = Math.min(state.selected, n - 1);
  panelCount.textContent = `· ${n} panels`;
}

function renderPreview() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawPoster(ctx, w, h, state);
  sizeLabel.textContent = `${w} × ${h}`;
}

function requestRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    renderPreview();
  });
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

function addPhoto(img, name, url) {
  const photo = { img, name, url, zoom: 1.15, ox: 0, oy: 0 };
  state.photos.push(photo);
  fillEmptyPanels();
  return photo;
}

/** Gives every empty panel a photo, cycling through the loaded ones, so a
 *  two-photo set still fills a three-panel layout. */
function fillEmptyPanels() {
  if (!state.photos.length) return;
  state.panels.forEach((slot, i) => {
    if (slot.photo === -1) slot.photo = i % state.photos.length;
  });
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageFromUrl(url);
      addPhoto(img, file.name, url);
      added++;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added) {
    setStatus(`Added ${added} photo${added > 1 ? 's' : ''}. Drag a panel to position it.`);
  }
  rebuildPhotoStrip();
  rebuildPanelEditors();
  requestRedraw();
}

async function loadSamples() {
  const samples = [
    ['samples/pier.jpg', 'pier.jpg'],
    ['samples/boulevard.jpg', 'boulevard.jpg'],
  ];
  for (const [url, name] of samples) {
    if (state.photos.some((p) => p.name === name)) continue;
    try {
      addPhoto(await loadImageFromUrl(url), name, url);
    } catch (err) {
      setStatus(`Sample photo failed to load: ${name}`);
    }
  }
  rebuildPhotoStrip();
  rebuildPanelEditors();
  requestRedraw();
}

function rebuildPhotoStrip() {
  photoStrip.innerHTML = '';
  if (!state.photos.length) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'No photos yet.';
    photoStrip.appendChild(empty);
    return;
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (state.panels.some((slot) => slot.photo === i)) thumb.classList.add('assigned');
    thumb.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      rebuildPhotoStrip();
      rebuildPanelEditors();
      requestRedraw();
    });
    photoStrip.appendChild(thumb);
  });
}

function sliderRow(label, min, max, step, value, onInput) {
  const row = document.createElement('label');
  row.className = 'slider-row';
  const name = document.createElement('span');
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = document.createElement('output');
  out.textContent = Number(value).toFixed(2);
  input.addEventListener('input', () => {
    out.textContent = Number(input.value).toFixed(2);
    onInput(Number(input.value));
  });
  row.append(name, input, out);
  return row;
}

function rebuildPanelEditors() {
  panelEditors.innerHTML = '';
  state.panels.forEach((slot, i) => {
    const box = document.createElement('div');
    box.className = 'panel-editor' + (state.selected === i ? ' selected' : '');
    box.addEventListener('click', () => {
      state.selected = i;
      rebuildPanelEditors();
      requestRedraw();
    });
    const head = document.createElement('h3');
    head.innerHTML = `Panel ${i + 1} · <b>${state.selected === i ? 'selected' : 'click to select'}</b>`;
    box.appendChild(head);

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = '— empty panel —';
    select.appendChild(none);
    state.photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = photo.name;
      select.appendChild(opt);
    });
    select.value = String(slot.photo);
    select.addEventListener('change', () => {
      slot.photo = Number(select.value);
      rebuildPhotoStrip();
      requestRedraw();
    });
    box.appendChild(select);

    const photo = slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (photo) {
      box.appendChild(sliderRow('Zoom', 1, 3, 0.01, photo.zoom, (v) => {
        photo.zoom = v;
        requestRedraw();
      }));
      box.appendChild(sliderRow('Pan X', -0.5, 0.5, 0.01, photo.ox, (v) => {
        photo.ox = v;
        requestRedraw();
      }));
      box.appendChild(sliderRow('Pan Y', -0.5, 0.5, 0.01, photo.oy, (v) => {
        photo.oy = v;
        requestRedraw();
      }));
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'btn ghost';
      reset.textContent = 'Reset crop';
      reset.style.marginTop = '6px';
      reset.addEventListener('click', (e) => {
        e.stopPropagation();
        photo.zoom = 1.15;
        photo.ox = 0;
        photo.oy = 0;
        rebuildPanelEditors();
        requestRedraw();
      });
      box.appendChild(reset);
    }
    panelEditors.appendChild(box);
  });
}

function hitPanel(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return { hit, x, y };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { hit, x, y } = hitPanel(e.clientX, e.clientY);
  if (hit === -1) return;
  state.selected = hit;
  rebuildPanelEditors();
  const photo = state.panels[hit].photo >= 0 ? state.photos[state.panels[hit].photo] : null;
  if (!photo) return;
  canvas.setPointerCapture(e.pointerId);
  drag = { photo, lastX: x, lastY: y };
  requestRedraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = hitPanel(e.clientX, e.clientY);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const rect = rects[state.selected];
  drag.photo.ox += (x - drag.lastX) / rect.w;
  drag.photo.oy += (y - drag.lastY) / rect.h;
  drag.lastX = x;
  drag.lastY = y;
  requestRedraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  rebuildPanelEditors();
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.panels[state.selected];
  const photo = slot.photo >= 0 ? state.photos[slot.photo] : null;
  if (!photo) return;
  photo.zoom = Math.max(1, Math.min(3, photo.zoom * (1 - e.deltaY * 0.001)));
  rebuildPanelEditors();
  requestRedraw();
}, { passive: false });

function exportPNG(width, height) {
  return new Promise((resolve, reject) => {
    const out = renderPoster(state, width, height);
    out.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Export produced no image'));
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-city-cover-${width}x${height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Exported vice-city-cover-${width}x${height}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

function exportDataURL(width, height) {
  return new Promise((resolve) => {
    const out = renderPoster(state, width, height);
    resolve(out.toDataURL('image/png'));
  });
}

// --- Controls -------------------------------------------------------------

document.getElementById('photoInput').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});
document.getElementById('loadSamples').addEventListener('click', loadSamples);
document.getElementById('clearPhotos').addEventListener('click', () => {
  state.photos.forEach((p) => {
    if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
  });
  state.photos = [];
  state.panels.forEach((slot) => { slot.photo = -1; });
  rebuildPhotoStrip();
  rebuildPanelEditors();
  requestRedraw();
  setStatus('Photos cleared.');
});

document.querySelectorAll('.layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('.layout-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
    syncPanelsToLayout();
    rebuildPanelEditors();
    requestRedraw();
  });
});

document.querySelectorAll('.grade-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('.grade-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
    requestRedraw();
  });
});

document.getElementById('sunToggle').addEventListener('change', (e) => {
  state.sun = e.target.checked;
  requestRedraw();
});

document.getElementById('titleInput').addEventListener('input', (e) => {
  state.title = e.target.value;
  requestRedraw();
});
document.getElementById('subtitleInput').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  requestRedraw();
});

document.querySelectorAll('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('.size-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)));
    requestRedraw();
  });
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  exportPNG(w, h).catch((err) => setStatus(`Export failed: ${err.message}`));
});

// --- Test / screenshot hooks ----------------------------------------------
window.__studio = {
  state,
  SIZES,
  loadSamples,
  exportPNG,
  exportDataURL,
  setLayout(layout) {
    state.layout = layout;
    document.querySelectorAll('.layout-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
    syncPanelsToLayout();
    rebuildPanelEditors();
    requestRedraw();
  },
  setCaption(title, subtitle) {
    state.title = title;
    state.subtitle = subtitle;
    document.getElementById('titleInput').value = title;
    document.getElementById('subtitleInput').value = subtitle;
    requestRedraw();
  },
  setGrade(grade) {
    state.grade = grade;
    document.querySelectorAll('.grade-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.grade === grade)));
    requestRedraw();
  },
  setSize(size) {
    if (!SIZES[size]) return;
    state.size = size;
    document.querySelectorAll('.size-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.size === size)));
    requestRedraw();
  },
  refreshControls() {
    rebuildPhotoStrip();
    rebuildPanelEditors();
  },
};

// --- Boot -------------------------------------------------------------------
syncPanelsToLayout();
rebuildPhotoStrip();
rebuildPanelEditors();
renderPreview();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  setupShot(shot, new URLSearchParams(location.search), window.__studio);
} else {
  // Redraw once the display font arrives so the preview uses Anton, not a fallback.
  document.fonts.load('400 100px Anton').then(requestRedraw).catch(() => {});
  document.fonts.ready.then(requestRedraw).catch(() => {});
}
