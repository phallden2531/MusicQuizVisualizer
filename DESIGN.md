---
name: Off the Record
description: Office-party name tags and raffle tickets on a lanyard-navy ground, for a colleague music quiz.
colors:
  sticker-red: '#d42b25'
  sticker-red-deep: '#b0201b'
  raffle-yellow: '#f6c945'
  badge-pink: '#f39bbb'
  badge-teal: '#48c1b0'
  badge-teal-deep: '#17695e'
  navy-950: '#0d1530'
  navy-900: '#111a38'
  navy: '#17234a'
  navy-700: '#1f2d5c'
  navy-600: '#2a3b72'
  navy-500: '#3a4d8a'
  paper: '#fbf8f2'
  paper-2: '#f1ece1'
  paper-line: '#d9d1c1'
  ink: '#14161f'
  ink-muted: '#5b5850'
  text: '#fbf8f2'
  muted: '#aab4d8'
  muted-2: '#8591c0'
typography:
  display:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(2.6rem, 6.2vw, 5.4rem)'
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: '-0.04em'
  headline:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(2.2rem, 4.4vw, 3.6rem)'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.03em'
  phone-headline:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(2.2rem, 10vw, 3.2rem)'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.04em'
  stage-display:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(3rem, 6vw, 7rem)'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.045em'
  stage-headline:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(2.2rem, 3.8vw, 4.8rem)'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.04em'
  stage-title:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(2rem, 2.8vw, 3.6rem)'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.03em'
  figure:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2.5rem'
    fontWeight: 800
    lineHeight: 1
    fontFeature: 'tnum'
  heading:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.03em'
  title:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.03em'
  subtitle:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1.375rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  lead:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.55
  lyrics:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.45
  label:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 700
    letterSpacing: '0.1em'
  micro:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '0.625rem'
    fontWeight: 800
    letterSpacing: '0.1em'
  tag-hello:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '3em'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '0.01em'
  marker-name:
    fontFamily: 'Permanent Marker, Bricolage Grotesque Variable, cursive'
    fontSize: '2.3em'
    fontWeight: 400
    lineHeight: 1.12
  serial:
    fontFamily: 'Bricolage Grotesque Variable, Bricolage Grotesque, system-ui, sans-serif'
    fontSize: 'clamp(3rem, 5vw, 6rem)'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '0.08em'
    fontFeature: 'tnum'
rounded:
  xs: '4px'
  sm: '6px'
  md: '10px'
  lg: '12px'
  xl: '16px'
  2xl: '20px'
  pill: '999px'
  strip: '0.2em'
  tag: '1em'
spacing:
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '22px'
  xl: '28px'
  2xl: '40px'
  3xl: '48px'
  gutter: 'clamp(16px, 4vw, 48px)'
  gutter-phone: '16px'
  gutter-projector: '4vw'
components:
  button-primary:
    backgroundColor: '{colors.sticker-red}'
    textColor: '{colors.paper}'
    rounded: '{rounded.button}'
    padding: '0 22px'
    height: '50px'
  button-primary-hover:
    backgroundColor: '{colors.sticker-red-deep}'
    textColor: '{colors.paper}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.text}'
    rounded: '{rounded.button}'
    padding: '0 22px'
    height: '50px'
  button-secondary-hover:
    backgroundColor: '{colors.navy-700}'
  button-secondary-on-sheet-hover:
    backgroundColor: '{colors.paper-2}'
    textColor: '{colors.ink}'
  name-tag:
    backgroundColor: '{colors.sticker-red}'
    textColor: '{colors.paper}'
    rounded: '{rounded.tag}'
    padding: '0.55em 0.55em 0.7em'
    width: '11em'
  name-tag-strip:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    typography: '{typography.marker-name}'
    rounded: '{rounded.strip}'
    padding: '0.25em 0.45em'
  ticket:
    backgroundColor: '{colors.raffle-yellow}'
    textColor: '{colors.ink}'
    rounded: '{rounded.ticket}'
  guest-badge:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.badge}'
    padding: '15px 12px 7px'
  suspect:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.suspect}'
    padding: '28px 12px 11px'
    height: '66px'
  sheet:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sheet}'
    padding: 'clamp(20px, 3vw, 34px)'
  input:
    backgroundColor: '{colors.navy-950}'
    textColor: '{colors.text}'
    rounded: '{rounded.input}'
    padding: '12px 14px'
  input-on-sheet:
    backgroundColor: '#ffffff'
    textColor: '{colors.ink}'
    rounded: '{rounded.input}'
    padding: '12px 14px'
  status-badge:
    backgroundColor: '{colors.navy-700}'
    textColor: '{colors.muted}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '7px 12px'
  nav-tab-active:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.input}'
    padding: '10px 16px'
---

# Design System: Off the Record

## Overview

**Creative North Star: "The Name Tag"**

Every song wears one colleague's name tag; the room has to find whose it really is. The whole client is built from that one object. A lanyard-navy ground fills every viewport, and the only things that sit on it are office-party ephemera: red HELLO my-name-is stickers with names written in marker, perforated raffle tickets in yellow, pink and teal carrying codes and numbers, and small name badges with a coloured top band. The host's working surfaces are paper sheets laid on the same navy. Nothing is a generic card on the room surfaces.

The world is printed and handled, not lit. Objects are slightly tilted (between about 0.5 and 7 degrees), cast one soft, deep drop shadow, and keep their tactile shapes: rounded sticker corners, notched ticket edges, dotted perforation lines. Two typefaces split the work along the same line as the real objects: Bricolage Grotesque is everything printed on the sticker or ticket, Permanent Marker is only ever a name someone wrote by hand. The density scales with the viewer: the projector is enormous and sparse, read from the back of a dim room; the phone is a quiet single column; the host studio is a normal-density operating surface on paper.

Motion has one signature: the slap-on settle. A tag or badge arrives a little oversized and rotated, then settles onto its tilt with an exponential ease-out while its shadow tightens. The reveal uses it to stick the true name tag onto the photo. Everything else moves only to report state.

This world replaced an earlier dark game-show stage with a single neon accent; that look is rejected.

**Key Characteristics:**

- Lanyard-navy ground on every viewport, including host screens.
- Objects, not cards: name tags, raffle tickets, top-band badges, paper sheets.
- Marker type for names only; a heavy grotesque for everything printed.
- Slight tilts and one soft object shadow give every object weight.
- One slap-on settle as the signature motion; static under reduced motion.

## Colors

A deep, slightly violet navy carries four sticker inks (red, yellow, pink, teal) and an off-white paper; the inks always sit on objects, never wash the ground.

### Primary

- **Sticker Red** (`sticker-red`): the HELLO name tag itself, the brand mark, the primary button, the strike line through a decoy name, the active-nav dot and the text caret. It is the colour of the answer: the true name tag at the reveal is always red.
- **Pressed Sticker Red** (`sticker-red-deep`): hover state of the primary button only.

### Secondary

- **Raffle Yellow** (`raffle-yellow`): the default raffle ticket (room invite, join-code ticket), the emphasised second clause of a headline, the leader's rank, the correct row in the vote bars, count chips on active tabs, track numbers, the focus ring and text selection. It means "this one" or "look here".

### Tertiary

- **Badge Teal** (`badge-teal`): the live/connected status dot, points just added, a badge band tone, and the decoy tag in the hero art.
- **Deep Badge Teal** (`badge-teal-deep`): success text on paper (uploaded file confirmations), where plain teal would not hold contrast.
- **Badge Pink** (`badge-pink`): a badge band tone and the result ticket for a wrong guess.

Red, teal, yellow and pink rotate in that order as the tone of guest badges, suspect badges and lineup rows, so a room of names reads as a pile of different badges.

### Neutral

- **Lanyard Navy** (`navy`): the ground of every page, and the browser theme colour.
- **Navy 950 / 900** (`navy-950`, `navy-900`): recessed wells on the ground: dark-ground inputs, the host nav track.
- **Navy 700 / 600 / 500** (`navy-700`, `navy-600`, `navy-500`): raised tints on the ground: status badges, notices, active tabs, standings rules, input and secondary-button outlines.
- **Paper** (`paper`) and **Ground Text** (`text`, the same off-white): the writing strip of a name tag, badge and suspect bodies, sheets, the QR backing, and all primary text on navy.
- **Paper 2** (`paper-2`) and **Paper Line** (`paper-line`): hover fills and hairlines inside sheets.
- **Ink** (`ink`) and **Ink Muted** (`ink-muted`): text on paper, yellow, pink and teal.
- **White** (`white`): input fields inside sheets, one step brighter than the paper around them.
- **Paper Placeholder** (`paper-placeholder`) and **Paper Dot** (`paper-dot`): placeholder text on paper and on name-tag strips, and the idle status dot on a guest badge.
- **Teal Wash** (`teal-wash`): the fill of an upload zone once its file is in.

### Feedback

- **Error Ground / Error Text** (`error-ground`, `error-text`): error notices on navy, outlined in sticker red.
- **Error Ground Light / Error Text Light** (`error-ground-light`, `error-text-light`): the same notice inside a paper sheet.
- **Shadow Ink** (`shadow-ink`): the near-black navy every object shadow is mixed from. Translucent tints of any token are written as `color-mix(in srgb, var(--token) N%, transparent)`, never as raw `rgb()`.
- **Muted / Muted 2** (`muted`, `muted-2`): secondary text and captions on navy, placeholders.

### Named Rules

**The Ink-On-Light Rule.** Text colour follows the object, not the screen: paper text on red only; ink on paper, yellow, pink and teal. The `tone-*` classes set this pair (`--c`, `--on`) together and must be used together.

**The Inks-Stay-On-Objects Rule.** Red, yellow, pink and teal fill stickers, tickets, badge bands and small marks. They never become a page or section background; the ground is always navy.

## Typography

**Display Font:** Bricolage Grotesque Variable (with system-ui), optical sizing on
**Name Font:** Permanent Marker (falls back to Bricolage Grotesque)

**Character:** A heavy, slightly quirky grotesque that looks like the printed parts of a sticker, against a felt-tip marker that looks like someone wrote their name on it. The contrast between the two is the whole idea of the game.

### Hierarchy

Every size comes from one ramp, set as `--fs-*` tokens on `:root`; nothing in the stylesheet uses a literal size. App UI steps in rem: micro 0.625, caption 0.75, small 0.875, body 1, lead 1.125, subtitle 1.375, title 1.75, heading 2.25 and figure 2.5. Headlines are fluid. The projector has its own fluid stage steps, and its smaller text is in em of `--fs-stage-base`, so the whole screen scales together.

- **Display** (800, `--fs-display` `clamp(2.6rem, 6.2vw, 5.4rem)`, line-height 0.98, -0.04em): home and login hero headlines. On the projector: **Stage Display** `clamp(3rem, 6vw, 7rem)` for the finale, **Stage Headline** `clamp(2.2rem, 3.8vw, 4.8rem)` for the lobby headline, song heading and access screens, **Stage Title** `clamp(2rem, 2.8vw, 3.6rem)` for the leaderboard heading.
- **Headline** (800, `--fs-headline` `clamp(2.2rem, 4.4vw, 3.6rem)`, 1.02, -0.03em): host page headings. **Phone Headline** `clamp(2.2rem, 10vw, 3.2rem)` is the one size for every phone h1.
- **Heading** (800, 2.25rem): empty-state and live-room status headings. **Title** (800, 1.75rem): sheet headings, the phone's "The usual suspects", reveal captions. **Subtitle** (800, 1.375rem): small section headings. **Figure** (800, 2.5rem, tabular): room codes and metrics in app UI.
- **Body** (400, 1rem, line-height 1.55, pretty wrap): copy and notices. **Lead** (1.125rem): intros (max 34em), emphasised lines and marker names in lists. **Small** (0.875rem): field labels, notes, footers, status lines.
- **Lyrics** (phone: Lead 1.125rem / 1.65; projector: weight 500, line-height 1.5, fitted to the panel and balanced into columns with a navy-600 rule).
- **Label** (700, 0.75rem, +0.1em tracking, written in capitals): table column headers, field hints beside a field label, metric captions. **Micro** (800, 0.625rem): the printed HELLO on suspect badges and the YOU chip.
- **Tag HELLO** (800, 3em of the tag's base size, 0.95): the word HELLO on a name tag; "my name is" below it at 650, 1.1em.
- **Marker Name** (Permanent Marker, 2.3em of the tag's base size, 1.12): every person's name: tag strips, badges, suspects, standings, vote rows, and the brand name "Off the Record".
- **Serial** (800, tabular numerals, `clamp(3rem, 5vw, 6rem)` on the projector, +0.08em): room codes and score totals.

Headings are weight 800 with negative tracking and balanced wrapping; numbers in scores, ranks, timers and tallies are always tabular.

### Named Rules

**The Marker-Is-A-Name Rule.** Permanent Marker is used for names and nothing else. If the text is not something a person would write on their own sticker, it is set in Bricolage Grotesque.

**The Yellow Second Clause Rule.** A headline may turn its second clause or final punctuation yellow (`em` or `.accent`): "Do you know the person?", "Or do you?", the period in "Your quiz studio." One yellow phrase per headline, never the whole line.

## Layout

Three shells share one ground:

- **Page shell** (home, host): max 1280px, side gutter `clamp(16px, 4vw, 48px)`, a 22px top bar with the brand sticker left. Home and login are a two-column grid (1.1fr / 0.9fr, gap 48 to 56px) of copy beside an object (decoy tags, join ticket, login sheet). The host studio is a 300px song sidebar beside a paper editor sheet (gap 28px); the live room is a 1.05fr / 0.95fr two-sheet grid.
- **Presentation shell** (projector): full viewport, 4vw gutter, base font `clamp(16px, 1.15vw, 22px)` with all inner sizes in em and vh/vw so the 1920x1080 composition scales as one. The lobby is a 1.2fr / 0.8fr grid: giant tilted HELLO tag and headline left, the yellow invite ticket right, guest badges along the bottom. A round fills the viewport height with the lyrics panel taking the remaining space; results put the photo-and-tag column beside the leaderboard (0.9fr / 1.1fr, gap 5vw).
- **Player shell** (phone): one column, max 520px, 16px gutters. Suspects sit in a two-column grid (gap 14px / 12px); the lock button is full width.

Spacing steps cluster at 8, 12, 16, 22, 28, 40 and 48px; the projector uses vh/vw steps (about 1.6vh, 3vh, 4.5vh) instead of pixels.

**Responsive:** at 1100px the studio and live-room grids collapse to one column; at 860px home and login stack with the decoy art moved above the copy and shrunk, the projector lobby and results stack, and a round may scroll; at 640px the join form stacks, field rows and upload grids go single column, and host nav hides its icons.

### Named Rules

**The Projector-In-Em Rule.** Inside the presentation shell, size everything in em or viewport units off the shell's clamped base, never in fixed px, so the room view stays one composition at any projector resolution.

## Elevation & Depth

Depth is physical: objects lie on the navy ground and cast one soft, deep shadow (`--shadow-object`); the ground itself is flat and there is no glow, gradient lighting or glass. Tints of navy (700 to 500) raise status and notice surfaces without shadows. Paper sheets, name tags, tickets, badges, the brand and the reveal photo all share the same object shadow, so everything on the table sits at the same height. A lifted object (a selected suspect, a tag mid-slap) gets a longer, darker shadow; when it settles the shadow returns to the object shadow.

### Shadow Vocabulary

- **Object** (`0 18px 32px -18px rgb(5 9 26 / 0.85), 0 3px 6px -2px rgb(5 9 26 / 0.35)`): every resting object: tags, tickets, badges, sheets, the brand, the reveal photo.
- **Resting suspect** (`0 8px 14px -10px rgb(5 9 26 / 0.9)`): the smaller suspect badges on the phone.
- **Lifted suspect** (`0 0 0 3px #f6c945, 0 22px 26px -14px rgb(5 9 26 / 0.95)`): the picked suspect, with a yellow 3px edge.
- **Slap start** (`0 50px 60px -24px rgb(5 9 26 / 0.7)`): the first frame of the slap-on settle.
- **Red button lift** (`0 10px 20px -12px rgb(212 43 37 / 0.9)`): under the primary button only.

### Named Rules

**The Same-Table Rule.** All resting objects share one shadow. Lift is a state (picked, arriving), never a hierarchy level.

## Shapes

Shapes come from real stationery. Name tags have generous corners (1em of their own size) with a paper writing strip (0.2em corners) set inside. Raffle tickets have 10px (`--r-md`) corners and two semicircular notches cut from the side edges with a CSS mask (`--notch`, 9px to 22px by size), plus dotted 3 to 4px perforation lines in ink at 40% separating a serial or score. Guest badges are paper with 10px corners and a 9px coloured top band; suspect badges are paper with a coloured HELLO band across the top. Corners come from one scale (`--r-*`): xs 4px, sm 6px, md 10px, lg 12px, xl 16px, 2xl 20px and pill. Sheets use 2xl; photos, upload zones, the host nav track and the sound-check banner xl; buttons, notices and song rows lg; inputs, tickets, badges and suspects md; small chips sm; progress and vote bars are pills.

Tilt is part of the shape language. Tags take explicit tilts (-7 to 5 degrees through the `tilt` prop), tickets and badges small fixed tilts (about -1.2 to 2.5 degrees), and repeated badges cycle -2, 1.5 and -0.5 degrees so a row never looks machine-aligned. Small numbered marks (track numbers, how-to steps) are yellow squares tilted -3 to -4 degrees. Sheets, inputs and buttons stay straight: tools are level, ephemera is tilted.

## Components

### Name Tag (signature)

_The HELLO my-name-is sticker; the product's central object._

- **Structure:** a coloured body (default Sticker Red) with "HELLO" (Tag HELLO type) and "my name is", then a paper strip holding the name in Marker. The base size comes from `--tag-*` tokens and everything inside scales in em: fixed `xs` 7px, `sm` 9px, `md` 13px and `lg` 17px for phone and host, and fluid stage sizes for the projector: `stage-sm` `clamp(9px, 0.75vw, 14px)`, `stage-md` `clamp(11px, 1vw, 20px)`, `stage-lg` `clamp(14px, 1.4vw, 26px)` and `stage-xl` `clamp(18px, 1.9vw, 34px)`.
- **Tones:** red (default, and always the true answer), teal for a decoy tag, yellow/pink for result tags.
- **Tilt:** set per use through `--tilt`.
- **Behaviour:** with `slap`, it plays the slap-on settle on mount. The join form puts the nickname input directly into the strip (transparent, centred, marker type). A decoy name is shown struck through with a red bar rotated -8 degrees.

### Raffle Ticket

_The carrier for codes and numbers._

- **Shape:** notched sides, 10px corners, default Raffle Yellow with ink text; tones match the name tag.
- **Uses:** the projector invite (QR on paper, room code as its serial below a dotted line, tilted 2.5 degrees), the home join-code ticket (dashed ink-bordered paper input, letter-spaced code, tilted -1.2 degrees), the host invite row and the phone's personal result (yellow for right, pink for wrong, points after a dotted divider).

### Guest Badge

_A joined player, stuck along the bottom of the lobby._

- Paper body, 9px coloured top band in the rotating tone, marker name at 1.125rem, object shadow, cycling tilt. Each badge slap-settles in as the player joins (0.55s). In the host room it carries a connection dot and a remove button.

### Suspect Badge

_The phone's answer choice._

- Paper badge with a coloured HELLO band on top, marker name at 1.125rem, 66px minimum height, 10px corners, alternating ±0.6 degree tilt.
- **Selected:** lifts 5px and tilts to -2.5 degrees with the lifted-suspect shadow and a yellow edge, plus a red check. Locking replaces the grid with a small slapped name tag.

### Buttons

- **Shape:** 12px corners, 50px minimum height, 0 22px padding, weight 750.
- **Primary:** Sticker Red with paper text and the red lift shadow; hover darkens to Pressed Sticker Red and rises 1px; active presses down 1px.
- **Secondary:** transparent with a 1.5px navy-500 inset outline; hover fills navy-700. On a sheet the outline becomes paper-line and hover fills paper-2.
- **Icon buttons:** 42px squares, muted icon, navy-700 (or paper-2 on a sheet) hover; destructive icons turn red on hover.
- **Text links:** underlined at 1.5px, offset 4px, underline at 45% of the text colour, full on hover.
- **Disabled:** 42% opacity, shadow removed.

### Paper Sheet (host)

_The host's working surface._

- Paper, 20px corners, `clamp(20px, 3vw, 34px)` padding, object shadow, ink text. Used for the login form, the song editor, the lineup form, the live-room control panel and empty states. Inside a sheet, inputs turn white with paper-line borders, secondary text becomes ink-muted, and the focus outline becomes ink.

### Inputs / Fields

- **On navy:** navy-950 fill, 1.5px navy-500 border, 10px corners, 12px 14px padding, red caret. Focus: yellow border plus a 3px yellow ring at 22%.
- **On a sheet:** white fill, paper-line border; focus: ink border plus a 3px yellow ring at 60%.
- **Labels:** 0.875rem weight 700, with an optional capitalised hint in Label type beside it ("HOST ONLY").
- **Upload zones:** 16px corners, dashed paper-line border, a solid teal border and a pale teal fill once a file is in.

### Status Badge and Notices

- **Status badge:** navy-700 pill, Label type, a 8px status dot (teal with a soft ring when live or connected).
- **Notices:** navy-700, 12px corners; errors use a red inset outline; paused and connection notices use a yellow outline on a 13% yellow tint.

### Navigation (host)

- A navy-900 track (16px corners, 4px padding) of 10px-cornered buttons; the active one is a paper chip with ink text. Section tabs below use navy-700 for the active tab and a yellow count chip.

### Standings and Votes

- **Standings:** rows separated by navy-600 hairlines, tabular numbers, marker names; the leader's rank is a yellow trophy, the viewing player's name is yellow, and points just added are teal. The finale on both projector and phone shows the top three as a podium of name tags (winner centred on the projector, on top on the phone), with fourth place onward listed below; a crowded projector list flows into two columns.
- **Votes:** marker name, 12px pill bar on paper at 10%, filled at 50% paper; the correct row turns yellow. Bars are drawn at their final width, with no animation.

### Reveal

- A 4:5 photo with 16px corners and the object shadow, starting blurred at 24px and scaled to 1.08, sharpening linearly over the five-second reveal; then the red name tag with the true name slaps on, overlapping the photo's bottom edge by 2.6em.

### Brand

- A small red HELLO sticker reading "Off the Record" in Marker on its strip, tilted -3 degrees; hover straightens and scales to 1.03.

### Motion grammar

- **Ease:** `cubic-bezier(0.16, 1, 0.3, 1)` (exponential ease-out) for all object motion.
- **Slap-on settle (the signature):** 0.6s on name tags, 0.55s on guest badges: from the tag's tilt minus 9 degrees at scale 1.35 with the slap-start shadow, to its own tilt at scale 1 with the object shadow. It plays only where something gets stuck down: a player joining, a guess locking, the true name at the reveal.
- **State feedback:** colour and border changes at 0.18s; suspect lift 0.3s; button press 0.25s.
- **Report motion:** only the reveal blur, which tracks the reveal timer. The now-playing equalizer and the vote bars are static; the slap stays the one authored moment. The loading spinner is the only other animation.
- **Reduced motion:** every animation and transition is removed and the reveal photo is not scaled; objects appear at their final tilt.

## Do's and Don'ts

### Do:

- **Do** put every surface on Lanyard Navy and let the objects carry the colour.
- **Do** set every person's name in Permanent Marker on paper (or in yellow when it is the viewer's own or the correct one), and everything else in Bricolage Grotesque.
- **Do** pair tone and text with the `tone-*` classes: paper on red, ink on yellow, pink and teal.
- **Do** give tags, tickets and badges a small tilt and the single object shadow; keep sheets, inputs and buttons level.
- **Do** put codes and scores on a raffle ticket or in tabular weight-800 numerals.
- **Do** use the slap-on settle (0.55 to 0.6s, exponential ease-out) when something is stuck down, and only then.
- **Do** keep the true answer as a red name tag, revealed only at the reveal.
- **Do** size projector content in em and viewport units off the shell's clamped base.

### Don't:

- **Don't** return to the dark game-show stage with a single neon accent: no glows, spotlights or neon lime.
- **Don't** wrap room content (projector and phone) in generic boxed cards; use a name tag, ticket, badge or plain text on navy. Paper sheets belong to the host.
- **Don't** use Permanent Marker for headings, buttons, labels or copy.
- **Don't** fill a page or section background with red, yellow, pink or teal.
- **Don't** add a second entrance animation or a bouncy/elastic ease; the slap-on settle is the only settle.
- **Don't** give objects different shadow depths at rest to show hierarchy.
- **Don't** turn a whole headline yellow; at most one clause or the final punctuation.
