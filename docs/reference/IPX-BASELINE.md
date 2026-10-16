# IPX baseline and provenance

Approved local reference: `E:\Bulk-Communicatio-System\IPX\IPX-BCS`.
Treat the entire `IPX` folder as preserved reference material. Production code belongs
outside it. This document is a reference inventory, not permission to alter the prototype.

## What was inspected for this documentation package

The owner-supplied `Universal_Notify_Partner_UI_Review_V1.zip` was inspected as an archive,
including its HTML entry, CSS, JavaScript and readme. Its archive root is
`Universal_Notify_UI_Review/`; the owner has extracted/renamed that directory locally to
`IPX/IPX-BCS`. The Windows screenshots/CMD confirm the latter location.

Archive SHA-256: `0c60b951ea59161cf50fa84a7d9f379dbeaab7a60ff9e771f04ff40a884e7147`.

The source has six HTML entry files for five logical pages: index and dashboard share
the dashboard view. Shared behaviour/layout comes from Assets/app.js and Assets/styles.css;
Assets/favicon.svg provides the icon. READ_ME_FIRST.txt and PARTNER_FEEDBACK.txt are support
files. The source readme describes 240 fictional students across four courses and 12 batches.
Demonstration KPI totals are illustrative and need not equal the grid fixture population.

The prototype is explicitly offline: no live database, authenticated API, SES sender or
production permission system is established by it. The searchable lookups are JavaScript
demonstrations, not bundled React/React Select source. Smart control TSX files and font
files were not present in the inspected ZIP. This was archive/source inspection, not a
full browser, accessibility or production-security test.

## Uploaded archive inventory (not a claim about current local hashes)

| Relative path inside the original archive root | Bytes | SHA-256 |
|---|---:|---|
| `Assets/app.js` | 85,647 | `932312d56892d8a2e744d9d9e71c3dacaadb0bc71103b65c634c9599a698c94f` |
| `Assets/favicon.svg` | 268 | `aa0e1760d24d228dc250b0aff5b1abf7968a7dd2536fd452bd85c70a7e902da9` |
| `Assets/styles.css` | 24,771 | `46bc7f263f6178d6ede21810314f2e6deb9f6ef32b47c741df064b43aa2dfc0a` |
| `PARTNER_FEEDBACK.txt` | 1,033 | `a8f8302463f2a639a568d7d81f707c066c73bd82a9b05207928dd831d0ec68b1` |
| `READ_ME_FIRST.txt` | 4,466 | `d36b8733bf7804c9de2d4447cc75b487775575a79d3a393a4f3b67e964a4d8fa` |
| `communication.html` | 565 | `d010d574bc54831e482b41dac2eac075e674bcc81172a41e75581daab3f2c5df` |
| `configuration.html` | 565 | `6a63b4d2ed5d7d7ed75dd98d46408d6b11c533ec8a415fee67e11491cb3e08de` |
| `dashboard.html` | 557 | `acd8ee6788faf3ec7c9fb7b271b68892aac9b4b72de092f6c12f4b6d468c26ca` |
| `index.html` | 557 | `acd8ee6788faf3ec7c9fb7b271b68892aac9b4b72de092f6c12f4b6d468c26ca` |
| `reports.html` | 553 | `086aeca908d0f5d5417c54a9996d1a84cbb44660b8198eca59c85554ad9247bf` |
| `scheduling.html` | 559 | `5265fa871413b998eb5f3f64abc76954d4e05dfcbc065bf7d95fa69e6531fb79` |

## Preserve the actual local baseline

Step 1C snapshots all files recursively under the owner's local IPX folder, including
hidden files, then compares names, lengths and SHA-256 values after document creation.
It stores that local inventory as `IPX-BASELINE-SHA256.json`. The installer does not force
local files to match the uploaded archive; it never restores/replaces them from the ZIP.

Do not rename, delete, reformat, regenerate, or change line endings in IPX. Do not use
IPX as the React build output folder. Future Git configuration must preserve its bytes.
Make a separately reviewed backup; checksum inventories cannot recover missing content.

Browser localStorage demo templates/preferences are not part of filesystem checksums.
The screenshots can therefore show a user-created demo template that is absent from the
archive. Do not clear browser state or pretend it represents central production persistence.
Close editors/avoid concurrent changes while running preservation verification. Do not
remove unrelated files when a mismatch is reported; investigate and obtain owner approval.

Visual fidelity and component acceptance are defined in the standards documents. A
future approved UI change needs a separately versioned/reference-reviewed baseline, not
silent edits to this V1 reference.
