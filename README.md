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
0.03-second reaction delay, 0.05-second scan interval, 0.7-second dodge cooldown, 75% attempt chance, and 320-unit awareness.
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

Tan, Black, and Red can aim one-bounce bank shots when direct sight is blocked.
They reflect a target across arena edges and solid wall faces, accounting for
bullet thickness, then verify both legs using live collision geometry. Holes
are ignored and shields are not used as planned bank surfaces. The shortest
safe valid route is preferred; searches are refreshed every 0.2 seconds and
trajectories are checked again before firing. Direct shots take priority.
Firing cadence, active-shell limits, friendly-fire prediction, and Elite burst
spread remain in force. Brown and Teal do not plan bank shots.

## First-map campaign prototype

Roguelike opens a browser-saved campaign map with eight encounter rows and at
most four choices per row. The route graph mixes single paths, two-way forks,
and two three-way forks. Encounters are seeded per new run: 50% combat, 15%
+1 heart, and 35% power-up category, equally divided across Stygian, Lethe,
Phleg, and Ache. Combat uses existing built-in levels with later rows drawing
from later levels. Category rewards are recorded as requisitions; there are
no invented upgrade effects yet.

Runs start with three hearts. Each hit costs one heart with 1.2 seconds of
damage grace; health carries between rooms and heart nodes restore one health up to the default three-heart capacity.
Zero hearts ends the run. Victory returns to the map through Campaign Map.
Room restart is disabled in campaign combat. Quick Play and editor playtests
retain their one-hit rules and ordinary restart behavior.

Progress is saved locally in this browser. Leaving during combat preserves
the pending encounter and remaining hearts; resuming restarts that encounter
with the saved hearts. Completing the eighth encounter clears Map 1 only;
Maps 2 and 3 are not implemented. Active runs can be replaced with New Run,
with an explicit confirmation. Menu music starts muted by default, and can
be enabled with the home menu's sound icon at its existing 25% volume.

`test-campaign.mjs` checks map constraints, probability distributions, node
locking, combat progression, rewards, save/resume, defeat, and completion.

Campaign health is shown as 30px filled or outlined heart slots at the top
right of the map and battlefield. Runs store maxHearts separately from health,
defaulting to three; future Styx upgrades can expand the slot capacity.

## Roguelike map editor

Level Editor now opens a Map / Level chooser. Map edits campaign encounter
routes; Level opens the existing arena editor. Maps have 2–12 rows and four
available positions per row. Place assigns an encounter (and a specific
Level 1–11 or random combat level). Connect links a source to the next row,
with up to three outgoing paths; selecting the same pair removes the path.
Erase removes an encounter and its incoming connections. Starts and exits
connect automatically to the first and final rows.

Refill All Hearts uses a red medical cross inside a circle and heals to the
current maximum capacity. It is manually placeable in custom maps; generated
maps retain their existing event weights.

Maps support draft autosave, a separate browser map library, undo/redo,
JSON import/export, templates, and Play Map. Play Map starts a new campaign
using that authored graph. Saved campaign runs include their map definition
so custom routes survive reload. New Run repeats the current custom map.
Map files use kind "tank-you-map" and are distinct from arena-level files.
Playable/exported maps must have reachable nodes, no early dead ends, and
only adjacent-row connections. Incomplete drafts can still be saved locally.

The new test-map-editor.mjs suite covers editing, validation, save/load,
import/export, custom-map play, full heals, and custom campaign restoration.

Map layout update: new campaign maps and editor templates use 15 rows. The
editor offers five positions per row and a fixed 15-row height. Older editor
maps are expanded by extending their final routes with connected combat
encounters. Map files from earlier layouts remain readable. Existing saved
generated runs retain their original layout until New Run. Both map views
are 20% narrower and scroll vertically, starting near the bottom.

Three-column update: maps now offer exactly three positions in each of their
15 rows. New templates and generated runs also stay three wide. Older maps
with at most three encounters per row are remapped while preserving their
connections. An older map with more than three encounters in a row must be
reduced before import; draft migration keeps a local backup.

Campaign combat now uses encounter banks 1a/1b, 2a/2b, and 3a/3b. Rows 1–8
use the a bank; rows 9–15 use b. Maps can be assigned to campaign map 1, 2,
or 3 in the map editor. Combat nodes pick random encounters from that bank,
avoid immediate repeats when alternatives exist, and retain the selected
encounter on resume. There are no uploaded bank encounters yet. Missing
banks display a notice and leave the node available, without substituting
regular Quick Play levels. Quick Play → Roguelike Levels lists bank encounters
for individual testing as they are added to encounters.js.

Map 1a (maps/map-1a.json) is now the default Roguelike map, registered in
campaign-maps.js. Selecting Roguelike switches to that authored map and
resumes it on subsequent visits. The exit is a separate boss node after the
15 encounter rows; all final-row routes converge there. Boss encounters are
randomly selected from 1boss / 2boss / 3boss banks. Their chosen identity is
saved like regular encounters, and a map clears only after boss victory.
Missing boss uploads leave the exit locked with an explanatory notice.

Pink (Flamethrower) is available in the arena editor. It inherits Black's
movement, dodging, bank shots, and burst weapon, with unchanged tank shape
and collision dimensions, shared AI treads, a pink body, and a flame emblem
on the turret. The emblem glows as the flame extends.

Flamethrower behavior: a small flame immediately extends to full reach over
1.7 seconds, holds at full reach for one second, then starts a five-second
cooldown. Aim remains locked; there is no advance warning cone. The
cone reaches 600 world units from the muzzle and spans about 200 units at
its widest point. Walls clip the stream, damage, and bullet
cancellation; holes do not block them. All bullet owners and rockets are
affected. Player damage uses ordinary Quick Play death or campaign hearts
and damage grace. Pink's gun is suppressed throughout extension and firing;
its burst weapon resumes during flame cooldown. Pink holds position while
charging/firing so the locked danger zone remains stable. Death, room reset,
pausing, and leaving combat correctly stop or freeze the ability.

Every fight now begins with a three-second 3–2–1 countdown, including room
restarts and editor playtests. Movement, shots, enemy opening timers, and
abilities remain frozen until it finishes. The countdown pauses on blur or
pause. Campaign fights hide the logo header and show 15px heart slots at
the top-right inside the battlefield; map heart slots remain 30px.

## Styx upgrades

Styx nodes now open a dark two-choice upgrade screen. Choices are saved
until selected, prerequisites are enforced, and unique upgrades stop
reappearing after acquisition. Defy Death remains repeatable and increases
maximum capacity without healing. Other upgrade categories keep their
existing placeholder behavior. Acquired upgrades are listed on the map.

Blessing enables Q's three-second absorbing shield. Favored extends it to
five seconds and reflects projectiles; Hero doubles its area (radius ×√2)
and damages enemies on contact. Shield cooldown is 13 seconds starting at
deactivation. All damage, including flames, is blocked while shielded.

Stun enables Q to arm the next shot as an expanding energy wave. It replaces
a standard shot, uses one of the five active-shot slots while travelling,
and travels at rocket speed through the flame-shaped six-cell cone. Walls
block it and holes do not. The cooldown starts on Q and lasts six seconds.
Q independently activates each ready owned ability, so it can shield and
arm Stun together. Stun freezes enemies for one second, including movement,
pushing, hull/turret rotation, normal fire, and ability activation, with
lightning effects. Death's Grasp extends the freeze to four seconds.

A compact battlefield sidebar shows shield and stun cooldown progress.
Cooldown state and an armed stun shot persist between rooms; map screens
and countdowns pause ability timers. An active shield ends at room victory
and starts its cooldown. Quick Play and editor playtests do not gain these
campaign abilities. test-upgrades.mjs checks choices, prerequisites,
repeatable capacity, pending choices, and persistent run effects.

Visual polish update: tanks share a canvas painter in levels.js across
gameplay and editor previews, with beveled armor, tread bands, engine vents,
fasteners, turret shading, class markings, and short barrel recoil. The
existing hull geometry and projectile origins still drive gameplay. The UI
uses consistent olive/tan panels, borders, buttons, focus treatments, and
readable military-terminal body copy. The arena editor load menu includes
all registered Roguelike encounters and bosses as editable draft copies.

Opening-combat update: the 3–2–1 countdown remains, but enemy opening reload
and per-enemy cumulative stagger are removed. Turrets begin aimed toward
the player; first-shot windup is at most 0.12 seconds, then each type returns
to its normal cadence. Each battlefield resets player ability cooldowns to
ready, without changing owned upgrades or carried health.

Mobile AI now checks intended movement against projectile trajectories over
the next 0.55 seconds, including allied shots and valid wall ricochets. It
can stop/replan before entering a safe-to-stand-in bullet lane, and compares
both dodge directions. Existing probabilistic reaction settings remain.
Active invincible shields allow aggressive movement. Tank ground, turret,
and barrel cast shadows have been removed from gameplay and editor art.

Campaign presentation update: new runs begin with two filled hearts in the
existing three-slot capacity. A short synthesized UI tap plays on enabled
button clicks throughout the game, including keyboard-activated buttons.
Campaign victories show current heart slots and all owned upgrades for two
seconds, then automatically return to the map. Defeat still offers View Run;
Quick Play results retain their manual navigation. Any navigation away from
the victory summary cancels its scheduled return to prevent stale timers.

Enemy opening fire is now independently randomized between zero and one
second per tank, rerolled for each battlefield or restart. This timer starts
after the countdown, never accumulates by enemy index, and applies to Pink's
flamethrower as well as ordinary guns. Movement, aiming, and dodging remain
active during the opening delay, and normal firing cadence follows afterward.

## Lethe upgrades

Lethe nodes offer their own two-choice upgrade menu. Forged Treads grants
+10% movement per stack (up to three stacks, +30%). Rockets grants +20%
standard bullet speed per stack (up to three, +60%) and a progressively
larger flame; upgraded bullets retain their usual ricochets.

Lithe uses Shift for 2.5× movement for one second, followed by a six-second
cooldown starting at the end of the burst. Swivel Shield requires Lithe and
adds a turret-following, absorbing half shield for 2.5 seconds on activation.
It remains after the one-second movement burst, leaves the rear vulnerable,
and protects against directional flame damage from its covered side.
Executor requires Lithe and multiplies the speed of standard bullets fired
during the dash by 1.2. Existing bullets retain their fired speed. Stun waves
retain their own rocket-speed behavior.

All Lethe upgrades persist within a run, prerequisites and stack caps are
enforced, and Lithe is refreshed alongside other abilities each battlefield.
The battlefield HUD displays Shift's active time and cooldown.

## Quick Play upgrade testing

Quick Play → Roguelike Levels includes a collapsible Tank upgrades panel.
Select Styx and Lethe upgrades, repeatable stack counts, and starting hearts
before choosing an encounter. Prerequisites and stack limits are enforced;
Full health fills the chosen capacity. The browser remembers this test loadout
separately from campaign progress. Retries restore the selected starting health
and refresh abilities; Next Level keeps the loadout. Ordinary Quick Play levels
remain unchanged.

Pink weapon tuning: regular bullet reload is now 1.8 seconds (10% shorter).
Flamethrower extension runs at 85% of its former rate, reaching full range
in 2 seconds, then holds for 0.9 seconds (10% shorter). Range, burst spacing,
and flame cooldown are unchanged.

Campaign victory summaries last 1.5 seconds and can be skipped by clicking
anywhere. Pre-fight countdowns play a short tone for each of 3, 2, and 1.
The map encounter legend labels the shield category Styx.

## Phleg upgrades

Phleg nodes offer two upgrade choices and retain selected effects for the run.
All four upgrades are also available in Quick Play → Roguelike Levels loadouts.
Space is dedicated to placing mines; only mouse clicks fire bullets.

Typhon Mines places a pulsing mine under the tank (80% of tank width). An enemy
within one square of its hull starts an irreversible one-second fuse. Any bullet
detonates it immediately and is consumed. Explosions chain to nearby mines.
The fiery blast reaches 1.5 squares and damages all tanks using normal shield
and damage-grace rules. Walls block proximity detection and blast damage; holes
do not. One mine may be active, with a three-second cooldown starting on placement.
Protector Mines prevents damage to the player from their mines. Fires of
Phlegethon permits two active mines and halves placement cooldown to 1.5 seconds.

Olympus's Forgiveness activates on every fatal hit with a 2.25-square blast.
If it and any resulting chain reactions destroy all remaining enemies, the
player revives at one heart and the encounter is won. Otherwise the run ends.
Mines and their placement cooldown reset fresh for each battlefield.

Mine feedback: placement has a short mechanical click, triggered proximity
fuses tick every quarter second, and detonation combines a low boom with a
filtered fiery burst. Simultaneous chain reactions share a boom to control volume.
Protector mine explosions use blue/cyan fire; ordinary mines and Olympus blasts
use orange/red fire. Animated curling tongues, hot cores, and flying sparks replace
the old circular outline, while walls clip the effect to the blast footprint.

## Battlefield and navigation polish

The battlefield uses cached, subtly textured ivory ground, beveled concrete cover
with seams and occasional cracks, worn hole rims, short muzzle flashes and impact
sparks. Tank movement leaves five-second tread marks; impact scorch marks fade
over eight seconds. Ground marks stay under walls and tanks and do not alter
collisions. Tank shadows remain absent. Ground texture uses deterministic decorative
noise so it does not consume gameplay random numbers.

Button clicks are louder. Both Tank You logos return to the main menu; the credits
logo also links home. A 180ms fade accompanies entering/leaving the battlefield,
without adding transitions between menus. Reduced-motion settings disable it.
Campaign maps and the map editor are twice as tall with columns half as far apart;
existing saved graphs retain their topology. Map scrollbars use olive field colors,
Lethe uses speed chevrons, and Boss immediately follows Combat in the legend.

Ground mark refinement: tread marks fade over 25 seconds (five times slower).
Wall ricochets retain brief sparks but leave no ground scuffs. Death Xs use
position-stable, broken sketch strokes in subdued rust or slate-blue, with no
background or glow, and remain below living tanks and scenery.
