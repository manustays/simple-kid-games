# Typing Fun! — physical keyboard support

Everything below lives in `type/index.html` (single global `keydown` listener plus
the `emojiKeys` bridge inside the emoji IIFE). Touch behaviour is unchanged.

## Global keys (every tab except **Keyboard**)

| Key | Action |
|-----|--------|
| `Backspace` | delete the last item |
| `Shift+Backspace`, `Escape` | clear the display |
| `Delete` | delete the last item |
| `Ctrl`/`Cmd` + `1`–`5` | jump to tab (123, ABC, Emoji, Colors, Keyboard) |
| `Ctrl`/`Cmd` + `←`/`→` | cycle tabs, wrapping |

The chosen tab is written to `localStorage['active-tab']`, same as tapping.

Rules that apply throughout:

- **Auto-repeat is ignored** (`e.repeat`) for everything except arrows, so a held key
  types once instead of flooding the display and the speech queue.
- **Modifier chords pass through.** Any key with `ctrl`/`cmd`/`alt` that isn't a tab
  shortcut is left to the browser, so `Cmd+R`, `Cmd+A` etc. still work.
- **Consumed keys call `preventDefault()`**, which is what stops `Space` from scrolling
  the emoji panel and `Backspace` from triggering browser back.
- **Settings overlay open** → only `Escape` is intercepted (it closes the dialog).
  Everything else stays native so the sliders, voice `<select>` and close button
  remain keyboard-operable.
- **Keyboard tab** → the handler returns immediately; the `contenteditable` owns all
  typing. Tab shortcuts are checked *before* this bail-out, so the tab is not a
  keyboard trap. Switching to it via `Ctrl+5` focuses `#native-edit` and puts the
  caret at the end, matching the tap path (both go through `switchTab()`).

## Per-tab keys

**123** — `0`–`9` type and speak; `Space` inserts a gap. Letters also type (spoken),
they just have no on-screen key to flash.

**ABC** — `A`–`Z` and `0`–`9` type and speak (the panel has a digit row); `Space`
inserts a gap and flashes the space bar.

**Colors** — `1`–`6` pick colours in grid order (red, green, blue, yellow, white,
black); `r g b y w` pick by first letter and `k` is black, since `b` is taken by blue.
**Any other key falls through to plain typing** — `8` types an 8, `q` types a Q.

**Emoji** — see below.

## Emoji tab navigation

The ring is hidden until the first keypress in the tab (`emojiSel === -1`); that first
press only reveals it on emoji #1 and types nothing.

| Key | Action |
|-----|--------|
| `←` `→` | move one cell, wrapping across the whole list |
| `↑` `↓` | move one row; at an edge, wraps to the other end **of the same column** |
| `Enter`, `Space` | type + speak the selected emoji |
| `0`–`9` | type that digit; the ring does not move |
| `A`–`Z` | jump to the first emoji whose name starts with that letter, then type + speak it. Pressing the same letter again cycles to the next match. Letters with no match are swallowed rather than typed as text. |

Details worth knowing:

- Column count is read per keypress from `getComputedStyle(kb).gridTemplateColumns`,
  because the grid is `auto-fill` — it survives resize and rotation.
- `setEmojiSel()` calls `scrollIntoView({ block: 'nearest' })`, so the ring stays
  visible inside the scrolling `#panel-emoji`.
- Clicking or tapping an emoji moves the ring to it (only once the ring is visible),
  so arrows continue from whatever was tapped.
- `emojiData` is shuffled on every load, so letter-cycling order differs per session.

## Press feedback

`flashKey(btn, ripple = true)` makes a physical press look like a tap: it adds a
`.pressed` class for 120ms and bursts an emoji from the button's centre. `.pressed`
reuses each key's existing `:active` rule verbatim, so there is no second visual
language to maintain. Emoji keys pass `ripple = false` — they aren't positioned or
clipped, so a ripple would escape the key. The removal timer is stored per button
(`btn._flashTimer`) so rapid presses can't have an old timer cut a new flash short.

## Selection

`#tab-bar`, `#panels` and `#digits-wrap` are `user-select: none`, which covers the
keyboards, the emoji grid and the typed strip. `#native-edit` sits outside
`#digits-wrap` and keeps `user-select: text` — it is a real text field.

## Focus

Keys set `outline: none`; a `:focus-visible` ring (`--c7`) was added for `.key`,
`.lkey`, `.ekey`, `.ckey` and `.tab`. Bare `Tab` is deliberately **not** intercepted so
normal focus traversal — and therefore that ring — still works.
