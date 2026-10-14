# Book & Notes Vault

A small, offline-first catalog for the books you are working through: title, author, pages, tag and date in one row,
regex search that highlights what it finds, reading statistics, and JSON import/export. No frameworks, no build step,
no server. Plain HTML, CSS and JavaScript (ES modules).

- **Live demo (GitHub Pages):** `https://gmukire-lang.github.io/Book-Notes-Vault-/`
- **Theme chosen:** Book & Notes Vault (catalog, pages, tags, search)
- **Stack:** vanilla HTML5 + CSS3 + Javascript, `localStorage`

---

## 1. Running it locally

The app uses ES modules, so it has to be served over `http://` instead of opened as a `file://` path.

```bash
# you may use node.js to initiate a local server
npx serve .
```

Then open `http://localhost:8000/index.html` for the dashboard, or any of the other pages: `vault.html`, `add-book.html`, `settings.html` and `about.html`. Open `tests.html` to run the checks.

## 2. Feature list

| Area          | What it does                                                                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation    | Each view is its own HTML page, connected with ordinary links.                                                                                                                                  |
| Dashboard     | Six stat cards (books, total pages, pages added today, top tag, average length, estimated reading time), a monthly page target with a progress meter, and a seven day bar chart built with CSS. |
| Vault         | Sortable table on tablet and desktop, cards on mobile. Sort by date, title, author, pages or tag, in either direction.                                                                          |
| Regex search  | Type any JavaScript pattern, toggle case sensitivity, filter by tag, and every match is wrapped in `&lt;mark&gt;`. Invalid patterns show the engine error instead of breaking the list.         |
| Add           | Live regex validation on every field, inline error messages, warning for repeated words, sample placeholders for tags.                                                                          |
| Edit / delete | Inline edit per row or card (Escape cancels), confirm before delete, `updatedAt` is stamped on every change.                                                                                    |
| Settings      | Words per page, reading speed, monthly page target, a pages↔minutes converter, JSON import/export, sample data loader, clear vault, light/dark theme.                                           |
| Persistence   | Every change is written to `localStorage` immediately. Data survives reloads and browser restarts.                                                                                              |
| Accessibility | Landmarks, heading order, labelled inputs, skip link, visible focus, `role="status"` and `role="alert"` live regions, full keyboard operation.                                                  |

## 3. Regex catalog

### 3.1 Validation rules (live in `scripts/validators.js`)

| Field                                                  | Pattern                                              | Accepts                                                   | Rejects                                        |
| ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Title                                                  | `/^\S(?:.*\S)?$/`                                    | `The Hobbit`                                              | `" The Hobbit"`, `"The Hobbit "`               |
| Title spacing                                          | `/\s{2,}/`                                           | `A Tale of Two Cities`                                    | `A Tale  of Two Cities`                        |
| Title, author repeated word (advanced, back-reference) | `/\b(\w+)\s+\1\b/i`                                  | `Notes on Film`                                           | `Notes on the the page` (warning, still saves) |
| Author                                                 | `/^[A-Za-z .'-]+$/` + the two spacing rules          | `J. R. R. Tolkien`, `Mina O'Connell`, `Ursula K. Le Guin` | `Author 2`, `Author  `                         |
| Pages                                                  | `/^(0\|[1-9]\d*)$/`                                  | `0`, `310`                                                | `310.5`, `0310`, `many`, `100000`              |
| Tag                                                    | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/`                    | `Sci-Fi`, `Film Studies`                                  | `Sci--Fi`, `Term 2`                            |
| Date added                                             | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | `2025-09-29`                                              | `2025-13-01`, `2025-09-32`, `29/09/2025`       |
| Date, calendar check                                   | `new Date(year, month - 1, day)` round trip          | `2024-02-29` (leap year)                                  | `2025-02-31`, `2025-02-29`                     |
| ISBN (optional)                                        | `/^(?:97[89](?:-?\d){10}\|\d(?:-?\d){8}[\dXx])$/`    | `9780132350884`, `978-0-13-235088-4`, `0306406152`        | `12345`                                        |

Two of these are the "advanced" patterns the brief asks for:

- **Back-reference** `/\b(\w+)\s+\1\b/i` finds a word that repeats immediately, such as a surname typed twice.
- **Lookarounds** in the search presets below (`(?!...)`, `(?=...)`).

### 3.2 Search patterns (the preset buttons in the Vault)

| Button             | Pattern                                   | What it finds                                                                | Example                                                             |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ISBN               | `97[89](?:-?\d){10}\|\d(?:-?\d){8}[\dXx]` | an ISBN-13 or ISBN-10 anywhere in a cell                                     | `978-0-261-10221-4`                                                 |
| Repeated word      | `(\w+)\s+\1`                              | duplicate words, back-reference                                              | `Notes on the the Cinematograph`, `Don Norman` (with _ignore case_) |
| 300+ pages         | `\b[3-9]\d{2}\b`                          | long books in the pages column                                               | `777`, `499`                                                        |
| No vowels          | `^(?!.*[aeiouAEIOU])[A-Za-z .'-]+$`       | consonant-only titles, negative lookahead                                    | `X Y Z`                                                             |
| Has year + capital | `^(?=.*\d{4})(?=.*[A-Z])`                 | a cell that has both a four digit run and a capital, two positive lookaheads | `2026-10-14`                                                        |
| Clear              | _(empty)_                                 | removes the filter                                                           |                                                                     |

Search runs **per field**, so a pattern can never match by accident across the boundary between the title and the
author. Empty fields are skipped, which is why the "No vowels" pattern does not match a blank ISBN.

Matches are highlighted with `<mark>` built from DOM nodes (`document.createElement` + `textContent`), never with
`innerHTML`, so a pattern such as `<script>` can only ever appear as literal text.

## 4. Keyboard map

| Key                                  | Action                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `Tab` / `Shift + Tab`                | Move between skip link, navigation, form fields, sort buttons, row actions and preset buttons. |
| `Enter` / `Space` on a nav link      | Open that page.                                                                                |
| `Enter` / `Space` on a column header | Sort by that column; `aria-sort` flips between `ascending` and `descending`.                   |
| `Enter` / `Space` on a row action    | Edit, Save or Delete the record in that row (or card).                                         |
| `Tab` inside an open editor          | Move through Title, Author, Pages, Tag, Date, ISBN, then Save and Cancel.                      |
| `Escape`                             | Cancel an open inline edit.                                                                    |
| `Enter` in the add form              | Validate every field; focus jumps to the first field with an error.                            |
| `Enter` / `Space` on a preset button | Fill the search box with that pattern and filter immediately.                                  |

Nothing needs a mouse. Focus never gets trapped, and the skip link (`Skip to main content`) appears on the first
`Tab`.

## 5. Accessibility notes

- **Landmarks:** one `header`, one `nav` (labelled _Primary_), one `main`, one `footer`; each view is a `section`
  with an `aria-labelledby` heading and a heading hierarchy of one `h1` per view plus `h2` subheadings.
- **Live regions:** `#polite-region` (`role="status"`) announces add, edit, delete, sort and import results.
  `#assertive-region` (`role="alert"`) announces validation failures, failed imports and going over the monthly target.
  The target message itself is a visible `role="status"` paragraph, so the number is both seen and heard.
- **Form labels:** every input has a `<label for="...">`; errors are wired with `aria-describedby`, invalid fields get
  `aria-invalid="true"` and a warning-coloured background, never colour alone.
- **Focus:** a 3px `:focus-visible` outline on interactive elements. `prefers-reduced-motion: reduce` disables the animations.
- **Contrast:** body text is `#221c14` on `#fbf7f0` (about 15:1), secondary text `#57493c` on the same background
  (about 7:1), accent text `#0f4c3d` on `#e2f1ec` (about 8:1). Dark mode uses the same structure with light ink.
- **Responsive table:** below 768px the table is removed with `display: none` (so it is not announced twice) and the
  card list is used instead; both lists are generated from the same data.

## 6. Data model

```json
{
  "id": "book_0001",
  "title": "The Hobbit",
  "author": "J. R. R. Tolkien",
  "pages": 310,
  "tag": "Fantasy",
  "dateAdded": "2025-09-02",
  "isbn": "978-0-261-10221-4",
  "createdAt": "2025-09-02T09:00:00.000Z",
  "updatedAt": "2025-09-02T09:00:00.000Z"
}
```

- `id` is generated as `book_0001`, `book_0002`, … from the highest existing number.
- `createdAt` never changes; `updatedAt` is rewritten on every edit.
- Storage keys: `vault:records` and `vault:settings`.
- Export downloads `{ app, version, exportedAt, records }`. Import accepts that payload **or** a bare JSON array,
  validates every entry, drops the invalid ones with a reason, and only then replaces the vault.
- `seed.json` holds 12 records with edge cases: a leap day (`2024-02-29`), a year boundary (`2025-12-31`), a zero page
  count, a 777 page book, unicode (`Gödel, Escher, Bach`, `Rhythms & Ruins`), an apostrophe (`Mina O'Connell`), a
  repeated word (`Notes on the the Cinematograph`), hyphenated ISBNs, and records with no ISBN at all.

## 7. Project structure

```
index.html          dashboard page
vault.html          book catalog, search and sorting
add-book.html       add-book form
settings.html       preferences and data tools
about.html          project and contact information
tests.html          assertion page for the validators, the search compiler and import validation
seed.json           12 sample records
styles/
  base.css          design tokens, typography, focus styles, dark theme
  layout.css        app shell, grids, the 480 / 768 / 1024 breakpoints
  components.css    buttons, table, cards, chart, meter, marks, animations
scripts/
  validators.js     every regex rule and the record shape check
  search.js         safe regex compiler, per-field matching, safe highlighting
  storage.js        localStorage load/save, import validation, JSON export
  state.js          in-memory records, settings and filters, change notification
  ui.js             all DOM rendering (stats, chart, table, cards, inline editor)
  app.js            routing, event wiring, form handling, actions
assets/
  favicon.svg
```

Modules only depend downwards: `app.js` → `state.js` → `ui.js` / `storage.js` → `search.js` → `validators.js`.
Nothing reaches into another module's internals.

## 8. How to run the tests

1. Start a local server (see section 1).
2. Open `http://localhost:8000/tests.html`.
3. The summary line at the top reads `64 passed, 0 failed, 64 checks total.`; each assertion is also printed to the
   browser console.

The page covers: every validation rule with its valid and invalid examples, the regex compiler (valid pattern,
broken pattern, blank input), per-field matching, the highlighter (including the "no markup injection" check),
record shape validation, and import validation (bare array, export payload, broken JSON, empty array, partially
invalid file).

## 9. Stretch features included

- Light and dark theme, persisted with the rest of the settings.
- Offline-friendly: after the first load the app makes no network calls except `seed.json`.
- Sample data loader, so the dashboard is never empty during a demo.
