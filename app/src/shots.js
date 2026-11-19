// Fixed scenes for screenshots, driven by a `?shot=` query:
//   ?shot=editor&photo=pier&caption=SUNSET%20HEIST — the editor with photos loaded
//   ?shot=cover&photo=boulevard&caption=BOULEVARD%20QUEEN — the poster alone
// `layout` and `grade` queries pick the arrangement. window.__shotReady is set
// once the scene is painted, so a screenshot driver can wait on it.
import { panelRects, clampPan, SIZES } from './poster.js';

// Where each sample photo's subject sits, as a fraction of the photo:
// the fisherman's face is upper-centre, the boulevard portrait's face upper-centre-right.
const FOCUS = [
  { fx: 0.45, fy: 0.2 },
  { fx: 0.55, fy: 0.22 },
];

export async function setupShot(shot, query, studio) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const caption = query.get('caption') ?? 'SUNSET HEIST';
  const subtitle = query.get('subtitle') ?? 'VICE CITY';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';

  await studio.loadSamples();
  // Both samples in play: pier leads the hero panel, boulevard fills the pair.
  studio.state.panels[0].photo = 0;
  if (studio.state.panels[1]) studio.state.panels[1].photo = 1;
  if (studio.state.panels[2]) studio.state.panels[2].photo = 0;
  if (studio.state.panels[3]) studio.state.panels[3].photo = 1;
  studio.setLayout(layout);
  studio.setGrade(grade);
  studio.setCaption(caption, subtitle);
  studio.setSize(size);
  // Frame each photo on its subject in the panel that shows it, at the size
  // this scene exports at, so wide crops keep the faces instead of shoulders.
  const [w, h] = SIZES[studio.state.size];
  const rects = panelRects(layout, w, h);
  const zooms = { hero: [1.2, 1.25], trio: [1.15, 1.15], quad: [1.2, 1.2] }[layout] || [1.2, 1.2];
  studio.state.photos.forEach((photo, pi) => {
    photo.zoom = zooms[pi] ?? 1.2;
    const panelIndex = studio.state.panels.findIndex((slot) => slot.photo === pi);
    if (panelIndex >= 0) {
      const focus = FOCUS[pi];
      const rect = rects[panelIndex];
      const iw = photo.img.naturalWidth;
      const ih = photo.img.naturalHeight;
      const base = Math.max(rect.w / iw, rect.h / ih);
      const dw = iw * base * photo.zoom;
      const dh = ih * base * photo.zoom;
      photo.ox = ((-focus.fx * dw + rect.w / 2) - (rect.w - dw) / 2) / rect.w;
      photo.oy = ((-focus.fy * dh + rect.h / 2) - (rect.h - dh) / 2) / rect.h;
      clampPan(photo, rect.w, rect.h);
    }
  });
  studio.refreshControls();

  try {
    await document.fonts.load('400 100px Anton');
    await document.fonts.ready;
  } catch { /* fall back to the system font for the shot */ }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
