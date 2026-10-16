# UI design system - approved IPX fidelity

Owner requirement: **No compromise on UI quality or the approved IPX experience.**
Reference: `IPX/IPX-BCS/`, particularly `Assets/styles.css` and `Assets/app.js`.
Status: reference specification; no production React components exist yet.

## Visual authority

Preserve the dark sidebar, blue active navigation, white/light surfaces, card borders,
page-level tabs, header actions, page hierarchy, dense forms and grids, selected-row states,
checkbox lookups and light/dark appearance. Do not replace them with an unrelated template,
new imagery or a component library's default theme. The existing HTML is an interaction
reference, not permission to copy unsafe browser-only persistence into production.

## Extracted V1 CSS reference values

These values were inspected in the uploaded V1 archive. Confirm the owner's local reference
before implementation; its screenshots reflect the browser's rendering/zoom, not necessarily
one screenshot pixel per CSS pixel. Accessibility corrections require review rather than
silently reproducing a visual defect.

| Token / rule | V1 value |
|---|---|
| Background | `--bg: #f4f7fc` |
| Surface / secondary surface | `#fff` / `#f8faff` |
| Sidebar palette | `#091529`, `#10203b`; sidebar rule uses a dark gradient |
| Text / muted | `#13203a` / `#6f7e96` |
| Borders | `--line: #e5ebf3` |
| Accent / hover / soft | `#236bff` / `#0e51d2` / `#eaf1ff` |
| Success / amber / danger | `#0b9e74` / `#ae7400` / `#ce4766` |
| Main card radius | `16px` |
| Font stack | `Inter, ui-sans-serif, 'Segoe UI', Arial, sans-serif` |
| Base body / H1 / H2 | `13px` / `29px` / `17px` |
| Desktop sidebar / topbar | `240px` / `74px` |
| Desktop content padding | `29px 31px 38px` |
| Input height / radius | `39px` / `9px` |
| Table body font / cell padding | `11.5px` / `12px` |
| Compact table vertical padding | `7px` |

No font files were present in the inspected archive. A CSS font-stack name does not prove
that Inter rendered on the owner's computer. Verify actual font availability and licensing
before bundling any production font. Do not fetch fonts merely for this documentation step.

The V1 dark theme overrides background to `#081323`, surface to `#101f34`, secondary
surface to `#14243b`, text to `#e9f1ff`, muted to `#9aabc4` and borders to `#283951`.
Preserve theme-aware inputs, rows, menus, dialogs and statuses, not only the page background.

## Responsive reference and requirements

The source CSS has breakpoints at 1220, 1000, 760 and 480 CSS pixels. At narrower sizes it
reduces sidebar/content widths, stacks split panels, collapses navigation into a drawer,
reduces form/template columns and permits controlled grid/tab scrolling.

Production must preserve the visual intent at desktop, laptop, tablet and mobile widths.
No whole-application horizontal overflow. Keep horizontal scrolling within a grid region
when necessary. Lookup dialogs, menus, labels and actions must remain reachable with touch
and keyboard. Do not use tiny fonts as the only way to fit mobile data.

## Production acceptance requirements

Maintain clear loading, empty, error, validation, disabled, success and permission-denied
states. Use visible focus and associated labels. Screen readers need meaningful names,
selected states, sort state and validation feedback. Dialog focus must be trapped/restored;
Escape/outside-click behaviour must be consistent. Do not rely on colour alone for status.

Visually compare the React build with IPX at identical CSS viewport, zoom, data fixture,
scroll position, active tab and theme. Cover all five pages and every tab; include open
multi-select, selected grid rows, column menu, density modes, composer preview, queue,
mapping and rights matrix. Do not declare UI approval from one dashboard screenshot.

Dynamic dates, greeting text and demonstration numbers must be controlled in screenshot
tests. Record every deliberate visual deviation and get owner approval. Do not change the
approved reference to make a failing production comparison pass.

Detailed reusable behaviour lives in `REUSABLE-COMPONENTS.md`; verification evidence lives
in `TESTING-AND-ACCEPTANCE.md`. These documents supplement rather than replace the IPX.
