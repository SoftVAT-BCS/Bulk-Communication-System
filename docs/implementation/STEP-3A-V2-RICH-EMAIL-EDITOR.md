# Step 3A-V2 — rich email designer

16 October 2026. **IMPLEMENTED / LOCALLY TESTED / OWNER VISUALLY APPROVED.**

V3 acceptance update: the owner approved the displayed synthetic Compose/Templates UI
on 2026-10-16. Typecheck, lint (11 infos, no errors/warnings), 33 tests in 5 files and
production build passed again during the local checkpoint review. This approval does
not certify 200% zoom, full accessibility, a supported full browser matrix, email-client
rendering, backend authorization or production readiness. The detailed V2 results and
stop-point wording below are retained as historical evidence. Current checkpoint and
proposed separate database review: [WORK-STATUS](../handover/WORK-STATUS.md).

## Baseline and scope

Canonical workspace `E:\Bulk-Communicatio-System`; main, HEAD
`2a78293ae7db68fbee62e4fbc0689949d0ba5782`, 41 tracked files, empty index, no remotes.
Start: one modified tracked WORK-STATUS and 41 untracked files from Step3A/V1,
including the Step1G helper. Existing untracked source was treated as owner work.

Read AGENTS, V2 prompt, PROJECT-MASTER, WORK-STATUS, UI/component/security/testing
standards, architecture/ADR, IPX baseline and prior implementation reports. Inspected
actual IPX communication.html, Assets/styles.css and Assets/app.js compose/template
workflows, and current React workspace/previews, controls, contracts and tests.
Local source was authoritative; no source archive was extracted over it. No separate
Gmail toolbar screenshot was available in Downloads; no inspection of it is claimed.

## Implementation

One exported `packages/ui/src/rich-email-editor.tsx` is imported by both
`apps/web/src/email-composer.tsx` and `apps/web/src/email-templates.tsx`.
Real Tiptap formatting includes bold/italic/underline/strike, seven fonts, nine sizes,
palette/validated hex color, paragraph/headings 1–3, lists, three alignments, safe links,
unlink, undo/redo, clear formatting, caret tokens and Ctrl+B/I/U. Accessible labels,
active states, focus, read-only/saving states and errors are included. Focus editor
expands into a large dialog; nested Escape leaves the parent designer open.

Templates has six preserved starter samples, Create, Customize, Edit, Save as copy,
Duplicate, Preview, Use in Compose and confirmed custom deletion. Large designer:
required name/category/subject/body, description, validation, live preview, discard
confirmation, focus trap/return and reachable action footer. Starters customize as copies.

Compose uses approximately 67/33 columns when space permits, stacking on small screens;
460px desktop/tablet and 320px mobile canvas, searchable template chooser, Save draft,
Save as Template and live formatted/plain-text/read-only HTML preview. Applying templates
does not change originals or recipient IDs. Unsaved draft state survives Communication
tabs; explicit saves survive reload. New message/replacement protect unsaved work;
dirty drafts register an unload guard. Preview uses the existing fictional recipients.
Send Test, Send Now, Schedule and Upload remain visibly disabled.

## Security, representation and storage

Backend-safe contracts live in `packages/contracts/src/index.ts`.
`EmailContent {version:1, html, plainText}` uses sanitized HTML as authority; plain text
is always recomputed. Editor JSON is internal. `email-html.ts` supplies the same policy
for paste, editor import/export, storage reads/saves and preview. DOMPurify sanitizes
before detached parsing and again after constrained style/link validation. Only semantic
HTML, reviewed fonts/sizes/colors and harmless inline formatting survive. Scripts,
handlers, SVG/MathML, forms, iframes and remote media/beacons are excluded. HTTPS and plain
mailto only; no HTTP/relative/data/javascript/credential-bearing/tokenized links.
Safe links use noopener/noreferrer. Preview receives sanitized HTML; source view is escaped.
Tokens split by inline formatting are replaced through text ranges, never attributes or
HTML interpolation. Unknown body tokens warn; recipient markup stays escaped.

Versioned local keys: `bcs-demo-templates-v1`, `bcs-demo-draft-v1`. Corrupt/unsupported
stores are not overwritten; saving is blocked with a warning. Denied/quota errors never
claim Saved. Limits include 100,000 HTML characters and 50 custom templates. This is
synthetic browser-local demo persistence only, not the future PostgreSQL master.
Future schema changes need explicit validated migrations and safe failure; server
storage needs separate authorization, tenant enforcement and server-side validation.
Browser preview does not guarantee Gmail/Outlook rendering; future conversion/inlining
and cross-client email tests remain necessary. System font availability varies.

## Dependency gate

Retained Next 16.4.2, React/React DOM 19.3.1, TypeScript 5.9.3, Biome 2.5.15,
Node 24.16.0 and npm 11.13.0. Exact additions in packages/ui:

| Package | Version | License |
|---|---|---|
| @tiptap/react | 3.32.0 | MIT |
| @tiptap/core | 3.32.0 | MIT |
| @tiptap/pm | 3.32.0 | MIT |
| @tiptap/starter-kit | 3.32.0 | MIT |
| @tiptap/extension-text-style | 3.32.0 | MIT |
| @tiptap/extension-text-align | 3.32.0 | MIT |
| dompurify | 3.4.17 | MPL-2.0 OR Apache-2.0; Apache option available |

Current registry metadata and official releases/advisories reviewed before installation.
React 19 accepted by Tiptap peers; core/PM aligned at 3.32.0. No conflicting Windows
OS/CPU/engine restriction. Browser/JS packages, no paid/cloud/CDN/key requirement.
StarterKit includes Link/Underline. TextStyleKit supplies family/size/color.
Client component uses immediatelyRender:false per Next integration guidance.

Sources:
- [Next integration](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [TextStyleKit](https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit)
- [FontSize](https://tiptap.dev/docs/editor/extensions/functionality/fontsize)
- [Tiptap release](https://github.com/ueberdosis/tiptap/releases/tag/v3.32.0)
- [Tiptap advisory](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh): fixed 3.30.4, selected 3.32.0.
- [DOMPurify release](https://github.com/cure53/DOMPurify/releases/tag/3.4.17)
- [DOMPurify advisory 1](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f), [2](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr), [3](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7): selected patched 3.4.17.
- [OWASP sanitization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)

Exact pins, official registry, local cache, strict peers/engines and --ignore-scripts;
lock-only review followed by installation (51 packages added). No force/legacy-peer-deps
or global configuration changes. Full resolved audit and production audit: zero known
vulnerabilities. This is current evidence, not a guarantee against latent vulnerabilities.

## Actual verification

| Command | Final result |
|---|---|
| npm.cmd run typecheck | PASS |
| npm.cmd run lint | PASS; zero errors/warnings, 11 prior informational suggestions |
| npm.cmd test | PASS: 33 tests, 5 files; all 14 prior checks retained unchanged |
| npm.cmd run build | PASS; five application routes prerendered |
| npm.cmd audit --omit=dev | PASS: zero vulnerabilities; official registry/local cache flags |
| npm.cmd ls --all --json | PASS: no invalid/missing peer graph |

Tests cover real formatting/commands, headings/lists/alignment, caret insertion,
Ctrl+B/I/U, undo/redo, clear formatting, safe links, read-only/expanded focus,
create/save/reload/edit/duplicate/preview/use/delete, independent drafts/New message,
validation, nested Escape, XSS/malformed HTML, split tokens/escaping, corrupt/denied/quota
storage and absence of fetch/XHR during workflows. jsdom geometry shims do not prove
layout; browser checks below are separate. Save-state notice clearing and nested Escape
bugs were fixed and tests rerun. Test history/serialization assumptions were corrected.

React URL: http://127.0.0.1:3000/communication; select Compose & Send or Templates.
Read-only original IPX: http://127.0.0.1:3001/communication.html.
Same in-app browser, four viewports and both themes: 40 measurements across React
Compose/Templates/designer and IPX Compose/Templates.

| Viewport | React scrollWidth/clientWidth | Canvas minimum | Designer footer bottom |
|---|---|---|---|
| 1440x900 | 1425/1425 | 460px | 863.2px |
| 1280x800 | 1265/1265 | 460px | 767.2px |
| 768x1024 | 753/753 | 460px | 982.24px |
| 390x844 | 375/375 | 320px | 843.2px |

No React document overflow in either theme; designer widths 1360/1216/729.6/375.2px.
Footer remains inside viewport. Native toolbar selectors, wrapping/scroll, expanded
desktop/mobile editor, Tab/Shift+Tab trap, Escape and focus return exercised. Original
IPX has tablet/mobile overflow (759/753 and 506/375), left unchanged. Rich canvas/cards
are approved V2 upgrades beyond IPX's textarea; sidebar/header/tabs/colors remain V1.
This is source/visual comparison, not a pixel-perfect automated image diff.

Browser walkthrough actually performed: create V2 browser demonstration; bold Georgia
24px blue; save/reload/edit/duplicate/preview/use; independent draft save/reload;
searchable Choose template, Save as Template, Save as copy and confirmed duplicate
deletion. Synthetic test examples remain browser-local. Actual malicious HTML paste
became `<p>Safe <strong>paste</strong>blocked link</p>`. Selection retained nine eligible
synthetic IDs across actions. All five routes rendered, Configuration remained its
demo-only UI; no browser console error returned.

Ignored evidence: `.local/v2-evidence/viewport-measurements.json`, screenshots for each
size/theme, `designer-desktop.png`, `compose-final.png`, `preservation.json` and
`dependency-tree.json`. Screenshots show actual pages, not mockups.
**200% browser zoom UNVERIFIED**: available tooling does not expose zoom and the earlier
keyboard attempt could not apply it. Resizing is not zoom. Full screen-reader/IME and
cross-platform accessibility are not certified. Owner visual approval remains mandatory.

## Exact V2 changes

Eight existing files modified relative to activity start:
- `package-lock.json`
- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `packages/ui/src/styles.css`
- `packages/contracts/src/index.ts`
- `apps/web/src/workspace.tsx`
- `apps/web/src/previews.tsx`
- `docs/handover/WORK-STATUS.md`

Twelve new files:
- `packages/ui/src/email-html.ts`
- `packages/ui/src/email-modal.tsx`
- `packages/ui/src/email-preview.tsx`
- `packages/ui/src/rich-email-editor.tsx`
- `packages/ui/src/rich-email-editor.css`
- `apps/web/src/email-store.ts`
- `apps/web/src/email-templates.tsx`
- `apps/web/src/email-composer.tsx`
- `apps/web/src/email-workspace.tsx`
- `tests/email-security.test.ts`
- `tests/email-editor.test.tsx`
- `docs/implementation/STEP-3A-V2-RICH-EMAIL-EDITOR.md`

## Preservation and stop point

12/12 IPX paths match saved SHA-256/lengths, including original ZIP; 3/3 archival TSX
match SOURCE-MANIFEST. A 95-file starting inventory including 13 Downloads files verifies
only the eight authorized existing paths changed. Downloads/CSV, scripts/Step1G helper,
root rules, historical reports, recipient provider, Configuration and prior tests remain
byte-identical. No staging, commit, push, remote/config/history changes or live services.
Final Git: main/same HEAD, empty index, no remotes, one modified tracked WORK-STATUS and
53 untracked files (41 prior plus 12 V2). The untracked helper remains untouched.

Owner review: select recipients, Create template, format/save/reload, Edit/Preview/Use,
save an independent draft, Expand editor, inspect both themes and mobile. Existing dev
server is loopback-only. If it is stopped, restart in Windows CMD (do not duplicate it):

```cmd
cd /d E:\Bulk-Communicatio-System
npm.cmd run dev
```

**Exactly one next activity: owner visual/accessibility acceptance of Step 3A-V2,
including manual 200% browser zoom. Stop; no further development authorized.**
