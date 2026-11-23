/*
 * StagePlan — stage plot & input list builder.
 * Vanilla JS, no build step. All data lives in localStorage; see README for the data model.
 *
 * Layout of this file:
 *   1. Constants & utilities
 *   2. Data model (blank / normalise / demo / templates)
 *   3. Storage (project library, autosave, prefs)
 *   4. History (undo/redo) & mutate()
 *   5. Stage SVG rendering (shared by editor, thumbnails and print)
 *   6. Stage editor (library, canvas, zoom, inspector)
 *   7. Inputs (table, quick add, warnings, reorder)
 *   8. Details panel
 *   9. Home (project browser) & new-project sheet
 *  10. CSV / JSON import & export
 *  11. Print / PDF
 *  12. Shell: views, tabs, theme, menus, dialogs, toasts, shortcuts, init
 */
(function () {
  'use strict';

  const { ITEM_TYPES, TYPE_MAP, CATEGORIES, CAT_MAP, ITEM_ICONS, uiIcon, itemIcon } = window.StageIcons;

  // =========================================================== 1. Constants
  const DATA_VERSION = 1;
  const LS = {
    index: 'stageplan.index',
    current: 'stageplan.current',
    prefs: 'stageplan.prefs',
    project: (id) => 'stageplan.project.' + id,
  };
  const SNAP = 0.25; // metres
  const MAX_HISTORY = 150;
  const STAGE_LIMITS = { wMin: 2, wMax: 40, dMin: 2, dMax: 30 };
  const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

  const SIZE_PRESETS = [
    { id: '5x4', name: 'Club', w: 5, d: 4 },
    { id: '6x4', name: 'Small', w: 6, d: 4 },
    { id: '8x6', name: 'Medium', w: 8, d: 6 },
    { id: '10x8', name: 'Large', w: 10, d: 8 },
    { id: '12x8', name: 'Theatre', w: 12, d: 8 },
    { id: '16x12', name: 'Festival', w: 16, d: 12 },
  ];

  const TEMPLATES = [
    { id: 'blank', name: 'Blank', desc: 'Empty stage and input list', size: '8x6' },
    { id: 'band', name: 'Five-piece band', desc: 'Drums, bass, guitar, keys, vocals · 20 inputs', size: '8x6' },
    { id: 'duo', name: 'Acoustic duo', desc: 'Two vocals, guitar and piano · 6 inputs', size: '6x4' },
    { id: 'tracks', name: 'Singer + tracks', desc: 'Wireless vocal, playback, IEMs · 4 inputs', size: '5x4' },
  ];

  // Short default labels for newly added items.
  const SHORT = {
    'vocal-mic': 'Vox mic', 'boom-stand': 'Mic', 'music-stand': 'Music stand', 'musician': 'Musician',
    'drum-kit': 'Drums', 'drum-riser': 'Drum riser', 'throne': 'Throne',
    'guitar-amp': 'Gtr amp', 'bass-rig': 'Bass rig', 'guitar-stand': 'Gtr stand',
    'keyboard': 'Keys', 'piano': 'Piano', 'laptop': 'Playback', 'tech-table': 'Table',
    'wedge': 'Wedge', 'iem': 'IEM', 'di-box': 'DI', 'sidefill': 'Sidefill',
    'pa-speaker': 'PA', 'subwoofer': 'Sub', 'power': 'Power', 'riser': 'Riser',
    'generic': 'Item', 'label': 'Label',
  };

  const MIC_SUGGESTIONS = ['SM58', 'Beta 58A', 'SM57', 'Beta 57A', 'Beta 52A', 'Beta 91A', 'Beta 98', 'e604', 'e609', 'e906', 'e945', 'MD421', 'RE20', 'D112', 'D6', 'KM184', 'SM81', 'C414', 'AT4050', 'Neumann KMS105', 'Active DI', 'Passive DI', 'Stereo DI', 'Radial J48', 'Radial ProD2', 'Radial JDI', 'Line (XLR)', 'Wireless handheld', 'Wireless beltpack', 'Contact pickup'];
  const STAND_SUGGESTIONS = ['Short boom', 'Tall boom', 'Straight (round base)', 'Clip', 'Inside kick', 'Hang over amp', 'Tabletop', 'Gooseneck', 'Floor', 'None — DI'];

  // Quick-add sources; linkTypes auto-link when exactly one item of that type is on stage.
  const QUICK = [
    { label: 'Drum kit (8 ch)', group: ['kick-in', 'snare-top', 'snare-btm', 'hihat', 'tom1', 'ftom', 'ohl', 'ohr'] },
    { key: 'kick-in', label: 'Kick In', name: 'Kick In', source: 'Kick drum', micOrDI: 'Beta 91A', stand: 'Inside kick', phantom: true, linkTypes: ['drum-kit'] },
    { key: 'kick-out', label: 'Kick Out', name: 'Kick Out', source: 'Kick drum', micOrDI: 'Beta 52A', stand: 'Short boom', linkTypes: ['drum-kit'] },
    { key: 'snare-top', label: 'Snare Top', name: 'Snare Top', source: 'Snare', micOrDI: 'SM57', stand: 'Short boom', linkTypes: ['drum-kit'] },
    { key: 'snare-btm', label: 'Snare Btm', name: 'Snare Bottom', source: 'Snare', micOrDI: 'SM57', stand: 'Clip', notes: 'Phase invert', linkTypes: ['drum-kit'] },
    { key: 'hihat', label: 'Hi-hat', name: 'Hi-hat', source: 'Hi-hat', micOrDI: 'SM81', stand: 'Short boom', phantom: true, linkTypes: ['drum-kit'] },
    { key: 'tom1', label: 'Rack Tom', name: 'Rack Tom', source: 'Tom', micOrDI: 'e604', stand: 'Clip', linkTypes: ['drum-kit'] },
    { key: 'tom2', label: 'Tom 2', name: 'Tom 2', source: 'Tom', micOrDI: 'e604', stand: 'Clip', linkTypes: ['drum-kit'] },
    { key: 'ftom', label: 'Floor Tom', name: 'Floor Tom', source: 'Floor tom', micOrDI: 'e604', stand: 'Clip', linkTypes: ['drum-kit'] },
    { label: 'Overhead L/R', pair: true, name: 'OH', source: 'Overheads', micOrDI: 'KM184', stand: 'Tall boom', phantom: true, linkTypes: ['drum-kit'] },
    { key: 'ohl', hidden: true, name: 'OH L', source: 'Overheads', micOrDI: 'KM184', stand: 'Tall boom', phantom: true, linkTypes: ['drum-kit'] },
    { key: 'ohr', hidden: true, name: 'OH R', source: 'Overheads', micOrDI: 'KM184', stand: 'Tall boom', phantom: true, linkTypes: ['drum-kit'] },
    { label: 'Bass DI', name: 'Bass DI', source: 'Bass guitar', micOrDI: 'Active DI', stand: 'None — DI', phantom: true, linkTypes: ['bass-rig', 'bassist'] },
    { label: 'Bass Mic', name: 'Bass Mic', source: 'Bass cab', micOrDI: 'RE20', stand: 'Short boom', linkTypes: ['bass-rig'] },
    { label: 'Guitar Amp', name: 'Gtr Amp', source: 'Electric guitar', micOrDI: 'SM57', stand: 'Short boom', linkTypes: ['guitar-amp'] },
    { label: 'Acoustic DI', name: 'Ac Gtr DI', source: 'Acoustic guitar', micOrDI: 'Active DI', stand: 'None — DI', phantom: true, linkTypes: ['guitarist'] },
    { label: 'Keys L/R', pair: true, name: 'Keys', source: 'Keyboard', micOrDI: 'Stereo DI', stand: 'None — DI', linkTypes: ['keyboard'] },
    { label: 'Playback L/R', pair: true, name: 'Playback', source: 'Laptop / backing tracks', micOrDI: 'Stereo DI', stand: 'None — DI', linkTypes: ['laptop'] },
    { label: 'Lead Vocal', name: 'Lead Vox', source: 'Vocal', micOrDI: 'SM58', stand: 'Straight (round base)', linkTypes: ['vocal-mic', 'vocalist'] },
    { label: 'Backing Vocal', name: 'BV', source: 'Vocal', micOrDI: 'SM58', stand: 'Tall boom' },
    { label: 'Talkback', name: 'Talkback', source: 'Talkback', micOrDI: 'SM58 (switched)', stand: 'Straight (round base)' },
  ];
  const QUICK_BY_KEY = Object.fromEntries(QUICK.filter((q) => q.key).map((q) => [q.key, q]));

  // ------------------------------------------------------------ utilities
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, p = 3) => Math.round(v * 10 ** p) / 10 ** p;
  const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  const fmtM = (v) => String(Math.round(v * 100) / 100);
  const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const reducedMotion = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const isPhone = () => mq('(max-width: 760px)').matches;
  const isCompact = () => mq('(max-width: 1240px)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function num(v, d) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : d;
  }
  function str(v, max = 300) {
    if (typeof v === 'string') return v.slice(0, max);
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return '';
  }
  function slug(s) {
    return (s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';
  }
  function fmtDate(iso, short) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, short ? { day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtAgo(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const s = (Date.now() - d) / 1000;
    if (s < 60) return 'Edited just now';
    if (s < 3600) return `Edited ${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `Edited ${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 7) return `Edited ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
    return 'Edited ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function ranges(nums) {
    const n = [...new Set(nums)].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < n.length; i++) {
      let j = i;
      while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++;
      out.push(j > i ? (j === i + 1 ? n[i] + ', ' + n[j] : n[i] + '–' + n[j]) : String(n[i]));
      i = j;
    }
    return out.join(', ');
  }
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  // =========================================================== 2. Data model
  function blankDoc() {
    const now = new Date().toISOString();
    return {
      version: DATA_VERSION,
      id: uid('p'),
      project: {
        name: 'Untitled show', artist: '', venue: '', date: '', revision: '',
        stageWidth: 8, stageDepth: 6, notes: '',
        contactName: '', contactRole: '', contactPhone: '', contactEmail: '',
        createdAt: now, updatedAt: now,
      },
      stageItems: [],
      channels: [],
    };
  }

  function makeItem(typeId, x, y, extra) {
    const t = TYPE_MAP[typeId] || TYPE_MAP.generic;
    return Object.assign({
      id: uid('item'), type: t.id, label: SHORT[t.id] || t.name,
      x: round(x, 4), y: round(y, 4), rotation: 0, w: t.w, h: t.h, color: '', notes: '',
    }, extra || {});
  }

  function makeChannel(fields) {
    return Object.assign({
      id: uid('ch'), number: 0, name: '', source: '', micOrDI: '', stand: '',
      phantom: false, stageItemId: null, position: '', monitor: '', notes: '',
    }, fields || {});
  }

  /** Validate + migrate any incoming project object. Throws on unusable input. */
  function normalizeDoc(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Not a StagePlan project file.');
    if (!raw.project && !Array.isArray(raw.stageItems) && !Array.isArray(raw.channels)) {
      throw new Error('This file does not look like a StagePlan project.');
    }
    const p = raw.project && typeof raw.project === 'object' ? raw.project : {};
    const now = new Date().toISOString();
    const doc = {
      version: DATA_VERSION,
      id: str(raw.id, 80) || uid('p'),
      project: {
        name: str(p.name, 120) || 'Untitled show',
        artist: str(p.artist, 120), venue: str(p.venue, 120),
        date: /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : '',
        revision: str(p.revision, 40),
        stageWidth: clamp(num(p.stageWidth, 8), STAGE_LIMITS.wMin, STAGE_LIMITS.wMax),
        stageDepth: clamp(num(p.stageDepth, 6), STAGE_LIMITS.dMin, STAGE_LIMITS.dMax),
        notes: str(p.notes, 10000),
        contactName: str(p.contactName, 80), contactRole: str(p.contactRole, 80),
        contactPhone: str(p.contactPhone, 40), contactEmail: str(p.contactEmail, 120),
        createdAt: str(p.createdAt, 40) || now, updatedAt: str(p.updatedAt, 40) || now,
      },
      stageItems: [],
      channels: [],
    };

    const seen = new Set();
    const freshId = (id, prefix) => {
      let v = str(id, 80);
      if (!v || seen.has(v)) v = uid(prefix);
      seen.add(v);
      return v;
    };

    const legacyLinks = {}; // channelId -> itemId (from item.channels arrays in older/hand-written files)
    for (const it of Array.isArray(raw.stageItems) ? raw.stageItems : []) {
      if (!it || typeof it !== 'object') continue;
      const t = TYPE_MAP[it.type] || TYPE_MAP.generic;
      const item = {
        id: freshId(it.id, 'item'), type: t.id,
        label: str(it.label, 120),
        x: round(clamp(num(it.x, 0.5), -1, 2), 4), y: round(clamp(num(it.y, 0.5), -1, 2), 4),
        rotation: ((Math.round(num(it.rotation, 0)) % 360) + 360) % 360,
        w: round(clamp(num(it.w, t.w), 0.15, 20), 2), h: round(clamp(num(it.h, t.h), 0.15, 20), 2),
        color: isHex(it.color) ? it.color.toLowerCase() : '',
        notes: str(it.notes, 2000),
      };
      if (item.rotation > 180) item.rotation -= 360;
      if (Array.isArray(it.channels)) it.channels.forEach((c) => { if (typeof c === 'string') legacyLinks[c] = item.id; });
      doc.stageItems.push(item);
    }
    const itemIds = new Set(doc.stageItems.map((i) => i.id));

    const rawCh = (Array.isArray(raw.channels) ? raw.channels : []).filter((c) => c && typeof c === 'object');
    if (rawCh.length && rawCh.every((c) => Number.isFinite(num(c.number, NaN)))) {
      rawCh.sort((a, b) => num(a.number, 0) - num(b.number, 0)); // stable
    }
    for (const c of rawCh) {
      const origId = str(c.id, 80);
      let link = str(c.stageItemId, 80) || legacyLinks[origId] || null;
      if (link && !itemIds.has(link)) link = null;
      doc.channels.push({
        id: freshId(c.id, 'ch'), number: 0,
        name: str(c.name, 120), source: str(c.source, 120), micOrDI: str(c.micOrDI, 120), stand: str(c.stand, 120),
        phantom: c.phantom === true || c.phantom === 'true' || c.phantom === 1,
        stageItemId: link, position: link ? '' : str(c.position, 120),
        monitor: str(c.monitor, 80), notes: str(c.notes, 500),
      });
    }
    doc.channels.forEach((c, i) => (c.number = i + 1));
    return doc;
  }

  /** Small helper used by the demo and templates: place items in metres. */
  function builder(d, W, D) {
    const items = {};
    return {
      items,
      add(key, type, label, cx, cy, extra) {
        const it = makeItem(type, cx / W, cy / D, Object.assign({ label }, extra || {}));
        items[key] = it;
        d.stageItems.push(it);
      },
      ch(name, source, micOrDI, stand, phantom, link, monitor, notes) {
        d.channels.push(makeChannel({ name, source, micOrDI, stand, phantom, stageItemId: link ? items[link].id : null, monitor: monitor || '', notes: notes || '' }));
      },
    };
  }

  /** The demo band. With generic=true it becomes the "Five-piece band" template (no names, no contact). */
  function demoDoc(generic) {
    const d = blankDoc();
    const L = (named, plain) => (generic ? plain : named);
    if (!generic) {
      Object.assign(d.project, {
        name: 'Demo — Club show', artist: 'The Night Signals', venue: 'Riverside Social Club',
        revision: 'v1', stageWidth: 8, stageDepth: 6,
        notes: 'Changeover: 20 min. Drum riser 2.4 × 2 m requested.\nBand carries: guitar amp, bass rig, keys, IEM rack for drummer.\nPower: 2 × 240 V drops upstage (one each side).\nPlayback laptop sends click to drummer IEM only — never to FOH.\nPlease supply 4 wedges on 4 mixes + 1 stereo IEM mix.',
        contactName: 'Morgan Lee', contactRole: 'FOH / production', contactPhone: '+61 400 000 000', contactEmail: 'production@example.com',
      });
    }
    const b = builder(d, 8, 6);
    const add = b.add, ch = b.ch;
    add('riser', 'drum-riser', 'Riser 2.4 × 2 m', 4, 1.25);
    add('kit', 'drum-kit', L('Drums — Taylor', 'Drums'), 4, 1.25);
    add('dIem', 'iem', 'Drum IEM', 5.65, 1.75, { notes: 'Stereo IEM mix 5 — click + mix' });
    add('bassRig', 'bass-rig', L('Bass rig — SVT', 'Bass rig'), 0.9, 0.5);
    add('bassDi', 'di-box', 'Bass DI', 1.85, 0.45);
    add('laptop', 'laptop', 'Playback', 5.95, 0.5, { notes: 'Ableton — 2 ch + click' });
    add('gtrAmp', 'guitar-amp', L('Gtr amp — AC30', 'Gtr amp'), 7.1, 0.45);
    add('pw1', 'power', '240V', 0.35, 1.7);
    add('pw2', 'power', '240V', 7.65, 1.7);
    add('bassist', 'bassist', L('Sam — Bass', 'Bass'), 1.4, 2.6);
    add('gtrist', 'guitarist', L('Jo — Gtr / BV', 'Guitar / BV'), 6.5, 2.5);
    add('gtrMic', 'boom-stand', L('BV Jo', 'BV 1'), 6.5, 3.55);
    add('vox', 'vocalist', L('Riley — Lead Vox', 'Lead vocal'), 4, 3.25);
    add('voxMic', 'vocal-mic', 'Vox 1', 4, 4.35);
    add('kbdist', 'keyboardist', L('Alex — Keys / BV', 'Keys / BV'), 1.6, 3.5);
    add('kbd', 'keyboard', L('Nord Stage', 'Keys'), 1.6, 4.7);
    add('kbdMic', 'boom-stand', L('BV Alex', 'BV 2'), 2.75, 3.4, { rotation: 30 });
    add('kbdDi', 'di-box', 'Keys DI ×2', 0.4, 3.6);
    add('w2', 'wedge', 'Mix 2 Bass', 0.75, 5.5);
    add('w4', 'wedge', 'Mix 4 Keys', 2.25, 5.5);
    add('w1', 'wedge', 'Mix 1 Vox', 4, 5.5);
    add('w3', 'wedge', 'Mix 3 Gtr', 6.4, 5.5);
    add('paL', 'pa-speaker', 'PA L', -0.75, 5.5);
    add('paR', 'pa-speaker', 'PA R', 8.75, 5.5);

    ch('Kick In', 'Kick drum', 'Beta 91A', 'Inside kick', true, 'kit', 'Mix 5');
    ch('Kick Out', 'Kick drum', 'Beta 52A', 'Short boom', false, 'kit', 'Mix 5');
    ch('Snare Top', 'Snare', 'SM57', 'Short boom', false, 'kit', 'Mix 5');
    ch('Snare Bottom', 'Snare', 'SM57', 'Clip', false, 'kit', '', 'Phase invert');
    ch('Hi-hat', 'Hi-hat', 'SM81', 'Short boom', true, 'kit');
    ch('Rack Tom', 'Tom', 'e604', 'Clip', false, 'kit');
    ch('Floor Tom', 'Floor tom', 'e604', 'Clip', false, 'kit');
    ch('OH L', 'Overheads', 'KM184', 'Tall boom', true, 'kit');
    ch('OH R', 'Overheads', 'KM184', 'Tall boom', true, 'kit');
    ch('Bass DI', 'Bass guitar', 'Radial J48', 'None — DI', true, 'bassDi', 'Mix 2, 5', 'Pre-amp DI out');
    ch('Bass Mic', 'Bass cab', 'RE20', 'Short boom', false, 'bassRig');
    ch('Gtr Amp', 'Electric guitar', 'SM57', 'Short boom', false, 'gtrAmp', 'Mix 3', 'Off-axis, on grille');
    ch('Keys L', L('Nord Stage', 'Keyboard'), 'Radial ProD2', 'None — DI', false, 'kbdDi', 'Mix 4');
    ch('Keys R', L('Nord Stage', 'Keyboard'), 'Radial ProD2', 'None — DI', false, 'kbdDi', 'Mix 4');
    ch('Playback L', 'Backing tracks', 'Stereo DI', 'None — DI', false, 'laptop');
    ch('Playback R', 'Backing tracks', 'Stereo DI', 'None — DI', false, 'laptop');
    ch('Lead Vox', L('Vocal — Riley', 'Vocal'), 'Beta 58A', 'Straight (round base)', false, 'voxMic', 'All mixes', L('Band supplies mic', ''));
    ch(L('BV Jo', 'BV 1'), L('Vocal — Jo', 'Vocal'), 'SM58', 'Tall boom', false, 'gtrMic', 'Mix 1, 3');
    ch(L('BV Alex', 'BV 2'), L('Vocal — Alex', 'Vocal'), 'SM58', 'Tall boom', false, 'kbdMic', 'Mix 1, 4');
    ch('Talkback', 'Talkback FOH', 'SM58 (switched)', 'Straight (round base)', false, null, 'All mixes');
    d.channels[19].position = 'FOH';
    d.channels.forEach((c, i) => (c.number = i + 1));
    return d;
  }

  function templateDoc(id) {
    if (id === 'band') return demoDoc(true);
    const d = blankDoc();
    if (id === 'duo') {
      d.project.stageWidth = 6; d.project.stageDepth = 4;
      const { add, ch } = builder(d, 6, 4);
      add('g', 'guitarist', 'Guitar / vocal', 2, 1.6);
      add('m1', 'vocal-mic', 'Vox 1', 2, 2.45);
      add('di', 'di-box', 'Ac gtr DI', 1.2, 1.55);
      add('k', 'keyboardist', 'Piano / vocal', 4.1, 1.35);
      add('p', 'keyboard', 'Stage piano', 4.1, 2.05);
      add('m2', 'boom-stand', 'Vox 2', 3.25, 2.4, { rotation: 30 });
      add('w1', 'wedge', 'Mix 1', 2, 3.5);
      add('w2', 'wedge', 'Mix 2', 4.1, 3.5);
      add('pw', 'power', '240V', 5.6, 0.4);
      ch('Vox 1', 'Vocal', 'SM58', 'Straight (round base)', false, 'm1', 'Mix 1, 2');
      ch('Vox 2', 'Vocal', 'SM58', 'Tall boom', false, 'm2', 'Mix 1, 2');
      ch('Ac Gtr DI', 'Acoustic guitar', 'Active DI', 'None — DI', true, 'di', 'Mix 1');
      ch('Piano L', 'Stage piano', 'Stereo DI', 'None — DI', false, 'p', 'Mix 2');
      ch('Piano R', 'Stage piano', 'Stereo DI', 'None — DI', false, 'p', 'Mix 2');
      ch('Talkback', 'Talkback FOH', 'SM58 (switched)', 'Straight (round base)', false, null, 'All mixes');
      d.channels[5].position = 'FOH';
    } else if (id === 'tracks') {
      d.project.stageWidth = 5; d.project.stageDepth = 4;
      const { add, ch } = builder(d, 5, 4);
      add('v', 'vocalist', 'Lead vocal', 2.5, 1.8);
      add('m', 'vocal-mic', 'Wireless vox', 2.5, 2.6);
      add('l', 'laptop', 'Playback', 4, 0.6, { notes: 'Ableton — stereo out + click to IEM' });
      add('i', 'iem', 'IEM Tx', 3.15, 0.55);
      add('pw', 'power', '240V', 0.4, 0.4);
      ch('Lead Vox', 'Vocal', 'Wireless handheld', 'Straight (round base)', false, 'm', 'IEM');
      ch('Playback L', 'Backing tracks', 'Stereo DI', 'None — DI', false, 'l');
      ch('Playback R', 'Backing tracks', 'Stereo DI', 'None — DI', false, 'l');
      ch('Spare Vox', 'Vocal (spare)', 'SM58', 'Straight (round base)', false, null, '', 'Wired backup');
      d.channels[3].position = 'Side of stage';
    }
    d.channels.forEach((c, i) => (c.number = i + 1));
    return d;
  }

  // =========================================================== 3. Storage
  let state = null; // the open project (null while browsing projects with nothing open)
  let index = []; // [{id, name, artist, venue, date, updatedAt, items, channels}]
  let storageOK = true;
  let saveTimer = null;
  let lastSavedJSON = '';

  const prefs = {
    grid: true, snap: true, dims: true, badges: true, tab: 'stage', view: 'home', theme: 'system', zoom: 1,
    print: { mode: 'combined', notes: true, contact: true, key: true, badges: true, paper: 'A4' },
  };

  const ui = {
    view: 'home', selectedId: null, inspPinned: false,
    libFilter: '', libFilterSheet: '', chFilter: '', homeFilter: '', showWarnings: true,
    newTemplate: 'blank', newSize: '8x6', cardMenuId: null,
  };

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) { localStorage.setItem(k, v); }
  function lsRemove(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function loadPrefs() {
    try {
      const p = JSON.parse(lsGet(LS.prefs) || '{}');
      for (const k of ['grid', 'snap', 'dims', 'badges']) if (typeof p[k] === 'boolean') prefs[k] = p[k];
      if (['stage', 'channels', 'project'].includes(p.tab)) prefs.tab = p.tab;
      if (['home', 'editor'].includes(p.view)) prefs.view = p.view;
      if (['system', 'light', 'dark'].includes(p.theme)) prefs.theme = p.theme;
      if (ZOOM_STEPS.includes(p.zoom)) prefs.zoom = p.zoom;
      if (p.print && typeof p.print === 'object') Object.assign(prefs.print, p.print);
    } catch (e) { /* defaults */ }
  }
  function savePrefs() {
    try { lsSet(LS.prefs, JSON.stringify(prefs)); } catch (e) { /* non-critical */ }
  }

  function loadIndex() {
    try {
      const v = JSON.parse(lsGet(LS.index) || '[]');
      index = Array.isArray(v) ? v.filter((e) => e && typeof e.id === 'string') : [];
    } catch (e) { index = []; }
  }
  function writeIndex() {
    try { lsSet(LS.index, JSON.stringify(index)); } catch (e) { /* reported by saveNow */ }
  }
  function indexEntry(doc) {
    const p = doc.project;
    return { id: doc.id, name: p.name, artist: p.artist, venue: p.venue, date: p.date, updatedAt: p.updatedAt, items: doc.stageItems.length, channels: doc.channels.length };
  }
  function persist(doc) {
    const json = JSON.stringify(doc);
    lsSet(LS.project(doc.id), json);
    const e = indexEntry(doc);
    const i = index.findIndex((x) => x.id === doc.id);
    if (i >= 0) index[i] = e; else index.push(e);
    lsSet(LS.index, JSON.stringify(index));
    return json;
  }
  function loadDoc(id) {
    const raw = lsGet(LS.project(id));
    if (!raw) return null;
    try { return normalizeDoc(JSON.parse(raw)); } catch (e) { return null; }
  }
  function removeDoc(id) {
    lsRemove(LS.project(id));
    index = index.filter((x) => x.id !== id);
    writeIndex();
    if (lsGet(LS.current) === id) lsRemove(LS.current);
  }

  function setStatus(kind) {
    const el = $('#save-status');
    el.classList.toggle('pending', kind === 'pending');
    el.classList.toggle('error', kind === 'error');
    if (kind === 'pending') { el.textContent = 'Saving…'; el.title = 'Saving to this browser'; }
    else if (kind === 'error') { el.textContent = 'Not saved'; el.title = 'Browser storage is unavailable or full. Save a project file to keep a copy.'; }
    else {
      const t = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      el.textContent = 'Saved'; el.title = 'Saved in this browser at ' + t;
    }
  }
  function scheduleSave() {
    setStatus('pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!state) return true;
    try {
      lastSavedJSON = persist(state);
      lsSet(LS.current, state.id);
      storageOK = true;
      setStatus('saved');
      return true;
    } catch (e) {
      if (storageOK) toast('Couldn’t save to browser storage. Save a project file to keep a copy.', { type: 'error', timeout: 8000 });
      storageOK = false;
      setStatus('error');
      return false;
    }
  }

  // =========================================================== 4. History
  const hist = { undo: [], redo: [], key: null, t: 0 };

  /**
   * Apply a change to the current project.
   * key: coalesces rapid edits (typing, dragging) into a single undo step.
   * render: 'all' or a list of renderer names.
   */
  function mutate(fn, opts) {
    const { key = null, render = 'all' } = opts || {};
    const now = Date.now();
    if (!(key && key === hist.key && now - hist.t < 2500)) {
      hist.undo.push(JSON.stringify(state));
      if (hist.undo.length > MAX_HISTORY) hist.undo.shift();
    }
    hist.key = key;
    hist.t = now;
    hist.redo.length = 0;
    fn(state);
    state.channels.forEach((c, i) => (c.number = i + 1));
    state.project.updatedAt = new Date().toISOString();
    scheduleSave();
    doRender(render);
  }
  function doRender(r) {
    if (r === 'all') renderAll();
    else r.forEach((n) => RENDER[n]());
    updateUndoButtons();
  }
  function restoreFrom(json) {
    state = normalizeDoc(JSON.parse(json));
    hist.key = null;
    if (ui.selectedId && !getItem(ui.selectedId)) ui.selectedId = null;
    state.project.updatedAt = new Date().toISOString();
    scheduleSave();
    renderAll();
  }
  function undo() {
    if (!state || !hist.undo.length) return;
    hist.redo.push(JSON.stringify(state));
    restoreFrom(hist.undo.pop());
    announce('Undone');
  }
  function redo() {
    if (!state || !hist.redo.length) return;
    hist.undo.push(JSON.stringify(state));
    restoreFrom(hist.redo.pop());
    announce('Redone');
  }
  function resetHistory() {
    hist.undo.length = 0; hist.redo.length = 0; hist.key = null;
    updateUndoButtons();
  }
  function updateUndoButtons() {
    $('#btn-undo').disabled = !hist.undo.length;
    $('#btn-redo').disabled = !hist.redo.length;
  }

  // ------------------------------------------------------------- helpers
  const getItem = (id) => (id && state ? state.stageItems.find((i) => i.id === id) : null);
  const getChannel = (id) => state.channels.find((c) => c.id === id);
  const typeOf = (it) => TYPE_MAP[it.type] || TYPE_MAP.generic;
  const itemColor = (it) => (isHex(it.color) ? it.color : (CAT_MAP[typeOf(it).cat] || CAT_MAP.misc).color);
  const channelsFor = (itemId) => state.channels.filter((c) => c.stageItemId === itemId);
  function channelPositionText(c) {
    const it = c.stageItemId && getItem(c.stageItemId);
    return it ? (it.label || typeOf(it).name) : c.position;
  }

  function aabb(it) {
    const r = (it.rotation * Math.PI) / 180;
    const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    return { hw: (it.w / 2) * c + (it.h / 2) * s, hh: (it.w / 2) * s + (it.h / 2) * c };
  }
  function isOutside(it, W, D) {
    const { hw, hh } = aabb(it);
    const cx = it.x * W, cy = it.y * D, e = 0.01;
    return cx - hw < -e || cx + hw > W + e || cy - hh < -e || cy + hh > D + e;
  }

  // ===================================================== 5. Stage SVG markup
  function stageGeom(doc) {
    const W = doc.project.stageWidth, D = doc.project.stageDepth;
    const mx = Math.max(1.3, W * 0.14), mt = Math.max(1.0, D * 0.16), mb = Math.max(1.5, D * 0.24);
    const fs = clamp(Math.max(W, D) / 36, 0.16, 0.55);
    return { W, D, mx, mt, mb, fs, vb: [-mx, -mt, W + 2 * mx, D + mt + mb] };
  }

  const PAL = {
    dark: { stage: '#1c1c21', line: 'rgba(235,235,245,0.42)', front: '#0a84ff', minor: 'rgba(255,255,255,0.045)', major: 'rgba(255,255,255,0.1)', center: 'rgba(10,132,255,0.4)', label: 'rgba(235,235,245,0.5)', text: 'rgba(255,255,255,0.95)', halo: '#1c1c21', audience: 'rgba(255,255,255,0.9)', fillOp: 0.2, badgeFill: '#0a84ff', badgeText: '#ffffff', badgeStroke: 'none', accent: '#0a84ff', warn: '#ff9f0a', radius: true },
    light: { stage: '#ffffff', line: 'rgba(60,60,67,0.38)', front: '#007aff', minor: 'rgba(0,0,0,0.04)', major: 'rgba(0,0,0,0.085)', center: 'rgba(0,122,255,0.32)', label: 'rgba(60,60,67,0.6)', text: '#1d1d1f', halo: '#ffffff', audience: '#1d1d1f', fillOp: 0.15, badgeFill: '#007aff', badgeText: '#ffffff', badgeStroke: 'none', accent: '#007aff', warn: '#ff9500', radius: true },
    print: { stage: '#ffffff', line: '#000000', front: '#000000', minor: '#eeeeee', major: '#d6d6d6', center: '#bbbbbb', label: '#333333', text: '#000000', halo: '#ffffff', audience: '#000000', fillOp: 0.16, badgeFill: '#ffffff', badgeText: '#000000', badgeStroke: '#000000', accent: '#000000', warn: '#000000', radius: false },
  };

  // Text is drawn in a ×100 coordinate space: browsers hint glyphs badly at sub-pixel font sizes (metres).
  const TS = 100;
  function svgText(x, y, content, a) {
    const o = a || {};
    const X = round(x * TS, 1), Y = round(y * TS, 1);
    const attrs = [
      `x="${X}"`, `y="${Y}"`, `font-size="${round(o.size * TS, 1)}"`, `fill="${o.fill}"`,
      `text-anchor="${o.anchor || 'middle'}"`, 'dominant-baseline="middle"',
      o.weight ? `font-weight="${o.weight}"` : '', o.ls ? `letter-spacing="${round(o.ls * TS, 1)}"` : '',
      `transform="scale(${1 / TS})${o.rotate ? ` rotate(${o.rotate} ${X} ${Y})` : ''}"`,
    ].join(' ');
    return `<text ${attrs}>${esc(content)}</text>`;
  }

  function wrapLabel(text, maxChars, maxLines) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (let w of words) {
      while (w.length > maxChars) { // hard-break very long words
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, maxChars)); w = w.slice(maxChars);
      }
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      keep[maxLines - 1] = keep[maxLines - 1].slice(0, Math.max(1, maxChars - 1)) + '…';
      return keep;
    }
    return lines;
  }

  function drumKitBody(w, h, stroke, fill, fillOp, sw) {
    const m = Math.min(w, h);
    const c = (x, y, r, op, dash) => `<circle cx="${round(x * w)}" cy="${round(y * h)}" r="${round(r * m)}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${round(sw)}"${dash ? ` stroke-dasharray="${round(sw * 2)} ${round(sw * 1.5)}"` : ''}/>`;
    // Top-down kit, drummer upstage (top) facing audience (bottom). Right-handed: hats on drummer's left = screen right.
    return [
      `<rect x="${round(-0.17 * w)}" y="${round(0.02 * h)}" width="${round(0.34 * w)}" height="${round(0.3 * h)}" rx="${round(0.03 * m)}" fill="${fill}" fill-opacity="${fillOp * 1.4}" stroke="${stroke}" stroke-width="${round(sw)}"/>`,
      c(-0.33, 0.24, 0.16, fillOp * 0.4, true), // ride
      c(0.31, 0.27, 0.14, fillOp * 0.4, true), // crash
      c(-0.11, 0.0, 0.085, fillOp * 1.6), // rack tom 2
      c(0.1, 0.0, 0.08, fillOp * 1.6), // rack tom 1
      c(-0.3, -0.12, 0.13, fillOp * 1.6), // floor tom
      c(0.14, -0.15, 0.11, fillOp * 1.9), // snare
      c(0.35, -0.2, 0.1, fillOp * 0.5, true), // hats
      c(0, -0.38, 0.08, fillOp * 2.2), // throne
    ].join('');
  }

  function iconSvg(t, x, y, s, color, opacity) {
    return `<svg x="${round(x)}" y="${round(y)}" width="${round(s)}" height="${round(s)}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" overflow="visible" pointer-events="none">${ITEM_ICONS[t.icon]}</svg>`;
  }

  function itemMarkup(it, g, P, o, chNums) {
    const t = typeOf(it);
    const col = itemColor(it);
    const cx = it.x * g.W, cy = it.y * g.D;
    const { hw, hh } = aabb(it);
    const w = it.w, h = it.h;
    const sw = g.fs * 0.1;
    const stroke = o.print ? '#1b1b1b' : col;
    const bodyAttrs = `class="body" fill="${col}" fill-opacity="${P.fillOp}" stroke="${stroke}" stroke-width="${round(sw)}"`;
    let body = '';
    let icon = '';
    let iconSize = Math.min(Math.min(w, h) * 0.74, 0.8);

    switch (t.shape) {
      case 'circle':
        body = `<ellipse cx="0" cy="0" rx="${round(w / 2)}" ry="${round(h / 2)}" ${bodyAttrs}/>`;
        iconSize = Math.min(w, h) * 0.62;
        break;
      case 'wedge': {
        const pts = [[-w / 2, h / 2], [w / 2, h / 2], [w * 0.32, -h / 2], [-w * 0.32, -h / 2]].map((p) => p.map((v) => round(v)).join(',')).join(' ');
        body = `<polygon points="${pts}" ${bodyAttrs} stroke-linejoin="round"/><line x1="${round(-w * 0.26)}" y1="${round(-h * 0.22)}" x2="${round(w * 0.26)}" y2="${round(-h * 0.22)}" stroke="${stroke}" stroke-width="${round(sw)}" stroke-linecap="round"/>`;
        iconSize = 0;
        break;
      }
      case 'none':
        body = `<rect x="${round(-w / 2)}" y="${round(-h / 2)}" width="${round(w)}" height="${round(h)}" fill="transparent" stroke="none"/>`;
        iconSize = 0;
        break;
      default: {
        const rx = Math.min(w, h) * (t.shape === 'round' ? 0.24 : 0.1);
        body = `<rect x="${round(-w / 2)}" y="${round(-h / 2)}" width="${round(w)}" height="${round(h)}" rx="${round(rx)}" ${bodyAttrs}/>`;
      }
    }
    if (t.id === 'drum-kit') {
      body += drumKitBody(w, h, stroke, col, P.fillOp, sw * 0.8);
      iconSize = 0;
    }
    if (t.id === 'drum-riser' || t.id === 'riser') {
      // Icon tucked into a corner so it does not compete with what sits on the riser.
      const s = Math.min(0.45, Math.min(w, h) * 0.3);
      icon = iconSvg(t, -w / 2 + s * 0.25, -h / 2 + s * 0.25, s, o.print ? '#444' : col, 0.75);
      iconSize = 0;
    }
    if (iconSize > 0) icon = iconSvg(t, -iconSize / 2, -iconSize / 2, iconSize, o.print ? '#111' : col, 1);

    const pad = g.fs * 0.22;
    let rings = '';
    if (o.interactive) {
      const r = (cls, k, extra) => `<rect class="${cls}" x="${round(-w / 2 - pad * k)}" y="${round(-h / 2 - pad * k)}" width="${round(w + pad * 2 * k)}" height="${round(h + pad * 2 * k)}" rx="${round(pad * (k + 0.6))}" ${extra}/>`;
      rings += r('hover-ring', 1, `fill="${P.accent}" fill-opacity="0.06" stroke="${P.accent}" stroke-opacity="0.45" stroke-width="${round(sw * 0.8)}"`);
      rings += r('sel', 1, `fill="${P.accent}" fill-opacity="0.1" stroke="${P.accent}" stroke-width="${round(sw * 1.1)}"`);
      rings += r('focus-ring', 1.9, `fill="none" stroke="${P.accent}" stroke-opacity="0.55" stroke-width="${round(sw * 1.4)}"`);
    }

    // Label (never rotated, always readable)
    let label = '';
    const isLabel = t.shape === 'none';
    if (o.labels !== false) {
      const isRiser = (t.id === 'drum-riser' || t.id === 'riser') && it.rotation === 0;
      const fsz = isLabel ? g.fs * 1.0 : isRiser ? g.fs * 0.62 : g.fs * 0.78;
      const maxChars = Math.max(8, Math.floor(Math.max(w * 1.3, 1.6) / (fsz * 0.56)));
      const lines = wrapLabel(it.label, maxChars, isLabel ? 3 : 2);
      if (lines.length) {
        const lh = fsz * 1.12;
        // Risers: label sits inside the top edge (next to the corner icon) so it never collides with what's on top.
        const lx = isRiser ? -w / 2 + Math.min(0.45, Math.min(w, h) * 0.3) * 1.45 : 0;
        const y0 = isLabel ? -((lines.length - 1) * lh) / 2 : isRiser ? -h / 2 + Math.min(0.45, Math.min(w, h) * 0.3) * 0.55 : hh + fsz * 0.85;
        const tspans = (isRiser ? lines.slice(0, 1) : lines).map((ln, i) => `<tspan x="${round(lx * TS, 1)}" y="${round((y0 + i * lh) * TS, 1)}">${esc(ln)}</tspan>`).join('');
        label = `<text transform="scale(${1 / TS})" font-size="${round(fsz * TS, 1)}" font-weight="${isLabel ? 700 : 600}" fill="${P.text}" text-anchor="${isRiser ? 'start' : 'middle'}" dominant-baseline="middle" stroke="${P.halo}" stroke-width="${round(fsz * 0.3 * TS, 1)}" stroke-linejoin="round" paint-order="stroke" pointer-events="none">${tspans}</text>`;
      }
    } else if (isLabel) {
      body = ''; // thumbnails: plain text labels add nothing at that size
    }

    // Channel badge
    let badge = '';
    if (o.badges && o.labels !== false && chNums && chNums.length) {
      let txt = ranges(chNums);
      if (txt.length > 14) txt = txt.slice(0, 12).replace(/[,\s–]+$/, '') + '…';
      const bfs = g.fs * 0.62;
      const bw = txt.length * bfs * 0.62 + bfs * 1.1;
      const bh = bfs * 1.55;
      const bx = hw - bw * 0.55, by = -hh - bh * 0.6;
      badge = `<g pointer-events="none"><rect x="${round(bx)}" y="${round(by)}" width="${round(bw)}" height="${round(bh)}" rx="${round(bh / 2)}" fill="${P.badgeFill}" stroke="${P.badgeStroke}" stroke-width="${round(sw * 0.6)}"/>${svgText(bx + bw / 2, by + bh / 2 + bfs * 0.04, txt, { size: bfs, fill: P.badgeText, weight: 700 })}</g>`;
    }

    let outRing = '';
    const outside = isOutside(it, g.W, g.D);
    if (o.interactive && outside) {
      outRing = `<rect x="${round(-hw - pad)}" y="${round(-hh - pad)}" width="${round(hw * 2 + pad * 2)}" height="${round(hh * 2 + pad * 2)}" rx="${round(pad)}" fill="none" stroke="${P.warn}" stroke-opacity="0.75" stroke-width="${round(sw * 0.7)}" stroke-dasharray="${round(sw * 1.5)} ${round(sw * 1.5)}"/>`;
    }

    let attrs = ' class="item"';
    if (o.interactive) {
      const sel = o.selectedId === it.id;
      const aria = `${it.label || t.name}, ${t.name}, ${fmtM(cx)} m across, ${fmtM(g.D - cy)} m from front${chNums && chNums.length ? ', inputs ' + ranges(chNums) : ''}${outside ? ', off stage' : ''}`;
      attrs = ` class="item${sel ? ' selected' : ''}" data-id="${esc(it.id)}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(aria)}"`;
    }
    return `<g transform="translate(${round(cx)} ${round(cy)})"${attrs}>${outRing}<g transform="rotate(${it.rotation})">${rings}${body}${icon}</g>${label}${badge}</g>`;
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  /** Build the full stage diagram. Returns { viewBox, body }. */
  function stageMarkup(doc, o) {
    const g = stageGeom(doc);
    const P = o.print ? PAL.print : PAL[o.theme || currentTheme()];
    const { W, D, fs } = g;
    let s = '<g font-family="-apple-system, BlinkMacSystemFont, SF Pro Text, Helvetica Neue, Inter, Segoe UI, system-ui, sans-serif" text-rendering="geometricPrecision">';

    if (o.interactive) s += `<rect class="bg-hit" x="${round(g.vb[0])}" y="${round(g.vb[1])}" width="${round(g.vb[2])}" height="${round(g.vb[3])}" fill="transparent"/>`;
    const rx = P.radius ? round(fs * 0.35) : 0;
    s += `<rect x="0" y="0" width="${W}" height="${D}" rx="${rx}" fill="${P.stage}"/>`;

    if (o.grid) {
      const step = W > 12 || D > 12 ? 1 : 0.5;
      const majorEvery = step === 1 ? 5 : 1;
      let lines = '';
      const isMajor = (v) => Math.abs(v / majorEvery - Math.round(v / majorEvery)) < 1e-6;
      for (let x = step; x < W - 1e-6; x += step) lines += `<line x1="${round(x)}" y1="0" x2="${round(x)}" y2="${D}" stroke="${isMajor(x) ? P.major : P.minor}"/>`;
      for (let y = step; y < D - 1e-6; y += step) lines += `<line x1="0" y1="${round(y)}" x2="${W}" y2="${round(y)}" stroke="${isMajor(y) ? P.major : P.minor}"/>`;
      s += `<g stroke-width="${round(fs * 0.05)}" pointer-events="none">${lines}</g>`;
    }
    // Centre line
    s += `<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${D}" stroke="${P.center}" stroke-width="${round(fs * 0.06)}" stroke-dasharray="${round(fs * 0.5)} ${round(fs * 0.35)}" pointer-events="none"/>`;
    s += `<rect x="0" y="0" width="${W}" height="${D}" rx="${rx}" fill="none" stroke="${P.line}" stroke-width="${round(fs * 0.08)}" pointer-events="none"/>`;
    s += `<line x1="${rx}" y1="${D}" x2="${W - rx}" y2="${D}" stroke="${P.front}" stroke-width="${round(fs * 0.22)}" stroke-linecap="round" pointer-events="none"/>`;

    if (!o.thumb) {
      // Orientation labels
      const lab = { size: fs * 0.72, fill: P.label, weight: 600, ls: fs * 0.12 };
      let t = '<g pointer-events="none">';
      t += svgText(W / 2, -fs * 0.75, 'UPSTAGE', lab);
      t += svgText(W / 2, D + fs * 1.05, 'DOWNSTAGE · FRONT OF STAGE', lab);
      t += svgText(-fs * 0.95, D / 2, 'STAGE RIGHT', Object.assign({}, lab, { rotate: -90 }));
      t += svgText(W + fs * 0.95, D / 2, 'STAGE LEFT', Object.assign({}, lab, { rotate: 90 }));
      // Audience
      const ay = D + g.mb * 0.62;
      const aud = { size: fs * 1.0, fill: P.audience, weight: 700, ls: fs * 0.45 };
      const half = Math.min(W * 0.3, fs * 9);
      t += `<line x1="${round(W / 2 - half)}" y1="${round(ay)}" x2="${round(W / 2 - fs * 5.2)}" y2="${round(ay)}" stroke="${P.label}" stroke-width="${round(fs * 0.05)}" stroke-linecap="round"/>`;
      t += `<line x1="${round(W / 2 + fs * 5.2)}" y1="${round(ay)}" x2="${round(W / 2 + half)}" y2="${round(ay)}" stroke="${P.label}" stroke-width="${round(fs * 0.05)}" stroke-linecap="round"/>`;
      t += svgText(W / 2, ay, 'AUDIENCE', aud);
      t += svgText(W / 2, ay + fs * 1.1, 'Viewed from the audience — stage right is on the left', { size: fs * 0.58, fill: P.label });

      if (o.dims) {
        const dy = -g.mt * 0.64;
        const dx = -g.mx * 0.68;
        const tk = fs * 0.3, gap = fs * 1.6;
        const dl = `stroke="${P.label}" stroke-width="${round(fs * 0.05)}" stroke-linecap="round"`;
        // Width — line broken around its label so it reads cleanly on any background.
        t += `<line x1="0" y1="${round(dy)}" x2="${round(W / 2 - gap)}" y2="${round(dy)}" ${dl}/><line x1="${round(W / 2 + gap)}" y1="${round(dy)}" x2="${W}" y2="${round(dy)}" ${dl}/>`;
        t += `<line x1="0" y1="${round(dy - tk)}" x2="0" y2="${round(dy + tk)}" ${dl}/><line x1="${W}" y1="${round(dy - tk)}" x2="${W}" y2="${round(dy + tk)}" ${dl}/>`;
        t += svgText(W / 2, dy, fmtM(W) + ' m', { size: fs * 0.8, fill: P.text, weight: 600 });
        t += `<line x1="${round(dx)}" y1="0" x2="${round(dx)}" y2="${round(D / 2 - gap)}" ${dl}/><line x1="${round(dx)}" y1="${round(D / 2 + gap)}" x2="${round(dx)}" y2="${D}" ${dl}/>`;
        t += `<line x1="${round(dx - tk)}" y1="0" x2="${round(dx + tk)}" y2="0" ${dl}/><line x1="${round(dx - tk)}" y1="${D}" x2="${round(dx + tk)}" y2="${D}" ${dl}/>`;
        t += svgText(dx, D / 2, fmtM(D) + ' m', { size: fs * 0.8, fill: P.text, weight: 600, rotate: -90 });
      }
      t += '</g>';
      s += t;
    }

    const chMap = {};
    for (const c of doc.channels) if (c.stageItemId) (chMap[c.stageItemId] = chMap[c.stageItemId] || []).push(c.number);
    s += '<g class="items">';
    for (const it of doc.stageItems) s += itemMarkup(it, g, P, o, chMap[it.id]);
    s += '</g></g>';

    const vb = g.vb.slice();
    if (o.thumb) {
      // Tight crop around the stage (and any off-stage items) for small previews.
      const xs = doc.stageItems.map((i) => i.x * W), ys = doc.stageItems.map((i) => i.y * D);
      const minX = Math.min(0, ...xs.map((x) => x - 0.6)), maxX = Math.max(W, ...xs.map((x) => x + 0.6));
      const minY = Math.min(0, ...ys.map((y) => y - 0.6)), maxY = Math.max(D, ...ys.map((y) => y + 0.6));
      const pad = Math.max(W, D) * 0.06;
      vb[0] = minX - pad; vb[1] = minY - pad; vb[2] = maxX - minX + pad * 2; vb[3] = maxY - minY + pad * 2;
    }
    return { viewBox: vb.map((v) => round(v)).join(' '), body: s, geom: g };
  }

  function thumbSvg(doc, theme) {
    const m = stageMarkup(doc, { thumb: true, labels: false, grid: true, theme: theme || currentTheme() });
    return `<svg viewBox="${m.viewBox}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${m.body}</svg>`;
  }

  // =============================================== 6. Stage editor (screen)
  function libraryMarkup(q) {
    q = q.trim().toLowerCase();
    let html = '';
    for (const cat of CATEGORIES) {
      const types = ITEM_TYPES.filter((t) => t.cat === cat.id && (!q || t.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)));
      if (!types.length) continue;
      html += `<div class="lib-cat" style="--cat:${cat.color}"><h3>${esc(cat.name)}</h3><div class="lib-items">`;
      for (const t of types) {
        html += `<button type="button" class="lib-btn sheen" draggable="true" data-type="${t.id}" title="Add ${esc(t.name)}"><span class="icon-wrap">${itemIcon(t.id)}</span><span>${esc(t.name)}</span></button>`;
      }
      html += '</div></div>';
    }
    return html || '<p class="lib-empty">No matches. Try “Custom item” for anything else.</p>';
  }
  function renderLibrary() {
    $('#library-list').innerHTML = libraryMarkup(ui.libFilter);
    $('#library-sheet-list').innerHTML = libraryMarkup(ui.libFilterSheet);
  }

  function renderStage() {
    if (!state) return;
    const svg = $('#stage-svg');
    const a = document.activeElement;
    const focusItem = a && svg.contains(a) && a.closest('.item') ? a.closest('.item').dataset.id : null;
    const m = stageMarkup(state, { interactive: true, selectedId: ui.selectedId, grid: prefs.grid, dims: prefs.dims, badges: prefs.badges });
    svg.setAttribute('viewBox', m.viewBox);
    svg.innerHTML = m.body;
    $('#canvas-empty').hidden = state.stageItems.length > 0;
    if (focusItem) focusStageItem(focusItem);
  }
  function focusStageItem(id) {
    const g = $('#stage-svg').querySelector(`.item[data-id="${CSS.escape(id)}"]`);
    if (g) g.focus({ preventScroll: true });
  }

  function syncInspectorVisibility() {
    const has = !!getItem(ui.selectedId);
    document.body.classList.toggle('has-selection', has);
    document.body.classList.toggle('insp-open', has || ui.inspPinned);
    const t = $('#btn-inspector-toggle');
    t.setAttribute('aria-pressed', String(has || ui.inspPinned));
  }

  function select(id) {
    if (ui.selectedId === id) return;
    ui.selectedId = id;
    renderStage();
    renderInspector();
    syncInspectorVisibility();
  }

  function freeSpot(t) {
    const { W, D } = stageGeom(state);
    const base = {
      people: [W / 2, D * 0.6], vocals: [W / 2, D * 0.72], drums: [W / 2, D * 0.25], strings: [W / 2, D * 0.12],
      keys: [W / 2, D * 0.5], monitors: [W / 2, D - 0.45], pa: [W / 2, D - 0.5], misc: [W / 2, D / 2],
    }[t.cat] || [W / 2, D / 2];
    // Free = the new footprint (plus a small gap) does not overlap any existing item's bounding box.
    const gap = 0.15;
    const others = state.stageItems.map((i) => Object.assign(aabb(i), { cx: i.x * W, cy: i.y * D }));
    const free = (x, y) => others.every((o) => Math.abs(o.cx - x) >= o.hw + t.w / 2 + gap || Math.abs(o.cy - y) >= o.hh + t.h / 2 + gap + 0.3); // + room for the label
    const cands = [];
    if (t.cat === 'pa') cands.push([-0.7, D - 0.45], [W + 0.7, D - 0.45]);
    const stepX = Math.max(0.5, t.w + gap), stepY = Math.max(0.5, t.h + gap + 0.3);
    const dir = base[1] > D / 2 ? -1 : 1; // rows move toward the middle of the stage
    for (let row = 0; row < Math.ceil(D / stepY) * 2; row++) {
      const off = Math.ceil(row / 2) * stepY * (row % 2 ? dir : -dir);
      const y = base[1] + off;
      if (y < t.h / 2 || y > D - t.h / 2) continue;
      for (let k = 0; k < 2 * Math.ceil(W / stepX) + 1; k++) {
        const x = base[0] + Math.ceil(k / 2) * stepX * (k % 2 ? 1 : -1);
        if (x < t.w / 2 || x > W - t.w / 2) continue;
        cands.push([x, y]);
      }
    }
    const snap = (v) => Math.round(v / SNAP) * SNAP;
    const pick = cands.map(([x, y]) => [snap(x), snap(y)]).find(([x, y]) => free(x, y)) || base;
    return { x: snap(pick[0]), y: snap(pick[1]) };
  }

  function addItem(typeId, at) {
    const t = TYPE_MAP[typeId];
    if (!t) return;
    const { W, D } = stageGeom(state);
    const pos = at || freeSpot(t);
    const it = makeItem(typeId, pos.x / W, pos.y / D);
    ui.selectedId = it.id;
    mutate((s) => {
      // Risers go to the back of the z-order so things can sit on top of them.
      if (t.id === 'drum-riser' || t.id === 'riser') s.stageItems.unshift(it); else s.stageItems.push(it);
    });
    syncInspectorVisibility();
    focusStageItem(it.id);
    announce(`${t.name} added at ${fmtM(pos.x)} metres across, ${fmtM(D - pos.y)} metres from the front.`);
  }

  function deleteItem(id) {
    const it = getItem(id);
    if (!it) return;
    const linked = channelsFor(id).length;
    if (ui.selectedId === id) ui.selectedId = null;
    mutate((s) => {
      s.stageItems = s.stageItems.filter((i) => i.id !== id);
      s.channels.forEach((c) => { if (c.stageItemId === id) c.stageItemId = null; });
    });
    syncInspectorVisibility();
    toast(`Deleted “${it.label || typeOf(it).name}”${linked ? ` · ${linked} input link${linked > 1 ? 's' : ''} removed` : ''}`, { action: { label: 'Undo', fn: undo } });
  }

  function duplicateItem(id) {
    const it = getItem(id);
    if (!it) return;
    const { W, D } = stageGeom(state);
    const copy = Object.assign({}, it, { id: uid('item'), x: round((it.x * W + 0.5) / W, 4), y: round((it.y * D + 0.25) / D, 4) });
    ui.selectedId = copy.id;
    mutate((s) => {
      const i = s.stageItems.findIndex((x) => x.id === id);
      s.stageItems.splice(i + 1, 0, copy);
    });
    focusStageItem(copy.id);
    announce('Duplicated');
  }

  function rotateItem(id, delta) {
    mutate((s) => {
      const it = s.stageItems.find((i) => i.id === id);
      let r = Math.round((it.rotation + delta) / 15) * 15;
      r = ((r % 360) + 360) % 360;
      if (r > 180) r -= 360;
      it.rotation = r;
    }, { key: 'rot:' + id, render: ['stage', 'inspector'] });
    const it = getItem(id);
    if (it) announceSoon(`Rotation ${it.rotation} degrees`);
  }

  // Zoom ------------------------------------------------------------------
  function applyZoom() {
    const wrap = $('#canvas-wrap');
    const svg = $('#stage-svg');
    const z = prefs.zoom;
    if (z === 1 || isPhone()) {
      svg.style.width = '100%';
      svg.style.height = isPhone() ? 'auto' : '100%';
      if (isPhone() && z !== 1) { svg.style.width = z * 100 + '%'; }
    } else {
      const cs = getComputedStyle(wrap);
      const bw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const bh = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      svg.style.width = Math.round(bw * z) + 'px';
      svg.style.height = Math.round(bh * z) + 'px';
    }
    $('#zoom-reset').textContent = Math.round(z * 100) + '%';
    $('#zoom-out').disabled = z <= ZOOM_STEPS[0];
    $('#zoom-in').disabled = z >= ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  function setZoom(z) {
    const wrap = $('#canvas-wrap');
    const old = prefs.zoom;
    if (z === old) return;
    // Keep the view centred on the same point.
    const cx = (wrap.scrollLeft + wrap.clientWidth / 2) / Math.max(1, wrap.scrollWidth);
    const cy = (wrap.scrollTop + wrap.clientHeight / 2) / Math.max(1, wrap.scrollHeight);
    prefs.zoom = z;
    savePrefs();
    applyZoom();
    wrap.scrollLeft = cx * wrap.scrollWidth - wrap.clientWidth / 2;
    wrap.scrollTop = cy * wrap.scrollHeight - wrap.clientHeight / 2;
    announceSoon(`Zoom ${Math.round(z * 100)} percent`);
  }
  function zoomStep(dir) {
    const i = ZOOM_STEPS.indexOf(prefs.zoom);
    setZoom(ZOOM_STEPS[clamp((i < 0 ? 2 : i) + dir, 0, ZOOM_STEPS.length - 1)]);
  }

  // Canvas pointer interactions --------------------------------------------
  let drag = null;
  function svgPoint(evt) {
    const svg = $('#stage-svg');
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }

  function bindStage() {
    const svg = $('#stage-svg');

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const gEl = e.target.closest('.item');
      if (!gEl) { select(null); return; }
      const it = getItem(gEl.dataset.id);
      if (!it) return;
      e.preventDefault();
      select(it.id);
      const geo = stageGeom(state);
      const p = svgPoint(e);
      drag = { id: it.id, pid: e.pointerId, offX: it.x * geo.W - p.x, offY: it.y * geo.D - p.y, sx: e.clientX, sy: e.clientY, moved: false, cx: it.x * geo.W, cy: it.y * geo.D, geo };
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      focusStageItem(it.id);
    });

    svg.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
      drag.moved = true;
      const p = svgPoint(e);
      let cx = p.x + drag.offX, cy = p.y + drag.offY;
      if (prefs.snap && !e.altKey) { cx = Math.round(cx / SNAP) * SNAP; cy = Math.round(cy / SNAP) * SNAP; }
      const { W, D, mx, mt, mb } = drag.geo;
      drag.cx = clamp(cx, -mx + 0.15, W + mx - 0.15);
      drag.cy = clamp(cy, -mt + 0.15, D + mb - 0.15);
      const gEl = svg.querySelector(`.item[data-id="${CSS.escape(drag.id)}"]`);
      if (gEl) gEl.setAttribute('transform', `translate(${round(drag.cx)} ${round(drag.cy)})`);
    });

    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.pid)) return;
      const d = drag;
      drag = null;
      try { svg.releasePointerCapture(d.pid); } catch (err) { /* ignore */ }
      if (!d.moved) return;
      mutate((s) => {
        const it = s.stageItems.find((i) => i.id === d.id);
        if (it) { it.x = round(d.cx / d.geo.W, 4); it.y = round(d.cy / d.geo.D, 4); }
      }, { render: ['stage', 'inspector'] });
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('lostpointercapture', endDrag);

    svg.addEventListener('dblclick', (e) => {
      if (e.target.closest('.item')) focusLabelField();
    });

    svg.addEventListener('focusin', (e) => {
      const gEl = e.target.closest && e.target.closest('.item');
      if (gEl && !drag && ui.selectedId !== gEl.dataset.id) select(gEl.dataset.id);
    });

    svg.addEventListener('keydown', (e) => {
      const gEl = e.target.closest && e.target.closest('.item');
      if (!gEl) return;
      const id = gEl.dataset.id;
      const it = getItem(id);
      if (!it) return;
      const mod = e.ctrlKey || e.metaKey;
      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrows[e.key] && !mod) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : prefs.snap ? SNAP : 0.05;
        const { W, D, mx, mt, mb } = stageGeom(state);
        const [dx, dy] = arrows[e.key];
        mutate((s) => {
          const x = s.stageItems.find((i) => i.id === id);
          x.x = round(clamp(x.x * W + dx * step, -mx + 0.15, W + mx - 0.15) / W, 4);
          x.y = round(clamp(x.y * D + dy * step, -mt + 0.15, D + mb - 0.15) / D, 4);
        }, { key: 'kmove:' + id, render: ['stage', 'inspector'] });
        const n = getItem(id);
        announceSoon(`${fmtM(n.x * W)} metres across, ${fmtM(D - n.y * D)} metres from the front`);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteItem(id);
        svg.focus();
      } else if ((e.key === 'r' || e.key === 'R') && !mod) {
        e.preventDefault();
        rotateItem(id, e.shiftKey ? -15 : 15);
      } else if (mod && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateItem(id);
      } else if (e.key === 'Escape') {
        select(null);
        svg.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        focusLabelField();
      }
    });
    svg.setAttribute('tabindex', '-1');

    // Drag from library
    svg.addEventListener('dragover', (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('application/x-stageplan-type')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });
    svg.addEventListener('drop', (e) => {
      const type = e.dataTransfer && e.dataTransfer.getData('application/x-stageplan-type');
      if (!type) return;
      e.preventDefault();
      const p = svgPoint(e);
      const { W, D, mx, mt, mb } = stageGeom(state);
      let x = p.x, y = p.y;
      if (prefs.snap) { x = Math.round(x / SNAP) * SNAP; y = Math.round(y / SNAP) * SNAP; }
      addItem(type, { x: clamp(x, -mx + 0.15, W + mx - 0.15), y: clamp(y, -mt + 0.15, D + mb - 0.15) });
    });

    for (const listId of ['#library-list', '#library-sheet-list']) {
      const lib = $(listId);
      lib.addEventListener('click', (e) => {
        const b = e.target.closest('.lib-btn');
        if (!b) return;
        if (listId === '#library-sheet-list') $('#dlg-library').close();
        addItem(b.dataset.type);
      });
      lib.addEventListener('dragstart', (e) => {
        const b = e.target.closest('.lib-btn');
        if (!b) return;
        e.dataTransfer.setData('application/x-stageplan-type', b.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    }
    $('#lib-search').addEventListener('input', (e) => { ui.libFilter = e.target.value; $('#library-list').innerHTML = libraryMarkup(ui.libFilter); });
    $('#lib-search-sheet').addEventListener('input', (e) => { ui.libFilterSheet = e.target.value; $('#library-sheet-list').innerHTML = libraryMarkup(ui.libFilterSheet); });
    $('#btn-add-mobile').addEventListener('click', openLibrarySheet);
    $('#btn-lib-close').addEventListener('click', () => $('#dlg-library').close());

    // HUD
    const toggles = { 'tg-grid': 'grid', 'tg-snap': 'snap', 'tg-dims': 'dims', 'tg-badges': 'badges' };
    for (const [id, key] of Object.entries(toggles)) {
      $('#' + id).addEventListener('click', () => {
        prefs[key] = !prefs[key];
        savePrefs();
        renderToggles();
        renderStage();
      });
    }
    $('#zoom-in').addEventListener('click', () => zoomStep(1));
    $('#zoom-out').addEventListener('click', () => zoomStep(-1));
    $('#zoom-reset').addEventListener('click', () => setZoom(1));
    $('#canvas-wrap').addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // trackpad pinch arrives as ctrl+wheel
      e.preventDefault();
      zoomStep(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    $('#btn-stage-size').addEventListener('click', () => {
      switchTab('project');
      $('#form-project [name="stageWidth"]').focus();
    });
    $('#btn-inspector-toggle').addEventListener('click', () => {
      const open = document.body.classList.contains('insp-open');
      if (open) { ui.inspPinned = false; select(null); } else ui.inspPinned = true;
      syncInspectorVisibility();
      if (!open) { const f = $('#inspector button, #inspector input'); if (f) f.focus(); }
    });
  }

  function renderToggles() {
    $('#tg-grid').setAttribute('aria-pressed', prefs.grid);
    $('#tg-snap').setAttribute('aria-pressed', prefs.snap);
    $('#tg-dims').setAttribute('aria-pressed', prefs.dims);
    $('#tg-badges').setAttribute('aria-pressed', prefs.badges);
  }

  function openLibrarySheet() {
    const dlg = $('#dlg-library');
    if (dlg.open) return;
    dlg.showModal();
    $('#btn-lib-close').focus();
  }

  function focusLabelField() {
    const inp = $('#inspector [data-f="label"]');
    if (inp) { inp.focus(); inp.select(); }
  }

  // Inspector --------------------------------------------------------------
  function captureFocus(root) {
    const a = document.activeElement;
    if (!a || !root.contains(a) || !a.dataset || !a.dataset.fk) return null;
    return { fk: a.dataset.fk, s: a.selectionStart, e: a.selectionEnd };
  }
  function restoreFocus(root, f) {
    if (!f) return;
    const el = root.querySelector(`[data-fk="${CSS.escape(f.fk)}"]`);
    if (!el) return;
    el.focus({ preventScroll: true });
    try { if (f.s != null && el.setSelectionRange) el.setSelectionRange(f.s, f.e); } catch (e) { /* not a text input */ }
  }

  function typeOptions(selected) {
    return CATEGORIES.map((c) => `<optgroup label="${esc(c.name)}">${ITEM_TYPES.filter((t) => t.cat === c.id).map((t) => `<option value="${t.id}"${t.id === selected ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</optgroup>`).join('');
  }

  function renderInspector() {
    if (!state) return;
    const box = $('#inspector');
    const f = captureFocus(box);
    const it = getItem(ui.selectedId);
    box.innerHTML = `${it ? inspectorProps(it) : inspectorEmpty()}
      <div class="insp-group insp-list-group"><h2 class="insp-title">On stage · ${state.stageItems.length}</h2><ul class="item-list" id="insp-list"></ul></div>`;
    renderItemList();
    restoreFocus(box, f);
  }

  function inspectorEmpty() {
    return `<div class="insp-empty">
        <div class="empty-icon">${uiIcon('stage')}</div>
        <h2 class="insp-empty-title">No selection</h2>
        <p>Select something on the stage to edit its label, position, size, colour and linked inputs.</p>
        <p class="small" style="font-size:12px;color:var(--text-3)">Tip: press <kbd>Tab</kbd> to move between items.</p>
      </div>`;
  }

  function inspectorProps(it) {
    const t = typeOf(it);
    const col = itemColor(it);
    const { W, D } = stageGeom(state);
    const cx = it.x * W, cy = it.y * D;
    const outside = isOutside(it, W, D);
    const swatches = [...new Set([...CATEGORIES.map((c) => c.color), '#ff375f', '#ffd60a', '#8e8e93'])];
    const linkedRows = state.channels.map((c) => {
      const other = c.stageItemId && c.stageItemId !== it.id ? getItem(c.stageItemId) : null;
      return `<li><label><input type="checkbox" data-link="${esc(c.id)}" data-fk="link:${esc(c.id)}"${c.stageItemId === it.id ? ' checked' : ''}>
        <span class="chn">${c.number}</span><span class="nm">${esc(c.name || 'Unnamed')}</span>
        ${other ? `<span class="elsewhere" title="Currently linked to ${esc(other.label)}">${esc(other.label || typeOf(other).name)}</span>` : ''}</label></li>`;
    }).join('');
    return `
      <div class="insp-head" style="--cat:${col}">
        <div class="type-icon">${itemIcon(t.id)}</div>
        <div class="meta"><strong id="insp-title">${esc(it.label || t.name)}</strong><span>${esc(t.name)}</span></div>
        <button type="button" class="btn icon-only small insp-close" data-act="close" data-fk="close" aria-label="Close properties" title="Deselect (Esc)">${uiIcon('x')}</button>
      </div>
      ${outside ? `<div class="notice">${uiIcon('alert')}<span>Off stage. That’s fine for PA, sidefills and other off-stage gear.</span></div>` : ''}
      <div class="insp-group">
        <label class="field">Label<input type="text" data-f="label" data-fk="label" maxlength="120" value="${esc(it.label)}" placeholder="${esc(t.name)}"></label>
        <label class="field">Type<select data-f="type" data-fk="type">${typeOptions(it.type)}</select></label>
      </div>
      <div class="insp-group">
        <h3 class="insp-title">Placement</h3>
        <div class="row2">
          <label class="field" title="Centre of the item, measured from the stage-right edge (the left edge as seen from the audience)">Across (m)<input type="number" inputmode="decimal" data-f="px" data-fk="px" step="0.05" value="${fmtM(cx)}"></label>
          <label class="field" title="Centre of the item, measured from the front (downstage) edge">From front (m)<input type="number" inputmode="decimal" data-f="py" data-fk="py" step="0.05" value="${fmtM(D - cy)}"></label>
        </div>
        <div class="row2">
          <label class="field">Width (m)<input type="number" inputmode="decimal" data-f="w" data-fk="w" min="0.15" max="20" step="0.05" value="${fmtM(it.w)}"></label>
          <label class="field">Depth (m)<input type="number" inputmode="decimal" data-f="h" data-fk="h" min="0.15" max="20" step="0.05" value="${fmtM(it.h)}"></label>
        </div>
        <div class="field"><span id="rot-lbl">Rotation</span>
          <div class="stepper">
            <button type="button" class="btn icon-only" data-act="rot-" data-fk="rot-" title="Rotate −15° (⇧R)" aria-label="Rotate anticlockwise 15 degrees">${uiIcon('rotateCcw')}</button>
            <input type="number" data-f="rotation" data-fk="rotation" step="5" min="-180" max="180" value="${it.rotation}" aria-labelledby="rot-lbl">
            <button type="button" class="btn icon-only" data-act="rot+" data-fk="rot+" title="Rotate +15° (R)" aria-label="Rotate clockwise 15 degrees">${uiIcon('rotateCw')}</button>
          </div>
        </div>
      </div>
      <div class="insp-group">
        <h3 class="insp-title" id="col-lbl">Colour</h3>
        <div class="swatches" role="group" aria-labelledby="col-lbl">
          ${swatches.map((c) => `<button type="button" class="swatch" data-color="${c}" data-fk="sw:${c}" style="background:${c};--swatch:${c}" aria-label="Colour ${c}" aria-pressed="${c.toLowerCase() === col.toLowerCase()}"></button>`).join('')}
          <input type="color" data-f="color" data-fk="color" value="${col}" aria-label="Custom colour">
        </div>
        ${it.color ? '<button type="button" class="btn plain small" data-act="color-reset" data-fk="color-reset" style="align-self:flex-start">Use category colour</button>' : ''}
      </div>
      <div class="insp-group">
        <label class="field">Notes<textarea data-f="notes" data-fk="notes" rows="2" maxlength="2000" placeholder="e.g. needs 2 × power">${esc(it.notes)}</textarea></label>
      </div>
      <div class="insp-group">
        <h3 class="insp-title">Linked inputs</h3>
        <ul class="linked-list" aria-label="Inputs linked to this item">${linkedRows || '<li class="none">No inputs yet. Add one below, or on the Inputs tab.</li>'}</ul>
        <button type="button" class="btn small" data-act="add-ch" data-fk="add-ch" style="align-self:flex-start">${uiIcon('plus')}<span>New linked input</span></button>
      </div>
      <div class="btn-row">
        <button type="button" class="btn small" data-act="dup" data-fk="dup" title="Duplicate (⌘D)">${uiIcon('copy')}<span>Duplicate</span></button>
        <button type="button" class="btn small icon-only" data-act="front" data-fk="front" title="Bring to front" aria-label="Bring to front">${uiIcon('layers')}</button>
        <button type="button" class="btn small icon-only" data-act="back" data-fk="back" title="Send to back" aria-label="Send to back">${uiIcon('layersDown')}</button>
        <span class="spacer"></span>
        <button type="button" class="btn small destructive" data-act="del" data-fk="del" title="Delete (⌫)">${uiIcon('trash')}<span>Delete</span></button>
      </div>`;
  }

  function renderItemList() {
    const list = $('#insp-list');
    if (!list || !state) return;
    const f = captureFocus(list);
    const map = {};
    state.channels.forEach((c) => { if (c.stageItemId) (map[c.stageItemId] = map[c.stageItemId] || []).push(c.number); });
    list.innerHTML = state.stageItems.length
      ? state.stageItems.slice().reverse().map((it) => `<li><button type="button" data-select="${esc(it.id)}" data-fk="il:${esc(it.id)}" aria-current="${it.id === ui.selectedId}" style="--cat:${itemColor(it)}"><span class="ic">${itemIcon(it.type)}</span><span class="nm">${esc(it.label || typeOf(it).name)}</span>${map[it.id] ? `<span class="tag">${esc(ranges(map[it.id]))}</span>` : ''}</button></li>`).join('')
      : '<li class="small" style="color:var(--text-3);font-size:13px;padding:4px 8px">Nothing on stage yet.</li>';
    restoreFocus(list, f);
  }

  function bindInspector() {
    const box = $('#inspector');
    box.addEventListener('input', (e) => {
      const el = e.target;
      const f = el.dataset.f;
      const it = getItem(ui.selectedId);
      if (!f || !it) return;
      const id = it.id;
      const { W, D } = stageGeom(state);
      const set = (fn, render) => mutate((s) => fn(s.stageItems.find((i) => i.id === id)), { key: `insp:${id}:${f}`, render });
      if (f === 'label') {
        set((x) => (x.label = el.value), ['stage', 'channels']);
        $('#insp-title').textContent = el.value || typeOf(it).name;
        renderItemList();
      } else if (f === 'notes') {
        set((x) => (x.notes = el.value), []);
      } else if (f === 'color') {
        if (isHex(el.value)) set((x) => (x.color = el.value.toLowerCase()), ['stage', 'insList']);
      } else if (['px', 'py', 'w', 'h', 'rotation'].includes(f)) {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v)) return;
        set((x) => {
          if (f === 'px') x.x = round(clamp(v, -5, W + 5) / W, 4);
          if (f === 'py') x.y = round(clamp(D - v, -5, D + 5) / D, 4);
          if (f === 'w') x.w = round(clamp(v, 0.15, 20), 2);
          if (f === 'h') x.h = round(clamp(v, 0.15, 20), 2);
          if (f === 'rotation') x.rotation = clamp(Math.round(v), -360, 360) % 360;
        }, ['stage']);
      }
    });
    box.addEventListener('change', (e) => {
      const el = e.target;
      const it = getItem(ui.selectedId);
      if (!it) return;
      if (el.dataset.f === 'type') {
        const oldT = typeOf(it), newT = TYPE_MAP[el.value];
        if (!newT) return;
        mutate((s) => {
          const x = s.stageItems.find((i) => i.id === it.id);
          x.type = newT.id;
          if (x.w === oldT.w && x.h === oldT.h) { x.w = newT.w; x.h = newT.h; }
          if (!x.label || x.label === (SHORT[oldT.id] || oldT.name)) x.label = SHORT[newT.id] || newT.name;
        });
      } else if (el.dataset.link) {
        const chId = el.dataset.link;
        const checked = el.checked;
        mutate((s) => {
          const c = s.channels.find((x) => x.id === chId);
          if (c) { c.stageItemId = checked ? it.id : null; if (checked) c.position = ''; }
        });
      } else if (['px', 'py', 'w', 'h', 'rotation', 'color'].includes(el.dataset.f)) {
        renderInspector(); // normalise displayed values + off-stage notice
      }
    });
    box.addEventListener('click', (e) => {
      const sel = e.target.closest('[data-select]');
      if (sel) { select(sel.dataset.select); return; }
      const sw = e.target.closest('[data-color]');
      const it = getItem(ui.selectedId);
      if (sw && it) {
        mutate((s) => (s.stageItems.find((i) => i.id === it.id).color = sw.dataset.color.toLowerCase()), { render: ['stage', 'inspector'] });
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b || !it) return;
      const act = b.dataset.act;
      if (act === 'close') { ui.inspPinned = false; select(null); focusStageCanvas(); }
      else if (act === 'rot-') rotateItem(it.id, -15);
      else if (act === 'rot+') rotateItem(it.id, 15);
      else if (act === 'color-reset') mutate((s) => (s.stageItems.find((i) => i.id === it.id).color = ''), { render: ['stage', 'inspector'] });
      else if (act === 'dup') duplicateItem(it.id);
      else if (act === 'del') deleteItem(it.id);
      else if (act === 'front') mutate((s) => { s.stageItems = s.stageItems.filter((i) => i.id !== it.id).concat([getItemIn(s, it.id)]); }, { render: ['stage', 'inspector'] });
      else if (act === 'back') mutate((s) => { s.stageItems = [getItemIn(s, it.id)].concat(s.stageItems.filter((i) => i.id !== it.id)); }, { render: ['stage', 'inspector'] });
      else if (act === 'add-ch') {
        const c = makeChannel({ name: it.label || typeOf(it).name, stageItemId: it.id });
        mutate((s) => s.channels.push(c));
        toast(`Input ${state.channels.length} added and linked`, { type: 'ok', action: { label: 'Edit', fn: () => { switchTab('channels'); focusChannel(c.id, 'name'); } } });
      }
    });
  }
  const getItemIn = (s, id) => s.stageItems.find((i) => i.id === id);
  function focusStageCanvas() {
    const svg = $('#stage-svg');
    if (svg) svg.focus({ preventScroll: true });
  }

  // ============================================================== 7. Inputs
  function computeWarnings() {
    const byName = {};
    state.channels.forEach((c) => {
      const k = c.name.trim().toLowerCase();
      if (k) (byName[k] = byName[k] || []).push(c.id);
    });
    const w = {};
    let dup = 0, noName = 0, noMic = 0;
    for (const c of state.channels) {
      const k = c.name.trim().toLowerCase();
      const e = {};
      if (!k) { e.name = 'Missing input name'; noName++; }
      else if (byName[k].length > 1) { e.name = 'Duplicate input name'; dup++; }
      if (!c.micOrDI.trim()) { e.micOrDI = 'Missing mic / DI'; noMic++; }
      w[c.id] = e;
    }
    return { map: w, dup, noName, noMic };
  }

  function channelMatches(c, q) {
    return [c.number, c.name, c.source, c.micOrDI, c.stand, c.monitor, c.notes, channelPositionText(c), c.phantom ? '48v phantom' : '']
      .some((v) => String(v).toLowerCase().includes(q));
  }

  function posOptions(c) {
    const items = state.stageItems.filter((i) => typeOf(i).shape !== 'none' || i.label);
    let html = '<option value="">Not on plot</option>';
    if (items.length) {
      html += '<optgroup label="Stage items">';
      html += items.map((i) => `<option value="${esc(i.id)}"${c.stageItemId === i.id ? ' selected' : ''}>${esc(i.label || typeOf(i).name)}</option>`).join('');
      html += '</optgroup>';
    }
    if (!c.stageItemId && c.position) html += `<option value="__text" selected>“${esc(c.position)}”</option>`;
    html += '<option value="__custom">Type a position…</option>';
    return html;
  }

  function rowMarkup(c, warn) {
    const n = c.number;
    const e = (ui.showWarnings && warn.map[c.id]) || {};
    const LBL = { name: 'Input', source: 'Instrument', micOrDI: 'Mic / DI', stand: 'Stand', monitor: 'Monitor', notes: 'Notes' };
    const cell = (f, ph, list) => `<td class="c-${f}${e[f] ? ' warn' : ''}"${f !== 'name' ? ` data-label="${LBL[f]}"` : ''}${e[f] ? ` title="${esc(e[f])}"` : ''}><input type="text" data-f="${f}" data-fk="${f}:${esc(c.id)}" value="${esc(c[f])}" placeholder="${esc(ph)}" aria-label="Input ${n} ${esc(LBL[f])}"${e[f] ? ` aria-invalid="true" aria-description="${esc(e[f])}"` : ''}${list ? ` list="${list}"` : ''} maxlength="120"></td>`;
    return `<tr data-id="${esc(c.id)}">
      <td class="c-grip"><button type="button" class="grip" data-fk="grip:${esc(c.id)}" title="Drag to reorder, or focus and press ↑ ↓" aria-label="Reorder input ${n}. Use the up and down arrow keys.">${uiIcon('grip')}</button></td>
      <td class="ch-num">${n}</td>
      ${cell('name', 'Input name')}
      ${cell('source', 'Instrument')}
      ${cell('micOrDI', 'Mic / DI', 'dl-mics')}
      ${cell('stand', 'Stand', 'dl-stands')}
      <td class="c-48" data-label="48V"><div class="p48"><input type="checkbox" data-f="phantom" data-fk="phantom:${esc(c.id)}"${c.phantom ? ' checked' : ''} aria-label="Input ${n} phantom power" title="Phantom power (+48V)"></div></td>
      <td class="c-pos" data-label="Position"><div class="pos-cell">${c.stageItemId ? `<span title="Linked to the stage plot">${uiIcon('link')}</span>` : ''}<select data-f="pos" data-fk="pos:${esc(c.id)}" aria-label="Input ${n} stage position">${posOptions(c)}</select></div></td>
      ${cell('monitor', 'Mix')}
      ${cell('notes', 'Notes')}
      <td class="c-act"><div class="row-actions">
        <button type="button" class="btn" data-act="up" data-fk="up:${esc(c.id)}" title="Move up" aria-label="Move input ${n} up">${uiIcon('up')}</button>
        <button type="button" class="btn" data-act="down" data-fk="down:${esc(c.id)}" title="Move down" aria-label="Move input ${n} down">${uiIcon('down')}</button>
        <button type="button" class="btn" data-act="dup" data-fk="dup:${esc(c.id)}" title="Duplicate" aria-label="Duplicate input ${n}">${uiIcon('copy')}</button>
        <button type="button" class="btn del" data-act="del" data-fk="del:${esc(c.id)}" title="Delete" aria-label="Delete input ${n}">${uiIcon('trash')}</button>
      </div></td>
    </tr>`;
  }

  function renderChannels() {
    if (!state) return;
    const body = $('#ch-body');
    const f = captureFocus(body);
    const q = ui.chFilter.trim().toLowerCase();
    const warn = computeWarnings();
    const rows = state.channels.filter((c) => !q || channelMatches(c, q));
    body.innerHTML = rows.map((c) => rowMarkup(c, warn)).join('') ||
      (state.channels.length ? '<tr><td colspan="11" class="empty-state"><p>No inputs match “' + esc(ui.chFilter) + '”.</p></td></tr>' : '');
    $('#ch-empty').hidden = state.channels.length > 0;
    $('#ch-table').hidden = state.channels.length === 0;
    restoreFocus(body, f);
    renderChMeta(warn);
  }

  function renderChMeta(warn) {
    if (!state) return;
    warn = warn || computeWarnings();
    const n = state.channels.length;
    $('#tab-ch-count').textContent = n || '';
    const ph = state.channels.filter((c) => c.phantom).length;
    const linked = state.channels.filter((c) => c.stageItemId).length;
    $('#ch-subtitle').textContent = n ? `${n} input${n === 1 ? '' : 's'} · ${ph} on phantom power · ${linked} on the stage plot` : 'Build the list your engineer patches from.';
    const parts = [];
    if (warn.dup) parts.push(`${warn.dup} share a name`);
    if (warn.noName) parts.push(`${warn.noName} unnamed`);
    if (warn.noMic) parts.push(`${warn.noMic} missing mic / DI`);
    $('#ch-warning-summary').innerHTML = ui.showWarnings && parts.length ? uiIcon('alert') + '<span>' + esc(parts.join(' · ')) + '</span>' : '';
    // Update warning classes in-place so typing never loses focus.
    if (!ui.showWarnings) return;
    $$('#ch-body tr[data-id]').forEach((tr) => {
      const e = warn.map[tr.dataset.id] || {};
      for (const fld of ['name', 'micOrDI']) {
        const td = tr.querySelector('.c-' + fld);
        if (!td) continue;
        td.classList.toggle('warn', !!e[fld]);
        const inp = td.querySelector('input');
        if (e[fld]) { td.title = e[fld]; inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-description', e[fld]); }
        else { td.removeAttribute('title'); inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-description'); }
      }
    });
  }

  function focusChannel(id, field) {
    requestAnimationFrame(() => {
      const el = $(`#ch-body [data-fk="${CSS.escape(field + ':' + id)}"]`);
      if (el) {
        el.focus();
        el.closest('tr').classList.add('flash');
        el.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    });
  }

  function addChannel(fields, afterId) {
    const c = makeChannel(fields);
    if (ui.chFilter) { ui.chFilter = ''; $('#ch-search').value = ''; }
    mutate((s) => {
      const i = afterId ? s.channels.findIndex((x) => x.id === afterId) : -1;
      if (i >= 0) s.channels.splice(i + 1, 0, c); else s.channels.push(c);
    });
    return c;
  }

  function moveChannel(id, delta) {
    const i = state.channels.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.channels.length) return;
    mutate((s) => { const [c] = s.channels.splice(i, 1); s.channels.splice(j, 0, c); });
    announce(`Moved to position ${j + 1} of ${state.channels.length}`);
  }
  function moveChannelTo(id, targetId, after) {
    if (id === targetId) return;
    mutate((s) => {
      const i = s.channels.findIndex((c) => c.id === id);
      if (i < 0) return;
      const [c] = s.channels.splice(i, 1);
      let j = s.channels.findIndex((x) => x.id === targetId);
      if (j < 0) j = s.channels.length; else if (after) j++;
      s.channels.splice(j, 0, c);
    });
  }

  function quickAdd(q) {
    const list = q.group ? q.group.map((k) => QUICK_BY_KEY[k]) : q.pair ? [Object.assign({}, q, { name: q.name + ' L' }), Object.assign({}, q, { name: q.name + ' R' })] : [q];
    const created = [];
    if (ui.chFilter) { ui.chFilter = ''; $('#ch-search').value = ''; }
    mutate((s) => {
      for (const p of list) {
        let link = null;
        for (const t of p.linkTypes || []) {
          const m = s.stageItems.filter((i) => i.type === t);
          if (m.length === 1) { link = m[0].id; break; }
        }
        const c = makeChannel({ name: p.name, source: p.source || '', micOrDI: p.micOrDI || '', stand: p.stand || '', phantom: !!p.phantom, notes: p.notes || '', stageItemId: link });
        s.channels.push(c);
        created.push(c);
      }
    });
    const linked = created.filter((c) => c.stageItemId).length;
    toast(`Added ${created.length} input${created.length > 1 ? 's' : ''}${linked ? ` · ${linked} linked to the stage` : ''}`, { type: 'ok', timeout: 2400 });
    requestAnimationFrame(() => {
      created.forEach((c) => { const r = $(`#ch-body tr[data-id="${CSS.escape(c.id)}"]`); if (r) r.classList.add('flash'); });
      const last = $(`#ch-body tr[data-id="${CSS.escape(created[created.length - 1].id)}"]`);
      if (last) last.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  }

  function promptPosition(c) {
    const v = window.prompt('Stage position (text only, not linked to an item):', c.position || '');
    if (v === null) { renderChannels(); return; }
    mutate((s) => { const x = s.channels.find((y) => y.id === c.id); x.stageItemId = null; x.position = v.trim().slice(0, 120); });
  }

  let dragRow = null, dropTarget = null;
  function bindChannels() {
    const body = $('#ch-body');

    $('#btn-add-channel').addEventListener('click', () => { const c = addChannel(); focusChannel(c.id, 'name'); });
    $('#ch-search').addEventListener('input', (e) => { ui.chFilter = e.target.value; renderChannels(); });
    $('#ch-warnings').addEventListener('change', (e) => { ui.showWarnings = e.target.checked; renderChannels(); });

    $('#quick-add').innerHTML = QUICK.filter((q) => !q.hidden).map((q) => `<button type="button" class="chip sheen${q.group ? ' group' : ''}" data-q="${QUICK.indexOf(q)}" title="${esc(q.group ? 'Adds ' + q.group.map((k) => QUICK_BY_KEY[k].name).join(', ') : [q.micOrDI, q.stand].filter(Boolean).join(' · '))}"><span>${uiIcon('plus')}</span><span>${esc(q.label)}</span></button>`).join('');
    $('#quick-add').addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (b) quickAdd(QUICK[+b.dataset.q]);
    });

    body.addEventListener('input', (e) => {
      const el = e.target;
      const tr = el.closest('tr[data-id]');
      if (!tr || el.type !== 'text') return;
      const id = tr.dataset.id, f = el.dataset.f;
      mutate((s) => { const c = s.channels.find((x) => x.id === id); if (c) c[f] = el.value; }, { key: `ch:${id}:${f}`, render: ['chMeta', 'stageIfVisible'] });
    });

    body.addEventListener('change', (e) => {
      const el = e.target;
      const tr = el.closest('tr[data-id]');
      if (!tr) return;
      const id = tr.dataset.id;
      const c = getChannel(id);
      if (!c) return;
      if (el.dataset.f === 'phantom') {
        mutate((s) => (s.channels.find((x) => x.id === id).phantom = el.checked), { render: ['chMeta'] });
      } else if (el.dataset.f === 'pos') {
        const v = el.value;
        if (v === '__custom') { promptPosition(c); return; }
        if (v === '__text') return;
        mutate((s) => { const x = s.channels.find((y) => y.id === id); x.stageItemId = v || null; x.position = ''; });
      }
    });

    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.closest('tr').dataset.id;
      const act = b.dataset.act;
      if (act === 'up') moveChannel(id, -1);
      else if (act === 'down') moveChannel(id, 1);
      else if (act === 'dup') {
        const src = getChannel(id);
        const c = addChannel(Object.assign({}, src, { id: uid('ch') }), id);
        focusChannel(c.id, 'name');
      } else if (act === 'del') {
        const c = getChannel(id);
        mutate((s) => { s.channels = s.channels.filter((x) => x.id !== id); });
        toast(`Deleted input ${c.number}${c.name ? ' · ' + c.name : ''}`, { action: { label: 'Undo', fn: undo } });
      }
    });

    body.addEventListener('keydown', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const id = tr.dataset.id;
      const onGrip = e.target.classList.contains('grip');
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (onGrip || e.altKey)) {
        e.preventDefault();
        moveChannel(id, e.key === 'ArrowUp' ? -1 : 1);
      } else if (e.key === 'Enter' && e.target.type === 'text') {
        e.preventDefault();
        const f = e.target.dataset.f;
        const next = tr.nextElementSibling && tr.nextElementSibling.dataset.id ? tr.nextElementSibling : null;
        if (next) next.querySelector(`[data-f="${f}"]`).focus();
        else if (!ui.chFilter) { const c = addChannel(); focusChannel(c.id, f); }
      }
    });

    // Drag-to-reorder (rows become draggable only while the grip is held)
    body.addEventListener('pointerdown', (e) => {
      const grip = e.target.closest('.grip');
      if (grip) grip.closest('tr').draggable = true;
    });
    document.addEventListener('pointerup', () => { if (!dragRow) $$('#ch-body tr[draggable="true"]').forEach((r) => (r.draggable = false)); });
    body.addEventListener('dragstart', (e) => {
      const tr = e.target.closest && e.target.closest('tr[data-id]');
      if (!tr || !tr.draggable) return;
      dragRow = tr.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'input ' + dragRow);
      tr.classList.add('dragging');
    });
    body.addEventListener('dragover', (e) => {
      if (!dragRow) return;
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      e.preventDefault();
      const r = tr.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      $$('#ch-body .drag-over-top, #ch-body .drag-over-bottom').forEach((x) => x.classList.remove('drag-over-top', 'drag-over-bottom'));
      tr.classList.add(after ? 'drag-over-bottom' : 'drag-over-top');
      dropTarget = { id: tr.dataset.id, after };
    });
    body.addEventListener('drop', (e) => {
      if (!dragRow) return;
      e.preventDefault();
      const src = dragRow, tgt = dropTarget;
      cleanupDrag();
      if (tgt) moveChannelTo(src, tgt.id, tgt.after);
    });
    body.addEventListener('dragend', cleanupDrag);
    function cleanupDrag() {
      dragRow = null; dropTarget = null;
      $$('#ch-body tr').forEach((r) => { r.draggable = false; r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'); });
    }

    $('#btn-clear-channels').addEventListener('click', async () => {
      if (!state.channels.length) { toast('The input list is already empty.'); return; }
      const ok = await ask({ title: 'Clear all inputs?', message: `All ${state.channels.length} inputs will be removed. Stage items stay. You can undo this.`, buttons: [{ label: 'Cancel', value: '' }, { label: 'Clear Inputs', value: 'yes', variant: 'danger' }] });
      if (ok === 'yes') mutate((s) => { s.channels = []; });
    });
    $('#btn-export-csv').addEventListener('click', exportCSV);
    $('#btn-import-csv').addEventListener('click', () => $('#file-csv').click());
    $('#file-csv').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) importCSV(await readFile(file), file.name);
    });
  }

  // ============================================================= 8. Details
  const PROJECT_FIELDS = ['name', 'artist', 'venue', 'date', 'revision', 'stageWidth', 'stageDepth', 'notes', 'contactName', 'contactRole', 'contactPhone', 'contactEmail'];

  function sizeChipsMarkup(selectedId, w, d) {
    return SIZE_PRESETS.map((p) => {
      const k = 34 / Math.max(p.w, p.d);
      const on = selectedId ? selectedId === p.id : p.w === w && p.d === d;
      return `<button type="button" class="size-chip" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-size="${p.id}"><span class="mini" style="width:${Math.round(p.w * k)}px;height:${Math.round(p.d * k)}px"></span><span>${p.name}</span><small>${p.w} × ${p.d} m</small></button>`;
    }).join('');
  }

  function renderProject() {
    if (!state) return;
    const form = $('#form-project');
    const p = state.project;
    for (const f of PROJECT_FIELDS) {
      const el = form.elements[f];
      if (el && document.activeElement !== el) el.value = p[f] == null ? '' : p[f];
    }
    renderPresetChips();
  }
  function renderPresetChips() {
    const box = $('#stage-presets');
    const f = captureFocus(box);
    box.innerHTML = sizeChipsMarkup(null, state.project.stageWidth, state.project.stageDepth).replace(/data-size="([^"]+)"/g, 'data-size="$1" data-fk="size:$1"');
    if (!box.querySelector('[aria-checked="true"]')) box.querySelector('.size-chip').tabIndex = 0;
    restoreFocus(box, f);
  }

  function renderHeader() {
    if (!state) return;
    const p = state.project;
    $('#hdr-name').textContent = p.name || 'Untitled show';
    $('#hdr-sub').textContent = [p.artist, p.venue, fmtDate(p.date, true)].filter(Boolean).join(' · ');
    $('#btn-doc-title').setAttribute('aria-label', `${p.name || 'Untitled show'}. Edit show details`);
    $('#stage-size-label').textContent = `${fmtM(p.stageWidth)} × ${fmtM(p.stageDepth)} m`;
    document.title = `${p.name || 'Untitled show'} — StagePlan`;
  }

  // An untouched blank project holds no user data, so it is dropped when switching away.
  function isPristine(doc) {
    const p = doc.project;
    return !doc.stageItems.length && !doc.channels.length && p.name === 'Untitled show' && p.stageWidth === 8 && p.stageDepth === 6 &&
      !['artist', 'venue', 'date', 'revision', 'notes', 'contactName', 'contactRole', 'contactPhone', 'contactEmail'].some((k) => p[k]);
  }

  /** Make doc the open project. Pass openEditor to switch to the editor view. */
  function switchProject(doc, opts) {
    const o = opts || {};
    if (saveTimer) saveNow();
    if (state && state.id !== doc.id && isPristine(state)) removeDoc(state.id);
    state = doc;
    ui.selectedId = null;
    ui.inspPinned = false;
    resetHistory();
    saveNow();
    if (o.tab) prefs.tab = o.tab;
    showView('editor');
    renderAll();
    switchTab(prefs.tab);
    if (o.message) toast(o.message, { type: 'ok' });
  }

  async function deleteProject(id) {
    const entry = index.find((x) => x.id === id);
    const name = entry ? entry.name : state && state.id === id ? state.project.name : 'this project';
    const ok = await ask({ title: `Delete “${name}”?`, message: 'It will be removed from this browser. This can’t be undone. Save a project file first if you might need it.', buttons: [{ label: 'Cancel', value: '' }, { label: 'Delete', value: 'yes', variant: 'danger' }] });
    if (ok !== 'yes') return false;
    removeDoc(id);
    if (state && state.id === id) {
      clearTimeout(saveTimer); saveTimer = null;
      state = null;
      resetHistory();
      showView('home');
    } else renderHome();
    toast(`Deleted “${name}”`);
    return true;
  }

  function duplicateDoc(src, open) {
    const copy = normalizeDoc(JSON.parse(JSON.stringify(src)));
    copy.id = uid('p');
    copy.project.name = (src.project.name || 'Untitled show') + ' copy';
    copy.project.createdAt = copy.project.updatedAt = new Date().toISOString();
    if (open) { switchProject(copy, { message: 'Duplicated. You’re editing the copy.' }); return copy; }
    try { persist(copy); } catch (e) { toast('Couldn’t save the copy. Browser storage may be full.', { type: 'error' }); return null; }
    renderHome();
    toast(`Duplicated “${src.project.name}”`, { type: 'ok' });
    return copy;
  }

  function bindProject() {
    const form = $('#form-project');
    form.addEventListener('input', (e) => {
      const el = e.target;
      const f = el.name;
      if (!PROJECT_FIELDS.includes(f)) return;
      if (f === 'stageWidth' || f === 'stageDepth') {
        const v = parseFloat(el.value);
        const lim = f === 'stageWidth' ? [STAGE_LIMITS.wMin, STAGE_LIMITS.wMax] : [STAGE_LIMITS.dMin, STAGE_LIMITS.dMax];
        if (!Number.isFinite(v) || v < lim[0] || v > lim[1]) return;
        mutate((s) => (s.project[f] = round(v, 2)), { key: 'proj:' + f, render: ['header', 'stage', 'presetSel'] });
      } else {
        mutate((s) => (s.project[f] = el.value), { key: 'proj:' + f, render: ['header'] });
      }
    });
    form.addEventListener('change', (e) => {
      const f = e.target.name;
      if (f === 'stageWidth' || f === 'stageDepth') {
        const lim = f === 'stageWidth' ? [STAGE_LIMITS.wMin, STAGE_LIMITS.wMax] : [STAGE_LIMITS.dMin, STAGE_LIMITS.dMax];
        const v = clamp(num(e.target.value, state.project[f]), lim[0], lim[1]);
        if (v !== state.project[f]) mutate((s) => (s.project[f] = round(v, 2)), { render: 'all' });
        e.target.value = state.project[f];
      } else if (f === 'name' && !e.target.value.trim()) {
        mutate((s) => (s.project.name = 'Untitled show'), { render: ['header', 'project'] });
      }
    });
    const presets = $('#stage-presets');
    presets.addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]');
      if (!b) return;
      const p = SIZE_PRESETS.find((x) => x.id === b.dataset.size);
      mutate((s) => { s.project.stageWidth = p.w; s.project.stageDepth = p.d; });
      announce(`Stage size ${p.w} by ${p.d} metres`);
    });
    radioKeys(presets);

    $('#btn-export-json').addEventListener('click', () => exportJSON(state));
    $('#btn-dup-project').addEventListener('click', () => { saveNow(); duplicateDoc(state, true); });
    $('#btn-delete-project').addEventListener('click', () => deleteProject(state.id));
    $('#btn-reset-project').addEventListener('click', async () => {
      const ok = await ask({ title: 'Clear stage and inputs?', message: `Removes ${state.stageItems.length} stage items and ${state.channels.length} inputs. Show details stay. You can undo this.`, buttons: [{ label: 'Cancel', value: '' }, { label: 'Clear', value: 'yes', variant: 'danger' }] });
      if (ok === 'yes') { ui.selectedId = null; mutate((s) => { s.stageItems = []; s.channels = []; }); toast('Stage and inputs cleared', { action: { label: 'Undo', fn: undo } }); }
    });
  }

  /** Arrow-key navigation for a role="radiogroup" of buttons (roving tabindex; arrows also select). */
  function radioKeys(group) {
    group.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      const items = $$('[role="radio"]', group);
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + keys[e.key] + items.length) % items.length];
      next.focus();
      next.click();
    });
  }

  // ================================================ 9. Home & new project
  function renderHome() {
    loadIndex();
    const list = index.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const q = ui.homeFilter.trim().toLowerCase();
    const shown = q ? list.filter((e) => [e.name, e.artist, e.venue].some((v) => String(v || '').toLowerCase().includes(q))) : list;
    $('#home-hero').hidden = list.length > 0;
    $('#home-projects').hidden = list.length === 0;
    $('#home-no-results').hidden = !(q && !shown.length);
    const theme = currentTheme();
    let html = q ? '' : `<li class="pcard new"><div class="pcard-inner"><button type="button" class="pcard-open js-new-project"><span class="new-plus">${uiIcon('plus')}</span><span>New Project</span></button></div></li>`;
    for (const e of shown) {
      const doc = loadDoc(e.id);
      const sub = [e.artist, e.venue].filter(Boolean).join(' · ');
      const when = e.date ? fmtDate(e.date, true) : fmtAgo(e.updatedAt);
      const isOpen = state && state.id === e.id;
      const label = `Open ${e.name}${sub ? ', ' + sub : ''}. ${e.items || 0} stage items, ${e.channels || 0} inputs. ${when}.`;
      html += `<li class="pcard" data-pid="${esc(e.id)}">
        <div class="pcard-inner glass sheen">
          ${isOpen ? '<span class="pcard-current">Open</span>' : ''}
          <button type="button" class="pcard-open" data-open="${esc(e.id)}" aria-label="${esc(label)}">
            <div class="thumb">${doc ? thumbSvg(doc, theme) : ''}</div>
            <div class="pcard-meta">
              <strong>${esc(e.name || 'Untitled show')}</strong>
              <span class="sub">${esc(sub || 'No artist or venue yet')}</span>
              <span class="stats"><span>${esc(when)}</span><span>${e.items || 0} items</span><span>${e.channels || 0} inputs</span></span>
            </div>
          </button>
          <button type="button" class="btn glass icon-only small pcard-more sheen" data-more="${esc(e.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ${esc(e.name)}">${uiIcon('more')}</button>
        </div>
      </li>`;
    }
    $('#project-grid').innerHTML = html;
  }

  function openProjectById(id) {
    if (state && state.id === id) { showView('editor'); renderAll(); switchTab(prefs.tab); return; }
    const doc = loadDoc(id);
    if (!doc) { toast('That project couldn’t be read from storage.', { type: 'error' }); return; }
    switchProject(doc);
  }

  function bindHome() {
    $('#project-search').addEventListener('input', (e) => { ui.homeFilter = e.target.value; renderHome(); });
    $('#project-grid').addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]');
      if (open) { openProjectById(open.dataset.open); return; }
      const more = e.target.closest('[data-more]');
      if (more) { ui.cardMenuId = more.dataset.more; toggleMenu($('#menu-card'), more); }
    });
    $('#menu-card').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-card]');
      if (!b) return;
      const id = ui.cardMenuId;
      closeMenu($('#menu-card'), false);
      const act = b.dataset.card;
      if (act === 'open') openProjectById(id);
      else if (act === 'delete') deleteProject(id);
      else {
        const doc = state && state.id === id ? state : loadDoc(id);
        if (!doc) return;
        if (act === 'duplicate') duplicateDoc(doc, false);
        if (act === 'export') exportJSON(doc);
      }
    });
    $('#btn-demo').addEventListener('click', () => switchProject(demoDoc(), { tab: 'stage', message: 'Demo project added to your Projects.' }));
  }

  function openNewProject() {
    const dlg = $('#dlg-new');
    const form = $('#new-form');
    form.reset();
    ui.newTemplate = 'blank';
    ui.newSize = '8x6';
    renderNewSheet();
    dlg.returnValue = '';
    dlg.showModal();
    form.elements.name.focus();
  }
  function renderNewSheet() {
    const theme = currentTheme();
    $('#templates').innerHTML = TEMPLATES.map((t) => {
      const on = t.id === ui.newTemplate;
      const thumb = t.id === 'blank' ? `<div class="tpl-thumb tpl-blank">${uiIcon('doc')}</div>` : `<div class="tpl-thumb">${thumbSvg(templateDoc(t.id), theme)}</div>`;
      return `<button type="button" class="tpl" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-tpl="${t.id}">${thumb}<strong>${esc(t.name)}</strong><span class="d">${esc(t.desc)}</span></button>`;
    }).join('');
    $('#new-sizes').innerHTML = sizeChipsMarkup(ui.newSize);
  }
  function bindNewProject() {
    $('#templates').setAttribute('role', 'radiogroup');
    $('#templates').setAttribute('aria-label', 'Template');
    $('#templates').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tpl]');
      if (!b) return;
      ui.newTemplate = b.dataset.tpl;
      ui.newSize = TEMPLATES.find((t) => t.id === ui.newTemplate).size;
      renderNewSheet();
      $(`#templates [data-tpl="${ui.newTemplate}"]`).focus();
    });
    $('#new-sizes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]');
      if (!b) return;
      ui.newSize = b.dataset.size;
      $('#new-sizes').innerHTML = sizeChipsMarkup(ui.newSize);
      $(`#new-sizes [data-size="${ui.newSize}"]`).focus();
    });
    radioKeys($('#templates'));
    radioKeys($('#new-sizes'));
    enterSubmits($('#new-form'), '#btn-create');
    $('#dlg-new').addEventListener('close', () => {
      if ($('#dlg-new').returnValue !== 'create') return;
      const f = $('#new-form').elements;
      const doc = templateDoc(ui.newTemplate);
      const size = SIZE_PRESETS.find((p) => p.id === ui.newSize) || SIZE_PRESETS[2];
      Object.assign(doc.project, {
        name: f.name.value.trim() || 'Untitled show', artist: f.artist.value.trim(), venue: f.venue.value.trim(),
        date: f.date.value, stageWidth: size.w, stageDepth: size.d,
      });
      switchProject(doc, { tab: 'stage' });
      announce(`Created ${doc.project.name}`);
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('.js-new-project')) openNewProject();
      else if (e.target.closest('.js-open-json')) $('#file-json').click();
      else if (e.target.closest('.js-shortcuts')) openShortcuts();
    });
  }

  /** In a form with method=dialog, Return should press the primary button, not the first (Cancel). */
  function enterSubmits(form, primarySel) {
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const t = e.target;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
      e.preventDefault();
      $(primarySel).click();
    });
  }

  // =================================================== 10. CSV & JSON
  const CSV_COLS = [['number', 'Ch'], ['name', 'Input'], ['source', 'Instrument / Source'], ['micOrDI', 'Mic / DI'], ['stand', 'Stand'], ['phantom', '48V'], ['position', 'Stage Position'], ['monitor', 'Monitor'], ['notes', 'Notes']];
  const CSV_ALIASES = {
    number: ['ch', 'chan', 'channel', 'no', 'num', 'number', 'chno', 'channelno', 'channelnumber', 'inputno', 'inputnumber', 'chnum'],
    name: ['name', 'input', 'inputname', 'sourcename', 'inputsource', 'inputsourcename', 'label', 'channelname'],
    source: ['source', 'instrument', 'instrumentsource', 'instrumentdetails', 'details', 'instrumentsourcedetails', 'sourcedetails'],
    micOrDI: ['mic', 'micdi', 'microphone', 'micordi', 'dipickup', 'micdipickup', 'pickup', 'di', 'mics', 'micdibox'],
    stand: ['stand', 'standplacement', 'standplacementnotes', 'placement', 'stands', 'micstand'],
    phantom: ['48v', 'phantom', 'phantompower', 'p48', '48', 'pwr'],
    position: ['stageposition', 'position', 'musician', 'stagepositionmusician', 'pos', 'stage', 'player', 'positionmusician'],
    monitor: ['monitor', 'mon', 'monitormix', 'bus', 'monitorbus', 'mix', 'monitors', 'mixbus'],
    notes: ['notes', 'note', 'comments', 'comment', 'remarks'],
  };

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
    return /[",\r\n;]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCSV() {
    if (!state.channels.length) { toast('There are no inputs to export yet.'); return; }
    const rows = [CSV_COLS.map((c) => c[1])];
    for (const c of state.channels) {
      rows.push(CSV_COLS.map(([k]) => (k === 'phantom' ? (c.phantom ? 'Yes' : '') : k === 'position' ? channelPositionText(c) : c[k])));
    }
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    download(`${slug(state.project.artist || state.project.name)}-input-list.csv`, csv, 'text/csv;charset=utf-8');
    toast('Input list downloaded as CSV', { type: 'ok' });
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const count = (ch) => (first.match(new RegExp('\\' + ch, 'g')) || []).length;
    const delim = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0] || ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }

  async function importCSV(text, filename) {
    let rows;
    try { rows = parseCSV(text); } catch (e) { rows = []; }
    if (!rows.length) { toast('That CSV file has no rows.', { type: 'error' }); return; }
    const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const header = rows[0].map(norm);
    const colMap = {};
    header.forEach((h, i) => {
      for (const [k, al] of Object.entries(CSV_ALIASES)) if (al.includes(h) && colMap[k] == null) { colMap[k] = i; break; }
    });
    let data;
    if (Object.keys(colMap).length >= 2) data = rows.slice(1);
    else { CSV_COLS.forEach(([k], i) => (colMap[k] = i)); data = rows; } // no header: assume our column order
    const clean = (v) => String(v == null ? '' : v).replace(/^'(?=[=+@])/, '').trim();
    const truthy = (v) => /^(y|yes|true|1|on|x|✓|✔|48|48v|\+48|\+48v|phantom)$/i.test(clean(v));
    const labelMap = {};
    state.stageItems.forEach((i) => { const k = (i.label || '').trim().toLowerCase(); if (k && !labelMap[k]) labelMap[k] = i.id; });
    const parsed = data.map((r) => {
      const get = (k) => (colMap[k] != null ? clean(r[colMap[k]]) : '');
      const pos = get('position');
      const link = labelMap[pos.toLowerCase()] || null;
      return { n: parseFloat(get('number')), ch: makeChannel({ name: get('name').slice(0, 120), source: get('source').slice(0, 120), micOrDI: get('micOrDI').slice(0, 120), stand: get('stand').slice(0, 120), phantom: colMap.phantom != null && truthy(r[colMap.phantom]), stageItemId: link, position: link ? '' : pos.slice(0, 120), monitor: get('monitor').slice(0, 80), notes: get('notes').slice(0, 500) }) };
    }).filter((x) => [x.ch.name, x.ch.source, x.ch.micOrDI, x.ch.stand, x.ch.position, x.ch.stageItemId, x.ch.monitor, x.ch.notes].some(Boolean));
    if (!parsed.length) { toast('No usable inputs found in that CSV.', { type: 'error' }); return; }
    if (parsed.every((x) => Number.isFinite(x.n))) parsed.sort((a, b) => a.n - b.n);
    const chans = parsed.map((x) => x.ch);
    let mode = 'replace';
    if (state.channels.length) {
      mode = await ask({ title: `Import ${chans.length} inputs?`, message: `“${filename}” has ${chans.length} inputs. Your list has ${state.channels.length}.`, buttons: [{ label: 'Replace List', value: 'replace', variant: 'primary' }, { label: 'Add to End', value: 'append' }, { label: 'Cancel', value: '' }] });
      if (!mode) return;
    }
    mutate((s) => { s.channels = mode === 'append' ? s.channels.concat(chans) : chans; });
    const linked = chans.filter((c) => c.stageItemId).length;
    toast(`Imported ${chans.length} inputs${linked ? ` · ${linked} matched to the stage` : ''}`, { type: 'ok', action: { label: 'Undo', fn: undo } });
  }

  function exportJSON(doc) {
    if (doc === state) saveNow();
    const out = Object.assign({ format: 'stageplan', exportedAt: new Date().toISOString() }, doc);
    download(`${slug(doc.project.name)}.stageplan.json`, JSON.stringify(out, null, 2), 'application/json');
    toast('Project file downloaded', { type: 'ok' });
  }

  async function importJSON(text) {
    let doc;
    try { doc = normalizeDoc(JSON.parse(text)); } catch (e) {
      toast('Couldn’t open that file: ' + (e instanceof SyntaxError ? 'it isn’t valid JSON.' : e.message), { type: 'error', timeout: 6000 });
      return;
    }
    // Nothing is ever overwritten silently.
    if (index.some((x) => x.id === doc.id)) {
      const choice = await ask({ title: 'This project is already here', message: `“${doc.project.name}” is already saved in this browser.`, buttons: [{ label: 'Keep Both', value: 'copy', variant: 'primary' }, { label: 'Replace Saved Version', value: 'replace', variant: 'danger' }, { label: 'Cancel', value: '' }] });
      if (!choice) return;
      if (choice === 'copy') { doc.id = uid('p'); doc.project.name += ' (imported)'; }
    }
    switchProject(doc, { message: `Opened “${doc.project.name}”` });
  }

  // ========================================================= 11. Print / PDF
  let printPrepared = false;
  let titleBeforePrint = null;

  function printHead(docTitle, o) {
    const p = state.project;
    const title = p.artist || p.name || 'Untitled show';
    const sub = p.artist && p.name && p.name !== p.artist ? p.name : '';
    const meta = [];
    if (p.venue) meta.push(esc(p.venue));
    if (p.date) meta.push(esc(fmtDate(p.date)));
    if (p.revision) meta.push('Rev. ' + esc(p.revision));
    if (o.contact) {
      const c = [p.contactName, p.contactRole].filter(Boolean).join(' — ');
      if (c) meta.push(esc(c));
      const c2 = [p.contactPhone, p.contactEmail].filter(Boolean).join(' · ');
      if (c2) meta.push(esc(c2));
    }
    return `<header class="pp-head"><div><div class="pp-doc">${esc(docTitle)}</div><h1>${esc(title)}</h1>${sub ? `<div>${esc(sub)}</div>` : ''}</div><div class="pp-meta">${meta.map((m) => `<div>${m}</div>`).join('')}</div></header>`;
  }

  function printStagePage(o, paperCls) {
    const m = stageMarkup(state, { print: true, grid: true, dims: true, badges: o.badges });
    const p = state.project;
    const keyItems = state.stageItems.filter((i) => typeOf(i).shape !== 'none');
    const notes = o.notes && p.notes.trim();
    let html = `<section class="pp pp-stage ${paperCls}${!notes && !(o.key && keyItems.length) ? ' pp-stage-only' : ''}">`;
    html += printHead(`Stage plot · ${fmtM(p.stageWidth)} × ${fmtM(p.stageDepth)} m`, o);
    html += `<svg class="pp-stage-svg" viewBox="${m.viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stage plot">${m.body}</svg>`;
    if (notes) html += `<div class="pp-section"><h2>Production notes</h2><p class="pp-notes">${esc(p.notes.trim())}</p></div>`;
    if (o.key && keyItems.length) {
      html += '<div class="pp-section pp-key-section"><h2>Stage items</h2><table class="pp-key"><thead><tr><th>Item</th><th>Type</th><th>Inputs</th><th>Notes</th></tr></thead><tbody>';
      for (const it of keyItems) {
        const ch = channelsFor(it.id).map((c) => c.number);
        html += `<tr><td><strong>${esc(it.label || typeOf(it).name)}</strong></td><td>${esc(typeOf(it).name)}</td><td>${esc(ch.length ? ranges(ch) : '—')}</td><td>${esc(it.notes || '')}</td></tr>`;
      }
      html += '</tbody></table></div>';
    }
    return html + '</section>';
  }

  function printChannelPage(o, paperCls) {
    const p = state.project;
    let html = `<section class="pp pp-channels ${paperCls}">`;
    html += printHead(`Input list · ${state.channels.length} inputs`, o);
    if (!state.channels.length) {
      html += '<div class="pp-empty">No inputs in this project yet.</div>';
    } else {
      html += '<table class="pp-table"><thead><tr><th class="n">Ch</th><th>Input</th><th>Instrument / source</th><th>Mic / DI</th><th>Stand</th><th class="ph">48V</th><th>Stage position</th><th>Monitor</th><th>Notes</th></tr></thead><tbody>';
      for (const c of state.channels) {
        html += `<tr><td class="n">${c.number}</td><td class="name">${esc(c.name)}</td><td>${esc(c.source)}</td><td>${esc(c.micOrDI)}</td><td>${esc(c.stand)}</td><td class="ph">${c.phantom ? '48V' : ''}</td><td>${esc(channelPositionText(c))}</td><td>${esc(c.monitor)}</td><td>${esc(c.notes)}</td></tr>`;
      }
      html += '</tbody></table>';
      const ph = state.channels.filter((c) => c.phantom).map((c) => c.number);
      html += `<p class="pp-foot">${state.channels.length} inputs${ph.length ? ` · Phantom power on ch ${esc(ranges(ph))}` : ''} · Printed ${esc(new Date().toLocaleDateString())}</p>`;
    }
    if (o.mode === 'channels' && o.notes && p.notes.trim()) html += `<div class="pp-section"><h2>Production notes</h2><p class="pp-notes">${esc(p.notes.trim())}</p></div>`;
    return html + '</section>';
  }

  function buildPrint(o) {
    const paperCls = o.paper === 'letter' ? 'paper-letter' : 'paper-a4';
    let html = '';
    if (o.mode !== 'channels') html += printStagePage(o, paperCls);
    if (o.mode !== 'stage') html += printChannelPage(o, paperCls);
    $('#print-root').innerHTML = html;
    let st = $('#print-page-style');
    if (!st) { st = document.createElement('style'); st.id = 'print-page-style'; document.head.appendChild(st); }
    st.textContent = `@media print { @page { size: ${o.paper === 'letter' ? 'letter' : 'A4'} landscape; } }`;
    const p = state.project;
    const docName = { combined: 'Production pack', stage: 'Stage plot', channels: 'Input list' }[o.mode] || 'Production pack';
    if (titleBeforePrint == null) titleBeforePrint = document.title;
    document.title = `${p.artist || p.name || 'Show'} — ${docName}${p.date ? ' — ' + p.date : ''}`; // becomes the default PDF filename
  }

  function doPrint(o) {
    buildPrint(o);
    printPrepared = true;
    setTimeout(() => window.print(), 60);
  }

  function openPrintDialog() {
    if (!state) return;
    const dlg = $('#dlg-print');
    const form = $('#print-form');
    const o = prefs.print;
    form.elements.mode.value = o.mode;
    for (const k of ['notes', 'contact', 'key', 'badges']) form.elements[k].checked = !!o[k];
    form.elements.paper.value = o.paper === 'letter' ? 'letter' : 'A4';
    dlg.returnValue = '';
    dlg.showModal();
    $('#btn-do-print').focus();
  }

  function bindPrint() {
    const dlg = $('#dlg-print');
    enterSubmits($('#print-form'), '#btn-do-print');
    dlg.addEventListener('close', () => {
      if (dlg.returnValue !== 'print') return;
      const f = $('#print-form').elements;
      prefs.print = { mode: f.mode.value, notes: f.notes.checked, contact: f.contact.checked, key: f.key.checked, badges: f.badges.checked, paper: f.paper.value };
      savePrefs();
      doPrint(prefs.print);
    });
    // Ctrl+P / browser menu printing without the dialog: print the default pack.
    window.addEventListener('beforeprint', () => { if (!printPrepared && state) buildPrint(prefs.print); });
    window.addEventListener('afterprint', () => {
      printPrepared = false;
      if (titleBeforePrint != null) { document.title = titleBeforePrint; titleBeforePrint = null; }
      renderHeader();
    });
  }

  // ====================================== 12. Shell: views, theme, menus, etc.
  let announceTimer = null;
  function announce(msg) {
    const el = $('#sr-announce');
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 30);
  }
  /** Debounced announce for rapid repeats (keyboard nudges, rotation). */
  function announceSoon(msg) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => announce(msg), 450);
  }

  function ask({ title, message, buttons }) {
    return new Promise((resolve) => {
      const dlg = $('#dlg-confirm');
      $('#dlg-confirm-title').textContent = title;
      $('#dlg-confirm-msg').textContent = message;
      const actions = $('#dlg-confirm-actions');
      actions.classList.toggle('two', buttons.length === 2);
      // Apple alerts: with two buttons, Cancel sits on the left; with more, actions stack with Cancel last.
      const ordered = buttons.length === 2 ? buttons.slice().sort((a, b) => (a.value ? 1 : 0) - (b.value ? 1 : 0)) : buttons;
      actions.innerHTML = ordered.map((b) => `<button class="btn${b.variant ? ' ' + b.variant : ''}" value="${esc(b.value)}">${esc(b.label)}</button>`).join('');
      dlg.returnValue = '';
      const onClose = () => { dlg.removeEventListener('close', onClose); resolve(dlg.returnValue || ''); };
      dlg.addEventListener('close', onClose);
      dlg.showModal();
      // Focus the safe choice for destructive alerts, otherwise the primary action.
      const danger = buttons.some((b) => b.variant === 'danger');
      const target = danger ? actions.querySelector('button[value=""]') : actions.querySelector('.btn.primary');
      (target || actions.querySelector('.btn')).focus();
    });
  }

  function toast(msg, opts) {
    const o = opts || {};
    const el = document.createElement('div');
    el.className = 'toast' + (o.type ? ' ' + o.type : '');
    el.innerHTML = (o.type === 'error' ? uiIcon('alert') : o.type === 'ok' ? uiIcon('check') : uiIcon('info')) + `<span>${esc(msg)}</span>`;
    if (o.type === 'error') el.setAttribute('role', 'alert');
    if (o.action) {
      const b = document.createElement('button');
      b.className = 'btn small plain';
      b.textContent = o.action.label;
      b.addEventListener('click', () => { o.action.fn(); dismiss(); });
      el.appendChild(b);
    }
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    let timer = setTimeout(dismiss, o.timeout || (o.action ? 6000 : 3000));
    // Pause while hovered or focused, so there's time to hit Undo.
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 2000); });
    el.addEventListener('focusin', () => clearTimeout(timer));
    function dismiss() {
      clearTimeout(timer);
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 300);
    }
  }

  // Views -----------------------------------------------------------------
  function showView(v) {
    if (ui.view === v && !$('#view-' + v).hidden) { if (v === 'home') renderHome(); return; }
    const apply = () => {
      ui.view = v;
      prefs.view = v;
      savePrefs();
      $('#view-home').hidden = v !== 'home';
      $('#view-editor').hidden = v !== 'editor';
      if (v === 'home') {
        if (saveTimer) saveNow();
        document.title = 'StagePlan';
        renderHome();
        $('.skip-link').setAttribute('href', '#main-home');
      } else {
        $('.skip-link').setAttribute('href', '#main');
        requestAnimationFrame(() => { positionSeg(); applyZoom(); });
      }
    };
    if (document.startViewTransition && !reducedMotion.matches) {
      document.startViewTransition(apply);
    } else apply();
  }

  function switchTab(tab) {
    prefs.tab = tab;
    savePrefs();
    for (const t of ['stage', 'channels', 'project']) {
      const on = t === tab;
      const b = $('#tab-' + t);
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      $('#panel-' + t).hidden = !on;
    }
    positionSeg();
    if (tab === 'stage') { renderStage(); requestAnimationFrame(applyZoom); }
  }

  function positionSeg() {
    const seg = $('#seg');
    const sel = $('#seg [aria-selected="true"]');
    if (!sel || !seg.offsetWidth) return;
    seg.style.setProperty('--seg-x', sel.offsetLeft + 'px');
    seg.style.setProperty('--seg-w', sel.offsetWidth + 'px');
  }

  // Theme -----------------------------------------------------------------
  const darkMQ = mq('(prefers-color-scheme: dark)');
  function applyTheme() {
    const resolved = prefs.theme === 'system' ? (darkMQ.matches ? 'dark' : 'light') : prefs.theme;
    const changed = document.documentElement.getAttribute('data-theme') !== resolved;
    document.documentElement.setAttribute('data-theme', resolved);
    const icon = { system: 'autoTheme', light: 'sun', dark: 'moon' }[prefs.theme];
    const label = { system: 'Automatic', light: 'Light', dark: 'Dark' }[prefs.theme];
    $$('.theme-toggle').forEach((b) => {
      b.innerHTML = `<span>${uiIcon(icon)}</span>`;
      b.setAttribute('aria-label', `Appearance: ${label}. Change appearance`);
      b.title = `Appearance: ${label}`;
    });
    if (changed) {
      if (state) renderStage();
      if (ui.view === 'home') renderHome();
      if ($('#dlg-new').open) renderNewSheet();
    }
  }
  function cycleTheme() {
    prefs.theme = { system: 'light', light: 'dark', dark: 'system' }[prefs.theme];
    savePrefs();
    const swap = () => applyTheme();
    if (document.startViewTransition && !reducedMotion.matches) document.startViewTransition(swap); else swap();
    announce(`Appearance: ${{ system: 'automatic', light: 'light', dark: 'dark' }[prefs.theme]}`);
  }

  // Menus (popover API with a fallback) -------------------------------------
  let menuAnchor = null;
  const hasPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  function isMenuOpen(menu) { return hasPopover ? menu.matches(':popover-open') : menu.classList.contains('open'); }
  function toggleMenu(menu, anchor) {
    // A click on the anchor that just light-dismissed this menu should leave it closed, not reopen it.
    const justClosed = anchor === menuAnchor && Date.now() - (+menu.dataset.closedAt || 0) < 250;
    if (isMenuOpen(menu) || justClosed) { closeMenu(menu, false); return; }
    menuAnchor = anchor;
    if (hasPopover) menu.showPopover(); else menu.classList.add('open');
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const left = clamp(r.right - mw, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 8);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.transformOrigin = `${r.left + r.width / 2 - left}px ${top > r.top ? 0 : mh}px`;
    anchor.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }
  function closeMenu(menu, restoreFocus) {
    if (isMenuOpen(menu)) { if (hasPopover) menu.hidePopover(); else menu.classList.remove('open'); }
    if (menuAnchor) {
      menuAnchor.setAttribute('aria-expanded', 'false');
      if (restoreFocus !== false) menuAnchor.focus();
    }
  }
  function bindMenu(menu) {
    menu.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') {
        menu.dataset.closedAt = Date.now();
        if (menuAnchor) menuAnchor.setAttribute('aria-expanded', 'false');
      }
    });
    menu.addEventListener('keydown', (e) => {
      const items = $$('[role="menuitem"]', menu);
      const i = items.indexOf(document.activeElement);
      const go = (j) => { e.preventDefault(); items[(j + items.length) % items.length].focus(); };
      if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(items.length - 1);
      else if (e.key === 'Escape') { e.preventDefault(); closeMenu(menu, true); }
      else if (e.key === 'Tab') closeMenu(menu, false);
    });
    if (!hasPopover) {
      document.addEventListener('pointerdown', (e) => { if (isMenuOpen(menu) && !menu.contains(e.target) && e.target !== menuAnchor) closeMenu(menu, false); });
    }
  }

  function openShortcuts() {
    const d = $('#dlg-shortcuts');
    if (!d.open) d.showModal();
  }

  // Pointer-driven sheen and card tilt (fine pointers only, never with reduced motion)
  function bindPointerEffects() {
    let raf = 0, last = null;
    document.addEventListener('pointermove', (e) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const t = last.target;
        if (!t || !t.closest) return;
        const s = t.closest('.sheen');
        if (s) {
          const r = s.getBoundingClientRect();
          s.style.setProperty('--mx', last.clientX - r.left + 'px');
          s.style.setProperty('--my', last.clientY - r.top + 'px');
        }
        const card = t.closest('.pcard:not(.new)');
        if (card) {
          const r = card.getBoundingClientRect();
          const px = (last.clientX - r.left) / r.width - 0.5, py = (last.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
        }
      });
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const card = e.target.closest && e.target.closest('.pcard');
      if (card && !card.contains(e.relatedTarget)) { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); }
    });
  }

  function bindGlobal() {
    $$('.seg-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('#seg').addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const tabs = $$('.seg-btn');
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const n = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus();
      switchTab(n.dataset.tab);
    });
    $('#btn-home').addEventListener('click', () => { select(null); showView('home'); $('#main-home').focus({ preventScroll: true }); });
    $('#btn-doc-title').addEventListener('click', () => { switchTab('project'); $('#form-project [name="name"]').focus(); });
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#btn-print').addEventListener('click', openPrintDialog);
    $$('.theme-toggle').forEach((b) => b.addEventListener('click', cycleTheme));
    darkMQ.addEventListener('change', () => { if (prefs.theme === 'system') applyTheme(); });

    const exportMenu = $('#menu-export');
    bindMenu(exportMenu);
    bindMenu($('#menu-card'));
    $('#btn-export-menu').addEventListener('click', (e) => toggleMenu(exportMenu, e.currentTarget));
    exportMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-menu]');
      if (!b) return;
      closeMenu(exportMenu, false);
      const act = b.dataset.menu;
      if (act === 'print') openPrintDialog();
      else if (act === 'json') exportJSON(state);
      else if (act === 'csv-export') exportCSV();
      else if (act === 'csv-import') $('#file-csv').click();
      else if (act === 'duplicate') { saveNow(); duplicateDoc(state, true); }
      else if (act === 'shortcuts') openShortcuts();
    });

    $('#file-json').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) importJSON(await readFile(file));
    });

    // Light-dismiss for sheets: clicking the backdrop closes them (but never the alert).
    for (const d of $$('dialog.sheet')) {
      d.addEventListener('click', (e) => { if (e.target === d) d.close('cancel'); });
    }

    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const t = e.target;
      const editing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t.type !== 'checkbox' && t.type !== 'radio';
      const modalOpen = !!$('dialog[open]');
      const inEditor = ui.view === 'editor' && state;
      if (!mod) {
        if (editing || modalOpen || e.altKey) return;
        if (e.key === '?') { e.preventDefault(); openShortcuts(); }
        else if (inEditor && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); switchTab(['stage', 'channels', 'project'][+e.key - 1]); $('#tab-' + prefs.tab).focus(); }
        return;
      }
      const k = e.key.toLowerCase();
      if (!inEditor) return;
      if (k === 's') { e.preventDefault(); if (saveNow()) toast('Saved in this browser', { type: 'ok', timeout: 1800 }); }
      else if (k === 'p') { e.preventDefault(); if (!modalOpen) openPrintDialog(); }
      else if (prefs.tab === 'stage' && (k === '=' || k === '+')) { e.preventDefault(); zoomStep(1); }
      else if (prefs.tab === 'stage' && k === '-') { e.preventDefault(); zoomStep(-1); }
      else if (prefs.tab === 'stage' && k === '0') { e.preventDefault(); setZoom(1); }
      else if (editing || modalOpen) return; // leave native text undo alone
      else if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    });

    window.addEventListener('beforeunload', () => { if (saveTimer) saveNow(); });
    let rz = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { positionSeg(); if (state && ui.view === 'editor') applyZoom(); }); });
    if (window.ResizeObserver) new ResizeObserver(() => positionSeg()).observe($('#seg'));

    // Keep multiple tabs reasonably in sync.
    window.addEventListener('storage', (e) => {
      if (e.key === LS.index && ui.view === 'home') renderHome();
      if (state && e.key === LS.project(state.id) && e.newValue && e.newValue !== lastSavedJSON && !saveTimer) {
        try {
          state = normalizeDoc(JSON.parse(e.newValue));
          lastSavedJSON = e.newValue;
          resetHistory();
          renderAll();
          toast('Updated from another tab');
        } catch (err) { /* ignore */ }
      }
    });
  }

  let stageDirty = false;
  const RENDER = {
    header: renderHeader,
    stage: renderStage,
    stageIfVisible: () => { if (!$('#panel-stage').hidden) renderStage(); else stageDirty = true; },
    inspector: renderInspector,
    insList: renderItemList,
    channels: renderChannels,
    chMeta: () => renderChMeta(),
    project: renderProject,
    presetSel: renderPresetChips,
  };

  function renderAll() {
    if (!state) return;
    renderHeader();
    renderStage();
    renderInspector();
    syncInspectorVisibility();
    renderChannels();
    renderProject();
    updateUndoButtons();
  }

  function init() {
    $$('[data-icon]').forEach((el) => { el.innerHTML = uiIcon(el.dataset.icon); });
    // Suggestion lists for mic and stand cells
    const dl = (id, vals) => `<datalist id="${id}">${vals.map((v) => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
    document.body.insertAdjacentHTML('beforeend', dl('dl-mics', MIC_SUGGESTIONS) + dl('dl-stands', STAND_SUGGESTIONS));
    $('#canvas-empty').innerHTML = `<div class="empty-icon">${uiIcon('stage')}</div><h3>An empty stage</h3><p>Add performers, backline and monitors from the library. Drag them anywhere, they snap to a 25 cm grid.</p><div class="btn-row"><button type="button" class="btn primary small" id="btn-empty-add">${uiIcon('plus')}<span>Add Item</span></button></div>`;
    $('#btn-empty-add').addEventListener('click', () => {
      if (isPhone()) openLibrarySheet();
      else { const s = $('#lib-search'); s.focus(); }
    });
    // Glass buttons and chips get the pointer sheen.
    $$('.btn.glass, .btn.primary, .segmented, .hud, .float-panel').forEach((el) => el.classList.add('sheen'));

    loadPrefs();
    applyTheme();
    loadIndex();
    const cur = lsGet(LS.current);
    state = (cur && loadDoc(cur)) || null;

    try { localStorage.setItem('stageplan.test', '1'); localStorage.removeItem('stageplan.test'); } catch (e) { storageOK = false; }

    renderLibrary();
    renderToggles();
    bindStage();
    bindInspector();
    bindChannels();
    bindProject();
    bindHome();
    bindNewProject();
    bindPrint();
    bindGlobal();
    bindPointerEffects();
    $('#ch-warnings').checked = ui.showWarnings;
    $('#tab-stage').addEventListener('click', () => { if (stageDirty) { stageDirty = false; renderStage(); } });

    if (!storageOK) toast('Browser storage is unavailable, so changes won’t be kept. Save a project file to back up your work.', { type: 'error', timeout: 9000 });

    if (state && prefs.view === 'editor') {
      ui.view = 'editor';
      $('#view-home').hidden = true;
      $('#view-editor').hidden = false;
      renderAll();
      switchTab(prefs.tab);
      setStatus('saved');
      requestAnimationFrame(() => { positionSeg(); applyZoom(); });
    } else {
      ui.view = 'home';
      renderHome();
    }
  }

  // Exposed for automated smoke tests only.
  window.StagePlan = { get state() { return state; }, normalizeDoc, parseCSV, demoDoc, templateDoc, stageMarkup };

  init();
})();
