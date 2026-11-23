# StagePlan — Stage Plot & Channel List Builder

A static web app for building **stage plots** and **channel / input lists** for live shows, and exporting them as print-ready PDFs. It's built for bands, sound engineers, small venues and production teams.

- No server, account, database or build step. It's plain HTML, CSS and JavaScript.
- Works offline once the page has loaded, and loads nothing from external CDNs, fonts or APIs.
- Your data stays in your browser. Nothing is uploaded.

---

## Features

**Stage plot**
- Top-down stage with a 0.5 m / 1 m grid, a centre line, dimension labels, and labels for upstage, downstage, stage right/left and the audience.
- An item library of 30 original vector icons: performers, vocal and boom mics, a drum kit drawn from above (kick, snare, toms, hats, cymbals, throne), drum riser, guitar and bass rigs, keys, piano, laptop/playback, DI boxes, wedges, IEM packs, sidefills, PA speakers, subs, power drops, music stands, risers, custom items and text labels.
- Add an item by clicking it in the library or dragging it onto the stage. Move items by mouse, touch or keyboard. Dragging snaps to a 25 cm grid; hold **Alt** to place freely.
- Each item has a label, type, position (in metres from stage right and from the front edge), width/depth, rotation, colour, notes and linked channels.
- Items may sit off the stage (PA, sidefills, FOH gear). They get a dashed amber outline in the editor so it's obvious.
- Undo/redo (up to 150 steps), duplicate, bring to front / send to back.

**Channel / input list**
- Inline table editing with these columns: Ch, input name, instrument/details, mic/DI, stand, 48V, stage position/musician, monitor/bus, notes.
- Channels renumber themselves automatically. Reorder by dragging the grip handle, with the ↑/↓ buttons, by focusing the grip and pressing ↑/↓, or with **Alt+↑/↓** from any cell.
- Add, duplicate and delete channels, with undo after a delete. **Enter** moves down a column, and pressing it on the last row adds a new channel.
- Quick-add buttons for common sources: a whole drum kit (8 ch), kick in/out, snare top/bottom, hi-hat, toms, OH L/R, bass DI/mic, guitar amp, acoustic DI, keys L/R, playback L/R, lead vocal, BV and talkback.
- Suggestions for mic/DI and stand types, such as SM58, Beta 91A, KM184, Radial J48 and short boom.
- Search/filter, plus warnings for duplicate names, missing names and missing mic/DI.
- CSV import (append or replace) and CSV export.

**Linking stage ↔ channels**
- Each channel can be linked to one stage item, using the *Stage position* column in the list or the *Linked channels* checkboxes in the stage inspector.
- Linked channel numbers appear as tags on the stage plot, for example `1–9` on the drum kit.
- The *Add linked channel* button creates a channel that is already linked to the selected item.
- Quick-add links channels automatically when exactly one matching item is on stage (e.g. drum channels go to the only drum kit).
- If you don't link a channel, you can give it a plain-text position (e.g. "FOH") instead.

**Projects and output**
- A **Projects** home screen shows every project in this browser as a card with a live stage thumbnail. You can search, open, duplicate, save to file or delete from there.
- A **New Project** sheet asks for the show details and stage size up front, and offers four starting points: *Blank*, *Five-piece band*, *Acoustic duo* and *Singer + tracks*.
- Autosave to localStorage, with a save-status indicator in the header.
- JSON backup and restore of the whole editable project.
- Print views for the **stage plot**, the **channel list**, or a **combined production pack**, all A4 or US Letter landscape.

---

## Using it

1. **New Project** (on the Projects screen): pick a starting point, enter the show name, artist, venue and date, choose a stage size, then press **Create** or Return.
2. **Stage:** click library items to add them, or drag them onto the stage. Select an item to edit it in the properties panel. On a laptop-sized window that panel slides in from the right. On a phone it's a bottom sheet, and the **+** button opens the library.
3. **Inputs:** use the *Quick add* chips or **Add Input**, then fill in the cells. The *Position* column links an input to a stage item.
4. **Details:** contact, production notes and stage size. You can also save the project file, duplicate, clear or delete the project here.
5. **Print** (toolbar): choose *Production pack*, *Stage plot* or *Input list*, set the options, then **Continue** to the browser's print dialog.

**Projects** (top left) goes back to all your projects. The share button (□↑) holds export, import, duplicate and keyboard shortcuts. To see a finished example, choose **Explore a demo** on the welcome screen. It's added as its own project and never replaces yours.

### Keyboard shortcuts

| Where | Keys | Action |
|---|---|---|
| Anywhere | Ctrl/⌘ Z · Ctrl/⌘ Shift Z (or Ctrl Y) | Undo / redo (outside text fields) |
| Anywhere | Ctrl/⌘ S | Save now (to the browser) |
| Anywhere | Ctrl/⌘ P | Open the print dialog |
| Editor | 1 · 2 · 3 | Stage / Inputs / Details |
| Anywhere | ? | Show all keyboard shortcuts |
| Stage | Ctrl/⌘ + · − · 0 (or pinch / Ctrl-scroll) | Zoom in / out / fit |
| Stage item focused | Arrow keys | Nudge 25 cm (5 cm with snap off). Hold Shift for 1 m |
| Stage item focused | R / Shift R | Rotate +15° / −15° |
| Stage item focused | Del / Backspace | Delete the item (undo available) |
| Stage item focused | Ctrl/⌘ D | Duplicate |
| Stage item focused | Enter | Edit the label |
| Stage item focused | Esc | Deselect |
| Channel list | Alt ↑ / Alt ↓ (or ↑/↓ on the grip) | Move the row |
| Channel list | Enter | Same column, next row. Adds a channel on the last row |

---

## Design and accessibility

The interface follows Apple's Human Interface Guidelines and uses the *Liquid Glass* look: translucent, blurred panels with a specular edge, over a softly lit background.

- **Materials:** panels, toolbars, menus and sheets use `backdrop-filter` blur and saturation, a gradient rim that catches the light, and a sheen that follows the pointer.
- **Motion:** buttons, chips and library tiles respond to hover and press with springy scale and lift. Project cards tilt in 3D toward the pointer. The tab control has a sliding thumb. Sheets, menus and toasts spring in, and switching views cross-fades with View Transitions where the browser supports them.
- **Light and dark appearance:** follows the system setting by default. The ◐ button cycles Automatic, Light and Dark, and the choice is applied before first paint so there's no flash of the wrong theme. The stage canvas and thumbnails re-render to match.
- **Responsive layout:** three floating panels on desktop; a slide-over properties panel on laptops and tablets; on phones, a floating tab bar, an add button that opens a library sheet, a bottom sheet for item properties, and input rows that become labelled cards.
- **Accessibility:**
  - Every control has an accessible name, and the automated tests check this on every screen.
  - Focus rings are visible.
  - Tabs, radio groups and menus follow the ARIA patterns, with arrow keys, Home/End and Escape returning focus.
  - Dialogs and sheets are native `<dialog>` elements, so focus is contained and restored.
  - Moves, rotation, zoom and reordering are announced through a live region.
  - Invalid inputs are flagged with `aria-invalid`.
  - Toasts pause while hovered or focused, so there's time to press Undo.
  - Touch targets are 40 px or larger on touch screens.
  - The app respects *Reduce Motion*, *Reduce Transparency* (glass becomes solid), *Increase Contrast* and Windows High Contrast (forced colours).
  - Destructive alerts put the focus on **Cancel**.

## Printing and saving PDFs

StagePlan does **not** create PDF files by itself. It builds clean print pages and opens your browser's print dialog, where you save the PDF:

1. Click **Print / PDF** and choose the document and options.
2. Click **Open print dialog**.
3. For the destination, choose **Save as PDF** (Chrome/Edge/Brave), **PDF → Save as PDF** (macOS Safari), or **Microsoft Print to PDF** (Windows).
4. For the cleanest result, turn off the browser's *Headers and footers* and turn on *Background graphics*.

Print pages are always plain black on white. They ignore the app's appearance setting and glass effects.

The print pages are white with black text and no editor controls. The stage plot keeps item positions, labels and channel tags, and you can add a key table of items. In the channel list, header rows repeat on each page and rows are never split across pages. Chromium-based browsers also print "Page X of Y" numbers. The suggested PDF filename comes from the artist, document type and date.

---

## Backups: JSON and CSV

- **Save JSON** downloads the whole project, including show details, stage items and channels, as `name.stageplan.json`. This is your full, editable backup. You can email it to another engineer, too.
- **Open JSON** imports a project file as a project in this browser. It never silently overwrites anything: if a project with the same ID already exists, you choose between *Import as a copy* and *Replace*.
- **Export CSV** downloads the channel list. The columns are `Ch, Input, Instrument / Source, Mic / DI, Stand, 48V, Stage Position, Monitor, Notes`. The file opens in Excel, Numbers or Google Sheets.
- **Import CSV** reads comma, semicolon or tab separated files. Headers are matched loosely, so "Channel", "Mic/DI", "Phantom" and "Musician" are all recognised. With no header row, the columns above are assumed. 48V is read from yes/true/x/48V. A *Stage Position* that matches an item label exactly links the channel to that item. Anything else is kept as text.

### Data model (JSON, version 1)

```json
{
  "format": "stageplan",
  "version": 1,
  "id": "p-…",
  "project": {
    "name": "Club show", "artist": "The Night Signals", "venue": "", "date": "2026-12-01",
    "revision": "v1", "stageWidth": 8, "stageDepth": 6, "notes": "",
    "contactName": "", "contactRole": "", "contactPhone": "", "contactEmail": ""
  },
  "stageItems": [
    { "id": "item-…", "type": "vocal-mic", "label": "Vox 1", "x": 0.5, "y": 0.72,
      "rotation": 0, "w": 0.45, "h": 0.45, "color": "", "notes": "" }
  ],
  "channels": [
    { "id": "ch-…", "number": 1, "name": "Lead Vox", "source": "Vocal", "micOrDI": "SM58",
      "stand": "Straight (round base)", "phantom": false, "stageItemId": "item-…",
      "position": "", "monitor": "Mix 1", "notes": "" }
  ]
}
```

- `x`/`y` are the item's centre, normalised from 0 to 1 across the stage width and depth. `y = 0` is upstage (the back) and `y = 1` is the front edge. Values outside 0–1 mean the item is off the stage. `w`/`h` are in metres.
- Each link between a channel and a stage item is stored once, as `channel.stageItemId`. An item's channels are worked out from that field, so the data can't contradict itself. Files that use the older `stageItems[].channels: [...]` arrays are still accepted and converted when imported.
- `number` is always the channel's position in the list (1, 2, 3, …).
- Every import is validated and cleaned: unknown item types become *Custom item*, numbers are clamped, and duplicate IDs are replaced.

---

## Running locally

There's nothing to install. Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari).

Some browsers keep separate storage for `file://` pages. If you'd rather use a local web server, run one of these:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

## Publishing with GitHub Pages

1. Create a GitHub repository and push these files to it, with `index.html` at the repository root:
   ```sh
   git init && git add . && git commit -m "StagePlan"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub, open the repository's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose **Branch: `main`**, folder **`/ (root)`**, and click **Save**.
   *If you'd rather keep the site in a `/docs` folder, move `index.html`, `styles.css`, `js/`, `assets/` and `.nojekyll` into `docs/` and choose `/docs` instead.*
5. After a minute or so the site is live at `https://<you>.github.io/<repo>/`.

All paths are relative, so the site works from a project sub-path. The included `.nojekyll` file tells GitHub Pages to serve the files as they are, without running Jekyll.

---

## Project structure

```text
/
├── index.html          App shell (semantic markup, dialogs, tab panels)
├── styles.css          All screen styles plus the @media print layouts
├── js/
│   ├── icons.js        Original SVG icon set + stage item type definitions
│   └── app.js          App logic: model, storage, stage editor, channel list, CSV/JSON, print
├── assets/
│   └── favicon.svg
├── .nojekyll
└── README.md
```

### Assets and icons

All icons are **original** line drawings on a 24×24 grid, in a style similar to [Lucide](https://lucide.dev) so they look consistent. They're defined inline in `js/icons.js` and not loaded as separate files. That keeps the app to a handful of requests, makes it work offline, and lets the same icons draw both the editor and the print view. There are no emoji, logos or third-party images. The drum kit, wedge and riser bodies are drawn in code (`itemMarkup` / `drumKitBody` in `app.js`) so they scale with the item's size.

### Libraries

**None.** The app uses only browser features:

| Need | Approach | Why not a library |
|---|---|---|
| Styling | Hand-written CSS with custom properties (glass materials, themes, spring easing) | Tailwind would need a build step or the Play CDN, which isn't meant for production |
| Icons | Inline original SVG | No dependency, works offline, easy to recolour for print |
| Row reordering | Native HTML drag-and-drop, plus buttons and keyboard | SortableJS isn't needed for one table, and buttons work on touch screens |
| PDF | Print stylesheet + `window.print()` → "Save as PDF" | More reliable text and vector output than jsPDF, and nothing extra to download |
| Fonts | System font stack | Nothing external to load or fail |

---

## Privacy

Projects are saved in your browser's **localStorage**, on this device and in this browser profile only. Nothing is sent anywhere, and there is no analytics. A project only leaves your computer if you export a JSON/CSV file or a PDF and share it yourself. Clearing your browser's site data deletes your saved projects, so keep JSON backups of anything important.

## Known limitations

- **PDFs come from the browser's print dialog.** There's no one-click PDF download. Page numbers ("Page X of Y") show in Chromium-based browsers. Firefox and Safari leave them out.
- **Dimensions are metric only.** Imperial units aren't supported yet; enter feet ÷ 3.28 if you need to.
- **Touch:** dragging items on the stage works on touch screens. Dragging channel rows needs a mouse, so on tablets and phones use the ↑/↓ buttons instead.
- **Phones:** the whole stage is fitted to the screen width, so items are small. Pinch-zoom is turned off on the canvas so items can be dragged. For precise placement, use the *Across* / *From front* fields in the properties panel.
- **One link per channel:** a channel links to one stage item. That covers the normal case of one input from one source.
- **Glass effects** need `backdrop-filter`, which current Chrome, Edge, Safari and Firefox all support. Older browsers show solid panels instead. View-transition animations are Chromium/Safari only, and other browsers switch views instantly.
- **Fonts:** Apple devices get SF Pro through the system font. Other platforms use their own system UI font (Segoe UI, Roboto and so on), and no web fonts are downloaded.
- **Shared browser storage:** if the same project is open in two tabs, the most recent save wins. The other tab picks up the change when it's idle.
- **Storage space:** localStorage typically holds about 5 MB per site, which is plenty for hundreds of projects. If it fills up, the header shows *Not saved* and you should export JSON.
