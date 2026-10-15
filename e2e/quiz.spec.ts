import { test, expect } from '@playwright/test';
import { makeAudio, image } from '../tests/fixtures';

test('host prepares a quiz and a mobile player completes a live round', async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/host');
  await page.getByLabel('Host password').fill('e2e-host-password');
  await page.getByRole('button', { name: 'Enter the studio' }).click();
  await expect(page.getByRole('heading', { name: 'Your quiz studio' })).toBeVisible();
  // Reset the editable quiz through the API so this scenario can be repeated.
  await page.request.put('/api/quiz', {
    data: { title: 'The colleagues sessions', colleagues: [], songs: [] },
  });
  await page.reload();
  await page.getByRole('button', { name: 'The lineup' }).click();
  await page.getByLabel('Colleague names').fill('Alex\nSam\nJordan');
  await page.getByRole('button', { name: 'Add colleagues' }).click();
  await page.getByRole('button', { name: 'The setlist' }).click();
  await page.getByRole('button', { name: 'Add a song', exact: true }).click();
  await page.getByLabel('Song title').fill('The coffee conspiracy');
  await page.getByLabel('Lyrics').fill('Alex is always early\nBut who makes coffee for the team?');
  await page.getByLabel('Correct colleague').selectOption({ label: 'Sam' });
  await page
    .getByLabel('Upload audio')
    .setInputFiles({ name: 'clue.mp3', mimeType: 'audio/mpeg', buffer: makeAudio(3) });
  await expect(page.getByText('Audio uploaded')).toBeVisible();
  await page
    .getByLabel('Upload picture')
    .setInputFiles({ name: 'sam.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByText('Picture uploaded')).toBeVisible();
  await page.getByRole('button', { name: 'Save quiz', exact: true }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Create live room' }).click();
  await expect(page.getByRole('heading', { name: 'The room is yours' })).toBeVisible();
  const link = await page.getByRole('link', { name: 'Open presentation' }).getAttribute('href');
  const room = link!.split('/').pop()!;
  const screen = await page.context().newPage();
  screen.on('pageerror', (error) => errors.push(error.message));
  await screen.goto(link!);
  await screen.getByRole('button', { name: 'Enable room audio' }).click();
  await expect(page.getByText('Presentation ready')).toBeVisible();
  const playerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const player = await playerContext.newPage();
  player.on('pageerror', (error) => errors.push(error.message));
  await player.goto(`/join/${room}`);
  await player.getByLabel('Your nickname').fill('Detective P');
  await player.getByRole('button', { name: 'Join the room' }).click();
  await expect(player.getByRole('heading', { name: 'You’re on the guest list.' })).toBeVisible();
  await screen.screenshot({ path: 'test-results/lobby-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Start first song' }).click();
  await expect(player.getByRole('heading', { name: 'Who’s this really about?' })).toBeVisible();
  await player.getByRole('button', { name: 'Sam', exact: true }).click();
  await player.getByRole('button', { name: 'Lock my guess' }).click();
  await expect(player.getByText('Your guess is locked')).toBeVisible();
  await player.reload();
  await expect(player.getByText('Your guess is locked')).toBeVisible();
  await expect(player.getByText('Last call for guesses')).toBeVisible({ timeout: 15000 });
  await player.screenshot({ path: 'test-results/player-mobile.png', fullPage: true });
  expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Reveal the colleague' })).toBeEnabled({
    timeout: 20000,
  });
  await expect(player.getByText('Waiting for the big reveal')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal the colleague' }).click();
  await expect(player.getByText('Coming into focus')).toBeVisible();
  await expect(player.getByRole('heading', { name: 'Sam', exact: true })).toBeVisible({
    timeout: 10000,
  });
  await expect(player.getByText('You got it')).toBeVisible();
  await screen.screenshot({ path: 'test-results/reveal-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Show final standings' }).click();
  await expect(player.getByRole('heading', { name: 'That’s a wrap.' })).toBeVisible();
  expect(errors).toEqual([]);
  await playerContext.close();
  await screen.close();
});

test('presentation reconnect resumes a paused round and preloads the next song', async ({
  browser,
  page,
}) => {
  await page.request.post('/api/host/login', { data: { password: 'e2e-host-password' } });
  const audioResponse = await page.request.post('/api/assets', {
    multipart: {
      kind: 'audio',
      file: { name: 'tone.mp3', mimeType: 'audio/mpeg', buffer: makeAudio(4) },
    },
  });
  const audio = await audioResponse.json();
  const pictureResponse = await page.request.post('/api/assets', {
    multipart: {
      kind: 'image',
      file: { name: 'portrait.png', mimeType: 'image/png', buffer: image },
    },
  });
  const picture = await pictureResponse.json();
  await page.request.put('/api/quiz', {
    data: {
      title: 'The encore',
      colleagues: [
        { id: 'alex', name: 'Alex' },
        { id: 'sam', name: 'Sam' },
      ],
      songs: ['sam', 'alex'].map((correctColleagueId, index) => ({
        id: `encore${index}`,
        title: `Encore ${index + 1}`,
        lyrics: 'Follow the lyrics to the real colleague.',
        audioId: audio.id,
        imageId: picture.id,
        durationMs: audio.durationMs,
        correctColleagueId,
      })),
    },
  });
  const gameResponse = await page.request.post('/api/games');
  const game = await gameResponse.json();
  await page.goto('/host');
  const screen = await page.context().newPage();
  await screen.goto(`/screen/${game.roomCode}`);
  await screen.getByRole('button', { name: 'Enable room audio' }).click();
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerContext.newPage();
  await player.goto(`/join/${game.roomCode}`);
  await player.getByLabel('Your nickname').fill('Encore detective');
  await player.getByRole('button', { name: 'Join the room' }).click();
  await page.getByRole('button', { name: 'Start first song' }).click();
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(player.getByText('A little intermission.')).toBeVisible();
  await expect(player.getByRole('button', { name: 'Sam', exact: true })).toBeDisabled();
  await screen.reload();
  await screen.getByRole('button', { name: 'Enable room audio' }).click();
  await page.getByRole('button', { name: 'Resume round' }).click();
  await player.getByRole('button', { name: 'Sam', exact: true }).click();
  await player.getByRole('button', { name: 'Lock my guess' }).click();
  await expect(page.getByRole('button', { name: 'Reveal the colleague' })).toBeEnabled({
    timeout: 25000,
  });
  await page.getByRole('button', { name: 'Reveal the colleague' }).click();
  await expect(player.getByRole('heading', { name: 'Sam', exact: true })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Presentation ready')).toBeVisible();
  await page.getByRole('button', { name: 'Start next song' }).click();
  await player.getByRole('button', { name: 'Alex', exact: true }).click();
  await player.getByRole('button', { name: 'Lock my guess' }).click();
  await expect(page.getByRole('button', { name: 'Reveal the colleague' })).toBeEnabled({
    timeout: 25000,
  });
  await page.getByRole('button', { name: 'Reveal the colleague' }).click();
  await expect(player.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Show final standings' }).click();
  await expect(player.getByRole('heading', { name: 'That’s a wrap.' })).toBeVisible();
  await playerContext.close();
  await screen.close();
});

test('edits made while a save is in flight remain unsaved instead of being discarded', async ({
  page,
}) => {
  await page.request.post('/api/host/login', { data: { password: 'e2e-host-password' } });
  await page.request.put('/api/quiz', {
    data: {
      title: 'Save test',
      colleagues: [
        { id: 'alex', name: 'Alex' },
        { id: 'sam', name: 'Sam' },
      ],
      songs: [
        {
          id: 'draft',
          title: 'Original title',
          lyrics: '',
          audioId: '',
          imageId: '',
          durationMs: 0,
          correctColleagueId: '',
        },
      ],
    },
  });
  await page.goto('/host');
  await page.getByRole('button', { name: 'Quiz studio', exact: true }).click();
  await page.getByLabel('Song title').fill('Submitted title');
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestEntered = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route('**/api/quiz', async (route) => {
    if (route.request().method() === 'PUT') {
      entered();
      await gate;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Save quiz', exact: true }).click();
  await requestEntered;
  await page.getByLabel('Song title').fill('Newer edits while saving');
  release();
  await expect(page.getByRole('button', { name: 'Save quiz', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Song title')).toHaveValue('Newer edits while saving');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
});
