import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('all three paths work and advanced requires a correct price', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Find the missing number.' })).toBeVisible();
  await page.getByLabel('Your answer for x').fill('4');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('alert')).toContainText('Not quite balanced');
  await page.getByLabel('Your answer for x').fill('5');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toContainText('You found the balance');
  await page.getByRole('button', { name: /Standard/ }).click();
  await expect(page.getByLabel('Equation: 5x + 6 = 2x + 21')).toBeVisible();
  await page.getByLabel('Your answer for x').fill('5');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: /Advanced/ }).click();
  await page.getByLabel('Break-even hours').fill('5');
  await page.getByLabel('Shared cost').fill('30');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('alert')).toContainText('time is correct');
  await page.getByLabel('Shared cost').fill('31');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByLabel('3 of 3 paths completed')).toBeVisible();
});

test('hints, solutions, persistence, and new examples behave correctly', async ({ page }) => {
  await page.getByRole('button', { name: /A hint, please/ }).click();
  await expect(page.getByText('Start by subtracting 6 from both sides.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'See the worked solution' }).click();
  await expect(page.getByRole('heading', { name: 'Undo the multiplication' })).toBeVisible();
  await page.getByLabel('Your answer for x').fill('5');
  await page.reload();
  await expect(page.getByLabel('Your answer for x')).toHaveValue('5');
  await expect(page.getByRole('heading', { name: 'Undo the multiplication' })).toBeVisible();
  await page.getByRole('button', { name: 'New example' }).click();
  await expect(page.getByLabel('Your answer for x')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Undo the multiplication' })).not.toBeVisible();
});

test('custom core validates input and transforms all paths', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit core equation' }).click();
  const fields = page.getByRole('dialog').locator('input');
  await fields.nth(0).fill('0');
  await page.getByRole('button', { name: 'Apply to all three paths' }).click();
  await expect(page.getByRole('alert')).toContainText('coefficient');
  await fields.nth(0).fill('4');
  await fields.nth(1).fill('8');
  await fields.nth(2).fill('36');
  await page.getByRole('button', { name: 'Apply to all three paths' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByLabel('Equation: 4x + 8 = 36')).toBeVisible();
  await page.getByRole('button', { name: /Advanced/ }).click();
  await page.getByLabel('Break-even hours').fill('7');
  await page.getByLabel('Shared cost').fill('50');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Exactly right' })).toBeVisible();
});

test('about dialog closes with Escape and narrow screens do not overflow', async ({ page }) => {
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(page.getByRole('dialog')).toContainText('No API key');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('AI failure is explicit and does not break verified practice', async ({ page }) => {
  test.setTimeout(75000);
  await page.route('**/huggingface.co/**', route => route.abort());
  await page.getByRole('button', { name: 'Load private AI coach' }).click();
  await expect(page.getByRole('alert')).toContainText(/AI could not|browser could not/, { timeout: 60000 });
  await page.getByLabel('Your answer for x').fill('5');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toContainText('You found the balance');
});

test('the learning interface meets automated WCAG AA checks at every level', async ({ page }) => {
  for (const level of ['Foundation', 'Standard', 'Advanced']) {
    await page.getByRole('button', { name: new RegExp(level) }).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});

test('AI transport fixture exercises verified hint and new-practice UI wiring', async ({ page }) => {
  // This fixture checks UI integration only; it is not real-model inference.
  await page.addInitScript(() => {
    window.Worker = class {
      postMessage(data) {
        setTimeout(() => this.onmessage?.({ data: data.type === 'load'
          ? { type: 'ready' }
          : { type: 'choice', requestId: data.requestId, index: data.messages[0].content.includes('You design') ? 0 : 2 } }), 20);
      }
      terminate() {}
    };
  });
  await page.reload();
  await page.getByRole('button', { name: 'Load private AI coach' }).click();
  await page.getByRole('button', { name: 'Ask my coach' }).click();
  await expect(page.locator('.coach-response')).toContainText('Check your thinking');
  await expect(page.locator('.coach-response')).toContainText('Substitute your answer');
  await page.getByRole('button', { name: 'Create an AI practice set' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your AI coach chose a new practice set' })).toBeVisible();
  await expect(page.locator('.core-pill strong')).toContainText('2x');
  await page.getByRole('button', { name: /Standard/ }).click();
  await expect(page.locator('.coach-response')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bring it back into balance.' })).toBeVisible();
});
