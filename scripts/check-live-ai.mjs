import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const browser = await chromium.launch(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('requestfailed', request => console.error('Failed request host:', new URL(request.url()).hostname, request.failure()?.errorText));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173/');
  await page.getByRole('button', { name: 'Load private AI coach' }).click();
  await Promise.race([
    page.getByRole('button', { name: 'Ask my coach' }).waitFor({ timeout: 190000 }),
    page.getByRole('alert').waitFor({ timeout: 190000 }).then(async () => { throw new Error(await page.getByRole('alert').innerText()); }),
  ]);
  for (const level of ['Foundation', 'Standard', 'Advanced']) {
    await page.getByRole('button', { name: new RegExp(level) }).click();
    await page.getByLabel('What are you working through?').fill('I want to check whether my answer works.');
    await page.getByRole('button', { name: 'Ask my coach' }).click();
    await Promise.race([
      page.locator('.coach-response').waitFor({ timeout: 70000 }),
      page.getByRole('alert').waitFor({ timeout: 70000 }).then(async () => { throw new Error(await page.getByRole('alert').innerText()); }),
    ]);
    console.log(level, 'real inference:', await page.locator('.coach-response').innerText());
  }
  await page.getByLabel('What are you working through?').fill('I would like a new practice set with simpler numbers.');
  await page.getByRole('button', { name: 'Create an AI practice set' }).click();
  await page.getByRole('status').filter({ hasText: 'Your AI coach chose a new practice set' }).waitFor({ timeout: 70000 });
  console.log('Real AI practice-set selection:', await page.locator('.core-pill strong').innerText());
} finally {
  await browser.close();
}
