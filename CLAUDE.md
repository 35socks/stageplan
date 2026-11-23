# Claude Code Project Brief — Stage Plot & Channel List Builder

## Project goal
Build a polished, easy-to-use **static website** for creating, editing, sharing, and exporting live-show stage plans (stage plots) and channel/input lists. It must work as a standalone site hosted on **GitHub Pages**, with no server, backend, account system, database, or build step required.

The site should be usable by bands, small venues, sound engineers, and live production teams. Prioritise clarity, speed, and practical stage-production workflows.

## Non-negotiable technical constraints
- Deliver as a static site using HTML, CSS, and vanilla JavaScript (or another approach that compiles to static files, but prefer vanilla).
- The site must work on GitHub Pages from a repository root or `/docs` folder.
- No backend, API keys, server-side processing, login, or paid service dependencies.
- All core functionality must work offline after the page has loaded.
- Keep the project maintainable and accessible. Use semantic HTML, keyboard support, visible focus, and responsive layouts.
- Do not require a package manager, build system, or command-line tooling for the end user.
- Persist project data locally in the browser (e.g. localStorage). Provide explicit JSON import/export so users can back up, transfer, and reopen projects.
- Avoid external assets and fonts where practical. If any external resource is used, provide a sensible local/fallback option and don't make the app dependent on it.

## Frontend toolkit and permitted libraries
Claude may use well-established frontend libraries and CDN resources to improve the design and usability. Do not artificially restrict the app to hand-written CSS if a suitable library helps. Keep the final site static and GitHub Pages compatible.

Preferred toolkit (use only where it adds value):
- **Tailwind CSS** for utility-first styling and responsive layout. Prefer a locally compiled, committed CSS file for production GitHub Pages. The Tailwind Play CDN is acceptable for quick prototypes, but it is officially intended for development and must not be the production dependency. If no build step is wanted, choose a stable prebuilt CSS approach or hand-written CSS rather than making the live site depend on the Play CDN.
- **Lucide** icons for interface and equipment-library icons. Use consistent, recognizable SVG icons; avoid emoji as UI iconography. Prefer bundled/local SVG assets or pin any CDN dependency to a specific version.
- **SortableJS** for drag-to-reorder channel rows and lists, if needed.
- **jsPDF** or another lightweight client-side PDF library only if it reliably produces the requested documents. Browser print with dedicated print styles is the fallback/preferred lightweight approach.
- **Google Fonts** only as an optional enhancement; include system-font fallbacks and avoid blocking functionality if fonts fail to load.
- Small, focused libraries may be added for canvas interactions, color selection, or file handling if they are compatible with static hosting and do not introduce unnecessary complexity.

Library rules:
- Keep all core app features working if external CDNs are unavailable; bundle/self-host dependencies where practical.
- Pin CDN versions; never use unversioned `latest` in production.
- Do not add React, a large framework, or a build pipeline unless there is a clear benefit and the app remains easy to deploy to GitHub Pages.
- Document any library used, why it was selected, and whether it is loaded locally or externally in README.
- Check licenses and avoid paid, account-gated, or API-key-required services.

## Main experience
Create a clean, professional, dark-themed production tool—not a generic admin dashboard. It should feel like a modern stage/lighting/audio utility: restrained charcoal backgrounds, high-contrast text, subtle accent colours, crisp grid lines, compact controls, and strong information hierarchy. The interface should be usable on laptops and tablets, and reasonably usable on phones.

The site should have two primary work areas that share the same project data:

1. **Stage Plot**
2. **Channel / Input List**

Also include a project setup area and export/print controls.

## Project setup and management
Allow the user to create/edit:
- Show / band / artist name
- Venue
- Date (optional)
- Stage dimensions or a simple stage-size preset
- Notes / production notes
- Optional contact / engineer details

Provide:
- New project
- Rename/edit project metadata
- Save automatically in the browser
- Export project as JSON
- Import project JSON
- Duplicate project (if practical)
- Clear/reset with confirmation
- A clear indication of unsaved state if auto-save is not immediate

## Stage plot editor
Build a visual stage canvas with a top-down stage view.

### Stage canvas
- Show the stage boundary and optional dimension labels.
- Make stage orientation clear (audience/front of stage should be labelled).
- Use a subtle grid or snap-to-grid.
- Responsive canvas that remains legible at different viewport sizes.
- Add, select, move, edit, and remove stage items.
- Drag items around using mouse/touch where supported; provide keyboard-accessible controls or position inputs as an alternative.
- Item placement should be constrained sensibly to the stage, or clearly indicate if an item is outside the boundary.
- Undo/redo is desirable if feasible.

### Stage items
Include a built-in item library with sensible icons or simple vector shapes for:
- Vocal microphones / mic stands
- Vocalists
- Guitarists / guitar rigs / amps
- Bass rigs / bass amps
- Drum kit (kick, snare, toms, cymbals, throne) or a simplified drum-kit object
- Keyboard / piano / synth
- DI boxes
- Monitor wedges / floor monitors
- IEM stations / packs
- Speaker / PA elements where appropriate
- Laptop / playback rig
- Music stands
- Generic equipment / custom labels

Each stage item should support:
- Name / label
- Type/icon
- Position
- Optional rotation
- Optional size
- Optional colour
- Optional notes
- Optional associated channel(s) from the input list

Use inline SVG, CSS icons, or original simple vector shapes for assets. **Do not rely on emoji as the primary stage-plot icons.** Stage items should be readable in both the editor and exports.

### Item assets
- Every item shown in the stage plot must have a clear visual asset (icon/vector/shape).
- Include a small, consistent icon library for the standard stage items.
- Provide a way to create a custom item with a text label and a generic icon.
- Keep assets in a clearly organised local folder (e.g. `assets/icons/`) if separate files are used; alternatively use inline SVG and document the asset approach.
- Use simple, original SVGs or CSS shapes; do not use copyrighted logos or scrape images.

## Channel / input list
Provide a structured editable channel list that can be used as a typical live sound input list.

Suggested columns:
- Channel number
- Input / source name
- Instrument / source details
- Microphone / DI / pickup
- Stand / placement notes
- Phantom power (48V) toggle or status
- Stage position / musician
- Monitor mix / bus (optional)
- Notes

Features:
- Add channel
- Delete channel
- Duplicate channel (optional)
- Reorder channels
- Renumber automatically and consistently
- Edit cells in a clear inline form or table editor
- Search/filter
- Import/export channel list as CSV
- Quick-add common sources (e.g. Kick, Snare, Hi-hat, Tom, Overhead L/R, Bass DI, Guitar mic, Keys L/R, Playback L/R, Lead vocal, Backing vocal)
- Optional warnings for duplicate channel names or missing source details
- Print-friendly formatting

## Shared stage plot ↔ channel list data
The two work areas should be connected:
- Channels can be associated with a stage item / musician / position.
- If a stage item is selected, show its linked channel(s).
- If a channel has a stage position or musician assigned, reflect that in the stage plot where possible.
- Make the relationship easy to understand, but don't force a channel to have a stage item.
- Avoid duplicated data where a field can be shared safely.

## Assets and downloads
The site must provide download/export options:
- **Stage plot PDF** (clean printable page with stage diagram, project details, and optional notes)
- **Channel/input list PDF** (professional table, readable, with sensible page breaks)
- **Combined production PDF** containing stage plot and channel list
- Project JSON download/import for full editable backup
- CSV download for channel list

PDF exports should be generated client-side (e.g. a browser print stylesheet and “Save as PDF” workflow, or a small local client-side PDF library if truly needed). Prefer a reliable, dependency-light print-to-PDF workflow: create dedicated print views, open browser print dialog, and instruct the user to save as PDF. Do not claim a PDF file was downloaded automatically unless that functionality is actually implemented.

Print/PDF output requirements:
- Clean white background and black/dark text, no editor controls, no unnecessary decoration.
- Stage plot and channel list must be legible at A4 landscape where appropriate.
- Stage plot should preserve item positions and labels.
- Channel list should have clear column headings and row spacing.
- Add project/show name, venue/date (when available), and page numbering if practical.
- Support a combined print view with stage plot first, channel list after.
- Avoid cutting off content or shrinking tables to unreadable sizes.

## Navigation and layout
- Primary navigation tabs or segmented sections for:
  - Stage Plot
  - Channel List
  - Project / Settings
- Keep the current project name visible.
- Include a concise toolbar for common actions: save/status, undo/redo if implemented, export/print, import/export project.
- The app should not bury core actions in complex menus.

## Quality and UX
- Use helpful empty states, tooltips or short instructions.
- Confirm destructive actions.
- Include realistic sample project data only as an optional demo that can be cleared; never silently overwrite a user's project.
- Make editing fast for live-production workflows. Minimise unnecessary clicks.
- Use clear terminology familiar to sound engineers.
- Ensure text contrast and controls are comfortable to use.
- Test with a small band, a larger stage setup, long labels, empty input lists, and mobile/tablet widths.

## Suggested data model
A project could use a structure similar to:

```json
{
  "version": 1,
  "project": {
    "name": "Example Show",
    "artist": "Example Band",
    "venue": "",
    "date": "",
    "stageWidth": 8,
    "stageDepth": 6,
    "notes": ""
  },
  "stageItems": [
    {
      "id": "item-1",
      "type": "vocal-mic",
      "label": "Lead Vocal",
      "x": 0.5,
      "y": 0.75,
      "rotation": 0,
      "channels": ["ch-1"],
      "notes": ""
    }
  ],
  "channels": [
    {
      "id": "ch-1",
      "number": 1,
      "name": "Lead Vocal",
      "source": "Vocal",
      "micOrDI": "SM58",
      "stand": "Boom stand",
      phantom": false,
      "position": "Downstage centre",
      monitor": "Mix 1",
      "notes": ""
    }
  ]
}
```

Use stable IDs and version the data format so future upgrades are possible. Stage coordinates should ideally be normalised (0–1) so items remain positioned correctly if the canvas changes size. Fix any syntax issues in the illustrative model before implementing it.

## Suggested project structure
Keep it simple and GitHub Pages-friendly:

```text
/
├── index.html
├── styles.css
├── app.js
├── README.md
└── assets/
    └── icons/
        └── (original SVG icons, if separate)
```

A single `index.html` with embedded CSS/JS is acceptable if that makes deployment easier, but keep code organised and readable.

## README / GitHub Pages
Include a README that explains:
- What the tool does
- How to use it
- Local browser usage
- How to publish with GitHub Pages (Settings → Pages → deploy from branch; select branch and root or `/docs`)
- Data privacy: project data stays in the browser unless the user exports/shares it
- How JSON and CSV backup/import work
- How to print or save PDFs

## Implementation order
Build in sensible stages and keep the site functional throughout:

1. Create the static site shell and responsive layout.
2. Implement project metadata and local autosave.
3. Implement stage canvas, item library, selection, positioning, and editing.
4. Implement channel list editing and CSV import/export.
5. Connect channels and stage items.
6. Implement print layouts and stage plot/channel list/combined PDF workflows.
7. Add JSON project backup/import.
8. Add polish, validation, sample project, accessibility, and test the GitHub Pages path.

## Definition of done
The project is complete when:
- A user can create a project and edit show details.
- A user can add, move, edit, and delete stage items.
- A user can build and reorder a channel list.
- Stage items and channels can be linked.
- Changes persist locally between visits.
- JSON backup/import works.
- CSV channel list export/import works.
- Stage plot, channel list, and combined layouts print cleanly to PDF.
- The site works when deployed to GitHub Pages without a backend.
- The interface is responsive, accessible, and contains no dead buttons or fake functionality.

## Claude's working instructions
- Start by inspecting the existing repository and preserve any useful code/assets.
- Before coding, briefly outline the implementation plan and identify any major technical trade-offs.
- Then implement the working app; don't stop at a mock-up or static screenshot.
- Use realistic stage-production terminology and data.
- If a feature is difficult, implement a working simpler alternative and clearly document the limitation instead of leaving a nonfunctional placeholder.
- Do not add features that require accounts, cloud storage, a server, or paid services.
- After implementation, test the app locally (at minimum, inspect for JavaScript errors, verify core editing flows, and check print CSS).
- Update the README with exact GitHub Pages deployment steps.
- Finish with a concise summary of what works, how to run it, and any limitations.
