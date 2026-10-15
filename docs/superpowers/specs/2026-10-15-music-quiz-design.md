# Colleague Music Quiz

Approved in the planning conversation: an Azure-hosted music game show for at most 15 people in one room. Players join by QR code and nickname without accounts. The host prepares a colleague roster and ordered rounds containing audio, lyrics, a photo, and the correct colleague. Lyrics are full text, not timed karaoke. Players choose one colleague from the full roster and lock one guess. Correctness stays hidden.

The presentation screen is the sole audio source. The host starts rounds; answers close automatically 15 seconds after actual playback ends. The host triggers a five-second blurred-photo reveal; the name, round points, and leaderboard appear only afterward. The host controls the next song; the last round ends with a podium. Correct guesses earn 1,000 to 500 points linearly over the song and grace period, using server receipt time. Tied totals share rank.

Three views: host, presentation, player. Dark music game show theme with bright accents, readable lyrics, mobile layouts, and reduced-motion support. Host access uses a configured password and secure session. No new players after the lobby; refreshing/reconnecting retains identity. Freeze quiz content per game. Handle audio failure, disconnects, and server recovery with a paused round and explicit host resume.

React/TypeScript frontend, Node/TypeScript backend, Socket.IO updates, one always-on Azure App Service instance, private Blob Storage for media and versioned JSON records, managed identity for storage. Persist accepted answers before acknowledgment, serialize writes, and send role-specific state without early answer/photo access. Include infrastructure and deployment documentation; do not provision billable infrastructure without an explicit deployment request.

Defaults: English, individual players, one host/game/presentation, five-second reveal, full lyrics. Out of scope: teams, remote audio, synchronized lyrics, concurrent games.
