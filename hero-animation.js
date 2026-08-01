/* Corollary Tutors — hero sketch animation.
 * Vanilla SVG port of the Claude Design Motion piece. Plays once on load,
 * holds on the last frame. Page refresh replays. Respects reduced-motion.
 *
 * Structure mirrors the source JSX:
 *   - one persistent SVG stage built at start
 *   - each scene contributes to a shared state object
 *   - each element has an updater that reads the state and writes attributes
 *   - a single rAF loop advances time and re-applies state
 *
 * Adding new animations: build them in Claude Design, then port by copying
 * the geometry constants + scene tick functions from the exported JSX. The
 * SVG primitives (path draw-in, text reveal, arrows, ∴ mark) are reusable.
 */

(function () {
  'use strict';

  const container = document.querySelector('.hero__animation-frame');
  if (!container) return;

  // ─────────────────────────────────────────────────────────────
  // palette
  // ─────────────────────────────────────────────────────────────
  const INK    = '#1E1A17';
  const BONE   = '#F4EFE4';
  const BONEW  = '#FAF6EC';
  const ORANGE = '#D4633A';
  const TEAL   = '#4A7C7E';
  const GRAY   = '#C9C0B0';

  // ─────────────────────────────────────────────────────────────
  // geometry — matches hero-sketch.jsx exactly
  // ─────────────────────────────────────────────────────────────
  const RAD = Math.PI / 180;
  const TH  = 30;                                              // incline angle
  const U = { x:  Math.cos(TH * RAD), y: -Math.sin(TH * RAD) }; // up-slope
  const N = { x: -Math.sin(TH * RAD), y: -Math.cos(TH * RAD) }; // outward normal

  const A  = { x: 130, y: 545 };
  const Bv = { x: 620, y: 545 };
  const Cv = { x: 620, y: 545 - 490 * Math.tan(TH * RAD) };
  const HYP = Math.hypot(Cv.x - A.x, Cv.y - A.y);
  const Pt = { x: A.x + U.x * HYP * 0.6, y: A.y + U.y * HYP * 0.6 };
  const BW = 112, BH = 72;
  const BC = { x: Pt.x + N.x * (BH / 2), y: Pt.y + N.y * (BH / 2) };
  const FC = { x: 945, y: 352 };

  const HATCH = [];
  for (let x = 118; x <= 692; x += 26) HATCH.push(x);

  const QS = [
    'Which way does it want to go?',
    'What is the surface pushing back with?',
    'Why does \u03B8 end up inside the weight?',
  ];
  const QW = [358, 464, 440];

  // ─────────────────────────────────────────────────────────────
  // math helpers
  // ─────────────────────────────────────────────────────────────
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix   = (a, b, t)   => a + (b - a) * t;
  const add   = (p, d, L)   => ({ x: p.x + d.x * L, y: p.y + d.y * L });
  const neg   = (d)         => ({ x: -d.x, y: -d.y });

  // easings (matched to Popmotion/omelette Easing)
  const EO  = (t) => (--t) * t * t + 1;                        // easeOutCubic
  const EIO = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; // easeInOutCubic
  const EOB = (t) => {                                         // easeOutBack
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const seg = (t, a, b, e) => {
    const k = clamp((t - a) / (b - a), 0, 1);
    return e ? e(k) : k;
  };

  // ─────────────────────────────────────────────────────────────
  // path builders
  // ─────────────────────────────────────────────────────────────
  function rectPts(c, w, h) {
    const hx = { x: U.x * w / 2, y: U.y * w / 2 };
    const hy = { x: N.x * h / 2, y: N.y * h / 2 };
    return [
      { x: c.x + hx.x + hy.x, y: c.y + hx.y + hy.y },
      { x: c.x - hx.x + hy.x, y: c.y - hx.y + hy.y },
      { x: c.x - hx.x - hy.x, y: c.y - hx.y - hy.y },
      { x: c.x + hx.x - hy.x, y: c.y + hx.y - hy.y },
    ];
  }
  const line = (p1, p2) => `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  const boxPath = (c, w, h) => 'M ' +
    rectPts(c, w, h).map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ') + ' Z';

  // ─────────────────────────────────────────────────────────────
  // SVG helpers
  // ─────────────────────────────────────────────────────────────
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, String(attrs[k]));
    return n;
  }

  const svg = el('svg', {
    viewBox: '0 0 1280 720',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
    role: 'img',
  });
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
  container.appendChild(svg);

  const defs = el('defs');
  svg.appendChild(defs);
  svg.appendChild(el('rect', { x:0, y:0, width:1280, height:720, fill:BONE }));

  let clipCounter = 0;

  // ─────────────────────────────────────────────────────────────
  // primitive: line that draws itself in via stroke-dashoffset
  // ─────────────────────────────────────────────────────────────
  function makeDrawablePath(d, w, c, parent) {
    const p = el('path', {
      d, stroke: c || INK, 'stroke-width': w || 2.4,
      fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1,
    });
    p.style.opacity = '0';
    (parent || svg).appendChild(p);
    return {
      el: p,
      set(progress, opacity) {
        const eff = clamp(progress, 0, 1);
        if (eff <= 0.002) { p.style.opacity = '0'; return; }
        p.setAttribute('stroke-dashoffset', String(1 - eff));
        p.style.opacity = String(opacity != null ? opacity : 1);
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // primitive: dashed line, always full length, opacity fades in
  // ─────────────────────────────────────────────────────────────
  function makeDashPath(d, w, c, dash, parent) {
    const p = el('path', {
      d, stroke: c || GRAY, 'stroke-width': w || 1.4, fill: 'none',
      'stroke-linecap': 'butt', 'stroke-linejoin': 'round',
      'stroke-dasharray': dash || '8 7',
    });
    p.style.opacity = '0';
    (parent || svg).appendChild(p);
    return {
      el: p,
      setD(d) { p.setAttribute('d', d); },
      set(progress, opacity) {
        const eff = clamp(progress, 0, 1);
        p.style.opacity = String(eff * (opacity != null ? opacity : 1));
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // primitive: text with clip-path reveal (typewriter-like)
  // ─────────────────────────────────────────────────────────────
  function makeText(opts) {
    const {
      x, y, size = 30, c = INK, fam = 'serif', italic = false, weight = 400,
      width = 400, anchor = 'start', ls = 0, text,
    } = opts;
    const id = 'ct_clip_' + (++clipCounter);
    const cx = anchor === 'end' ? x - width
             : anchor === 'middle' ? x - width / 2
             : x;
    const clip = el('clipPath', { id });
    const rect = el('rect', {
      x: cx - 12, y: y - size * 1.25, width: 0, height: size * 1.85,
    });
    clip.appendChild(rect);
    defs.appendChild(clip);

    const family = fam === 'mono' ? '"IBM Plex Mono", monospace'
                 : fam === 'sans' ? '"IBM Plex Sans", sans-serif'
                 :                  '"IBM Plex Serif", serif';

    const t = el('text', {
      x, y,
      'clip-path': `url(#${id})`,
      fill: c,
      'font-family': family,
      'font-size': size,
      'font-style': italic ? 'italic' : 'normal',
      'font-weight': weight,
      'text-anchor': anchor,
      'letter-spacing': ls,
    });
    t.textContent = text;
    t.style.opacity = '0';
    svg.appendChild(t);

    const revealWidth = width + 24;
    return {
      el: t,
      set(progress, opacity) {
        const eff = clamp(progress, 0, 1);
        if (eff <= 0.002) { t.style.opacity = '0'; return; }
        rect.setAttribute('width', String(revealWidth * eff));
        t.style.opacity = String(opacity != null ? opacity : 1);
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // primitive: arrow (shaft grows, head appears at tip)
  // ─────────────────────────────────────────────────────────────
  function makeArrow(opts) {
    const {
      from, dir, len, c = TEAL, w = 2.8, dash = null, head = 14,
    } = opts;
    const shaft = el('path', {
      stroke: c, 'stroke-width': w, fill: 'none',
      'stroke-linecap': dash ? 'butt' : 'round', 'stroke-linejoin': 'round',
    });
    if (dash) shaft.setAttribute('stroke-dasharray', dash);
    shaft.style.opacity = '0';
    svg.appendChild(shaft);

    const headG = el('g');
    const headPath = el('path', { fill: c });
    headG.appendChild(headPath);
    headG.style.opacity = '0';
    svg.appendChild(headG);

    return {
      set(progress, opacity) {
        const eff = clamp(progress, 0, 1);
        const op  = opacity != null ? opacity : 1;
        if (eff <= 0.002) {
          shaft.style.opacity = '0';
          headG.style.opacity = '0';
          return;
        }
        const ang = Math.atan2(dir.y, dir.x) * 180 / Math.PI;
        const hs  = clamp((eff - 0.7) / 0.3, 0, 1);
        const headD = `M 0 0 L ${-head} ${head * 0.36} L ${-head} ${-head * 0.36} Z`;

        if (dash) {
          // dashed arrow: shaft full length, opacity fades with eff
          const tip = add(from, dir, len);
          shaft.setAttribute('d', line(from, tip));
          shaft.style.opacity = String(op * eff);
          if (hs > 0) {
            headPath.setAttribute('d', headD);
            headG.setAttribute('transform',
              `translate(${tip.x},${tip.y}) rotate(${ang}) scale(${hs})`);
            headG.style.opacity = String(op * eff);
          } else {
            headG.style.opacity = '0';
          }
        } else {
          // solid arrow: shaft grows to length as eff → 1
          const grow  = Math.min(1, eff / 0.84);
          const tip   = add(from, dir, len * grow);
          const shaftEnd = add(from, dir, len * grow - head * 0.7 * hs);
          shaft.setAttribute('d', line(from, hs > 0 ? shaftEnd : tip));
          shaft.style.opacity = String(op);
          if (hs > 0) {
            headPath.setAttribute('d', headD);
            headG.setAttribute('transform',
              `translate(${tip.x},${tip.y}) rotate(${ang}) scale(${hs})`);
            headG.style.opacity = String(op);
          } else {
            headG.style.opacity = '0';
          }
        }
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // primitive: the ∴ mark (three orange dots)
  // ─────────────────────────────────────────────────────────────
  function makeMark(x, y, r) {
    r = r || 6.5;
    const gap = r * 1.6;
    const g = el('g', { fill: ORANGE });
    g.appendChild(el('circle', { cx: 0,    cy: -gap,        r }));
    g.appendChild(el('circle', { cx: -gap, cy: gap * 0.72,  r }));
    g.appendChild(el('circle', { cx:  gap, cy: gap * 0.72,  r }));
    g.style.opacity = '0';
    svg.appendChild(g);
    return {
      set(progress) {
        const eff = clamp(progress, 0, 1);
        if (eff <= 0.002) { g.style.opacity = '0'; return; }
        const scale = 0.65 + 0.35 * eff;
        g.setAttribute('transform', `translate(${x},${y}) scale(${scale})`);
        g.style.opacity = String(eff);
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // build the stage (all elements created ONCE, in draw order)
  // ─────────────────────────────────────────────────────────────

  // ground line
  const groundPath = makeDrawablePath(line({x:104,y:A.y}, {x:704,y:A.y}), 2.6, INK);

  // hatch marks
  const hatchPaths = HATCH.map(x =>
    makeDrawablePath(line({x, y:A.y+1}, {x:x-14, y:A.y+17}), 1.4, GRAY)
  );

  // incline
  const hypPath  = makeDrawablePath(line(A, Cv),  2.8, INK);
  const vertPath = makeDrawablePath(line(Cv, Bv), 2.2, INK);

  // theta arc + label
  const thetaArc = makeDrawablePath(
    `M ${A.x + 88} ${A.y} A 88 88 0 0 0 ${A.x + 88*U.x} ${A.y + 88*U.y}`,
    1.6, GRAY
  );
  const thetaLabel = makeText({
    x: A.x + 106, y: A.y - 22, size: 29, italic: true, width: 22,
    text: '\u03B8',
  });

  // block on incline: fill + 4 edges + m label
  const blockOnPts = rectPts(BC, BW, BH);
  const blockFill = el('path', {
    d: boxPath(BC, BW, BH), fill: BONEW,
  });
  blockFill.style.opacity = '0';
  svg.appendChild(blockFill);
  const blockEdges = [];
  for (let i = 0; i < 4; i++) {
    blockEdges.push(makeDrawablePath(
      line(blockOnPts[i], blockOnPts[(i+1)%4]), 2.4, INK
    ));
  }
  // m label — inside the block, rotated with the incline
  const mLabelGroup = el('g', {
    transform: `translate(${BC.x},${BC.y}) rotate(${-TH})`,
  });
  svg.appendChild(mLabelGroup);
  const mLabel = (function() {
    const id = 'ct_clip_' + (++clipCounter);
    const clip = el('clipPath', { id });
    const rect = el('rect', {
      x: -12, y: 11 - 31 * 1.25, width: 0, height: 31 * 1.85,
    });
    clip.appendChild(rect);
    defs.appendChild(clip);
    const t = el('text', {
      x: 0, y: 11,
      'clip-path': `url(#${id})`,
      fill: INK,
      'font-family': '"IBM Plex Serif", serif',
      'font-size': 31,
      'font-style': 'italic',
      'text-anchor': 'middle',
    });
    t.textContent = 'm';
    t.style.opacity = '0';
    mLabelGroup.appendChild(t);
    const revealWidth = 22 + 24;
    return {
      set(progress, opacity) {
        const eff = clamp(progress, 0, 1);
        if (eff <= 0.002) { t.style.opacity = '0'; return; }
        rect.setAttribute('width', String(revealWidth * eff));
        t.style.opacity = String(opacity != null ? opacity : 1);
      },
    };
  })();

  // dashed isolation cut-out + leader line
  const cutRect = makeDashPath(boxPath(BC, BW+40, BH+40), 1.4, GRAY, '8 7');
  const leaderLine = makeDashPath(
    line({x:BC.x+78, y:BC.y-34}, {x:FC.x-96, y:FC.y-6}), 1.3, GRAY, '6 8'
  );

  // FBD block (moves from BC → FC). Fill + 4 edges, path d recomputed per frame.
  const fbdFill = el('path', { fill: BONEW });
  fbdFill.style.opacity = '0';
  svg.appendChild(fbdFill);
  const fbdEdges = [];
  for (let i = 0; i < 4; i++) {
    const p = el('path', {
      stroke: INK, 'stroke-width': 2.4, fill: 'none',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    p.style.opacity = '0';
    svg.appendChild(p);
    fbdEdges.push(p);
  }

  // rotated axes at 742,520 (below-left of FBD)
  const axesArrowU = makeArrow({
    from: {x:742, y:520}, dir: U, len: 84, c: INK, w: 1.7, head: 10,
  });
  const axesArrowN = makeArrow({
    from: {x:742, y:520}, dir: N, len: 84, c: INK, w: 1.7, head: 10,
  });
  const axLabelX = makeText({
    x: 834, y: 470, size: 23, italic: true, c: INK, width: 26, text: 'x\u2032',
  });
  const axLabelY = makeText({
    x: 662, y: 438, size: 23, italic: true, c: INK, width: 26, text: 'y\u2032',
  });

  // force vectors
  const arrowMg = makeArrow({ from: FC, dir: {x:0, y:1}, len: 148 });
  const labelMg = makeText({
    x: FC.x + 20, y: FC.y + 168, size: 29, italic: true, c: TEAL, width: 44, text: 'mg',
  });

  const arrowCompX = makeArrow({
    from: FC, dir: neg(U), len: 74, dash: '7 6', w: 2, head: 11,
  });
  const arrowCompY = makeArrow({
    from: FC, dir: neg(N), len: 128, dash: '7 6', w: 2, head: 11,
  });
  const labelCompS = makeText({
    x: FC.x - 86, y: FC.y + 54, size: 24, italic: true, c: TEAL,
    anchor: 'end', width: 116, text: 'mg sin \u03B8',
  });
  const labelCompC = makeText({
    x: FC.x + 78, y: FC.y + 134, size: 24, italic: true, c: TEAL,
    width: 120, text: 'mg cos \u03B8',
  });

  const arrowN = makeArrow({ from: FC, dir: N, len: 122 });
  const labelN = makeText({
    x: FC.x - 92, y: FC.y - 118, size: 29, italic: true, c: TEAL,
    anchor: 'end', width: 22, text: 'N',
  });

  const arrowF = makeArrow({ from: FC, dir: U, len: 104 });
  const labelF = makeText({
    x: FC.x + 108, y: FC.y - 62, size: 29, italic: true, c: TEAL,
    width: 94, text: 'f = \u03BCN',
  });

  // intuition eyebrow + questions
  const eyebrowText = makeText({
    x: 726, y: 152, size: 15, fam: 'mono', c: GRAY, ls: '0.18em', width: 262,
    text: 'BEFORE THE ALGEBRA',
  });
  const qTexts = QS.map((q, i) => makeText({
    x: 726, y: 218 + i * 74, size: 29, italic: true, width: 540, text: q,
  }));
  const qStrikes = QS.map((_, i) => makeDrawablePath(
    line({x:716, y:218 + i*74 - 6}, {x:726 + QW[i], y:218 + i*74 - 13}),
    2, INK,
  ));

  // derivation lines
  const derText = [
    makeText({
      x: 740, y: 562, size: 24, fam: 'mono', c: INK, width: 368,
      text: '\u03A3Fy\u2032 = 0  \u2192  N = mg cos \u03B8',
    }),
    makeText({
      x: 740, y: 606, size: 24, fam: 'mono', c: INK, width: 368,
      text: '\u03A3Fx\u2032 = mg sin \u03B8 \u2212 \u03BCN',
    }),
  ];

  // ∴ mark and final equation
  const markEl = makeMark(352, 654, 6.5);
  const eqText = makeText({
    x: 392, y: 670, size: 42, weight: 500, c: ORANGE, width: 552,
    text: 'ma = mg sin \u03B8 \u2212 \u03BCmg cos \u03B8',
  });
  const rulePath = makeDrawablePath(
    line({x:346, y:699}, {x:944, y:699}), 1.6, ORANGE
  );

  // ─────────────────────────────────────────────────────────────
  // apply: read state → update all element attributes
  // ─────────────────────────────────────────────────────────────
  function apply(s) {
    // ground + hatch
    groundPath.set(s.ground);
    for (let i = 0; i < HATCH.length; i++) {
      const p = seg(s.hatch, (i / HATCH.length) * 0.74, (i / HATCH.length) * 0.74 + 0.26);
      hatchPaths[i].set(p);
    }

    // incline
    hypPath.set(s.hyp);
    vertPath.set(s.vert);

    // theta
    thetaArc.set(s.theta);
    thetaLabel.set(seg(s.theta, 0.45, 1));

    // block on incline
    blockFill.style.opacity = String(seg(s.block, 0.45, 1));
    for (let i = 0; i < 4; i++) {
      blockEdges[i].set(seg(s.block, i * 0.2, i * 0.2 + 0.36, EO));
    }
    mLabel.set(s.mlab);

    // isolation cut + leader
    cutRect.set(s.cut);
    leaderLine.set(s.leader);

    // FBD block position
    if (s.move > 0) {
      const mvC = { x: mix(BC.x, FC.x, s.move), y: mix(BC.y, FC.y, s.move) };
      fbdFill.setAttribute('d', boxPath(mvC, BW, BH));
      fbdFill.style.opacity = '1';
      const pts = rectPts(mvC, BW, BH);
      for (let i = 0; i < 4; i++) {
        fbdEdges[i].setAttribute('d', line(pts[i], pts[(i+1)%4]));
        fbdEdges[i].style.opacity = '1';
      }
    } else {
      fbdFill.style.opacity = '0';
      for (let i = 0; i < 4; i++) fbdEdges[i].style.opacity = '0';
    }

    // axes (rendered at 0.58 group opacity like the source)
    const axOp = 0.58;
    axesArrowU.set(seg(s.axes, 0, 0.6),    axOp);
    axesArrowN.set(seg(s.axes, 0.35, 1),   axOp);
    axLabelX.set(seg(s.axes, 0.5, 0.8),    axOp);
    axLabelY.set(seg(s.axes, 0.8, 1),      axOp);

    // forces + labels
    arrowMg.set(s.mg);
    labelMg.set(seg(s.mg, 0.6, 1));

    arrowCompX.set(seg(s.comp, 0, 0.55));
    arrowCompY.set(seg(s.comp, 0.35, 0.9));
    labelCompS.set(seg(s.comp, 0.55, 0.85));
    labelCompC.set(seg(s.comp, 0.75, 1));

    arrowN.set(s.nf);
    labelN.set(seg(s.nf, 0.6, 1));

    arrowF.set(s.fr);
    labelF.set(seg(s.fr, 0.6, 1));

    // intuition text
    eyebrowText.set(s.eyebrow, 1 - s.ebErase);
    for (let i = 0; i < 3; i++) {
      const o = 1 - s.qErase[i];
      qTexts[i].set(s.q[i], o);
      qStrikes[i].set(s.qStrike[i], o * 0.8);
    }

    // derivation (dims but stays visible)
    const derOp = 1 - s.derDim * 0.6;
    derText[0].set(s.der[0], derOp);
    derText[1].set(s.der[1], derOp);

    // ∴ mark + equation + rule
    markEl.set(s.mark);
    eqText.set(s.eq);
    rulePath.set(s.rule);
  }

  // ─────────────────────────────────────────────────────────────
  // scene sequencing
  // ─────────────────────────────────────────────────────────────
  function baseState() {
    return {
      ground: 0, hyp: 0, vert: 0, hatch: 0, theta: 0, block: 0, mlab: 0,
      eyebrow: 0, q: [0,0,0], qErase: [0,0,0], qStrike: [0,0,0], ebErase: 0,
      cut: 0, move: 0, leader: 0, axes: 0,
      mg: 0, comp: 0, nf: 0, fr: 0, der: [0,0], derDim: 0,
      mark: 0, eq: 0, rule: 0,
    };
  }

  const doneAfter = [
    // done after Setup
    (s) => {
      s.ground = 1; s.hyp = 1; s.vert = 1; s.hatch = 1;
      s.theta = 1; s.block = 1; s.mlab = 1;
    },
    // done after Ask
    (s) => { s.eyebrow = 1; s.q = [1,1,1]; },
    // done after Erase
    (s) => { s.qErase = [1,1,1]; s.qStrike = [1,1,1]; s.ebErase = 1; },
    // done after Isolate
    (s) => { s.cut = 1; s.move = 1; s.leader = 1; s.axes = 1; },
    // done after Forces
    (s) => { s.mg = 1; s.comp = 1; s.nf = 1; s.fr = 1; s.der = [1,1]; },
    // done after Therefore (nothing to inherit, animation ends here)
    () => {},
  ];

  const scenes = [
    { name: 'Setup', dur: 3.2, tick: (t, s) => {
      s.ground = seg(t, 0.00, 0.17, EO);
      s.hyp    = seg(t, 0.18, 0.42, EO);
      s.vert   = seg(t, 0.40, 0.52, EO);
      s.hatch  = seg(t, 0.46, 0.68);
      s.theta  = seg(t, 0.62, 0.80, EO);
      s.block  = seg(t, 0.70, 0.94);
      s.mlab   = seg(t, 0.90, 1.00);
    }},
    { name: 'Ask', dur: 3.8, tick: (t, s) => {
      s.eyebrow = seg(t, 0.00, 0.09);
      s.q = [
        seg(t, 0.08, 0.32),
        seg(t, 0.38, 0.64),
        seg(t, 0.70, 0.94),
      ];
    }},
    { name: 'Erase', dur: 2.3, tick: (t, s) => {
      s.qStrike = [
        seg(t, 0.02, 0.18, EO),
        seg(t, 0.28, 0.44, EO),
        seg(t, 0.54, 0.70, EO),
      ];
      s.qErase = [
        seg(t, 0.18, 0.34),
        seg(t, 0.44, 0.60),
        seg(t, 0.70, 0.86),
      ];
      s.ebErase = seg(t, 0.82, 0.96);
    }},
    { name: 'Isolate', dur: 2.3, tick: (t, s) => {
      s.cut    = seg(t, 0.00, 0.26, EO);
      s.leader = seg(t, 0.22, 0.44);
      s.move   = seg(t, 0.26, 0.80, EIO);
      s.axes   = seg(t, 0.72, 1.00);
    }},
    { name: 'Forces', dur: 3.9, tick: (t, s) => {
      s.mg   = seg(t, 0.02, 0.20, EO);
      s.comp = seg(t, 0.20, 0.46);
      s.nf   = seg(t, 0.44, 0.62, EO);
      s.fr   = seg(t, 0.60, 0.78, EO);
      s.der  = [seg(t, 0.76, 0.90), seg(t, 0.88, 1.00)];
    }},
    { name: 'Therefore', dur: 3.2, tick: (t, s) => {
      s.derDim = seg(t, 0.04, 0.26);
      s.mark   = seg(t, 0.12, 0.34, EOB);
      s.eq     = seg(t, 0.32, 0.70);
      s.rule   = seg(t, 0.66, 0.86, EO);
    }},
  ];

  const cumulative = [0];
  for (let i = 0; i < scenes.length; i++) cumulative.push(cumulative[i] + scenes[i].dur);
  const totalDur = cumulative[scenes.length];

  function stateAt(globalTime) {
    const s = baseState();
    let idx = scenes.length - 1;
    for (let i = 0; i < scenes.length; i++) {
      if (globalTime < cumulative[i+1]) { idx = i; break; }
    }
    for (let i = 0; i < idx; i++) doneAfter[i](s);
    const localT = clamp((globalTime - cumulative[idx]) / scenes[idx].dur, 0, 1);
    scenes[idx].tick(localT, s);
    return s;
  }

  // ─────────────────────────────────────────────────────────────
  // playback
  // ─────────────────────────────────────────────────────────────
  const prefersReduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // jump straight to the settled last frame
    // (need all "done" states applied)
    const s = baseState();
    for (let i = 0; i < scenes.length - 1; i++) doneAfter[i](s);
    scenes[scenes.length - 1].tick(1, s);
    apply(s);
    container.classList.add('is-playing');
    return;
  }

  let startTime = null;
  function frame(now) {
    if (startTime == null) startTime = now;
    const t = (now - startTime) / 1000;
    apply(stateAt(t));
    if (t < totalDur) {
      requestAnimationFrame(frame);
    } else {
      // ensure final frame is exactly the end state
      apply(stateAt(totalDur));
    }
  }

  function start() {
    container.classList.add('is-playing');
    requestAnimationFrame(frame);
  }

  // wait for fonts before starting so text metrics don't shift mid-animation.
  // small delay after fonts ready to let the hero cascade breathe first.
  const HERO_CASCADE_MS = 1200;
  const kickoff = () => setTimeout(start, HERO_CASCADE_MS);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(kickoff, kickoff);
  } else {
    kickoff();
  }
})();
