# XION modules

The XION-specific modules you can place in the studio (`/studio` → **Add** → search, or the **Items** filter). Each one is a component in the engine plus, where needed, game logic in `apps/ghostt`.

All of them are **invisible markers during play**: you see them in the studio (as a translucent box or square) and the game reacts when a player is near or inside them. Select one in the studio and its settings appear in the panel on the right, under the module's name.

| Module | What it does | Player key |
| --- | --- | --- |
| [Seat](#seat) | Walk up, press E, the avatar sits | E |
| [Reverse Gravity](#reverse-gravity) | Lifts players up, or slows their fall: elevators, safe drops | — |
| [Music Zone](#music-zone) | Music in a box or sphere, fading in and out around it | — |
| [Lift](#lift) | Teleport between the floors of a building | E |
| [Video Screen](#video-screen) | A screen with a playlist everyone watches in sync | E (to control) |
| [Chat Zone](#chat-zone) | An area with its own text chat room | — |
| [Token Gate](#token-gate) | An area only token / NFT holders can enter | — |
| [Portal](#portal) | A spawn point that opens the destination directory | — |

---

## Seat

A place to sit. Put the square on a chair, bench, step or ledge; a player who walks up to it gets an **"E Sit"** prompt. Pressing E sits the avatar on the square, facing the white arrow, with the built-in `sitting` animation. Pressing E again, moving or jumping stands back up where they were standing. Other players see the pose (it travels with the normal position + animation updates).

**How to use**

1. Add **Seat**. An orange square with a white arrow appears.
2. Move it onto the seat surface (Transform → Position). The square marks where the **backside** goes: the game measures the avatar's body and rests the underside of its backside and thighs exactly on it, whatever the avatar's size.
3. Rotate it (Transform → Rotation Y) so the **arrow points where the player should face**: the front of a chair, or out over the edge of a ledge so the legs hang down.
4. On a ledge, put the square right at the edge, or the shins go into the wall.

**Settings (Seat panel)**

| Setting | Default | Meaning |
| --- | --- | --- |
| Prompt | `Sit` | Text shown after "E", e.g. "Sit on the bench" |
| Range (m) | 1.5 | How close a player must be to get the prompt |
| Height offset (m) | 0 | Nudge the seated avatar up (+) or down (−) |

The square's scale only changes how big it looks in the studio. Teleports, lifts, fly mode, cinematic mode and pausing all stand the player up first.

**Code:** `packages/engine/src/space/components/seat/` (component), `packages/engine-edit/src/editors/seat/editor.ts` (studio panel), `apps/ghostt/shared/seats.ts` (finding the nearest seat), `apps/ghostt/src/lib/game-script.ts` (`sit` / `standUp`), `apps/ghostt/src/components/seat-controls.tsx` (prompt).

---

## Reverse Gravity

A zone where normal gravity is replaced. With a **positive** Strength you are carried up at that speed and stop at the top: use it for **elevators** (a column from the ground floor up to the next floor). With a **negative** Strength gravity is slowed, not reversed: you fall gently, no faster than that speed, like a parachute: use it for **safe drops** and the way down from an elevator. 0 makes players float.

**How to use**

1. Add **Reverse Gravity**. A translucent box appears: **blue** when it lifts, **orange** when it slows falls.
2. Put its floor where players step in (Transform → Position is the centre of the floor).
3. **Resize the floor by its corners:** while the zone is selected, its four floor corners show as small white cubes. Click one (it turns green) and drag it with the move arrows. The opposite corner stays where it is and the floor stretches between them. Undo works as usual.
4. Set **Height** so the top of the box is the floor players should arrive on: a rising zone slows down near the top and stops players exactly at the top, so they can step off.
5. Set **Strength**.

**Settings (Reverse Gravity panel)**

| Setting | Default | Meaning |
| --- | --- | --- |
| Height (m) | 6 | How tall the zone is, from its floor up. The floor square becomes a box this tall |
| Strength (m/s) | 4 | **Positive:** lift speed (players stop at the top). **Negative:** slow fall, players come down at no more than this speed (−2 = a gentle 2 m/s drift; −10 is still fast). **0:** float |

**Elevator recipe:** a 2 × 2 m zone on the ground floor, Height = the height of the upper floor's surface above the ground, Strength 3 to 6. Players walk in, rise, stop level with the upper floor and walk off. For the way down, a second column next to it with Strength −2 to −4 and the same Height: players step in at the top and drift down slowly.

**Falling in from above:** a fast fall is braked within a few metres (a 50 m/s fall into a −2 zone slows to about 4 m/s in roughly 3 m), then continues at the slow speed. **Jumping inside a zone:** the jump goes up as usual, then the zone takes over (in a slow-fall zone you drift back down; in a rising zone you keep rising). Flying players are not affected. Only the floor size (x and z scale) matters; the y scale is ignored, use Height.

**Code:** `packages/engine/src/space/components/gravity-zone/` (component), `packages/engine-edit/src/editors/gravity-zone/editor.ts` (studio panel and corner handles), `apps/ghostt/shared/gravity-zones.ts` (which zone a player is in, target speed), `apps/ghostt/src/lib/game-script.ts` (`applyGravityZone`).

---

## Music Zone

Music that plays while players are in an area. Inside the zone the track plays at **full volume**. Around it you can add an optional **fade band**: walking toward the zone, the music rises from silent to full; walking away, it fades back out. Each player hears the music for where they are (nothing is synced between players).

Two shapes:

- **Box (rectangle):** a room, a stage, a corner of the map. Every side can be moved on its own.
- **Sphere:** ambience over a whole area, with the same fade all round.

**How to use**

1. Add **Music Zone**. A translucent green box appears; a fainter outline around it shows the fade band.
2. **Upload the music** in the **Music** section of the right panel (.mp3, .ogg, .wav, .m4a).
3. **Size it by its sides:** while the zone is selected, the middle of each of its six sides (left, right, front, back, top, bottom) shows a small white cube. Click one (it turns green) and drag it with the move arrows: that side moves, the opposite side stays where it is. For a sphere, dragging any cube changes the radius and the centre stays put. Undo works as usual. (Transform → Scale also works: x = width, y = height, z = depth; for a sphere x is the diameter.)
4. Set the volume and the fade distance.

**Settings (Music panel)**

| Setting | Default | Meaning |
| --- | --- | --- |
| Music file | — | The track to play |
| Volume (0 to 1) | 0.8 | Volume inside the zone |
| Fade distance (m) | 6 | Width of the fade band around the zone: full volume at the edge, silent this far out. **0 = no fade band**: the music stops at the edge (with a quarter-second fade so it doesn't click) |
| Shape | Box | Box (rectangle) or Sphere |
| Loop | on | Play the track again when it ends |
| Restart when you come back | off | Off: leaving pauses the track and coming back continues where it was. On: it starts from the beginning each time |

**Paths with one song:** zones that use the **same music file share one track**. Put boxes end to end (or touching at a corner, like an L) with the same song: walking from one into the next, the music keeps playing at the same point in the song, with no restart and no dip. Where they overlap, the louder one is used (volumes don't add up). Each box can still have its own volume and fade. Zones with different files play separately (and can overlap, e.g. a sphere of ambience with a box of music inside).

**Loading:** a music file is only downloaded once a player reaches the fade band of one of its zones (or the zone itself when the fade is 0); far-away zones download nothing. After a moment of silence the track pauses, and after 20 seconds out of earshot it is released from memory; its position is remembered so coming back continues the song (unless "Restart when you come back" is on).

Music is heard from the avatar's head height (from the camera in cinematic mode). Browsers only allow sound after a click, so music starts once the player has clicked "Click to start".

**Code:** `packages/engine/src/space/components/music-zone/` (component), `packages/engine-edit/src/editors/music-zone/editor.ts` (studio panel and side handles), `apps/ghostt/shared/music-zones.ts` (distance and volume), `apps/ghostt/src/lib/music-player.ts` (playing and fading), `apps/ghostt/src/lib/game-script.ts` (`musicZones`, `listenerPosition`).

---

## Lift

Boxes placed on each floor of a building. Boxes that share a **Lift name** are the floors of one lift. Standing in one shows the lift's name and floor; pressing **E** opens a panel listing its floors, and picking one teleports the player to the bottom centre of that floor's box. Floors behind a token gate or a members-only chunk the player can't enter are shown locked.

**Settings:** Lift name (same on every floor of one lift), Floor (number, highest listed first), Floor name (optional, e.g. "Lobby").

**Code:** `packages/engine/src/space/components/lift/`, `apps/ghostt/shared/lifts.ts`, `apps/ghostt/src/components/lift-controls.tsx`.

---

## Video Screen

A screen with a playlist that every player watches in sync. Players near it with permission press **E** to open its controls.

**Settings:** Playlist (title + URL or upload), Ads, Who can control (roles with *Control Screens*, everyone, or holders of a token gate), Interaction distance, Auto play, At the end (next video / repeat / stop), Load distance, Volume, Audio range, Background colour, Idle image.

**Code:** `packages/engine/src/space/components/video-screen/`, `apps/ghostt/shared/screens.ts`, `apps/ghostt/src/lib/screen-sync.ts`, `apps/ghostt/src/components/screen-controls.tsx`.

---

## Chat Zone

A box-shaped area with its own text chat room: players standing inside talk to each other apart from the rest of the world.

**Settings:** Room name.

**Code:** `packages/engine/src/space/components/chat-zone/`, `apps/ghostt/shared/zones.ts`, `apps/ghostt/server/game-room.ts`.

---

## Token Gate

An area only holders of a token or NFT can enter. Players who don't qualify are sent to the exit point and told what they need. Supports CFT-20 tokens and inscriptions on Cosmos, and ERC-20 / NFTs (ERC-721 / 1155) on EVM chains. The server checks holdings too, so it can't be bypassed from the browser.

**Settings:** Chain, Holds (CFT-20 / inscription / ERC-20 / NFT), Ticker, Collection, Contract address, Symbol, Token id (ERC-1155), Minimum amount, Area name, **Door tag** (objects with this tag are solid and visible for non-holders, open for holders), **Exit offset** (where refused players are sent, relative to the gate).

**Code:** `packages/engine/src/space/components/token-gate/`, `apps/ghostt/shared/gates.ts`, `apps/ghostt/server/gate-registry.ts`.

---

## Portal

A spawn point that opens the destination directory when a player enters it. `?plot=<slug>` links start players at a plot's first portal.

**Settings:** Image, Name, Slug, Cooldown (ms), Display in Live Mode, Radius, Color, Opacity.

**Code:** `packages/engine/src/space/components/portal/`, `apps/ghostt/src/lib/portals.ts`.

---

## Adding a new module

Copy the Seat or the Lift; a module touches these places:

1. `packages/engine/src/space/components/<name>/`: `<name>-data.ts` (settings), `<name>-component.ts` (what you see in the studio), `index.ts` (title, icon, default values).
2. Register it in `packages/engine/src/space/components/components.ts` and `components-web.ts`.
3. Studio panel: `packages/engine-edit/src/editors/<name>/editor.ts`, registered in `packages/engine-edit/src/editors/index.ts`.
4. Show it under **Items** in the Add menu: `ITEM_TYPES` in `packages/studio/src/components/content-tab/add-assets/marketplace/official/index.tsx`.
5. Game behaviour in `apps/ghostt` (`src/lib/game-script.ts`, `shared/`, UI in `src/components/`).

File names are kebab-case. Check with `pnpm engine:check`, `pnpm engine-edit:check`, `pnpm studio:check` and `pnpm --filter ghostt test`.
