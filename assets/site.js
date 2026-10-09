(function () {
  'use strict';
  var D = window.SQALE;
  if (!D) return;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ---------- */
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function el(tag, attrs, parent, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmt(n, d) {
    d = d || 0;
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtTrim(n) { return Number.isInteger(n) ? fmt(n) : fmt(n, 1); }
  /* "M_SQaLe" -> M<sub>SQaLe</sub>, built with DOM nodes */
  function appendModel(parent, name) {
    var m = /^M_(.+)$/.exec(name);
    if (!m) { parent.appendChild(document.createTextNode(name)); return; }
    parent.appendChild(document.createTextNode('M'));
    el('sub', null, parent, m[1]);
  }
  function appendModelSvg(textEl, name, fs) {
    var m = /^M_(.+)$/.exec(name);
    if (!m) { textEl.appendChild(document.createTextNode(name)); return; }
    var shift = Math.round(fs * 0.28 * 10) / 10;
    textEl.appendChild(document.createTextNode('M'));
    var s = svg('tspan', { dy: shift, 'font-size': Math.round(fs * 0.76) }, textEl);
    s.textContent = m[1];
    var b = svg('tspan', { dy: -shift }, textEl);
    b.textContent = ' ';
  }
  var MODEL_CLASS = { M_SQaLe: 'sqale', M_BIRD: 'bird', M_SynSQL: 'synsql' };
  function cls(name) { return MODEL_CLASS[name] || 'base'; }
  var MODEL_DESC = {
    M_SQaLe: 'Qwen3.5-2B trained with GRPO on SQaLe',
    M_BIRD: 'Qwen3.5-2B trained with GRPO on BIRD train',
    M_SynSQL: 'Qwen3.5-2B trained with GRPO on SynSQL-2.5M',
    'Qwen3.5-2B': 'untrained base model',
    'Qwen3.6-27B': 'untrained, 27B parameters'
  };

  /* ---------- figure animations ----------
     A figure is armed when it is drawn and plays the first time it scrolls into
     view: .anim-draw paths draw themselves, .anim-in nodes fade in, each on the
     delay its data-delay carries. Replay arms and plays it again. Under
     prefers-reduced-motion nothing is armed, so every draw is the final state. */
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animState = {};
  function eachAnim(root, sel, fn) {
    if (root) Array.prototype.forEach.call(root.querySelectorAll(sel), fn);
  }
  function armFigure(root) {
    if (!root) return;
    /* getTotalLength() below flushes layout, which would make the jump to the
       start state a transition of its own and leave the play with nothing to
       animate. Transitions are off while the start state is set. */
    var all = root.querySelectorAll('.anim-draw, .anim-in, .anim-grow');
    Array.prototype.forEach.call(all, function (n) { n.classList.add('anim-off'); });
    eachAnim(root, '.anim-draw', function (p) {
      var len = 0;
      try { len = p.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      p.style.strokeDasharray = len + ' ' + len;
      p.style.strokeDashoffset = len;
      p.style.transitionDelay = (p.getAttribute('data-delay') || 0) + 'ms';
      if (p.getAttribute('data-dur')) p.style.transitionDuration = p.getAttribute('data-dur') + 'ms';
    });
    eachAnim(root, '.anim-in', function (n) {
      n.style.opacity = '0';
      n.style.transform = 'translateY(6px)';
      n.style.transitionDelay = (n.getAttribute('data-delay') || 0) + 'ms';
    });
    eachAnim(root, '.anim-grow', function (n) {
      n.style.width = '0%';
      n.style.transitionDelay = (n.getAttribute('data-delay') || 0) + 'ms';
    });
    void root.getBoundingClientRect();   /* the start state becomes the one to animate from */
    Array.prototype.forEach.call(all, function (n) { n.classList.remove('anim-off'); });
  }
  function playFigure(root) {
    eachAnim(root, '.anim-draw', function (p) { p.style.strokeDashoffset = '0'; });
    eachAnim(root, '.anim-in', function (n) { n.style.opacity = '1'; n.style.transform = 'none'; });
    eachAnim(root, '.anim-grow', function (n) { n.style.width = n.getAttribute('data-w'); });
  }
  /* called at the end of a draw */
  function settle(id) {
    if (REDUCE || animState[id] === 'done') return;
    armFigure(document.getElementById(id));
    animState[id] = 'armed';
  }
  function trigger(id) {
    animState[id] = 'done';
    var root = document.getElementById(id);
    if (REDUCE || !root) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { playFigure(root); }); });
  }
  var REDRAW = {};
  function buildAnim() {
    REDRAW['pareto-plot'] = drawPareto;
    REDRAW['explore-plot'] = drawExplore;
    REDRAW['scale-fig'] = function () { drawSlope(); settle('scale-fig'); };
    var ids = Object.keys(REDRAW).filter(function (id) { return document.getElementById(id); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-replay]'), function (b) {
      if (REDUCE) { b.hidden = true; return; }
      var id = b.getAttribute('data-replay');
      b.addEventListener('click', function () {
        animState[id] = null;
        REDRAW[id]();              /* rebuilds the svg, which arms it again */
        trigger(id);
      });
    });
    if (REDUCE) return;
    if (!('IntersectionObserver' in window)) { ids.forEach(trigger); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        trigger(e.target.id);
      });
    }, { threshold: 0.15 });
    ids.forEach(function (id) {
      var n = document.getElementById(id);
      if (n) io.observe(n);
    });
    /* safety: never leave a figure armed and invisible */
    setTimeout(function () { ids.forEach(function (id) { if (animState[id] === 'armed') trigger(id); }); }, 8000);
  }

  /* ---------- Figure 5: one record ---------- */
  function buildRecord() {
    if (!document.getElementById('rec-meta')) return;
    var ex = D.example, sc = D.schema;
    var meta = document.getElementById('rec-meta');
    el('strong', null, meta, ex.schemaId);
    meta.appendChild(document.createTextNode(' · ' + ex.numTables + ' tables · ' + fmt(sc.rows) + ' rows · ' + ex.difficulty + ' question · test split'));

    var tabs = document.getElementById('style-tabs');
    var stack = document.getElementById('style-panels');
    var btns = [], panels = [];
    D.styles.forEach(function (s, i) {
      var b = el('button', {
        type: 'button', role: 'tab', class: 'tab', id: 'tab-' + s.key,
        'aria-controls': 'panel-' + s.key, 'aria-selected': i === 0 ? 'true' : 'false',
        tabindex: i === 0 ? '0' : '-1'
      }, tabs, s.label);
      var p = el('div', {
        role: 'tabpanel', class: 'qpanel' + (i === 0 ? ' is-active' : ''), id: 'panel-' + s.key,
        'aria-labelledby': 'tab-' + s.key
      }, stack);
      el('span', { class: 'label' }, p, 'Question · phrasing ' + (i + 1) + ' of ' + D.styles.length);
      el('p', { class: 'q-text' }, p, s.text);
      btns.push(b); panels.push(p);
    });
    function select(i, focus) {
      btns.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
        panels[j].classList.toggle('is-active', on);
      });
      if (focus) btns[i].focus();
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i, false); });
      b.addEventListener('keydown', function (e) {
        var n = btns.length, t = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') t = (i + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') t = (i - 1 + n) % n;
        else if (e.key === 'Home') t = 0;
        else if (e.key === 'End') t = n - 1;
        if (t !== null) { e.preventDefault(); select(t, true); }
      });
    });

    document.getElementById('rec-sql').innerHTML = highlightSQL(ex.sqlPretty);

    var rl = document.getElementById('rec-result-label');
    rl.textContent = 'Result · ' + ex.result.length + (ex.result.length === 1 ? ' row' : ' rows');
    var t = document.getElementById('rec-result');
    var tr = el('tr', null, el('thead', null, t));
    ex.resultColumns.forEach(function (c) { el('th', { scope: 'col' }, tr, c); });
    var tb = el('tbody', null, t);
    ex.result.forEach(function (row) {
      var r = el('tr', null, tb);
      row.forEach(function (v) { el('td', null, r, v); });
    });

    var goldNames = sc.gold.map(function (i) { return sc.tables[i]; });
    document.getElementById('strip-label').textContent = 'Schema · ' + sc.tables.length + ' tables';
    var usedLine = document.getElementById('schema-used');
    usedLine.appendChild(document.createTextNode('The gold SQL uses ' + goldNames.length + ' of them: '));
    goldNames.forEach(function (n, j) {
      el('code', null, usedLine, n);
      var sep = j === goldNames.length - 1 ? '.' : j === goldNames.length - 2 ? ' and ' : ', ';
      usedLine.appendChild(document.createTextNode(sep));
    });
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlightSQL(src) {
    var re = /('(?:[^']|'')*')|\b(FROM|JOIN)\b(\s+)(\w+)|\b(SELECT|DISTINCT|ON|WHERE|AND|OR|AS|GROUP|BY|ORDER|LIMIT|IN|HAVING|DESC|ASC|INNER|LEFT|NOT|NULL|IS|LIKE|FROM|JOIN)\b/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="tok-str">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-kw">' + m[2] + '</span>' + m[3] + '<span class="tok-tbl">' + esc(m[4]) + '</span>';
      else out += '<span class="tok-kw">' + m[5] + '</span>';
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  /* ---------- Figure 7: pipeline ---------- */
  var STAGES = [
    { t: ['Schema collection', 'and extension'], one: 'Schema collection and extension',
      d: ['SchemaPile schemas,', 'LLM-added tables'], dv: 'SchemaPile schemas plus LLM-added tables' },
    { t: ['Value', 'synthesis'], one: 'Value synthesis',
      d: ['rows filled in', 'foreign-key order'], dv: 'Rows filled in foreign-key order',
      loops: [{ h: ['key checks', 'and repair'], v: 'Key checks, then repair' }] },
    { t: ['Question', 'generation'], one: 'Question generation',
      d: ['subgraphs of up to', '20 tables, 3 levels'], dv: 'Subgraphs of up to 20 tables, 3 levels' },
    { t: ['Style', 'variation'], one: 'Style variation',
      d: ['7 rewrites,', 'one shared SQL'], dv: '7 rewrites that share one SQL query' },
    { t: ['Agentic answering', 'and judging'], one: 'Agentic answering and judging',
      d: ['agent explores the', 'live database'], dv: 'An agent explores the live database',
      loops: [{ h: ['execution', 'error'], v: 'Execution errors go back to the agent' },
              { h: ['judge', 'rejects'], v: 'Rejected queries go back for a rewrite' }] }
  ];
  function fitText(t, maxW) {
    try {
      var w = t.getComputedTextLength();
      if (w > maxW && w > 0) {
        var fs = parseFloat(getComputedStyle(t).fontSize) || 12;
        t.style.fontSize = Math.max(9.5, fs * maxW / w).toFixed(2) + 'px';
      }
    } catch (e) { /* not rendered yet */ }
  }
  function markers(s, id) {
    var defs = svg('defs', null, s);
    [['a', 'p-mk'], ['l', 'p-mk-loop']].forEach(function (p) {
      var mk = svg('marker', { id: id + p[0], viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
      mk.setAttribute('markerWidth', 8); mk.setAttribute('markerHeight', 8);
      svg('path', { d: 'M0 0.5 L10 5 L0 9.5 z', class: p[1] }, mk);
    });
  }
  function drawPipeline() {
    var wrap = document.getElementById('pipeline');
    if (!wrap) return;
    var W = Math.floor(wrap.clientWidth);
    if (!W) return;
    wrap.textContent = '';
    var id = 'pm' + W;
    if (W >= 840) {
      var g = 24, w = (W - 4 - 4 * g) / 5, by = 6, bh = 112, bb = by + bh;
      var depth = 22, H = bb + depth + 92;
      var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, wrap);
      markers(s, id);
      STAGES.forEach(function (st, i) {
        var x = 2 + i * (w + g);
        svg('rect', { x: x, y: by, width: w, height: bh, rx: 6, class: 'p-box' }, s);
        svg('text', { x: x + 12, y: by + 22, class: 'p-num' }, s).textContent = String(i + 1);
        st.t.forEach(function (line, j) {
          var t = svg('text', { x: x + 12, y: by + 46 + j * 17, class: 'p-title' }, s);
          t.textContent = line; fitText(t, w - 22);
        });
        st.d.forEach(function (line, j) {
          var t = svg('text', { x: x + 12, y: by + 86 + j * 15, class: 'p-detail' }, s);
          t.textContent = line; fitText(t, w - 22);
        });
        if (i < STAGES.length - 1) {
          svg('path', { d: 'M' + (x + w + 3) + ' ' + (by + bh / 2) + ' H' + (x + w + g - 3), class: 'p-arrow', 'marker-end': 'url(#' + id + 'a)' }, s);
        }
        (st.loops || []).forEach(function (lp, j, arr) {
          var sw = w / arr.length, cx = x + sw * (j + 0.5), hw = Math.min(20, sw / 2 - 14), r = 6;
          var d = 'M' + (cx + hw) + ' ' + bb + ' V' + (bb + depth - r) +
            ' Q' + (cx + hw) + ' ' + (bb + depth) + ' ' + (cx + hw - r) + ' ' + (bb + depth) +
            ' H' + (cx - hw + r) + ' Q' + (cx - hw) + ' ' + (bb + depth) + ' ' + (cx - hw) + ' ' + (bb + depth - r) +
            ' V' + (bb + 2);
          svg('path', { d: d, class: 'p-loop', 'marker-end': 'url(#' + id + 'l)' }, s);
          lp.h.forEach(function (line, k) {
            var t = svg('text', { x: cx, y: bb + depth + 16 + k * 14, 'text-anchor': 'middle', class: 'p-loop-lab' }, s);
            t.textContent = line;
          });
        });
      });
      var y = bb + depth + 58, x0 = 2, x1 = W - 2;
      svg('path', { d: 'M' + x0 + ' ' + (y - 7) + ' V' + y + ' H' + x1 + ' V' + (y - 7), class: 'p-bracket' }, s);
      var nt = svg('text', { x: W / 2, y: y + 18, 'text-anchor': 'middle', class: 'p-note' }, s);
      nt.textContent = 'every stage validated by execution';
    } else {
      var bw = W - 34, gapV = 26, yy = 0, rows = [];
      STAGES.forEach(function (st) {
        var n = (st.loops || []).length;
        var h = 58 + (n ? 8 + n * 19 : 0);
        rows.push({ y: yy, h: h }); yy += h + gapV;
      });
      var Hv = yy - gapV + 34;
      var sv = svg('svg', { width: W, height: Hv, viewBox: '0 0 ' + W + ' ' + Hv, 'aria-hidden': 'true' }, wrap);
      markers(sv, id);
      STAGES.forEach(function (st, i) {
        var r0 = rows[i], x = 1, yb = r0.y + 1;
        svg('rect', { x: x, y: yb, width: bw, height: r0.h - 2, rx: 6, class: 'p-box' }, sv);
        var t = svg('text', { x: x + 12, y: yb + 23, class: 'p-title' }, sv);
        var num = svg('tspan', { class: 'p-num' }, t); num.textContent = (i + 1) + ' ';
        t.appendChild(document.createTextNode(st.one));
        fitText(t, bw - 22);
        var dt = svg('text', { x: x + 12, y: yb + 43, class: 'p-detail' }, sv);
        dt.textContent = st.dv; fitText(dt, bw - 22);
        (st.loops || []).forEach(function (lp, k) {
          var ly = yb + 66 + k * 19;
          var lt = svg('text', { x: x + 12, y: ly, class: 'p-loop-lab' }, sv);
          lt.textContent = lp.v; fitText(lt, bw - 22);
          var cy = ly - 4, ex = x + bw;
          svg('path', { d: 'M' + ex + ' ' + (cy + 6) + ' H' + (ex + 10) + ' A6 6 0 0 0 ' + (ex + 10) + ' ' + (cy - 6) + ' H' + (ex + 2), class: 'p-loop', 'marker-end': 'url(#' + id + 'l)' }, sv);
        });
        if (i < STAGES.length - 1) {
          var ax = x + 22;
          svg('path', { d: 'M' + ax + ' ' + (yb + r0.h - 1) + ' V' + (rows[i + 1].y - 2), class: 'p-arrow', 'marker-end': 'url(#' + id + 'a)' }, sv);
        }
      });
      var nt2 = svg('text', { x: 1, y: Hv - 10, class: 'p-note' }, sv);
      nt2.textContent = 'every stage validated by execution';
    }
  }

  /* ---------- Figure 6: schema size ---------- */
  function drawCompare() {
    var wrap = document.getElementById('compare-plot');
    if (!wrap) return;
    var W = Math.floor(wrap.clientWidth);
    if (!W) return;
    wrap.textContent = '';
    var rows = D.compare, rowH = 40, m = { l: 66, r: 36, t: 4, b: 30 };
    var H = m.t + rows.length * rowH + m.b, pw = W - m.l - m.r;
    var lo = Math.log(3), hi = Math.log(900);
    function X(v) { return m.l + (Math.log(v) - lo) / (hi - lo) * pw; }
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Median tables and columns per schema: ' + rows.map(function (d) { return d.name + ' ' + fmtTrim(d.medTables) + ' tables, ' + d.medCols + ' columns'; }).join('; ') }, wrap);
    [5, 10, 50, 100, 500].forEach(function (v) {
      svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, class: 'c-grid' }, s);
      svg('text', { x: X(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'c-tick' }, s).textContent = fmt(v);
    });
    svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'c-base' }, s);
    rows.forEach(function (d, i) {
      var cy = m.t + rowH * (i + 0.5), ours = d.name === 'SQaLe';
      var xt = X(d.medTables), xc = X(d.medCols);
      svg('text', { x: 0, y: cy + 4.5, class: 'c-row' + (ours ? ' strong' : '') }, s).textContent = d.name;
      svg('line', { x1: xt, x2: xc, y1: cy, y2: cy, class: 'conn' + (ours ? ' sqale' : '') }, s);
      svg('circle', { cx: xt, cy: cy, r: 5.5, class: 'f-bg ' + (ours ? 's-sqale' : 's-muted'), 'stroke-width': 2 }, s);
      svg('circle', { cx: xc, cy: cy, r: 6, class: (ours ? 'f-sqale' : 'f-muted') + ' ring-bg' }, s);
      svg('text', { x: xt - 11, y: cy + 4, 'text-anchor': 'end', class: 'c-val' + (ours ? ' strong' : '') }, s).textContent = fmtTrim(d.medTables);
      svg('text', { x: xc + 11, y: cy + 4, class: 'c-val' + (ours ? ' strong' : '') }, s).textContent = fmt(d.medCols);
    });
  }
  function buildCompareTable() {
    var t = document.getElementById('compare-table');
    if (!t) return;
    var head = el('tr', null, el('thead', null, t));
    [['Dataset', ''], ['Schemas', 'num'], ['Median tables', 'num'], ['Median columns', 'num'], ['Foreign keys', 'num'], ['Median rows / table', 'num']]
      .forEach(function (c) { el('th', { scope: 'col', class: c[1] || null }, head, c[0]); });
    var tb = el('tbody', null, t);
    D.compare.forEach(function (d) {
      var r = el('tr', { class: d.name === 'SQaLe' ? 'is-hl' : null }, tb);
      el('th', { scope: 'row' }, r, d.name);
      el('td', { class: 'num' }, r, fmt(d.schemas));
      el('td', { class: 'num' }, r, fmtTrim(d.medTables));
      el('td', { class: 'num' }, r, fmt(d.medCols));
      el('td', { class: 'num' }, r, fmt(d.fks));
      var c = el('td', { class: 'num' }, r);
      if (d.medRows == null) el('span', { class: 'na', title: 'not reported' }, c, 'n/a'); else c.textContent = fmt(d.medRows);
    });
  }

  /* ---------- Figures 1 and 2: size/compute, matrix ---------- */
  function buildMatrix() {
    var t = document.getElementById('matrix-table');
    if (!t) return;
    var head = el('tr', null, el('thead', null, t));
    [['Model', ''], ['SQaLe test', 'num'], ['BIRD', 'num'], ['EHRSQL', 'num']]
      .forEach(function (c) { el('th', { scope: 'col', class: c[1] || null }, head, c[0]); });
    var tb = el('tbody', null, t);
    var trained = D.matrix.filter(function (r) { return r.kind !== 'base'; });
    var base = D.matrix.filter(function (r) { return r.kind === 'base'; });
    var baseline = D.matrix.filter(function (r) { return r.model === 'Qwen3.5-2B'; })[0];
    var best = {};
    ['sqale', 'bird', 'ehrsql'].forEach(function (k) {
      best[k] = Math.max.apply(null, trained.map(function (r) { return r[k]; }));
    });
    function group(label) {
      var g = el('tr', { class: 'grp' }, tb);
      el('th', { colspan: 4, scope: 'colgroup' }, g, label);
    }
    function row(r, isTrained) {
      var tr = el('tr', { class: r.kind === 'ours' ? 'is-ours' : null }, tb);
      var th = el('th', { scope: 'row' }, tr);
      el('i', { class: 'sw sw-' + cls(r.model), 'aria-hidden': 'true' }, th);
      appendModel(th, r.model);
      el('span', { class: 'desc' }, th, MODEL_DESC[r.model] || '');
      ['sqale', 'bird', 'ehrsql'].forEach(function (k) {
        var td = el('td', { class: 'num' }, tr);
        if (r[k] == null) { el('span', { class: 'na' }, td, 'not measured'); return; }
        var v = fmt(r[k], 1);
        if (isTrained && r[k] === best[k]) el('strong', null, td, v);
        else td.appendChild(document.createTextNode(v));
        if (isTrained && k === 'sqale' && baseline) {
          el('span', { class: 'delta' }, td, '+' + fmt(r[k] - baseline[k], 1));
        }
      });
    }
    group('Qwen3.5-2B trained with GRPO on one corpus');
    trained.forEach(function (r) { row(r, true); });
    group('Without training');
    base.forEach(function (r) { row(r, false); });
  }

  function buildParetoLegend() {
    var lg = document.getElementById('pareto-legend');
    if (!lg) return;
    [['M_SQaLe', 'sqale'], ['M_BIRD', 'bird'], ['M_SynSQL', 'synsql']].forEach(function (p) {
      var sp = el('span', null, lg);
      el('i', { class: 'sw sw-' + p[1], 'aria-hidden': 'true' }, sp);
      appendModel(sp, p[0]);
    });
    var o = el('span', null, lg);
    el('i', { class: 'sw sw-base', 'aria-hidden': 'true' }, o);
    o.appendChild(document.createTextNode('general-purpose models, untrained'));
    var sk = el('span', { class: 'size-key' }, lg);
    var vals = [200, 1000, 3000], rs = vals.map(radius), wTot = 0;
    rs.forEach(function (r) { wTot += 2 * r + 6; });
    var hS = 2 * rs[2] + 2;
    var ks = svg('svg', { width: wTot, height: hS, viewBox: '0 0 ' + wTot + ' ' + hS, 'aria-hidden': 'true' }, sk);
    var cx = 0;
    rs.forEach(function (r) {
      svg('circle', { cx: cx + r, cy: hS - r - 1, r: r, class: 'f-base' }, ks);
      cx += 2 * r + 6;
    });
    sk.appendChild(document.createTextNode('dot area: 200, 1,000, 3,000 TFLOPs per question'));
  }
  function radius(tf) { return Math.max(4.5, 0.29 * Math.sqrt(tf)); }

  var paretoFocus = 0;
  function drawPareto() {
    var wrap = document.getElementById('pareto-plot');
    if (!wrap) return;
    var tip = document.getElementById('pareto-tip');
    var W = Math.floor(wrap.clientWidth);
    if (!W) return;
    var old = wrap.querySelector('svg');
    if (old) wrap.removeChild(old);
    tip.hidden = true;
    var narrow = W < 600;
    var H = narrow ? 330 : Math.round(Math.max(380, Math.min(540, W * 0.48)));
    var m = { l: 40, r: 16, t: 14, b: 46 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var lo = Math.log(1.6), hi = Math.log(85);
    /* The field starts at 10%, the lowest model in it, so the band everything sits in
       is not squeezed into the top half of the plot. */
    var yLo = 10, yHi = 70;
    function X(p) { return m.l + (Math.log(p) - lo) / (hi - lo) * pw; }
    function Y(a) { return m.t + ph - (a - yLo) / (yHi - yLo) * ph; }
    var yBase = Y(yLo);
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'group',
      'aria-label': 'Scatter plot of accuracy against model size for 25 models. M_SQaLe reaches 52% at 2B parameters and 224 TFLOPs per question.' });
    wrap.insertBefore(s, tip);
    [10, 20, 40, 60].forEach(function (v) {
      svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: v === yLo ? 'c-base' : 'c-grid' }, s);
      svg('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'c-tick' }, s).textContent = v + '%';
    });
    [2, 5, 10, 20, 50].forEach(function (v) {
      svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: yBase, class: 'c-grid' }, s);
      svg('text', { x: X(v), y: yBase + 19, 'text-anchor': 'middle', class: 'c-tick' }, s).textContent = v + 'B';
    });
    svg('text', { x: m.l + pw / 2, y: H - 6, 'text-anchor': 'middle', class: 'c-axis-title' }, s).textContent = 'Parameters, log scale';

    /* The frontier of the untrained general-purpose models: the best accuracy
       reached at each size. M_SQaLe's distance from it is the point of the figure,
       so both annotations go in before the dots and are painted over by them. */
    /* One left-to-right sweep drives the figure. sweepAt(x) is the moment the
       frontier's drawing line passes that x, so a dot and its label arrive with
       it; past the end of the line it carries on at the same pace. */
    var A_START = 260, A_SWEEP = 2200, A_AFTER = A_START + A_SWEEP;
    var sweepAt = function (x) { return Math.round(A_START + (x - m.l) / Math.max(1, pw) * A_SWEEP); };
    var base = D.pareto.filter(function (p) { return p.kind === 'base'; })
      .sort(function (a, b) { return a.params - b.params; });
    var front = [], top = -1;
    base.forEach(function (p) { if (p.acc > top) { front.push(p); top = p.acc; } });
    var ourP = D.pareto.filter(function (p) { return p.kind === 'ours'; })[0];
    if (front.length > 1) {
      var verts = [];
      front.forEach(function (p, i) {
        var px = X(p.params), py = Y(p.acc * 100);
        if (i) verts.push([px, verts[verts.length - 1][1]]);
        verts.push([px, py]);
      });
      var d = verts.map(function (v, i) {
        return (i ? 'L' : 'M') + v[0].toFixed(1) + ',' + v[1].toFixed(1);
      }).join('');
      svg('path', { d: d, class: 'c-front anim-draw', 'data-delay': A_START, 'data-dur': A_SWEEP }, s);
      var cum = [0];
      for (var vi = 1; vi < verts.length; vi++) {
        var vdx = verts[vi][0] - verts[vi - 1][0], vdy = verts[vi][1] - verts[vi - 1][1];
        cum.push(cum[vi - 1] + Math.sqrt(vdx * vdx + vdy * vdy));
      }
      var totalLen = cum[cum.length - 1] || 1;
      var spanX = verts[verts.length - 1][0] - verts[0][0] || 1;
      sweepAt = function (x) {
        if (x <= verts[0][0]) return A_START;
        for (var i = 1; i < verts.length; i++) {
          if (x <= verts[i][0]) {
            var ax = verts[i - 1][0], bx = verts[i][0];
            var f = bx === ax ? 1 : (x - ax) / (bx - ax);
            return Math.round(A_START + (cum[i - 1] + (cum[i] - cum[i - 1]) * f) / totalLen * A_SWEEP);
          }
        }
        return Math.round(A_AFTER + (x - verts[verts.length - 1][0]) / spanX * A_SWEEP);
      };
    }
    if (ourP && front.length) {
      /* the lead at M_SQaLe's own size */
      var foot = front[0];
      if (foot.params === ourP.params) {
        var gx = X(ourP.params) - 11, ya = Y(foot.acc * 100), yb = Y(ourP.acc * 100);
        svg('line', { x1: gx, x2: gx, y1: ya, y2: yb, class: 'c-gap anim-in', 'data-delay': A_AFTER + 150 }, s);
        [ya, yb].forEach(function (y) {
          svg('line', { x1: gx - 3, x2: gx + 3, y1: y, y2: y, class: 'c-gap anim-in', 'data-delay': A_AFTER + 150 }, s);
        });
      }
      /* how far right the frontier has to run to reach M_SQaLe's accuracy */
      var a = null, b = null;
      front.forEach(function (p, i) {
        if (b === null && p.acc >= ourP.acc && i > 0) { a = front[i - 1]; b = p; }
      });
      if (a && b) {
        var xr = X(b.params);
        var yr = Y(ourP.acc * 100), x0 = X(ourP.params) + radius(ourP.tflops) + 5;
        svg('line', { x1: x0, x2: xr, y1: yr, y2: yr, class: 'c-reach anim-draw', 'data-delay': A_AFTER + 380, 'data-dur': 700 }, s);
        if (!narrow) {
          var rl = svg('text', { x: xr - 6, y: yr - 22, 'text-anchor': 'end', class: 'c-lab anim-in', 'data-delay': A_AFTER + 950, 'aria-hidden': 'true' }, s);
          rl.textContent = Math.round(b.params / ourP.params) + '\u00d7 the parameters to match';
        }
      }
    }

    var pts = D.pareto.map(function (p) {
      return { p: p, x: X(p.params), y: Y(p.acc * 100), r: radius(p.tflops) };
    });
    var drawOrder = pts.slice().sort(function (a, b) {
      var ka = a.p.kind === 'base' ? 0 : 1, kb = b.p.kind === 'base' ? 0 : 1;
      return ka - kb || b.p.tflops - a.p.tflops;
    });
    var navOrder = pts.slice().sort(function (a, b) { return a.p.params - b.p.params || b.p.acc - a.p.acc; });
    var groups = [];
    drawOrder.forEach(function (d) {
      var g = svg('g', { class: 'pt anim-in', 'data-delay': sweepAt(d.x), tabindex: '-1', role: 'img',
        'aria-label': d.p.model.replace('M_', 'M ') + ': ' + Math.round(d.p.acc * 100) + '% accuracy, ' + fmt(Math.round(d.p.tflops)) + ' TFLOPs per question, ' + d.p.params + 'B parameters' }, s);
      svg('circle', { cx: d.x, cy: d.y, r: d.r, class: 'f-' + cls(d.p.model) + ' ring-bg' }, g);
      if (d.p.kind === 'ours') svg('circle', { cx: d.x, cy: d.y, r: d.r + 4, class: 'halo' }, g);
      svg('circle', { cx: d.x, cy: d.y, r: d.r + 3, class: 'focus-ring' }, g);
      svg('circle', { cx: d.x, cy: d.y, r: Math.max(12, d.r + 4), class: 'hit' }, g);
      d.g = g; groups.push(d);
      g.addEventListener('pointerenter', function () { show(d); });
      g.addEventListener('pointerleave', function () { if (document.activeElement !== g) hide(d); });
      g.addEventListener('focus', function () { paretoFocus = navOrder.indexOf(d); show(d); });
      g.addEventListener('blur', function () { hide(d); });
      g.addEventListener('keydown', function (e) {
        var i = navOrder.indexOf(d), n = navOrder.length, t = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = (i - 1 + n) % n;
        else if (e.key === 'Home') t = 0;
        else if (e.key === 'End') t = n - 1;
        else if (e.key === 'Escape') { hide(d); return; }
        if (t !== null) {
          e.preventDefault();
          d.g.setAttribute('tabindex', '-1');
          navOrder[t].g.setAttribute('tabindex', '0');
          navOrder[t].g.focus();
        }
      });
    });
    var start = navOrder[Math.min(paretoFocus, navOrder.length - 1)];
    var ours = navOrder.filter(function (d) { return d.p.kind === 'ours'; })[0];
    (paretoFocus ? start : ours).g.setAttribute('tabindex', '0');

    /* direct labels: M_SQaLe, Qwen3.5-9B, Qwen3.5-27B always; others when there is room */
    function find(name) { return pts.filter(function (d) { return d.p.model === name; })[0]; }
    function label(name, dx, dy, anchor, strong, suffix) {
      var d = find(name); if (!d) return;
      var t = svg('text', { x: d.x + dx(d), y: d.y + dy(d), 'text-anchor': anchor, class: 'c-lab anim-in' + (strong ? ' strong' : ''), 'data-delay': sweepAt(d.x) + 70, 'aria-hidden': 'true' }, s);
      appendModelSvg(t, name, 12);
      if (suffix) t.appendChild(document.createTextNode(suffix));
    }
    var right = function (d) { return d.r + 6; }, mid = function () { return 4; };
    label('M_SQaLe', right, mid, 'start', true, ' · ' + Math.round(find('M_SQaLe').p.acc * 100) + '%');
    label('Qwen3.5-9B', function () { return 0; }, function (d) { return -d.r - 7; }, 'middle', false);
    label('Qwen3.5-27B', function (d) { return -d.r * 0.5; }, function (d) { return -d.r - 7; }, 'end', false);
    if (!narrow) {
      label('M_BIRD', right, mid, 'start', false);
      label('M_SynSQL', right, mid, 'start', false);
      label('Qwen3.5-2B', right, mid, 'start', false);
      /* a few of the best-known general-purpose models, where there is room */
      label('Gemma-3-12B', right, mid, 'start', false);
      label('gpt-oss-20b', right, mid, 'start', false);
      label('Llama-3.3-70B', function (d) { return d.r; }, function (d) { return -d.r - 7; }, 'end', false);
    }

    function show(d) {
      groups.forEach(function (o) { o.g.classList.toggle('is-hot', o === d); });
      tip.textContent = '';
      el('span', { class: 't-val' }, tip, Math.round(d.p.acc * 100) + '% accuracy');
      var nm = el('span', { class: 't-name' }, tip);
      appendModel(nm, d.p.model);
      if (MODEL_DESC[d.p.model] && d.p.kind !== 'base') el('span', { class: 't-desc' }, tip, MODEL_DESC[d.p.model]);
      el('span', { class: 't-more' }, tip, fmt(Math.round(d.p.tflops)) + ' TFLOPs per question');
      el('span', { class: 't-more' }, tip, d.p.params + 'B parameters');
      tip.hidden = false;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = d.x + d.r + 12, top = d.y - th / 2;
      if (left + tw > W) left = d.x - d.r - 12 - tw;
      if (left < 0) left = Math.max(0, Math.min(W - tw, d.x - tw / 2));
      top = Math.max(0, Math.min(H - th, top));
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
    function hide(d) {
      if (d) d.g.classList.remove('is-hot');
      tip.hidden = true;
    }
    settle('pareto-plot');
  }
  function buildParetoTable() {
    var t = document.getElementById('pareto-table');
    if (!t) return;
    var head = el('tr', null, el('thead', null, t));
    [['Model', ''], ['Parameters', 'num'], ['Accuracy', 'num'], ['TFLOPs per question', 'num']]
      .forEach(function (c) { el('th', { scope: 'col', class: c[1] || null }, head, c[0]); });
    var tb = el('tbody', null, t);
    D.pareto.slice().sort(function (a, b) { return a.params - b.params || b.acc - a.acc; }).forEach(function (p) {
      var r = el('tr', { class: p.kind === 'ours' ? 'is-ours' : null }, tb);
      var th = el('th', { scope: 'row' }, r);
      el('i', { class: 'sw sw-' + cls(p.model), 'aria-hidden': 'true' }, th);
      appendModel(th, p.model);
      el('td', { class: 'num' }, r, p.params + 'B');
      el('td', { class: 'num' }, r, Math.round(p.acc * 100) + '%');
      el('td', { class: 'num' }, r, fmt(Math.round(p.tflops)));
    });
  }

  /* ---------- Figure 4: what SQaLe teaches ---------- */
  var scaleBars = [];
  var SCALE_SUB = ['Execution accuracy (%) at three schema sizes', 'Share of episodes in which the model opened every gold table (%) at three schema sizes'];
  function barRow(parent, name, value, decimals) {
    var row = el('div', { class: 'bar-row' + (name === 'M_SQaLe' ? ' is-ours' : '') }, parent);
    var lab = el('span', { class: 'bar-lab' }, row);
    appendModel(lab, name);
    var track = el('span', { class: 'track', 'aria-hidden': 'true' }, row);
    var bar = el('span', { class: 'bar b-' + cls(name) }, track);
    bar.style.width = value + '%';
    var val = el('span', { class: 'bar-val' }, row, fmt(value, decimals) + '%');
    return { bar: bar, val: val };
  }
  function scaleRow(parent) {
    var sr = el('div', { class: 'bar-scale', 'aria-hidden': 'true' }, parent);
    el('span', null, sr);
    var mid = el('span', null, sr);
    ['0', '50', '100'].forEach(function (v) { el('span', null, mid, v); });
    el('span', null, sr);
  }
  var SL_SERIES = [['M_SQaLe', 'sqale'], ['M_BIRD', 'bird'], ['M_SynSQL', 'synsql']];
  var scaleMetric = 1;
  function drawSlope() {
    var wrap = document.getElementById('scale-slope');
    if (!wrap || !D.scale || D.scale.length < 2) return;
    var W = Math.floor(wrap.clientWidth);
    if (!W) return;
    var old = wrap.querySelector('svg');
    if (old) wrap.removeChild(old);
    var narrow = W < 540;
    var H = Math.round(Math.max(220, Math.min(300, W * 0.33)));
    var m = { l: narrow ? 50 : 58, r: narrow ? 60 : 122, t: 14, b: 38 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = D.scale.length;
    var all = [];
    SL_SERIES.forEach(function (ser) {
      D.scale.forEach(function (lv) { all.push(lv[ser[1]][scaleMetric]); });
    });
    var lo = Math.max(0, Math.floor((Math.min.apply(null, all) - 6) / 10) * 10);
    var hi = Math.min(100, Math.ceil((Math.max.apply(null, all) + 6) / 10) * 10);
    function X(i) { return m.l + i / (n - 1) * pw; }
    function Y(v) { return m.t + ph - (v - lo) / (hi - lo) * ph; }
    var s2 = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': SCALE_SUB[scaleMetric] + '. ' + SL_SERIES.map(function (ser) {
        return ser[0].replace('M_', 'M ') + ': ' + D.scale.map(function (lv) {
          return fmt(lv[ser[1]][scaleMetric], 1) + '% ' + lv.level;
        }).join(', ');
      }).join('. ') }, wrap);

    var SHORT = { 'Gold tables only': 'Gold only', '+32 distractor tables': '+32 tables' };
    D.scale.forEach(function (lv, i) {
      svg('line', { x1: X(i), x2: X(i), y1: m.t, y2: m.t + ph, class: 'sl-rule' }, s2);
      var t = svg('text', { x: X(i), y: m.t + ph + 22,
        'text-anchor': i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'), class: 'sl-cat' }, s2);
      t.textContent = narrow ? (SHORT[lv.level] || lv.level) : lv.level;
    });

    /* one line per model, with its value at the first column and its name and
       value at the last; labels in a column are nudged apart, never stacked */
    var ends = [[], []];
    SL_SERIES.forEach(function (ser, k) {
      var pts = D.scale.map(function (lv, i) { return [X(i), Y(lv[ser[1]][scaleMetric])]; });
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
      svg('path', { d: d, class: 'sl-line sl-' + ser[1] + ' anim-draw', 'data-delay': 120 + k * 120, 'data-dur': 900 }, s2);
      pts.forEach(function (p, i) {
        var g = svg('g', { class: 'anim-in', 'data-delay': 900 + i * 90 }, s2);
        svg('circle', { cx: p[0], cy: p[1], r: 4.5, class: 'f-' + cls(ser[0]) + ' ring-bg' }, g);
      });
      ends[0].push({ ser: ser, y: pts[0][1], v: D.scale[0][ser[1]][scaleMetric] });
      ends[1].push({ ser: ser, y: pts[n - 1][1], v: D.scale[n - 1][ser[1]][scaleMetric] });
    });
    ends.forEach(function (col, side) {
      col.sort(function (a, b) { return a.y - b.y; });
      for (var i = 1; i < col.length; i++) {
        if (col[i].y - col[i - 1].y < 15) col[i].y = col[i - 1].y + 15;
      }
      col.forEach(function (e) {
        var t = svg('text', {
          x: side ? X(n - 1) + 11 : X(0) - 9, y: e.y + 4,
          'text-anchor': side ? 'start' : 'end',
          class: 'sl-val is-' + e.ser[1] + ' anim-in', 'data-delay': 1150, 'aria-hidden': 'true' }, s2);
        if (side && !narrow) {
          appendModelSvg(t, e.ser[0], 12);
          t.appendChild(document.createTextNode(' ' + fmt(e.v, 1) + '%'));
        } else {
          t.textContent = fmt(e.v, 1) + '%';
        }
      });
    });
    settle('scale-fig');
  }
  function buildScaleTable() {
    var t = document.getElementById('scale-table');
    if (!t) return;
    t.textContent = '';
    var head = el('tr', null, el('thead', null, t));
    el('th', null, head, 'Model');
    D.scale.forEach(function (lv) { el('th', { class: 'num' }, head, lv.level); });
    var tb = el('tbody', null, t);
    SL_SERIES.forEach(function (ser) {
      var tr = el('tr', ser[1] === 'sqale' ? { class: 'is-ours' } : null, tb);
      appendModel(el('th', null, tr), ser[0]);
      D.scale.forEach(function (lv) {
        el('td', { class: 'num' }, tr, fmt(lv[ser[1]][0], 1) + '% · ' + fmt(lv[ser[1]][1], 1) + '%');
      });
    });
    el('caption', { class: 'panel-sub' }, t, 'Execution accuracy · share of episodes in which the model opened every gold table');
  }

  function buildScale() {
    if (!document.getElementById('literals')) return;
    drawSlope();
    buildScaleTable();
    var btns = document.querySelectorAll('#scale-toggle button');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        var k = Number(b.getAttribute('data-metric'));
        Array.prototype.forEach.call(btns, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        scaleMetric = k;
        drawSlope();
        document.getElementById('scale-sub').textContent = SCALE_SUB[k];
      });
    });
    var lit = document.getElementById('literals');
    D.literalsSeen.forEach(function (r) {
      var b = barRow(lit, r.model, r.pct, 0);
      if (r.model === 'Qwen3.5-2B') b.val.parentNode.querySelector('.bar-lab').title = 'untrained base model';
    });
    scaleRow(lit);
    /* every bar grows in reading order, its number arriving as the bar lands */
    var root = document.getElementById('scale-fig');
    Array.prototype.forEach.call(root.querySelectorAll('.bar'), function (n, i) {
      n.classList.add('anim-grow');
      n.setAttribute('data-w', n.style.width);
      n.setAttribute('data-delay', 140 + i * 80);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.bar-val'), function (n, i) {
      n.classList.add('anim-in');
      n.setAttribute('data-delay', 140 + i * 80 + 280);
    });
    settle('scale-fig');
  }

  /* ---------- Figure 8: episodes ---------- */
  function buildEpisode() {
    var E = D.episodes;
    if (!E || !E.length || !document.getElementById('ep-tabs')) return;
    var tabsEl = document.getElementById('ep-tabs');
    var rail = document.getElementById('ep-rail');
    var callsEl = document.getElementById('ep-calls');
    var prev = document.getElementById('ep-prev');
    var next = document.getElementById('ep-next');
    var play = document.getElementById('ep-play');
    var cur = 0, round = 0, steps = [], timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
    function literals(sql) {
      var out = [], m, re = /'((?:[^']|'')+)'/g;
      while ((m = re.exec(sql))) {
        var v = m[1].replace(/^%+|%+$/g, '');  /* LIKE '%firmware%' marks "firmware" */
        if (v.length >= 3) out.push(v);
      }
      return out;
    }
    /* text with every occurrence of a literal wrapped in <mark> */
    function appendMarked(parent, text, lits) {
      if (!lits.length) { parent.appendChild(document.createTextNode(text)); return; }
      var re = new RegExp(lits.map(function (l) { return l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
      var last = 0, m;
      while ((m = re.exec(text))) {
        parent.appendChild(document.createTextNode(text.slice(last, m.index)));
        el('mark', { class: 'ep-lit' }, parent, m[0]);
        last = re.lastIndex;
      }
      parent.appendChild(document.createTextNode(text.slice(last)));
    }
    function listOut(ep) {
      var head = ep.tables.slice(0, 6).join('\n');
      return ep.tables.length + ' tables\n' + head + '\n… and ' + (ep.tables.length - 6) + ' more';
    }

    var tabs = E.map(function (ep, i) {
      var b = el('button', {
        type: 'button', role: 'tab', class: 'tab', id: 'ep-tab-' + i,
        'aria-controls': 'ep-round', 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1'
      }, tabsEl, ep.title + ' · ' + ep.nTables + ' tables');
      b.addEventListener('click', function () { pick(i, false); });
      b.addEventListener('keydown', function (e) { arrowKeys(e, i, E.length, function (t) { pick(t, true); }); });
      return b;
    });
    function arrowKeys(e, i, n, go) {
      var t = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = (i - 1 + n) % n;
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = n - 1;
      if (t !== null) { e.preventDefault(); go(t); }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false');
    }

    function pick(i, focus) {
      stop();
      cur = i;
      var ep = E[i];
      tabs.forEach(function (b, j) {
        b.setAttribute('aria-selected', i === j ? 'true' : 'false');
        b.setAttribute('tabindex', i === j ? '0' : '-1');
      });
      if (focus) tabs[i].focus();

      var meta = document.getElementById('ep-meta');
      meta.textContent = '';
      el('strong', null, meta, ep.schemaId);
      meta.appendChild(document.createTextNode(' · ' + ep.nTables + ' tables, schema withheld · ' + ep.difficulty + ' question · ' + (ep.correct ? 'answered correctly' : 'answered incorrectly')));
      document.getElementById('ep-question').textContent = ep.question;
      var hint = document.getElementById('ep-hint');
      hint.textContent = '';
      el('span', { class: 'label' }, hint, 'Evidence');
      hint.appendChild(document.createTextNode(ep.hint));

      rail.textContent = '';
      rail.style.setProperty('--n', ep.rounds.length);
      steps = ep.rounds.map(function (rd, k) {
        var li = el('li', null, rail);
        var b = el('button', {
          type: 'button', role: 'tab', class: 'ep-step', id: 'ep-step-' + k, 'aria-controls': 'ep-round',
          'aria-label': rd.forced ? 'Final answer, no tool call' : 'Round ' + (k + 1) + ', ' + rd.label + ', ' + plural(rd.nCalls, 'call', 'calls')
        }, li);
        el('span', { class: 'ep-rn' }, b, rd.forced ? 'Final' : 'Round ' + (k + 1));
        el('span', { class: 'ep-rl' }, b, rd.label);
        var dots = el('span', { class: 'ep-dots', 'aria-hidden': 'true' }, b);
        for (var d = 0; d < rd.nCalls; d++) el('i', null, dots);
        b.addEventListener('click', function () { stop(); show(k, false); });
        b.addEventListener('keydown', function (e) { arrowKeys(e, k, ep.rounds.length, function (t) { stop(); show(t, true); }); });
        return b;
      });
      var note = document.getElementById('ep-note');
      note.textContent = '';
      el('strong', null, note, 'What to look for. ');
      note.appendChild(document.createTextNode(ep.note));
      show(0, false);
    }

    function show(k, focus) {
      var ep = E[cur], rd = ep.rounds[k], last = k === ep.rounds.length - 1;
      round = k;
      steps.forEach(function (b, j) {
        b.setAttribute('aria-selected', j === k ? 'true' : 'false');
        b.setAttribute('tabindex', j === k ? '0' : '-1');
        b.classList.toggle('is-past', j < k);
      });
      document.getElementById('ep-round').setAttribute('aria-labelledby', 'ep-step-' + k);
      if (focus) steps[k].focus();

      var distinct = rd.calls.length;
      var nTool = ep.rounds.filter(function (r) { return !r.forced; }).length;
      var st = document.getElementById('ep-status');
      st.textContent = '';
      if (rd.forced) {
        el('strong', null, st, 'Final answer');
        st.appendChild(document.createTextNode(' · written as text, no tool call'));
      } else {
        el('strong', null, st, 'Round ' + (k + 1) + ' of ' + nTool);
        st.appendChild(document.createTextNode(' · ' + plural(rd.nCalls, 'tool call', 'tool calls') +
          (distinct < rd.nCalls ? ', ' + distinct + ' distinct' : '')));
      }

      document.getElementById('ep-think').textContent = rd.think;

      var lits = literals(ep.final.sql);
      callsEl.textContent = '';
      rd.calls.forEach(function (c) {
        var isFinal = c.tool === 'submit_sql' || c.tool === 'answer';
        var card = el('div', { class: 'call' + (isFinal ? ' is-submit' : '') }, callsEl);
        var head = el('div', { class: 'call-head' }, card);
        el('span', { class: 'call-tool' }, head, c.tool === 'answer' ? 'final answer (text)' : c.tool);
        if (c.n > 1) el('span', { class: 'call-n', title: 'issued ' + c.n + ' times in this round' }, head, '×' + c.n);
        if (c.args) {
          var arg = el('pre', { class: 'call-arg' }, card);
          if (c.tool === 'run_query' || isFinal) arg.innerHTML = highlightSQL(c.args);
          else arg.textContent = c.args;
        }
        if (c.tool === 'list_tables') {
          el('pre', { class: 'call-out' }, card, listOut(ep));
        } else if (c.out) {
          var out = el('pre', { class: 'call-out' + (/^CREATE TABLE/.test(c.out) ? ' is-ddl' : '') }, card);
          appendMarked(out, c.out, lits);
        }
        if (isFinal) {
          var fin = el('div', { class: 'ep-final' }, card);
          var ok = el('span', { class: 'ep-ok' }, fin);
          var ic = svg('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, ok);
          svg('path', { d: 'M3 8.5l3.2 3L13 4.5' }, ic);
          ok.appendChild(document.createTextNode('Result matches the gold query'));
          var wrap = el('div', { class: 'table-wrap' }, fin);
          var t = el('table', { class: 'tbl' }, wrap);
          var tr = el('tr', null, el('thead', null, t));
          ep.final.columns.forEach(function (h) { el('th', { scope: 'col' }, tr, h); });
          var tb = el('tbody', null, t);
          ep.final.rows.forEach(function (row) {
            var r = el('tr', null, tb);
            row.forEach(function (v) { el('td', null, r, v); });
          });
          if (ep.final.more) el('span', { class: 'ep-budget' }, fin, 'The environment showed the first ' + ep.final.rows.length + ' rows.');
        }
      });
      document.getElementById('ep-budget').textContent = rd.budget
        ? 'Environment: ' + rd.budget + (/[.]$/.test(rd.budget) ? '' : '.')
        : rd.forced ? 'The answer ends the episode.' : 'submit_sql ends the episode.';

      prev.disabled = k === 0;
      next.disabled = last;
    }

    prev.addEventListener('click', function () { stop(); if (round > 0) show(round - 1, false); });
    next.addEventListener('click', function () { stop(); if (round < E[cur].rounds.length - 1) show(round + 1, false); });
    play.addEventListener('click', function () {
      if (timer) { stop(); return; }
      var n = E[cur].rounds.length;
      if (round === n - 1) show(0, false);
      play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(function () {
        if (round >= E[cur].rounds.length - 1) { stop(); return; }
        show(round + 1, false);
        if (round >= E[cur].rounds.length - 1) stop();
      }, reduce ? 4000 : 3200);
    });

    pick(0, false);
  }

  /* ---------- Figure 3: exploration, the compact view ---------- */
  function drawExplore() {
    var T = D.training, wrap = document.getElementById('explore-plot');
    if (!T || !wrap) return;
    var W = Math.floor(wrap.clientWidth);
    if (!W) return;
    var old = wrap.querySelector('svg');
    if (old) wrap.removeChild(old);
    var narrow = W < 560;
    var H = narrow ? 220 : Math.round(Math.max(242, Math.min(340, W * 0.30)));
    var m = { l: 30, r: narrow ? 14 : 136, t: 18, b: 34 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    function X(st) { return m.l + st / T.lastReported * pw; }
    function Y(v) { return m.t + ph - Math.min(v, 24) / 24 * ph; }
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Over 1,658 training steps, tool calls per episode rise from about six to about twenty while rounds per episode stay near six.' }, wrap);
    [0, 10, 20].forEach(function (v) {
      svg('line', { x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v), class: v === 0 ? 'c-base' : 'c-grid' }, s);
      svg('text', { x: m.l - 7, y: Y(v) + 4, 'text-anchor': 'end', class: 'c-tick' }, s).textContent = String(v);
    });
    [0, 800, 1600].forEach(function (st) {
      svg('text', { x: X(st), y: m.t + ph + 18, 'text-anchor': 'middle', class: 'c-tick' }, s).textContent = fmt(st);
    });
    svg('text', { x: m.l + pw, y: H - 2, 'text-anchor': 'end', class: 'c-axis-title' }, s).textContent = 'Training step';

    function smooth(vals) {  /* centred moving average, window shrinking at both ends */
      var h = 7;
      return vals.map(function (_, i) {
        var a = Math.max(0, i - h), b = Math.min(vals.length - 1, i + h), sum = 0;
        for (var j = a; j <= b; j++) sum += vals[j];
        return sum / (b - a + 1);
      });
    }
    [{ key: 'toolCalls', cls: 'tr-sqale', label: 'tool calls', strong: true },
     { key: 'rounds', cls: 'tr-ink', label: 'rounds', strong: false }].forEach(function (ser) {
      var v = smooth(T[ser.key]);
      var d = T.steps.map(function (st, i) {
        return (i ? 'L' : 'M') + X(st).toFixed(1) + ',' + Y(v[i]).toFixed(1);
      }).join('');
      svg('path', { d: d, class: 'tr-line anim-draw ' + ser.cls, 'data-delay': ser.strong ? 160 : 380, 'data-dur': 2000 }, s);
      var last = v[v.length - 1];
      var t = svg('text', narrow
        ? { x: X(T.lastReported), y: Y(last) - 9, 'text-anchor': 'end', class: 'c-lab anim-in' + (ser.strong ? ' strong' : ''), 'data-delay': ser.strong ? 2160 : 2380 }
        : { x: X(T.lastReported) + 10, y: Y(last) + 4, class: 'c-lab anim-in' + (ser.strong ? ' strong' : ''), 'data-delay': ser.strong ? 2160 : 2380 }, s);
      t.textContent = fmt(last, 1) + ' ' + ser.label;
    });
    settle('explore-plot');
  }

  /* ---------- cite ---------- */
  function buildCite() {
    var code = document.getElementById('bibtex');
    if (!code) return;
    code.textContent = D.bibtex;
    var btn = document.getElementById('copy-bib');
    var status = document.getElementById('bib-status');
    var timer = null;
    function flash(msg) {
      btn.textContent = msg; status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'Copy'; status.textContent = ''; }, 1800);
    }
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(code);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      flash('Selected');
    }
    btn.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(D.bibtex).then(function () { flash('Copied'); }, fallback);
      } catch (e) { fallback(); }
    });
  }

  /* ---------- contents highlight ---------- */
  function buildToc() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    function setCurrent(id) {
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      if (byId[id]) byId[id].setAttribute('aria-current', 'true');
    }
    setCurrent('abstract');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.id); });
    }, { rootMargin: '-25% 0px -65% 0px' });
    document.querySelectorAll('.sec').forEach(function (s) { io.observe(s); });
  }

  /* ---------- theme switch ---------- */
  function buildTheme() {
    var root = document.documentElement;
    var group = document.getElementById('theme');
    if (!group) return;
    var btns = Array.prototype.slice.call(group.querySelectorAll('.theme-btn'));
    function mark(v) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === v)); });
    }
    function apply(v) {
      if (v === 'auto') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', v);
      try {
        if (v === 'auto') localStorage.removeItem('sqale-theme');
        else localStorage.setItem('sqale-theme', v);
      } catch (e) { /* storage blocked */ }
      mark(v);
      drawAll();
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-set')); });
    });
    mark(root.getAttribute('data-theme') || 'auto');
  }

  /* ---------- foldable detail ---------- */
  function buildFolds() {
    var folds = Array.prototype.slice.call(document.querySelectorAll('details.fold'));
    if (!folds.length) return;
    /* Charts inside a fold are drawn at zero width while it is closed. */
    folds.forEach(function (d) {
      d.addEventListener('toggle', function () { if (d.open) drawAll(); });
    });
    /* A link into folded content (a note back-link, a shared #hash) opens its fold. */
    function reveal() {
      var id = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : '';
      var t = id ? document.getElementById(id) : null;
      if (!t || !t.closest) return;
      var opened = false, d = t.closest('details.fold');
      while (d) {
        if (!d.open) { d.open = true; opened = true; }
        d = d.parentElement ? d.parentElement.closest('details.fold') : null;
      }
      if (opened) setTimeout(function () { t.scrollIntoView(); }, 0);
    }
    window.addEventListener('hashchange', reveal);
    reveal();
  }

  /* ---------- boot ---------- */
  buildRecord();
  buildCompareTable();
  buildMatrix();
  buildParetoLegend();
  buildParetoTable();
  buildScale();
  buildEpisode();
  buildCite();
  buildToc();
  buildTheme();
  buildFolds();
  buildAnim();
  function drawAll() { drawPipeline(); drawCompare(); drawPareto(); drawExplore(); drawSlope(); }
  drawAll();

  var widths = new WeakMap();
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        var w = Math.floor(e.contentRect.width);
        if (widths.get(e.target) === w) return;
        widths.set(e.target, w);
        if (e.target.id === 'pipeline') drawPipeline();
        else if (e.target.id === 'compare-plot') drawCompare();
        else if (e.target.id === 'pareto-plot') drawPareto();
        else if (e.target.id === 'explore-plot') drawExplore();
        else if (e.target.id === 'scale-slope') drawSlope();
      });
    });
    ['pipeline', 'compare-plot', 'pareto-plot', 'explore-plot', 'scale-slope'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) ro.observe(n);
    });
  } else {
    window.addEventListener('resize', drawAll);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', drawAll);
})();
