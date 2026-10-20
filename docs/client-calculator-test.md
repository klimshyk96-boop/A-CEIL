# Client calculator — first test

Public entry: `/calculator/`. `?demo=1` opens an explicitly labelled demo with illustrative rates; it is not a company offer.

In the editor open **Номенклатура → ⚙ → Калькулятор для клієнта**. Select exact retail catalogue rows and optional minimum order. Film, classic profile and classic corners are required. A unique matching source is preselected; ambiguous matches require a choice. Special profiles require their corner row; floating additionally requires LED. A zero-price corner row can represent corners included in the profile rate. Generate the URL and review it before sharing. Only allowlisted names/prices are exported, with a date; no cost prices, other catalogue entries, auth credentials, projects or client contacts are included.

Client inputs: a rectangle in metres, or measured area/perimeter/corner count. No arbitrary contour drawing in this iteration. The rectangle diagram uses entered proportions; area/perimeter mode does not invent a floor plan. Dimensions, integer counts, impossible area/perimeter combinations and missing selected rates block the estimate. Cornice is an additive retail row, without subtracting profile length. Complex walls, film width, joins and extra installation work require a professional check.

The URL fragment stores the retail configuration and optional room snapshot. A share link can be reopened and edited on another device without login; copying an updated calculation creates a new snapshot. Old links retain old rates. URL data is editable and is not a binding or authenticated quote. No backend record or anonymous write access is introduced.

Names/phone/comment are only in the outgoing message, not in the URL or browser draft. The client explicitly chooses the receiving app and recipient in the phone's share sheet. Fallback: copy the message and send it manually. The UI never claims a lead was saved to an inbox. Automatic lead intake, short permanent URLs and drawing arbitrary contours are follow-up work.

Validation: `tests/client-calculator.test.cjs` covers formulas, minimum, alternate profiles, LED, invalid input, owner price export, contact exclusion, URL round trip, hash changes, malformed links, text injection, disabled missing-rate choices, and mobile/desktop layouts. It is included in the deploy gate.
