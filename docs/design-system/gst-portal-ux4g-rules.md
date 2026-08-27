# GST Portal Design Rules

This is the universal design rulebook for every GST portal page. It is based on the **UX4G Design System 2.0 Web Kit (Community)** and applies to public, authenticated, transactional, and support experiences.

It defines how GST should use UX4G foundations, components, and service patterns. It does not define any one page or workflow.

## 1. Design Principles

- **Citizen task first:** each screen should make the next required action unmistakable.
- **One system, many services:** registration, returns, payments, notices, and help use the same interaction language.
- **Progress must be visible:** users should always know where they are, what has been saved, and what happens next.
- **Plain before clever:** use familiar controls, clear labels, and direct wording over novelty.
- **Inclusive by default:** accessibility, language, device constraints, and low digital confidence are baseline requirements.
- **Trust is designed:** show authoritative identity, status, acknowledgements, reference numbers, and deadlines consistently.

## 2. Brand And Theme Boundary

UX4G supplies the interaction and component foundation. GST supplies its own official identity.

- Use GST-approved logo, emblem, product name, and departmental contact information only.
- Configure GST brand colours through semantic tokens; do not recolour individual components ad hoc.
- Preserve the UX4G component anatomy, state treatment, contrast, spacing, and interaction behaviour when applying GST branding.
- Keep decoration restrained. Government services should feel calm, credible, and operational rather than promotional.
- Use photography or illustrations only when they improve comprehension or help a user choose a service; never let them compete with a task.

## 3. Foundation Tokens

All interfaces must consume named tokens rather than hard-coded values.

### Colour

- The eInvoice light-mode theme is defined centrally in `src/app/globals.css`. Components must use its semantic Tailwind utilities or CSS custom properties, never raw colour values.

| Role | Token / utility | Value | Use |
| --- | --- | --- | --- |
| Shell background | `--gst-navy-950` | `#051547` | Service shell, masthead, or dark identity band only. |
| Primary | `primary` / `bg-primary` | `#0B1E59` | Main action, active navigation, key service anchors. |
| Primary hover | `primary-hover` / `hover:bg-primary-hover` | `#051547` | Hover or pressed state for primary actions. |
| Secondary | `secondary` / `bg-secondary` | `#2C4E86` | Active tab background and secondary emphasis. |
| Link | `link` / `text-link` | `#337AB7` | Inline and navigational links. Always retain an underline. |
| Primary text | `on-primary` / `text-on-primary` | `#FFFFFF` | Text and icons on a primary or secondary blue surface. |
| Surface | `surface` / `bg-surface` | `#FFFFFF` | Cards, inputs, dialogs, and page content. |
| Page background | `background` / `bg-background` | `#F8FAFC` | Application canvas behind surfaces. |
| Text | `text` / `text-text` | `#212121` | Default body text and headings. |
| Muted text | `text-muted` / `text-text-muted` | `#6B7280` | Supporting copy and metadata only. |
| Border | `border` / `border-border` | `#D1D5DB` | Input, card, and divider borders. |
| Focus | `focus` | `#337AB7` | Visible keyboard focus ring. |
| Success | `success` / `text-success` | `#3C763D` | Confirmed or completed status, with a label/icon. |
| Warning | `warning` / `text-warning` | `#8A5A00` | Caution or pending action, with a label/icon. |
| Error | `error` / `text-error` | `#B22222` | Errors, rejected states, and validation messages. |

- Define semantic roles: `primary`, `secondary`, `surface`, `surface-subtle`, `border`, `text`, `text-muted`, `focus`, `success`, `warning`, and `error`.
- Use primary only for the main action, active navigation, and important service anchors.
- Use status colours only for status. Pair every colour cue with an icon, label, or explanatory text.
- Maintain WCAG 2.1 AA contrast at a minimum for text and interactive controls.
- Do not use colour alone to distinguish mandatory fields, selected states, validation, or deadlines.

### Typography

- Use the approved UX4G/GST type scale and a highly legible font with Indian-script support where content requires it.
- Establish a small hierarchy: display/page title, section title, body, label, helper, and metadata.
- Use sentence case for navigation, labels, buttons, and messages. Avoid all caps for running interface text.
- Prefer short line lengths and readable line-height; never reduce type below a usable size to fit dense information.
- Numerals, dates, monetary values, GSTINs, and reference IDs must be easy to scan and copy.

### Spacing, Shape, And Elevation

- Use the UX4G spacing scale consistently; build layouts from a base unit rather than arbitrary gaps.
- Use a limited radius scale and modest elevation. Borders should define structure; shadows should only separate layered surfaces.
- Preserve enough whitespace between sections, controls, and dense data to make scanning reliable.
- Use dividers sparingly, primarily in dense lists, summaries, and menus.

### Iconography And Motion

- Use a single approved icon set with clear, familiar metaphors and visible text labels where meaning could be ambiguous.
- Animate only to confirm an action, reveal a change, or show progress. Motion must be brief, optional, and never block completion.
- Respect reduced-motion preferences.

## 4. Global Shell And Navigation

Every page should use a consistent service shell.

- Provide a skip link as the first focusable element.
- Keep the Government/GST identity, utility controls, primary navigation, page content, and footer structurally consistent.
- Include language selection, accessibility settings, and help/support access in predictable locations.
- Use the shared eInvoice header and footer from the root layout. The header carries the India emblem and GST identity; the footer carries GSTN attribution and the India marker. Do not recreate them per page.
- Show the active top-level area and, where needed, a clear breadcrumb trail.
- Do not hide core actions solely inside hover menus; every navigation path must work with keyboard and touch.
- On small screens, collapse navigation deliberately while preserving access to account, help, language, and the current task.
- Authenticated areas must clearly distinguish account-level navigation from service/workflow navigation.

## 5. Page Composition

- Use a responsive content container and an explicit grid rather than full-width, unstructured content.
- Start each task page with a page title, concise purpose, and only the essential supporting information.
- Place the primary task in the dominant reading column. Place contextual help, alerts, due dates, and summaries in a secondary region.
- Group related controls in clearly titled sections; avoid one long, undifferentiated form.
- Keep one primary action per page region. Secondary actions must not visually compete.
- For high-risk actions, present a review/confirmation step and a clear completion acknowledgement.

## 6. Component Rules

Use approved UX4G components and their documented states before creating a custom control.

### Buttons And Links

- Use a primary button for the single main action, secondary or outline buttons for alternate actions, and text links for navigation or low-emphasis tasks.
- Button labels begin with an action: `Continue`, `Save draft`, `Submit return`, `Download acknowledgement`.
- Do not use vague labels such as `Click here`, `Proceed`, or `Submit` when the outcome can be more specific.
- Disabled buttons must explain what remains incomplete when the reason is not obvious.

### Forms

- Every field has a persistent visible label; placeholders are examples, never labels.
- All text inputs, dropdowns, and textareas must have a visible `border` token in their default state. Do not remove it to create a borderless field.
- Mark required fields consistently and explain the convention once near the form start.
- Put helper text, format examples, and validation messages next to the relevant field.
- Validate at the right time: format may be checked while entering; missing required data should be shown after the user leaves a field or attempts to continue.
- Preserve entered data after validation failure, session warning, or a recoverable service error.
- Use the appropriate input type for dates, currency, GSTINs, document uploads, passwords, and search.
- Do not split a simple field across multiple inputs unless the format materially benefits users, such as OTP entry.

### Selection Controls

- Use radios for one choice from a short fixed set, checkboxes for independent choices, and select/autocomplete for longer lists.
- Never use a dropdown when two to five choices can be seen and compared directly.
- Provide search, filtering, and clear empty states for long taxpayer, filing, and document lists.

### Alerts, Status, And Feedback

- Alerts must state what happened, why it matters, and what the user should do next.
- Use inline feedback for field-level issues and banners for service-wide, deadline, session, or submission issues.
- Status chips or badges should use an approved, limited vocabulary such as `Draft`, `Submitted`, `In progress`, `Action required`, `Approved`, and `Rejected`.
- After a successful transaction, show confirmation, reference ID, date/time, amount where relevant, and the next action.

### Data And Documents

- Tables must have clear headers, predictable alignment, sortable/filterable behaviour where appropriate, and a responsive alternative for narrow screens.
- Align numerical columns for comparison; format currency, dates, percentages, and IDs consistently.
- Show document name, type, size, upload/verification state, and available actions.
- Never expose sensitive values in full when masked display is appropriate.

## 7. Government Service Patterns

These patterns should be shared across the portal, not redesigned page by page.

- **Sign in and account recovery:** identify the account, protect credentials, show clear recovery paths, and explain session behaviour.
- **Multi-step application or return filing:** show numbered steps, current position, completion state, save-draft status, and a review before submission.
- **OTP and identity verification:** state destination and expiry, support resend with a clear timer, allow correction of the target, and show failure guidance.
- **Payment:** present a transparent fee summary before payment; after success or failure, show a transaction ID and recovery path.
- **Uploads:** state accepted file types, size limits, progress, retry, replacement, and verification state.
- **Service request tracking:** show a reference ID, meaningful status timeline, SLA/due date, owner or escalation path where applicable, and all user actions.
- **Search and results:** keep filters visible, return helpful zero-result guidance, and allow users to clear filters.
- **Save and resume:** make draft state explicit, record the last saved time, and warn users before unsaved work is lost.

## 8. Content, Language, And Inclusion

- Write in plain, direct language: lead with the action or outcome, then the supporting detail.
- Keep instructions short and place them at the moment they are needed.
- Use consistent terms across the portal; maintain a shared GST content glossary for domain language.
- Design for English and Indian-language expansion from the beginning. Do not hard-code widths that break when text grows.
- Present dates, time zones, currency, units, and legal references unambiguously.
- Avoid blame in errors. Explain the issue and the recovery path.

## 9. Accessibility And Resilience

- Meet WCAG 2.1 AA, GIGW requirements, keyboard access, visible focus, semantic landmarks, and screen-reader labelling.
- Provide labels for controls, programmatic relationships for help and error text, and meaningful alternative text for informative imagery.
- Ensure touch targets, zoom, reflow, and mobile screen readers work without loss of task completion.
- Do not rely on a mouse, hover, colour vision, sound, fast network, or a large display.
- Surface session expiry early, give users time to extend it, and preserve draft data whenever feasible.
- Include loading, empty, error, offline/retry, permission-denied, and maintenance states in every service flow.

### AI Validation Rules

Use the following rules as mandatory checks for design reviews, pull requests, and automated accessibility validation. A failure must be corrected or documented with an approved exception before release.

#### Rule_Set_01: Structural_Semantic_Integrity

- `semantic_element_priority`: Use native HTML5 elements first: `nav`, `main`, `header`, `footer`, `button`, and `a`. Use ARIA roles only when a native element is unavailable. A `div` must never be used as a button or link.
- `dom_sequence_sync`: DOM order must match visual order, especially for tables and ordered lists. CSS reordering must not change reading or keyboard traversal order.
- `metadata_integrity`: Every page must have a unique, descriptive document title and an `html[lang]` value using the applicable ISO 639-1 language code. `Untitled` and placeholder titles are prohibited.
- `heading_hierarchy`: Headings must form a logical, sequential `h1`-`h6` outline. Do not skip heading levels for visual styling.

#### Rule_Set_02: Keyboard_Interaction_Logic

- `keyboard_operability`: All links, buttons, inputs, and custom interactive controls must be fully operable with `Tab`, `Enter`, and `Space` as appropriate. No task may depend on a mouse or hover.
- `focus_visibility`: Every focusable control must show a visible, high-contrast focus indicator. `outline: none` is prohibited unless an equivalent or stronger custom focus state replaces it.
- `navigation_traversal`: Keyboard users must not encounter traps. Modals, dropdowns, dialogs, and menus must support `Escape` to close when closing is available, return focus sensibly, and preserve a predictable tab order.
- `bypass_mechanism`: Provide a skip link at the top of the DOM that becomes visible when focused and moves focus directly to the primary content.

#### Rule_Set_03: Visual_Constraint_Metrics

- `contrast_ratio`: Text must meet at least `4.5:1` contrast; large text may meet `3:1`. Large text means at least `18pt` regular or `14pt` bold.
- `color_independence`: Meaning must not depend on colour alone. Status, selection, validation, and required-field cues require text, an icon, underline, or another non-colour affordance.
- `reflow_performance`: At `200%` zoom, all content and functionality must remain available without two-dimensional scrolling at standard viewport widths, except where a data table genuinely requires horizontal scrolling.

#### Rule_Set_04: Media_Object_Schemas

- `image_alt_schema`: Informative images require concise descriptive `alt` text. Decorative images require an explicit empty `alt=""`; omitting `alt` is prohibited.
- `multimedia_accessibility`: Video requires synchronised closed captions. Audio-only content requires a complete text transcript.

#### Rule_Set_05: Form_Validation_Logic

- `explicit_labeling`: Every form control must use a visible `label` associated through matching `for` and `id` values. A placeholder cannot be the primary label.
- `error_handling`: Errors must appear adjacent to the relevant field and expose `aria-invalid="true"` plus `aria-describedby` pointing to the error/help text. Submission errors must be announced to screen readers through an appropriate live region or focus management.

#### Rule_Set_06: GIGW_3.0_Regional_Localization

- `multilingual_support`: The portal must support `en`, `hi`, and the approved first regional locale. Layout and component styles must support right-to-left directionality before Urdu is introduced.
- `data_formatting`: Use `DD-MM-YYYY` dates, the `₹` INR symbol, and Indian numbering conventions for telephone and monetary values where the service context requires them.
- `standard_navigation`: Provide breadcrumbs for hierarchical journeys, a sitemap page, and a global-search entry point in the shared portal shell.

### Validation Evidence

- Automated checks: semantic HTML, unique page title, language attribute, heading order, label association, image alternatives, contrast, and common ARIA misuse.
- Manual keyboard checks: skip link, tab order, focus visibility, dialog/menu closure, no traps, and completion of each critical journey without a mouse.
- Assisted-technology checks: screen-reader announcement of page changes, form errors, status changes, and transaction confirmations.
- Responsive checks: keyboard and screen-reader operation on mobile, plus 200% zoom and reflow verification.

## 10. Responsive Rules

- Start with the task hierarchy, not a desktop layout scaled down.
- Reflow multi-column content into a clear single-column reading order on small screens.
- Keep the current step, errors, primary action, and essential summary visible or easy to reach on a phone.
- Convert dense tables into cards, summaries, or horizontally scrollable regions only when their relationships remain understandable.
- Never remove critical information or support paths merely to fit a smaller screen.

## 11. Delivery And Governance

- Treat the UX4G kit as the component source of truth; use its components, tokens, and patterns before extending the library.
- Document each GST-specific extension with purpose, states, accessibility behaviour, content rules, and responsive behaviour.
- Review new pages against this rulebook before development and test key journeys with keyboard, screen reader, mobile, and low-bandwidth conditions.
- Keep design tokens and reusable components centralised so a change is made once and inherited everywhere.

## Sources

- UX4G Design System 2.0 Web Kit (Community): https://www.figma.com/community/file/1471833723727926454/ux4g-design-system-2-0-web-kit
- UX4G developer documentation: https://doc.ux4g.gov.in/
- UX4G design-system overview and service-pattern examples: https://www.ux4g.gov.in/

The public UX4G documentation now references version 3.0. This project follows the user-requested 2.0 Web Kit as the design reference while retaining the same system-level principles: reusable tokens and components, government-service workflows, WCAG 2.1 AA accessibility, and GIGW-aware implementation.
