# Segmented curve test

Test branch: `test/curve-segment-measurements`.

1. Draw an ordinary rectangle A–B–C–D and enter its dimensions.
2. Tap a wall and choose the curved-wall editor.
   A new curve starts as one whole arc with no intermediate points: for a
   200 cm side enter chord 200 and tape length 220 or 230, then Apply.
   The known wall chord is prefilled; no diagonal or invented midpoint is needed.
3. Add three intermediate points. On side BC these become C, D, E;
   the old corners C and D display as F and G.
4. Enter the straight chord and tape length for each segment, including EF.
   Add optional diagonals from any base corner to the intermediate points.
5. Apply, save/reopen the room, and generate the contractor sheet.

Each segment has an independent bend selection: inherit the wall default,
outside, inside, or automatically follow the control-point geometry. This
supports an S-shaped boundary such as CD outside and DE inside with tape
lengths 270/270 and chords 250/250. The intermediate point can remain on the
base wall. Point position is a separate constraint (automatic, outside,
inside, or on the base line); its side is enforced together with measured
chords/diagonals, not inferred from the segment's bend direction.

Chord and tape lengths are separate data. Tape lengths determine perimeter;
missing tape lengths use an estimated curve. Missing diagonals leave the shape
underconstrained and show a yellow canvas warning with an explanation on tap.
The shape between measured points is approximated by circular arcs; split a
segment if its arc exceeds a semicircle. Existing V2 curves remain readable;
editing them migrates their chords, while unknown tape lengths stay blank.

The display contour adds virtual labeled points, leaving base corner indices,
existing base-diagonal keys, and wall-element side bindings intact. New curve
points keep opaque IDs across edits and normalization. Reports use the same
labels and separate chord/tape columns, including in multiroom exports.

Verification: `tests/curve-segments.test.cjs` exercises mobile and desktop,
real editor handlers, optional/conflicting constraints, perimeter, labels,
normalization, and the actual contractor report. It also rejects painting a
straight contour across a curved wall in the report.
