// DOM layer of the world: four HUD items, bottom dialog, in-world screen panel, bubbles, joystick, fades.
// All text is set with textContent; nothing here reads or writes engine state.

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  parent?.append(node);
  return node;
}

export function createUI(root, { touch }) {
  const layer = el('div', 'v3-layer', root);
  const money = el('div', 'v3-hud-money', layer);
  el('small', '', money, '经营现金');
  const cash = el('strong', '', money, '$0');
  const profit = el('span', 'v3-profit', money, '');
  const task = el('div', 'v3-hud-task', layer, '');
  task.setAttribute('role', 'status');
  const mapBox = el('div', 'v3-minimap', layer);
  const map = el('canvas', '', mapBox);
  map.width = map.height = 300;
  const prompt = el('button', 'v3-prompt', layer);
  prompt.hidden = true;
  const dialog = el('div', 'v3-dialog', layer);
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  const avatar = el('div', 'v3-avatar', dialog);
  const name = el('div', 'v3-name', dialog);
  const text = el('div', 'v3-text', dialog);
  const options = el('div', 'v3-options', dialog);
  const next = el('div', 'v3-next', dialog, '');
  const panel = el('section', 'v3-panel', layer);
  panel.hidden = true;
  const notice = el('div', 'v3-notice', layer);
  notice.hidden = true;
  const flashEl = el('div', 'v3-flash', layer);
  const fadeEl = el('div', 'v3-fade', layer);
  const stick = el('div', 'v3-stick', layer);
  const knob = el('i', '', stick);
  // M-002: always-visible mode switch in the top bar.
  const modeBtn = el('button', 'v3-mode-pill', layer, '▤ 2D 经典');
  modeBtn.type = 'button';
  modeBtn.setAttribute('aria-label', '切换到 2D 经典模式');
  modeBtn.hidden = true;
  // Same 消息提醒 as the 2D campus (总部来电、新成就、售后提醒、可建设…), mirrored into the HUD.
  const inbox = el('aside', 'v3-inbox', layer);
  inbox.setAttribute('aria-label', '消息提醒');
  inbox.hidden = true;
  const inboxHead = el('button', 'v3-inbox-head', inbox);
  inboxHead.type = 'button';
  const inboxList = el('div', 'v3-inbox-list', inbox);
  let inboxOpen = !matchMedia('(max-width: 760px)').matches, inboxKey = '';   // phones start collapsed
  inbox.classList.toggle('is-collapsed', !inboxOpen);
  inboxHead.addEventListener('click', () => { inboxOpen = !inboxOpen; inbox.classList.toggle('is-collapsed', !inboxOpen); inboxHead.setAttribute('aria-expanded', String(inboxOpen)); if (inboxHead.lastChild) inboxHead.lastChild.textContent = inboxOpen ? '收起 −' : '展开 ＋'; });

  let onPrompt = null;
  prompt.addEventListener('click', () => onPrompt?.());
  let lastTask = '';
  let busy = false;
  let closeActive = null;

  // Joystick (3D-075): returns a unit-ish vector in screen space.
  const vec = { x: 0, y: 0, active: false };
  let stickId = null;
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 10, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / max);
    vec.x = (dx / d) * k; vec.y = (dy / d) * k; vec.active = true;
    knob.style.transform = `translate(${vec.x * max}px, ${vec.y * max}px)`;
  }
  stick.addEventListener('pointerdown', e => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const release = e => { if (e.pointerId !== stickId) return; stickId = null; vec.x = vec.y = 0; vec.active = false; knob.style.transform = ''; };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);

  function clearPanel() { panel.replaceChildren(); panel.hidden = true; }

  return {
    stick: vec,
    get busy() { return busy; },
    // True while buttons are on screen (dialog choices or a screen panel): Enter then belongs to the focused button.
    get hasChoices() { return !panel.hidden || options.childElementCount > 0; },
    setMoney(cashText, profitText) { cash.textContent = cashText; profit.textContent = profitText || ''; },
    setTask(value) {
      if (value === lastTask) return;
      lastTask = value;
      task.textContent = value;
      task.classList.remove('is-new');
      void task.offsetWidth;
      task.classList.add('is-new');
    },
    minimap: map,
    // items: [{ id, title, detail, open(), dismiss?() }]. Returns ids that are new since the last call.
    setMessages(items) {
      const key = items.map(m => m.id).join('\n');
      if (key === inboxKey) return [];
      const before = new Set(inboxKey ? inboxKey.split('\n') : []);
      inboxKey = key;
      inbox.hidden = !items.length;
      inboxHead.replaceChildren(el('span', '', null, `消息提醒 · ${items.length}`), el('b', '', null, inboxOpen ? '收起 −' : '展开 ＋'));
      inboxList.replaceChildren();
      for (const m of items) {
        const row = el('div', 'v3-inbox-row', inboxList);
        const open = el('button', 'v3-inbox-link', row);
        open.type = 'button';
        el('strong', '', open, m.title);
        if (m.detail) el('small', '', open, m.detail);
        open.addEventListener('click', () => m.open());
        if (m.dismiss) {
          const x = el('button', 'v3-inbox-x', row, '×');
          x.type = 'button';
          x.setAttribute('aria-label', `收起${m.title}`);
          x.addEventListener('click', () => m.dismiss());
        }
      }
      return items.filter(m => !before.has(m.id)).map(m => m.id);
    },
    onModeToggle(handler) { modeBtn.hidden = !handler; modeBtn.onclick = handler || null; },
    // 3D-016 prompt above the interactable; touch shows "点一下", desktop shows the E key.
    showPrompt(label, x, y, handler) {
      if (!label) { prompt.hidden = true; onPrompt = null; return; }
      onPrompt = handler;
      prompt.replaceChildren();
      if (!touch) el('kbd', '', prompt, 'E');
      el('span', '', prompt, touch ? `点一下 · ${label}` : label);
      prompt.style.left = `${x}px`;
      prompt.style.top = `${y}px`;
      prompt.hidden = false;
    },
    // Bottom dialog. Lines advance on click / Enter; final line shows options. Resolves the chosen value or null.
    talk({ speaker, mark, lines, choices = [] }) {
      busy = true; layer.classList.add('is-busy');
      dialog.hidden = false;
      avatar.textContent = mark || speaker.slice(0, 1);
      name.textContent = speaker;
      return new Promise(resolve => {
        let i = 0;
        const finish = value => {
          dialog.hidden = true; options.replaceChildren(); busy = false; layer.classList.remove('is-busy'); closeActive = null;
          dialog.onclick = null; resolve(value);
        };
        closeActive = () => finish(null);
        const render = () => {
          text.textContent = lines[i];
          options.replaceChildren();
          const last = i === lines.length - 1;
          next.textContent = last && choices.length ? '' : (touch ? '点击继续' : '点击 / 回车继续');
          if (last && choices.length) {
            for (const c of choices) {
              const b = el('button', `v3-btn${c.primary ? ' is-primary' : ''}`, options, c.label);
              b.disabled = !!c.disabled;
              b.addEventListener('click', ev => { ev.stopPropagation(); finish(c.value); });
            }
            (options.querySelector('.is-primary:not(:disabled)') || options.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
          }
        };
        dialog.onclick = () => {
          if (i < lines.length - 1) { i++; render(); } else if (!choices.length) finish(true);
        };
        render();
      });
    },
    // In-world screen panel. spec: { kicker, title, body, rows:[[label,value]], list:[{id,title,detail,badge,disabled}], selected, actions:[{label,value,primary,needsSelection}] }
    screen(spec) {
      busy = true; layer.classList.add('is-busy');
      return new Promise(resolve => {
        let selected = spec.selected ?? null;
        const values = { ...(spec.values || {}) };
        panel.classList.toggle('is-side', !!spec.side);
        const finish = value => { clearPanel(); busy = false; layer.classList.remove('is-busy'); closeActive = null; resolve(value); };
        closeActive = () => finish({ action: null, id: selected });
        const draw = () => {
          panel.replaceChildren();
          panel.hidden = false;
          const close = el('button', 'v3-btn v3-close', panel, touch ? '关闭' : '关闭 Esc');
          close.addEventListener('click', () => finish({ action: null, id: selected }));
          el('div', 'v3-kicker', panel, spec.kicker || '');
          el('h3', '', panel, spec.title || '');
          if (spec.body) el('p', 'v3-body', panel, spec.body);
          if (spec.rows?.length) {
            const dl = el('dl', '', panel);
            for (const [k, v] of spec.rows) { el('dt', '', dl, k); el('dd', '', dl, v); }
          }
          if (spec.list?.length) {
            const list = el('div', 'v3-list', panel);
            for (const item of spec.list) {
              const b = el('button', `v3-item${item.id === selected ? ' is-selected' : ''}`, list);
              el('span', '', b, item.title);
              el('b', '', b, item.badge || '');
              if (item.detail) el('small', '', b, item.detail);
              b.disabled = !!item.disabled;
              b.addEventListener('click', () => { selected = item.id; draw(); });
            }
          }
          // M-006 fields: { id, type: 'range' | 'toggle', label, min, max, step, unit }; live changes go to spec.onChange.
          if (spec.fields?.length) {
            const box = el('div', 'v3-fields', panel);
            for (const f of spec.fields) {
              const row = el('label', `v3-field is-${f.type}`, box);
              el('span', '', row, f.label);
              const input = el('input', '', row);
              if (f.type === 'toggle') {
                input.type = 'checkbox'; input.checked = !!values[f.id];
                input.addEventListener('change', () => { values[f.id] = input.checked; spec.onChange?.({ ...values }); });
              } else {
                input.type = 'range'; Object.assign(input, { min: f.min, max: f.max, step: f.step || 1 }); input.value = values[f.id];
                const out = el('output', '', row, `${values[f.id]}${f.unit || ''}`);
                input.addEventListener('input', () => { values[f.id] = Number(input.value); out.textContent = `${values[f.id]}${f.unit || ''}`; spec.onChange?.({ ...values }); });
              }
            }
          }
          const actions = el('div', 'v3-actions', panel);
          for (const a of spec.actions || []) {
            const b = el('button', `v3-btn${a.primary ? ' is-primary' : ''}`, actions, a.label);
            b.disabled = a.needsSelection && !selected;
            b.addEventListener('click', () => finish({ action: a.value, id: selected, values: { ...values } }));
          }
          (actions.querySelector('.is-primary:not(:disabled)') || close).focus({ preventScroll: true });
        };
        draw();
      });
    },
    closeActive() { closeActive?.(); },
    // Enter / E / Space advance a dialog line when no choice buttons are showing.
    advance() { if (!dialog.hidden && !options.childElementCount) dialog.onclick?.(); },
    bubble(message, x, y, ms = 2600) {
      const b = el('div', 'v3-bubble', layer, message);
      if (x == null) b.classList.add('is-edge'); else { b.style.left = `${x}px`; b.style.top = `${y}px`; }
      setTimeout(() => b.remove(), ms);
    },
    notice(message, ms = 3000) {
      notice.textContent = message; notice.hidden = false;
      clearTimeout(notice._t); notice._t = setTimeout(() => { notice.hidden = true; }, ms);
    },
    flash() { flashEl.classList.remove('is-on'); void flashEl.offsetWidth; flashEl.classList.add('is-on'); },
    fade(on) { fadeEl.classList.toggle('is-on', on); return new Promise(r => setTimeout(r, 320)); },
    destroy() { layer.remove(); },
  };
}

// Tiny WebAudio cues (3D-071 subset): confirm ding, completion chime, error buzz.
export function createSounds() {
  let ctx = null;
  const tone = (freq, dur, type = 'sine', gain = 0.06, delay = 0) => {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
    } catch { /* audio is optional */ }
  };
  return {
    confirm: () => tone(880, 0.18),
    complete: () => { tone(660, 0.2); tone(990, 0.3, 'sine', 0.06, 0.12); },
    error: () => tone(180, 0.2, 'square', 0.03),
    door: () => tone(240, 0.25, 'triangle', 0.04),
  };
}
