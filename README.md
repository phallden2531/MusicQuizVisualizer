# Off the Record

A live music quiz about your colleagues. A song mentions one person but describes another. Players scan a QR code, follow the lyrics, and lock one guess. The host reveals the real subject with a photo that comes into focus before the leaderboard appears.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Set your host password and a random session secret of at least 32 characters in `.env`. Open [localhost:3000](http://localhost:3000) and select **Host a quiz**. Local uploads and game records are kept in `.data/local`, outside Git.

To test on phones, open the host page through the computer’s LAN address (for example, `http://192.168.1.20:3000/host`). The QR code uses that address. Keep the computer and phones on the same network and permit incoming connections to port 3000.

## Prepare and run a show

1. In **The lineup**, add every colleague players can choose, one per line. Include misleading names mentioned in the songs.
2. In **The setlist**, add songs with a private title, lyrics, audio, a picture, and the correct colleague. MP3/M4A files can be up to 30 MB and 30 minutes; JPEG/PNG/WebP pictures up to 10 MB. Save the quiz. Unfinished songs can be saved as drafts; a live room needs every song complete.
3. Create a live room. Open the presentation in a separate tab on the host computer, connect the room’s speakers, and click **Enable room audio**. Only one presentation tab can own playback.
4. Put the presentation on the projector/TV. Players scan its QR code or enter the room code on the home page, then join with a unique nickname. Maximum 15 players; new players join only in the lobby. The host can remove a player from the lobby (for example, a misspelled nickname) with the × on their name.
5. Start the first song from the host panel. Phones display full lyrics and the complete colleague roster. Each player locks one guess. The host panel stays private.
6. When playback finishes, a server-controlled 15-second countdown begins. Answers close automatically. Click **Reveal the colleague** when ready: the picture sharpens over five seconds, then the name, how the room voted, and the scores appear. While a song plays, the host panel shows its title, progress, and who has locked a guess, never what they chose.
7. Start the next song or show the final standings. A fresh room uses the current saved quiz; edits never change a game already created. **End game early** shows the final standings immediately; a song that was not yet revealed does not count.

Correct guesses earn `round(1000 - 500 × min(elapsed / (audio duration + 15 seconds), 1))` points. Wrong or missing guesses earn zero. The server records submission time, excludes paused time, and acknowledges answers only after saving. Equal totals share rank. No correctness or current-round scores are sent to players before the reveal completes.

## Interruptions

If audio stops, its connection stalls, or the presentation disconnects, the game pauses and stops accepting answers. Reconnect/reload the presentation, enable audio if requested, then click **Resume round** on the host panel. Audio resumes from its last known position; time without audio does not count against answers. Refreshing a player’s page preserves identity and a locked guess. Server restarts preserve the game and pause interrupted rounds; no offline time counts toward scoring. Keep the presentation tab active and prevent the computer from sleeping.

## Deploy to Azure

The app uses **one Linux Azure App Service B1 instance** and a **private Standard LRS Storage account**. Blob versioning and seven-day soft deletion are enabled. The app accesses storage through its system-assigned managed identity; anonymous Blob access and storage shared keys are disabled. Keep App Service at one instance: live connections and the mutation queue belong to one process. ETag conditions prevent a second process from silently overwriting state.

Install Azure CLI with Bicep and sign in. Your account needs permission to create resources and assign the **Storage Blob Data Contributor** role. The commands below create billable resources; no resources are created by the build or tests.

```sh
az login
az group create --name music-quiz --location swedencentral
az deployment group create --resource-group music-quiz \
  --template-file infra/main.bicep --parameters appName=YOUR-UNIQUE-APP-NAME
```

Azure CLI prompts for the required secure `hostPassword` (at least 10 characters) and `sessionSecret` (at least 32 characters). Use a randomly generated session secret; keep the same value across application updates. Do not commit secrets or include them in shell history.

Build and package locally, then deploy the archive:

```sh
npm run package:azure
az webapp deploy --resource-group music-quiz --name YOUR-UNIQUE-APP-NAME \
  --src-path dist/deploy/music-quiz.zip --type zip
```

The packaging command requires the `zip` utility. Azure installs production dependencies and runs the precompiled server; the React build is served from the same origin. Managed identity role assignments can take several minutes to propagate; restart the app if its first boot reports storage authorization failure.

Visit `https://YOUR-UNIQUE-APP-NAME.azurewebsites.net/api/health`, then `/host`. Run a sound check and a complete test round before the event. If using a custom domain, update `PUBLIC_ORIGIN` to the exact HTTPS origin. Always On, HTTPS, WebSockets, and `/api/health` checks are configured by Bicep. App Service log streaming receives structured server errors; do not enable verbose request-body logging.

## Verification

```sh
npm test                  # domain, persistence, HTTP, and real Socket.IO integration
npm run build             # typecheck + production client/server builds
npx playwright install chromium
npm run test:e2e          # real browser: studio → mobile join → audio → reveal → final standings
az bicep build --file infra/main.bicep --stdout > /dev/null
```

Tests use synthetic MP3 audio and a generated image fixture, not colleague content. The service tests exercise 15 simultaneous joins. Browser screenshots and failure traces are written to `test-results/`.

## Structure and configuration

- `client/`: studio, presentation, and mobile player views.
- `server/game.ts`: rules, timing, scoring, and role-specific projections.
- `server/service.ts`: serialized changes and persistence before publication.
- `server/app.ts`: authenticated HTTP routes and Socket.IO transport.
- `server/storage.ts`: atomic local storage and conditional Azure Blob writes.
- `shared/types.ts`: public views and persisted domain types.

Environment: `HOST_PASSWORD`, `SESSION_SECRET`, `PORT` (default `3000`), `DATA_DIR` (local only), `NODE_ENV=production`, `AZURE_STORAGE_ACCOUNT_URL`, `AZURE_STORAGE_CONTAINER` (default `quiz`), `PUBLIC_ORIGIN` (production HTTPS origin). Production refuses to start without Azure storage. The schema is versioned at `1`; future migrations must explicitly preserve old game records.

First version: one host, one room, individual players, and shared room audio. Teams, remote audio playback, and synchronized karaoke lyrics are outside this version.
