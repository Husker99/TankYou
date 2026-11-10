# Tank You prototype

Open the running local game at http://127.0.0.1:8765/ or the editor at
http://127.0.0.1:8765/?editor=1. To start a server again, run
`python3 -m http.server 8765 --bind 127.0.0.1` from this folder.

## Menu

The root URL opens the minimalist Tank You / by Ben menu with Levels 1–5 and
Level editor buttons. Menu music loops at 25% volume: each menu visit chooses
Copter Theme 1 with 75% probability or Messing Around with 25% probability.
Browsers may require the first interaction or Play music before audio starts.
Music stops on entering a level/editor and pauses when the page is hidden.
Direct `?level=level-3` and `?editor=1` links still open their target directly.

## Level editor

- New boards default to 12 × 9 square cells. Use Columns, Rows, and Apply size
  to resize between 5 × 5 and 20 × 11. Editor cells were reduced by 15% and then about another 12%; tank previews
  keep their size so cannons extend past the cell edge. Erase uses an eraser cursor;
  each cell still represents 100 game-world units, preserving tank proportions.
  Shrinking past objects requires selecting Remove objects; Undo restores them.
- Place one player start, up to 20 AI starts, and solid wall cells.
- All tanks start facing north, including tanks in older saved or imported levels.
- AI types are Tan (Stationary) (`sentry`), Brown (Mobile) (`brown`), Teal (Rocket) (`teal`), and Black (Elite) (`elite`).
  Brown moves at 78 units/s (player: 135), uses cardinal routes around cover, pauses
  between movement bursts, and occasionally dodges nearby incoming shots from any tank
  after a reaction delay. Both types use the same aiming/firing delays and check
  direct and ricochet paths for allies before firing.
  Levels 1–5 are available in the game and editor menus.
- Drag to paint walls or erase; each stroke can be undone in one step.
- With the grid focused, use arrows to select a cell, Space to place, and Delete to erase.
- Test level starts combat using the draft; returning to the editor preserves it.
- Draft autosave and the named level library use this browser's local storage.
- Export a JSON file for a durable backup or to share a level. Import validates it
  before changing the current draft. Testing/exporting requires both player and AI starts.
- Imported grids support 5–20 columns and 5–11 rows. Width and height are independent; cells stay square. Existing saved levels retain their dimensions.

Exported files are versioned level descriptions. `levels.js` defines validation,
compilation, spawn orientation, and the AI type registry. This is the extension
point for future tank, barrier, and terrain types; those extra types are not yet implemented.
There is no online level upload service in this local prototype.

## Validation

With Node.js, run `node test-game.mjs`, `node test-editor.mjs`, and `node test-menu.mjs` for the simulation,
level validation, and editor workflow checks. These tests have also been run using
the available Node execution tool. Browser checks cover creating a two-AI level,
undo/redo, saving, exporting, importing the exported file, and playtesting it.

Sound source notes and licenses are in `audio/`; the font license is in `fonts/`.

## Contact physics

Movement uses a rotated rounded hull footprint (61 × 58 world units, rounded
corners) rather than the former 88-unit circular collider. The cannon is excluded.
Wall contacts separate overlapping shapes and allow sliding; turning is checked
through its swept orientations. Tank pushing, mobile AI collision, and navigation
clearance use the same footprint. Bullet hit detection retains its separate hull
and shell hitboxes. Press F2 during gameplay to show or hide collision outlines.

Tanks move continuously while the hull rotates toward the nearest forward/backward
alignment. Reversing along the tread axis is immediate. Collision-safe rotation
may use a small sideways clearance shift near walls; this does not oppose the
requested travel direction. Tank artwork is squarer (63 × 60 units), and editor
previews use the same proportions.

## Teal rockets

Teal shares Brown navigation, dodging, speed, aiming delay, reload, and active-shell
limit. Its rockets travel at 634.8 units/s (standard AI shells: 240) and disappear
on their first wall hit. Rocket projectiles have animated rear flames, sparks, and longer smoke trails;
the tanks themselves have no exhaust flames. Launch and quiet in-flight audio
use Kenney CC0 sounds. The
flight loop is shared and volume-limited, and stops when no rockets remain or
when gameplay is paused, reset, finished, or left for the editor/menu. All AI
palettes use the same track and tread-stripe colors; bodies identify the type.

## Black Elite

All mobile types consider player shots, allied shots/rockets, and their own returning ricochets when dodging; outgoing shots and projectiles stopped by cover are ignored. Pre-fire self-hit prevention is not added.

The editor supports `elite` AI tanks. They use Brown movement speed and collision
rules, modest predictive aiming (maximum 0.45-second lead), and three standard
240-unit/s shells at -5, 0, +5 degrees, 0.18 seconds apart. The central aim is
committed at burst start. Each shot independently checks walls, active-shell
capacity, and friendly-fire safety. A 2-second cooldown begins after the burst;
cover is prioritized during cooldown, and firing lanes are preferred when ready.
Elite firing windup is only 0.05 seconds once aligned with a safe, clear shot.
Other tank types retain their 0.7-second warning. Dodging uses a
0.08-second reaction delay, 75% attempt chance, and 320-unit awareness.
Elites retain one-hit destruction. Existing built-in levels are unchanged.

Scenery includes walls and holes. Holes occupy a blocked grid cell for tank movement
and AI routing, but do not obstruct sight or projectiles. The editor shows type
selectors only for the selected AI Tank or Scenery tool. Holes are saved as
`type: "hole"` in the existing scenery (`walls`) array, preserving older levels.

Red (Charge) inherits Black's burst weapon, firing cadence, predictive aiming,
and dodge settings. It predicts direct and ricochet hits over the next second.
An available shield lasts 3 seconds, grants invincibility and 25% extra movement
speed, and reflects standard shells using the circular surface normal. Rockets
and shells with no remaining ricochets are destroyed. Outgoing shots leave the
shield freely; AI firing safety also avoids allied shields.

After 6 idle seconds Red activates offensively, pursuing firing lanes and
continuing movement through bursts for 3.5 seconds, without cover or dodging.
The shield and speed boost expire after 3 seconds; the final half-second is
unprotected. Every activation is followed by a 6-second cooldown starting
when the shield deactivates. Defensive activation takes priority when ready.
Ability timers pause with gameplay and reset when the room restarts.

Bullet-to-bullet collisions use directional rectangles 12% larger than the
visible bullet dimensions. Bullet-to-tank collisions and AI tank-hit prediction
use the exact artwork bounds, without that extra margin. Wall padding remains
unchanged. Standard shells have rounded noses; rockets have pointed noses,
both contained within their existing artwork dimensions.
