# DESIGN — GST Flow Prototype
**Audience: the coding agent. This is a BINDING spec, not inspiration. When in doubt, copy the approved HTML files pixel-for-pixel rather than inventing. If a screen has no approved HTML, compose it ONLY from the components in §3 using the recipes in §4.**

---

## 0. Source-of-truth files (in the repo's `/design-reference` folder — copy them there)

| File | Status | Governs |
|---|---|---|
| `returns-page-design-v2-final.html` | **APPROVED — copy exactly** | App shell (header/nav/footer), selector row, period card, category table, chips, buttons |
| `user-flow-complete.html` | **APPROVED** | Screen order, what's on each screen, navigation targets |
| `dashboard-design-v2.html` | Approved direction — re-skin onto the v3.1 shell (§4.1) | Dashboard content & to-do pattern |
| `gstr1-filing-design-v1.html` | Approved direction — re-skin onto the v3.1 shell | Numbered-step pattern, method boxes, upload file card |
| The user's built Profile pages | Live reference | Page title scale, tabs, bordered field grids, chip look |

Rule of precedence: `returns-page-design-v2-final.html` tokens/components > this doc's prose > older mockups.

**Audience reminder baked into every choice:** accountants fluent in Excel/Tally/SAP, often on 1366×768 Windows laptops, expecting government-portal conventions. Familiar > clever, always.

---

## 1. Design tokens (copy this block into `globals.css` verbatim)

```css
:root{
  /* colour */
  --navy-900:#12295B;   /* header, footer */
  --navy-700:#1D437F;   /* nav bar, SEARCH button */
  --blue-600:#1B56C5;   /* primary buttons, links */
  --blue-700:#15459E;   /* primary hover */
  --blue-50:#EEF3FC;    /* selected tint, info chips */
  --ink-900:#1A2233;    /* headings, values */
  --ink-600:#4A5568;    /* secondary text */
  --ink-400:#8A94A6;    /* meta, placeholders, empty rows */
  --line:#DDE3EC;       /* every border */
  --tint:#F4F7FB;       /* table headers, quiet fills */
  --green-700:#137A46;  --green-50:#E7F6EE;   /* filed / success */
  --amber-700:#9A5B00;  --amber-50:#FFF4DE;   /* due / confirm */
  --red-700:#B42318;    --red-50:#FDEEEC;     /* action needed / error */
  --red-dot:#E23B2E;    /* mandatory-field dot */
  --saffron-600:#D9660F; --saffron-700:#BB560A; --saffron-50:#FEF3E8; /* REFUND ONLY */
  /* type & layout */
  --font:'Inter',system-ui,Arial,sans-serif;
  --radius:8px;         /* cards */
  --radius-btn:6px;     /* buttons, chips, inputs */
  --maxw:1180px;
}
```

**Iron rules:**
1. **Saffron appears ONLY on refund surfaces** (dashboard refund row/box, Refunds nav highlight if active, R1–R7). Nothing else, ever.
2. Status colours (`green/amber/red`) appear **only inside chips and inline notes** — never as page decoration, section backgrounds, or big icons.
3. No gradients, no glassmorphism, no drop shadows heavier than `0 1px 2px rgba(16,24,40,.05)`, no border-radius above 10px, no emoji in UI copy (the ⬆/⬇/⌕ glyphs in the approved files are the only allowed symbols).
4. White page background. Grey (`--tint`) only for table headers and quiet inner fills.

## 2. Type & spacing

| Role | Spec |
|---|---|
| Page title (h1) | 38px / 700 / −0.01em (30px below 900px) |
| Card title (h2) | 19px / 700 |
| Section label in card | 14.5px / 600 |
| Body | 15px / 400, line-height 1.55 |
| Table cell | 14.5px; header 13px / 700 / `--ink-600` on `--tint` |
| Meta / chip-date line | 12.5–13px / `--ink-400` |
| Money & dates | always `font-variant-numeric: tabular-nums`; ₹ Indian grouping; dates DD-MM-YYYY |

Spacing: card padding 24–28px; between cards 26px; content `max-width: var(--maxw)` centered, 28px side padding (20px mobile). Minimum interactive target 40px (buttons 44–48px min-height).

## 3. Component library (build once in `/components/ui`, reuse everywhere)

**AppShell** — exactly as in the approved Returns file: navy header (emblem block, "Goods and Services Tax" 20/700 + sub-line 12.5 at 75% opacity, right: company 700 + GSTIN mono-ish 12.5, white Logout button) · navy nav (items 15/600 #E8EEF9, active = white + 3px white underline, IMS white badge with navy count, right visual-only search pill) · navy footer + `subfoot` prototype strip. Breadcrumb 14.5 with underlined links.

**Card** — white, `1px var(--line)`, `--radius`; header block inside: h2 + one grey sub-line (ONE sentence max).

**Chip** — `4px 12px`, `--radius-btn`, 13/600, tint bg + coloured text, **no border**: `ok` green · `due` amber · `todo` red · `na` tint/ink-400 · `auto` blue · `ref` saffron (refund only). **Every chip's text carries the words and, where known, the date** ("Filed 11-08-2026", "Due 20-08-2026"). Optional second line `chipdate` 12.5 grey below.

**Buttons** — heights ≥44px, 15/600–700: `primary` blue-600→blue-700 hover · `outline` white/blue border · `plain` white/ink-600/line border · `search` navy-700, UPPERCASE, letter-spacing .04em, radius 4px (portal look) · `saffron` (refund only). Disabled: `--tint` bg, `--ink-400` text, **always accompanied by the reason in words next to it** — never a mystery-disabled button.

**Selector row** — label 14.5/600 with `--red-dot` ● for mandatory; select 16px, `1px #B9C2D0`, radius 4px, min-height 48px, min-width 210px; SEARCH button aligned to field baseline. (Portal muscle memory — do not modernise this row.)

**DataTable** — `--tint` header row, 1px row borders, right-aligned numeric columns, first column pattern: bold name + small grey descriptor line (`.cat`/`.fname2`). Empty rows greyed at `--ink-400`, no action link. Totals in `tfoot` bold on `--tint`. Horizontal scroll below its min-width — never squash columns.

**StepCard** (filing & refund flows) — from `gstr1-filing-design-v1.html`: header row = 34px numbered circle (grey → blue `now` → green `done`; saffron variant in refunds) + title 17/700 + small sub + right status chip; body padded 20px. Steps stack vertically, all visible, top-to-bottom.

**NoteInline** — 1.5px bordered tinted strip (blue = info, amber = check this) with one bold lead phrase + one sentence. **This replaces banners — full-width status banners are banned** (explicit user feedback).

**Modal (consequence pattern)** — title = the consequence in plain words ("₹17,97,211 leaves your credit ledger today"), 1–2 sentence body, `Cancel` plain + one strongly-labelled confirm ("File refund claim"). Confirm never says "OK/Submit".

**Toast** — bottom, one line, echoes the button's verb ("Filed. ARN AA290726…").

**EmptyState** — one sentence + one button. Never a bare table.

**ProvenanceBadge** (refund statements, 3B cells) — 11.5px uppercase tag: `already held` (tint/grey) · `you confirmed` (blue-50/blue) · `computed` (green-50/green) · `simulated` (tint/grey italic).

**Timeline** (R7) — vertical: dot + form code (RFD-02…) + status words + date + deadline chip; ledger-effect line in green/red beneath the event; future stages greyed.

## 4. Screen recipes (composition only — content per PRD, data per TECHNICAL)

**4.1 Dashboard** — shell → h1 "Your work for {Month}" + one grey sub → **to-do list as one Card** with numbered rows (34px circles; refund row uses the saffron circle + `ref` chip + saffron button; only screen outside /refunds allowed saffron) → "Your money with the government" three-box grid (label / 26px value / ONE explainer sentence; third box saffron for Meridian only) → "Coming due dates" DataTable → no chart, no help panel (overload cut).

**4.2 Returns hub** — copy the approved file 1:1, wired to data.

**4.3 Upload** — StepCards: 1 Get the sheet (Download template primary-outline pair + `Use sample data` plain) · 2 Upload (drop-zone; after parse, the green file card: filename+time / counts line / View report) · errors as a DataTable (Row / Problem / How to fix) — plain words only.

**4.4 Review** — error rows first as amber-tinted table rows with inline fix controls; then category groups: group header (name + count + value), rows with the category `<select>` + helper text = `category_reason`; sticky bottom commit bar (summary sentence + primary button + reason-if-disabled).

**4.5 GSTR-1 workspace** — category DataTable (shared with hub) with expandable rows; Table 12 card (read-only tabs + the one-line caption); Table 13 card (detected series line + Confirm button + cancelled input); file row: `Preview return (PDF)` plain + big primary `File GSTR-1 with EVC/DSC` + reasons-in-words when disabled. IRN badge: green `chip auto` "e-invoice · IRN"; severed: red chip "IRN detached".

**4.6 IMS** — NoteInline (amber) as the do-nothing preview at top (not a banner — it sits inside the content column); DataTable with per-row 3-button segmented control (Accept/Reject/Pending — text, not icons); bulk bar above table; finalize primary at bottom with the summary modal ("7 accepted by you · 25 accepted by silence").

**4.7 GSTR-3B** — blocked state = one Card, one sentence, one link. Otherwise: sectioned Cards per table; every value row: label + amount + grey source line + ProvenanceBadge; locked cells get a small lock glyph + "locked from your GSTR-1". Payment Card: per-head mini-table + suggested set-off (editable inputs) + cash line bold + `Offset` then `File`.

**4.8 Ledgers** — profile-style tabs (underline) inside one page; per tab: 4 head balance boxes → monthly statement DataTable (Date / Description / Source link / +− per head / Balance) with month subheader rows (opening/closing); cash tab: collapsible minor-head rows (chevron + text, not icon-only); the stuck-fee row carries a blue NoteInline. `Download statement (Excel)` outline top-right.

**4.9 Refunds R1–R7** — StepCards with saffron numbered circles; progress rail of 5 labelled steps at top of R2–R6 (text labels, not dots). R4 evidence cards: one Card per HSN — evidence as label:value rows, verdict sentence bold, `Confirm eligibility` saffron + `Exclude from claim` plain. R5: derivation rows (label / value / "show working" disclosure); binding ceiling row gets blue-50 fill + one-line reason. R6: statements as DataTables with ProvenanceBadges per column header; declarations as real checkboxes with full sentences; consequence Modal before filing. R7: Timeline + clock chips; officer panel = detached grey-dashed Card labelled "Demo controls — not part of the product".

**4.10 Annual** — three read-only summary Cards with captions; the single editable Table 9 cell: on change → `--red-50` bg + `--red-700` text + persistent note.

## 5. Copy rules (words are part of the design)

1. Official names stay official — GSTR-1, GSTR-3B, IMS, RFD-01 — with ONE plain-language line beneath ("Your sales for the month"). Never rename a government form.
2. Buttons say what happens: "File GSTR-1 with EVC/DSC", "Upload invoices (Excel)", "Start refund claim". Banned: Submit, OK, Proceed, Done, Go.
3. Error pattern: what happened → the fix → where. "Row 12: the export invoice has no port code. Pick the port from the list on the review screen." Never a bare code.
4. Numbers in sentences are real and computed ("₹4,32,100 across 9 invoices"), never "some invoices".
5. One idea per sentence; ≤2 sentences per description; sentence case everywhere except the SEARCH button.
6. Explanations state consequences, not features: "If you do nothing, this becomes your claim" beats "Review pending invoices".
7. The honesty strip appears once per page (subfoot). Simulated actions additionally say so at the point of action ("filing is simulated").

## 6. Responsive & accessibility floor

- Design at 1180px; must be clean at **1366×768** (no horizontal scroll, no clipped buttons) and usable at 360px (nav wraps to two rows; selector fields go full-width; tables scroll horizontally inside their card; money boxes stack).
- Visible keyboard focus (2px `--blue-600` outline offset 2px) on every interactive element; labels tied to inputs; chips convey status in text so colour is never the only signal; contrast ≥ 4.5:1 (all token pairs above pass).
- `prefers-reduced-motion`: no transitions. Default motion allowance: 120ms ease on hover/focus only — nothing animates on load.

## 7. Anti-drift checklist (run on EVERY screen before calling it done)

- [ ] Shell identical to the approved Returns file (header, nav order, footer, subfoot).
- [ ] Zero full-width status banners; zero icon-only buttons; zero hover-only actions.
- [ ] Saffron nowhere outside refund surfaces.
- [ ] Every status = chip + words (+ date). Every disabled control has its reason beside it.
- [ ] Every derived number can show its source (grey line, badge, or "show working").
- [ ] Dates DD-MM-YYYY; money tabular ₹ Indian grouping.
- [ ] Empty state exists and says what to do.
- [ ] Reads correctly at 1366×768 and 360px.
- [ ] No colour, radius, shadow, or font outside §1–§2. If you're choosing a value not in this doc, stop — reuse a token or copy the approved HTML.
