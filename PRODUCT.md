# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Players:** up to 15 colleagues in one room at an after-work office party, lights dimmed, drinks in hand. They join on their own phones by QR code or room code, read lyrics, and lock one guess per song.
- **Host:** one colleague who prepares the quiz beforehand (lineup, songs, lyrics, audio, photos) on a laptop, then runs the live room from a private host panel during the party.
- **The room:** everyone watches a projector or TV showing the presentation screen, which is also the only audio source.

## Product Purpose

A live music quiz about colleagues. Each original song mentions one person but describes another. Players read between the lyrics and guess who the song is really about. The host reveals the real subject with a photo that sharpens into focus, then the room's votes and the leaderboard. Success is a room that laughs, argues and cheers at each reveal.

## Positioning

The songs are written about the people in the room. The answer is always a colleague, and the misleading name in the lyrics is part of the game.

## Operating Context

- Three views: host (studio for preparation + live room control), presentation (projector, audio, QR code), player (phone).
- Flow per song: host starts → song plays on the room speakers → phones show full lyrics and the roster → players lock one guess → when the song ends (or the host ends the round once everyone has guessed) a five-second blurred-photo reveal starts → name, room votes, scores → next song starts by itself after ten seconds, or the host shows the final standings.
- Interruptions pause the round; host resumes explicitly.

## Capabilities and Constraints

- Max 15 players, one host, one game, one presentation at a time. No accounts; nickname only. Players join only in the lobby.
- English UI. Full (not timed) lyrics. Five-second reveal. Scoring: one point per correct guess, no speed bonus. A revealed colleague leaves the roster.
- Correctness is never shown to players before the reveal; the host panel never shows what anyone chose.
- React + TypeScript (Vite), Socket.IO, Node/Express server, Azure App Service + Blob Storage.

## Brand Commitments

- Name: **Off the Record**.

## Evidence on Hand

- No real songs, photos or colleague names ship in the repository; all quiz content is entered by the host at runtime. Test fixture audio in `tests/assets/tone.m4a`.

## Product Principles

1. The room is the stage: the projector view is read from across a dim room and carries the drama.
2. The phone is a quiet instrument: lyrics readable, one decisive guess, nothing that leaks the answer.
3. The host stays in control and never sees what anyone chose.
4. The reveal is the moment; everything builds toward it.

## Accessibility & Inclusion

- Reduced-motion support for the reveal.
- Projector text must be legible from the back of a room; phone lyrics legible in low light.
