// Vice City Cover Studio — poster renderer.
// Draws the whole multi-panel poster onto any 2D canvas context at any size:
// panels filled with the user's photos (each cropped and positioned on its own),
// a sunset / neon colour grade, a striped retro sun, and bold Anton caption
// lettering over a scrim at the foot. Everything is drawn, nothing is fetched.

export const LAYOUTS = {
  hero: {
    label: 'Hero + pair',
    panels: [
      [0, 0, 1, 0.6],
      [0, 0.6, 0.5, 0.4],
      [0.5, 0.6, 0.5, 0.4],
    ],
  },
  trio: {
    label: 'Triple strip',
    panels: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
  },
  quad: {
    label: 'Four grid',
    panels: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
};

export const GRADES = {
  sunset: {
    top: 'rgba(255, 150, 60, 0.16)',
    mid: 'rgba(255, 70, 130, 0.20)',
    low: 'rgba(80, 20, 130, 0.26)',
    sun: ['#ffd319', '#ff2975'],
    title: ['#ffffff', '#ffe9a8'],
    subtitle: '#ffb3d1',
  },
  neon: {
    top: 'rgba(0, 229, 255, 0.20)',
    mid: 'rgba(255, 0, 150, 0.22)',
    low: 'rgba(40, 0, 90, 0.28)',
    sun: ['#2ee6ff', '#ff2e88'],
    title: ['#ffffff', '#a5f3ff'],
    subtitle: '#2ee6ff',
  },
  dusk: {
    top: 'rgba(120, 90, 255, 0.14)',
    mid: 'rgba(180, 60, 160, 0.16)',
    low: 'rgba(10, 8, 40, 0.34)',
    sun: ['#ffb347', '#b967ff'],
    title: ['#ffffff', '#e6d9ff'],
    subtitle: '#c9b8ff',
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Panel rectangles for a layout, in canvas pixels, with a gap between them. */
export function panelRects(layout, w, h) {
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  const m = gap;
  const innerW = w - m * 2;
  const innerH = h - m * 2;
  return LAYOUTS[layout].panels.map(([fx, fy, fw, fh]) => {
    const x = m + fx * innerW + (fx > 0 ? gap / 2 : 0);
    const y = m + fy * innerH + (fy > 0 ? gap / 2 : 0);
    const pw = fw * innerW - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0);
    const ph = fh * innerH - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0);
    return { x, y, w: pw, h: ph };
  });
}

/** Keeps a photo's pan inside the panel so it always covers it. */
export function clampPan(photo, panelW, panelH) {
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  const base = Math.max(panelW / iw, panelH / ih);
  const dw = iw * base * photo.zoom;
  const dh = ih * base * photo.zoom;
  const maxOx = Math.max(0, (dw - panelW) / 2 / panelW);
  const maxOy = Math.max(0, (dh - panelH) / 2 / panelH);
  photo.ox = Math.max(-maxOx, Math.min(maxOx, photo.ox));
  photo.oy = Math.max(-maxOy, Math.min(maxOy, photo.oy));
}

function drawPhoto(ctx, photo, rect) {
  const { x, y, w, h } = rect;
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const dw = iw * base * photo.zoom;
  const dh = ih * base * photo.zoom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(photo.img, x + (w - dw) / 2 + photo.ox * w, y + (h - dh) / 2 + photo.oy * h, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, index, w, h) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#2a1748');
  g.addColorStop(1, '#160a28');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  ctx.lineTo(rect.x + rect.w, rect.y);
  ctx.stroke();
  const size = Math.min(rect.w, rect.h) * 0.14;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** A sun with horizontal slats, drawn as stacked slices of a gradient disc.
 *  It sits high in the panel's far corner, clear of the framed subject. */
function drawRetroSun(ctx, rect, grade, w, h) {
  const cx = rect.x + rect.w * 0.85;
  const cy = rect.y + rect.h * 0.2;
  const r = Math.min(rect.w, rect.h) * 0.19;
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, grade.sun[0]);
  grad.addColorStop(1, grade.sun[1]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = grad;
  const step = Math.max(2, r / 26);
  for (let yy = cy - r; yy < cy + r; yy += step) {
    const rel = (yy - cy) / r;
    if (rel > 0.1) {
      // Widening gaps toward the bottom of the disc.
      const gap = step * (0.4 + rel * 2.2);
      if ((yy / step) % 2 < gap / step) continue;
    }
    const half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
    ctx.fillRect(cx - half, yy, half * 2, step);
  }
  ctx.restore();
}

function splitTitle(ctx, text, maxWidth, maxSize) {
  let size = maxSize;
  ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
  if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
  const words = text.split(/\s+/);
  if (words.length < 2) {
    while (size > 12 && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
    }
    return { lines: [text], size };
  }
  // Balance the words over two lines, then shrink until both fit.
  let best = null;
  for (let cut = 1; cut < words.length; cut++) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const width = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || width < best.width) best = { lines: [a, b], width };
  }
  while (size > 12) {
    ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
    if (best.lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
    size -= 2;
  }
  return { lines: best.lines, size };
}

function drawCaption(ctx, state, grade, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;

  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.62, 0, h);
  scrim.addColorStop(0, 'rgba(12, 4, 26, 0)');
  scrim.addColorStop(0.45, 'rgba(12, 4, 26, 0.55)');
  scrim.addColorStop(1, 'rgba(12, 4, 26, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  const maxWidth = w * 0.92;
  let titleBottom = h * 0.93;
  if (title) {
    const { lines, size } = splitTitle(ctx, title, maxWidth, h * 0.115);
    const grad = ctx.createLinearGradient(0, h - size * lines.length * 1.05, 0, h);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(1, grade.title[1]);
    ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 4, 40, 0.9)';
    ctx.lineWidth = size * 0.09;
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.02;
    lines.forEach((line, i) => {
      const y = titleBottom - (lines.length - 1 - i) * size * 1.02;
      ctx.strokeText(line, w / 2, y);
      ctx.fillStyle = grad;
      ctx.fillText(line, w / 2, y);
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    titleBottom -= lines.length * size * 1.02 + size * 0.28;
  }

  if (subtitle) {
    const size = Math.max(12, h * 0.026);
    ctx.font = `400 ${size}px Anton, system-ui, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.42}px`; } catch { /* older canvas: no tracking */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = size * 0.25;
    const textW = ctx.measureText(subtitle).width;
    ctx.fillText(subtitle, w / 2, titleBottom);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    // Flanking rules.
    const ruleY = titleBottom - size * 0.32;
    const ruleLen = Math.min(w * 0.14, (w - textW) / 2 - w * 0.03);
    if (ruleLen > 10) {
      ctx.strokeStyle = grade.subtitle;
      ctx.lineWidth = Math.max(1.5, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(w / 2 - textW / 2 - w * 0.02 - ruleLen, ruleY);
      ctx.lineTo(w / 2 - textW / 2 - w * 0.02, ruleY);
      ctx.moveTo(w / 2 + textW / 2 + w * 0.02, ruleY);
      ctx.lineTo(w / 2 + textW / 2 + w * 0.02 + ruleLen, ruleY);
      ctx.stroke();
    }
  }
}

/** Draws the full poster for `state` onto `ctx` at pixel size w x h. */
export function drawPoster(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#241040');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const slot = state.panels[i];
    const photo = slot && slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (photo && photo.img) {
      clampPan(photo, rect.w, rect.h);
      drawPhoto(ctx, photo, rect);
    } else {
      drawEmptyPanel(ctx, rect, i, w, h);
    }
    // Thin neon edge on every panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(1, w * 0.0012);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  if (state.sun && rects[0]) drawRetroSun(ctx, rects[0], grade, w, h);

  // Colour grade over the whole poster.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.55, grade.mid);
  wash.addColorStop(1, grade.low);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, state, grade, w, h);

  // Outer frame: cream hairline, magenta inner line.
  const frame = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.9)';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.65)';
  ctx.lineWidth = Math.max(1, frame * 0.35);
  ctx.strokeRect(frame * 2, frame * 2, w - frame * 4, h - frame * 4);
}

/** Renders the poster for `state` onto a fresh canvas of the given size. */
export function renderPoster(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawPoster(canvas.getContext('2d'), width, height, state);
  return canvas;
}
