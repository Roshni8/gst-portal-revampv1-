# GST Portal UI/UX Directives for Coding Agents

## Mandate

This document is the implementation brief for generating GST Portal components, layouts, and workflow screens. It is intentionally strict. Follow these directives unless a more specific project rule overrides them.

The portal serves three primary user groups:

- heavy spreadsheet operators
- regional Chartered Accountants (CAs)
- business owners with mixed digital literacy

The interface must therefore feel authoritative, explicit, and easy to scan under pressure.

## Core Design Position

Data must be clear, visible, and dense.

- Prefer exposed controls over hidden actions.
- Prefer predictable enterprise structure over consumer-app minimalism.
- Prefer strong labels, borders, and state cues over subtle or decorative treatment.
- Combine the operational density of tools such as Linear and ServiceNow with the calm, compliant tone of a government service.

If a design choice improves aesthetic minimalism but reduces clarity, discoverability, or keyboard efficiency, reject it.

## 1. Global Shell and Unified Workspace

Every authenticated page must live inside a consistent global shell that preserves orientation and maximizes vertical space for the working area.

### Mandatory shell structure

- The masthead must remain fixed at the top during scroll.
- A skip link pointing to `<main id="content">` must be the first DOM element and must become visible on `:focus`.
- Breadcrumbs must appear immediately below the masthead on the application background.
- The main content area must prioritize the primary task over decorative content.

### Masthead requirements

- Background must use `--gst-navy-950` / `#051547`.
- The left side must display the Government of India emblem and `Goods and Services Tax` identity.
- Level 1 navigation must be exposed horizontally on desktop.
- Required top-level items: `Dashboard`, `Services`, `GST Law`, `Search`, `Downloads`.
- Do not hide desktop navigation behind a hamburger menu.
- The right side must include persistent utilities for search, notifications, language selection, and user profile.

### Breadcrumb requirements

- Parent nodes must be clickable links using `text-link` styling with an underline.
- The current page must be plain text, not a link.
- Example pattern: `Home > Returns > GSTR-1`.

## 2. Token Architecture and Styling

Never use raw hexadecimal values or arbitrary one-off styling in product code. Map all visual treatment to approved tokens and semantic utilities.

### Backgrounds

- Application canvas: `bg-background` (`#F8FAFC`)
- Cards, panels, and forms: `bg-surface` (`#FFFFFF`)

### Typography

- Primary text: `text-text` (`#212121`)
- Helper or supporting text: `text-muted` (`#6B7280`)
- All text must be left-aligned by default.
- All financial figures and numeric quantities must be right-aligned.
- GSTINs, dates, reference numbers, and currency values must use tabular numerals for scanability.

### Borders and radius

- Inputs, dropdowns, textareas, cards, and grids must have a visible `1px` `border-border` border.
- Borderless inputs are prohibited.
- Underline-only material-style fields are prohibited.
- Use a tight radius scale only: `4px` or `8px`.
- Avoid pill shapes and overly rounded controls.

### Interaction states

- Primary buttons must use `bg-primary` with `text-on-primary`.
- Hover and pressed states must use `bg-primary-hover`.
- Every interactive element must show a visible focus ring: `2px solid #337AB7` with `2px` offset.
- `outline: none` is banned unless replaced with an equal or stronger accessible focus treatment.

## 3. High-Density Data Grids

This is the highest-priority interaction pattern in the portal.

Standard presentation tables with generous padding are not sufficient for GST workflows. Build dense, keyboard-usable, WAI-ARIA-compliant `role="grid"` experiences for users who think in rows, columns, and repeated entry patterns.

### Control ribbon

- Place a sticky control ribbon directly above the column headers.
- Keep the controls permanently visible.
- Required action: `Show/Hide Columns`
- Required action: `Export to Excel`
- Required action: `Clear Filters`
- Do not bury column controls inside a generic overflow or three-dot menu.

### Grid structure

- Target row height: `32px` to `40px`
- Draw borders around every cell using `border-border`.
- Apply zebra striping between `#FFFFFF` and `#F8FAFC`.
- Keep column headers visually stronger than body cells.
- Numeric cells must align right.
- Dense data views must maximize above-the-fold visibility.

### Keyboard behavior

These interactions are mandatory:

- Arrow keys move focus cell-by-cell in two dimensions.
- `Enter` toggles between read-only focus and cell edit mode.
- `Escape` exits edit mode and returns focus to the grid cell.
- Native `Ctrl+C` and `Ctrl+V` paste and copy patterns must be supported where editable tabular entry is expected.

## 4. Form Architecture and Data Entry

GST workflows must reduce cognitive load and prevent omission.

### Structure

- Long processes must be split into multi-step wizards.
- A persistent progress indicator must appear near the top.
- Example: `Step 2 of 5`.
- Primary workflows should favor a single-column structure.

### Labels and helper text

- Every input must have a visible bold `<label>` placed above the field.
- Labels must be programmatically linked using `for` and `id`.
- Placeholders are never a substitute for labels.
- Helper text must appear between the label and the input when needed.

### Selection controls

- For `2` to `5` choices, use exposed radio buttons.
- For long lists such as HSN codes or states, use an autocomplete combobox.
- Do not hide short decision sets inside dropdowns.

### Error handling

Follow GOV.UK-style error behavior:

- Invalid fields must receive an error border using `#B22222`.
- A bold red error message must appear adjacent to the relevant field.
- Do not rely on page-level summaries alone.
- Set `aria-invalid="true"` on invalid controls.
- Link the error text with `aria-describedby`.

## 5. Localization and Formatting Logic

The portal must be localization-ready from the start.

### Dates

- Display and accept dates in `DD-MM-YYYY` format only.
- Example: `15-08-2026`

### Currency and numbers

- Use the Indian numbering system for display formatting.
- Group digits as thousands, lakhs, and crores.
- Example: `10,00,000`
- Prefix INR amounts with `₹`.

### Width behavior

- Do not hardcode fixed widths for buttons, tabs, pills, or content containers where labels can grow.
- Hindi and regional languages must fit without truncating critical meaning.

## 6. Accessibility and Semantic Non-Negotiables

These rules apply to every generated interface.

- Use native HTML elements before ARIA workarounds.
- Maintain logical heading order.
- Keep DOM order aligned with visual order.
- Ensure all controls are operable by keyboard.
- Preserve visible focus throughout the product.
- Never use color alone to communicate status, validation, or required state.
- Ensure skip links, landmarks, labels, and error associations are present.

If a component looks correct but fails keyboard or screen-reader use, it is not complete.

## 7. Prohibited Patterns

Do not introduce the following:

- desktop hamburger navigation for primary sections
- borderless form fields
- vague unlabeled icons as primary actions
- hidden critical controls inside overflow menus
- placeholder-only labeling
- overly spacious tables that reduce visible data density
- centered numeric values in financial grids
- pill-shaped consumer-style controls that weaken institutional tone

## 8. Delivery Standard for Agents

When generating pages or components for this project:

- start from tokens, not ad hoc visual choices
- preserve the global shell and breadcrumb pattern
- default to dense, explicit enterprise interaction models
- build grid and form behavior for keyboard-heavy users
- verify accessibility and localization constraints before considering the work complete

This document should be treated as an implementation contract, not a loose style suggestion.
