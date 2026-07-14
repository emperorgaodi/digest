---
name: glassmorphism-apple-ui
description: Build or review a translucent "liquid glass" Apple-style desktop UI — vivid dark gradient backdrop, frosted floating panels with soft specular rims (no hard borders), a single runtime-themeable accent, letterpress text treatments, scroll-driven fades, and a frameless window with mac traffic lights. Use when styling a React/Tailwind (or plain CSS) app in this glassmorphism direction, especially Electron desktop apps. Distilled from the Digest app.
---

# Glassmorphism Apple UI

A design system for a **dark, luminous, translucent** interface: a vivid gradient
lit from the corners, frosted glass panels that *melt into the scene* (soft inset
rims, never hard 1px borders), one accent color that themes the whole app at
runtime, and restrained Apple-style motion. Built and hardened in an Electron +
React + Tailwind app.

Copy `glass.css` as a starting stylesheet, then follow the rules below. It assumes
Tailwind (arbitrary values like `text-[15px]`, `rounded-[26px]`) but the material
classes are plain CSS and work anywhere.

## The one non-negotiable: contrast follows surface, not whim

Every surface is either **dark glass (light text)** or **light glass (dark text)**.
Pick per surface and never mix. This is the rule that breaks most often during edits.

- Dark glass panels (`.leather`, `.metal`, the body backdrop) → light text
  (`.embossed`, `text-white/…`).
- Light glass panels (`.paper`, cards, modals, popovers) → dark text
  (`.engraved`, `#2e2c26`, `#7c766a` for muted).

When you flip a surface's darkness, you MUST flip its text, its muted greys, AND
any inline `text-shadow` (light shadow under dark text, dark shadow under light
text). A "low contrast" complaint almost always means text and surface disagree.

## Color & backdrop

- **One accent, themed at runtime.** Store the accent as `--accent-rgb: R G B`
  (space-separated channels) on `:root`. Everything accent-colored uses
  `rgb(var(--accent-rgb) / <alpha>)`. In Tailwind: `accent: 'rgb(var(--accent-rgb) / <alpha-value>)'`.
  Set it from JS: `document.documentElement.style.setProperty('--accent-rgb', '10 132 255')`.
  A tiny hex→channels helper: `parseInt` the hex, then `(n>>16)&255} ${(n>>8)&255} ${n&255}`.
- **Backdrop** = deep indigo base + 4 saturated radial "light" blobs in the corners,
  one of them the accent. Dark enough for white text, vivid enough to glow through
  frosted panels. See `body` in glass.css.
- Provide presets as `{name, hex}` swatches; one click updates `--accent-rgb` and
  the whole UI (buttons, selection, backdrop tint) retints live.

## Materials (the heart of it)

Four surfaces. Depth is **shadow + translucency**, never a visible border.

| Class | Role | Text |
|-------|------|------|
| `.paper` | light frosted cards, modals, popovers, note/reminder cards | dark |
| `.leather` / `.metal` | dark frosted sidebar & top bars (identical) | light |
| `.gloss` | primary button — accent gradient, glossy | white |
| `.btn-metal` | secondary button — clear light glass | dark navy |
| `.neu-inset` | pressed-in well for inputs/checkboxes | — |

Rules that make it read as *glass* and not flat translucency:
- **No `border`.** Edges are a **soft specular rim** built from inset shadows:
  a hairline `inset 0 0 0 1px rgba(255,255,255,.13)`, a bright top
  `inset 0 1px 0 rgba(255,255,255,.30)`, a faint bottom, plus an outer drop shadow.
- **Backdrop blur is expensive.** Keep it 14–16px, `saturate(140%)`, and ONLY on
  the big panels. Do NOT put `backdrop-filter` on buttons or on every small card in
  a long list — resize/scroll will stutter. (Learned the hard way: 30px blur on
  every card made window resize glitch.)
- **Clip the blur to the radius.** Chromium does not clip `backdrop-filter` to
  `border-radius` unless the element also has `overflow: hidden`. Without it you get
  ugly square blurred corners. Add `overflow: hidden` to every frosted rounded panel.
- Buttons press in: `:active { transform: translateY(1px) }` + brightness dip.

## Typography

- System font stack, optical antialiasing: SF Pro / `-apple-system` /
  `BlinkMacSystemFont` / `"Segoe UI"` / `system-ui`. Tight tracking on big titles
  (`tracking-tight`), bold weights for headings.
- **Letterpress treatments** (small but essential to the Apple feel):
  - `.embossed` — light text on dark glass, `text-shadow: 0 1px 3px rgba(0,0,0,.4)`.
  - `.engraved` — dark text on light glass, `text-shadow: 0 1px 0 rgba(255,255,255,.45)`.
  - `.stamp` — a saturated accent-pink label for dates/tags on light surfaces.
- **No emoji as UI icons.** They render inconsistently and (via byte-level edits)
  can corrupt into mojibake. Prefer text labels or inline SVG. If you must, verify
  they render on the target OS.

## Layout & spacing

- **Uniform frame.** One value everywhere: `p-6` (24px) padding around the app and
  `gap-6` between columns. Every outer gap and inter-panel gap is the same number —
  inconsistent top vs side spacing is the #1 thing that looks "off".
- **Floating rounded panels.** Sidebar and top bars are separate panels with big
  radii (`rounded-[26px]`) floating on the gradient with the frame gap between them —
  never edge-to-edge butting (that hard seam looks wrong).
- Top bars and the sidebar share the **exact same glass** (`.metal` === `.leather`)
  and align their top edges.
- Content columns: `mx-auto max-w-2xl` (or 3xl) so text has a readable measure while
  panels span full width.

## Motion (restrained, physical)

- **Enter:** `.card-enter` — 0.28s rise+fade on `cubic-bezier(.22,1,.36,1)`.
- **Scroll-driven fade:** `.scroll-fade` uses the native `animation-timeline: view()`
  so list items fade+rise in as they enter and fade out as they leave (e.g. sliding
  under a header). Wrap in `@supports (animation-timeline: view())`. Keyframes must
  use plain `%` offsets (named ranges like `entry 0%` break the CSS minifier) with
  `animation-range: entry 0% exit 100%`.
- **Edge masks:** `.fade-scroll-edges` masks the top ~22px and bottom ~56px of a
  scroll container so content dissolves at the header and bottom instead of hard-
  cutting. Gotcha: the top mask fades the first item at rest — add top padding
  (`pt-3`) so the first item clears it, and bottom padding so the last control clears
  the bottom mask.
- Keep durations 120–280ms, ease-out. No bounce.

## Desktop / Electron specifics

- **Frameless window with custom controls.** `titleBarStyle: 'hidden'` (Win 11 keeps
  rounded corners), then draw your own mac-style traffic lights (13px red/amber/green
  dots, symbols on group-hover). Wire `window:minimize/maximize/close` over IPC.
  Make Close call `app.quit()` if a hidden helper window would otherwise keep the app
  alive.
- **Drag regions:** `-webkit-app-region: drag` on the top bar / sidebar chrome;
  **every interactive child inside a drag region needs `.no-drag`** or the window
  swallows the click. (Classic bug: a header button silently doesn't fire.)
- **Translucent widget/mini window:** make the OS window `transparent: true` AND set
  the body background transparent in that window (`html.widget body { background: transparent }`),
  or the rectangular page background shows square corners behind your rounded panel.
- **Native `<input type="datetime-local">` and heavy `<select>`s never fit** — build
  a custom calendar/time popover with your own buttons. It's worth it.
- Kill visual noise: hide scrollbars (`::-webkit-scrollbar { width:0 }`,
  `scrollbar-width: none`) and disable UI-wide text selection
  (`* { user-select: none }`, re-enable on `input, textarea, [contenteditable]`) so
  Ctrl+A doesn't highlight the whole app.

## Review checklist

- [ ] Text color matches surface darkness (and so do muted greys + text-shadows).
- [ ] No `border:` on glass — rims are inset shadows only.
- [ ] `overflow: hidden` on every frosted rounded panel (corner clip).
- [ ] `backdrop-filter` only on big panels, blur ≤ 16px; none on buttons/list items.
- [ ] One `--accent-rgb`; nothing hard-codes the accent hex.
- [ ] Uniform frame/gap value; panels float, never butt edge-to-edge.
- [ ] Interactive elements inside `.drag` regions have `.no-drag`.
- [ ] Scroll edges: first/last items padded clear of the fade mask.
- [ ] No emoji as functional icons.

See `glass.css` for the copy-paste stylesheet.
