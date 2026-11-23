/*
 * StagePlan icon + item-type library.
 * All icons are original line drawings on a 24×24 grid (stroke-based, round caps),
 * drawn in the same visual language as Lucide but not copied from it.
 * Exposed as window.StageIcons so app.js can use them without a build step.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- UI icons
  const UI = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    magnet: '<path d="M4 4h5v7a3 3 0 0 0 6 0V4h5v7a8 8 0 0 1-16 0z"/><path d="M4 8h5M15 8h5"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    rotateCw: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    filePlus: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9 14h6"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    stage: '<path d="M2 19h20"/><path d="M4 19V9h16v10"/><path d="M8 13h.01M12 13h.01M16 13h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    layersDown: '<path d="M12 11 3 16l9 5 9-5z"/><path d="m3 8 9-5 9 5"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M9 9l6 6M15 9l-6 6"/>',
    open: '<path d="M3 6h6l2 2h10v3"/><path d="M3 6v13h15l3-8H7l-4 8"/>',
  };

  // ------------------------------------------------------- stage item icons
  const ITEM_ICONS = {
    person: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
    vocalist: '<circle cx="10" cy="7" r="3.5"/><path d="M3 21v-1a7 7 0 0 1 11-5.7"/><rect x="16" y="11" width="4" height="7" rx="2"/><path d="M18 18v3"/>',
    mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>',
    boom: '<path d="M4 21h8M8 21V12M8 12l10-7"/><circle cx="19" cy="4.5" r="2"/>',
    guitar: '<path d="M14.5 9.5 20 4M18 2l4 4"/><path d="M11 9a3.5 3.5 0 0 0-5 .5 4 4 0 0 0-3 5.5 4.5 4.5 0 0 0 6 6 4 4 0 0 0 5.5-3 3.5 3.5 0 0 0 .5-5z"/><circle cx="9.5" cy="14.5" r="1.5"/>',
    bass: '<path d="M13 11 21 3M19.5 1.5l3 3"/><path d="M9.5 11a3 3 0 0 0-4.5.5 3.5 3.5 0 0 0-2.5 5 4 4 0 0 0 5 5 3.5 3.5 0 0 0 5-2.5 3 3 0 0 0 .5-4.5z"/><path d="M7 16.5l2 2"/>',
    amp: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18"/><circle cx="12" cy="14.5" r="3.5"/><path d="M6 7h.01M9 7h.01"/>',
    bassRig: '<rect x="6" y="2" width="12" height="20" rx="1.5"/><path d="M6 6h12"/><circle cx="12" cy="11" r="2.5"/><circle cx="12" cy="17.5" r="2.5"/>',
    drums: '<circle cx="12" cy="15" r="5"/><circle cx="12" cy="15" r="1.5"/><circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="7" r="2.5"/><path d="M1.5 12.5h4M18.5 12.5h4M2 3.5h4M18 3.5h4"/>',
    riser: '<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M2 10h20M6 18v3M18 18v3"/>',
    percussion: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/>',
    keys: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v7M10 6v7M14 6v7M18 6v7M2 13h20"/>',
    piano: '<path d="M4 21V4a2 2 0 0 1 2-2h4c3 0 4 2 4 5 0 3 2 4 4 5.5S20 16 20 18v3z"/><path d="M4 17h16"/>',
    di: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="16.5" cy="12" r="1.5"/><path d="M11 10h2M11 14h2"/>',
    wedge: '<path d="M2 8h20l-4 10H6z"/><path d="M8 13h8"/>',
    iem: '<rect x="7" y="6" width="10" height="15" rx="2"/><path d="M10 6V2M10 15h4"/><circle cx="12" cy="11" r="1.5"/>',
    speaker: '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="15" r="4"/><circle cx="12" cy="7" r="2"/>',
    sub: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    laptop: '<path d="M4 5h16v10H4zM2 19h20l-2-4H4z"/>',
    musicStand: '<path d="M4 3h16l-2 8H6zM12 11v10M8 21h8"/>',
    power: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    chair: '<circle cx="12" cy="10" r="6"/><path d="M12 16v5M8 21h8"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    techTable: '<rect x="3" y="7" width="18" height="4" rx="1"/><path d="M5 11v9M19 11v9"/>',
  };

  const CATEGORIES = [
    { id: 'people', name: 'Performers', color: '#e8a838' },
    { id: 'vocals', name: 'Mics & stands', color: '#4fb3e8' },
    { id: 'drums', name: 'Drums & percussion', color: '#e8704f' },
    { id: 'strings', name: 'Guitar & bass', color: '#8fd14f' },
    { id: 'keys', name: 'Keys & playback', color: '#b183e8' },
    { id: 'monitors', name: 'Monitoring & DI', color: '#46d6b0' },
    { id: 'pa', name: 'PA & power', color: '#a3acba' },
    { id: 'misc', name: 'Staging & custom', color: '#c9c9c9' },
  ];

  // w/h are default footprint in metres; shape is the body drawn on the plot.
  const ITEM_TYPES = [
    { id: 'vocalist', name: 'Vocalist', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'vocalist' },
    { id: 'guitarist', name: 'Guitarist', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'guitar' },
    { id: 'bassist', name: 'Bassist', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'bass' },
    { id: 'keyboardist', name: 'Keyboardist', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'keys' },
    { id: 'drummer', name: 'Drummer', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'drums' },
    { id: 'musician', name: 'Musician (other)', cat: 'people', w: 0.7, h: 0.7, shape: 'circle', icon: 'note' },

    { id: 'vocal-mic', name: 'Vocal mic (straight stand)', cat: 'vocals', w: 0.45, h: 0.45, shape: 'circle', icon: 'mic' },
    { id: 'boom-stand', name: 'Mic on boom stand', cat: 'vocals', w: 0.6, h: 0.45, shape: 'round', icon: 'boom' },
    { id: 'music-stand', name: 'Music stand', cat: 'vocals', w: 0.55, h: 0.35, shape: 'round', icon: 'musicStand' },

    { id: 'drum-kit', name: 'Drum kit', cat: 'drums', w: 2.0, h: 1.8, shape: 'round', icon: 'drums' },
    { id: 'drum-riser', name: 'Drum riser', cat: 'drums', w: 2.4, h: 2.0, shape: 'rect', icon: 'riser' },
    { id: 'percussion', name: 'Percussion', cat: 'drums', w: 1.0, h: 0.8, shape: 'round', icon: 'percussion' },
    { id: 'throne', name: 'Throne / chair', cat: 'drums', w: 0.5, h: 0.5, shape: 'circle', icon: 'chair' },

    { id: 'guitar-amp', name: 'Guitar amp / combo', cat: 'strings', w: 0.75, h: 0.4, shape: 'rect', icon: 'amp' },
    { id: 'bass-rig', name: 'Bass rig / amp', cat: 'strings', w: 0.8, h: 0.55, shape: 'rect', icon: 'bassRig' },
    { id: 'guitar-stand', name: 'Guitar stand', cat: 'strings', w: 0.45, h: 0.45, shape: 'round', icon: 'guitar' },

    { id: 'keyboard', name: 'Keyboard / synth', cat: 'keys', w: 1.4, h: 0.45, shape: 'rect', icon: 'keys' },
    { id: 'piano', name: 'Grand piano', cat: 'keys', w: 1.5, h: 1.9, shape: 'round', icon: 'piano' },
    { id: 'laptop', name: 'Laptop / playback rig', cat: 'keys', w: 0.8, h: 0.6, shape: 'rect', icon: 'laptop' },
    { id: 'tech-table', name: 'Table / tech desk', cat: 'keys', w: 1.2, h: 0.6, shape: 'rect', icon: 'techTable' },

    { id: 'wedge', name: 'Monitor wedge', cat: 'monitors', w: 0.7, h: 0.5, shape: 'wedge', icon: 'wedge' },
    { id: 'iem', name: 'IEM station / pack', cat: 'monitors', w: 0.45, h: 0.4, shape: 'round', icon: 'iem' },
    { id: 'di-box', name: 'DI box', cat: 'monitors', w: 0.4, h: 0.3, shape: 'rect', icon: 'di' },
    { id: 'sidefill', name: 'Sidefill / drum fill', cat: 'monitors', w: 0.7, h: 0.6, shape: 'rect', icon: 'speaker' },

    { id: 'pa-speaker', name: 'PA speaker', cat: 'pa', w: 0.8, h: 0.7, shape: 'rect', icon: 'speaker' },
    { id: 'subwoofer', name: 'Subwoofer', cat: 'pa', w: 1.0, h: 0.8, shape: 'rect', icon: 'sub' },
    { id: 'power', name: 'Power drop', cat: 'pa', w: 0.4, h: 0.4, shape: 'round', icon: 'power' },

    { id: 'riser', name: 'Riser / platform', cat: 'misc', w: 2.0, h: 1.0, shape: 'rect', icon: 'riser' },
    { id: 'generic', name: 'Custom item', cat: 'misc', w: 0.8, h: 0.6, shape: 'round', icon: 'box' },
    { id: 'label', name: 'Text label', cat: 'misc', w: 1.6, h: 0.4, shape: 'none', icon: 'text' },
  ];

  const TYPE_MAP = Object.fromEntries(ITEM_TYPES.map((t) => [t.id, t]));
  const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  /** Inline SVG string for a UI icon. */
  function uiIcon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (UI[name] || UI.info) + '</svg>';
  }

  /** Inline SVG string for an item-type icon (used in library + selects). */
  function itemIcon(typeId, cls) {
    const t = TYPE_MAP[typeId] || TYPE_MAP.generic;
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ITEM_ICONS[t.icon] + '</svg>';
  }

  window.StageIcons = { UI, ITEM_ICONS, CATEGORIES, CAT_MAP, ITEM_TYPES, TYPE_MAP, uiIcon, itemIcon };
})();
