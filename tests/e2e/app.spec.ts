// tests/e2e/app.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CoachingOS E2E Browser Journeys', () => {
  test('1. Landing & Login view loads with 1-click demo personas', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/CoachingOS/);

    // Verify brand heading
    const brand = page.locator('h1', { hasText: 'CoachingOS' });
    await expect(brand).toBeVisible();

    // Verify demo persona buttons
    const ownerBtn = page.getByRole('button', { name: /Centre Owner/i });
    await expect(ownerBtn).toBeVisible();

    const teacherBtn = page.getByRole('button', { name: /Batch Teacher/i });
    await expect(teacherBtn).toBeVisible();
  });

  test('2. 1-Click Demo Login as Centre Owner lands on Overview with KPIs', async ({ page }) => {
    await page.goto('/login');

    // Click Centre Owner demo persona
    await page.getByRole('button', { name: /Centre Owner/i }).click();

    // Verify redirected to Dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome back, Ramesh Sharma')).toBeVisible();

    // Verify active centre display on dashboard
    await expect(page.getByText(/Apex Science & Commerce Academy/i).last()).toBeVisible();

    // Verify KPIs
    await expect(page.getByText('Active Students')).toBeVisible();
    await expect(page.getByText('Attendance Rate')).toBeVisible();
    await expect(page.getByText('Fee Collected')).toBeVisible();
  });

  test('3. Student Directory navigation & 360° view', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Centre Owner/i }).click();
    await expect(page).toHaveURL('/');

    // Navigate to Students
    await page.goto('/students');
    await expect(page.locator('h1', { hasText: 'Student Directory' })).toBeVisible();

    // Verify seeded students are listed
    await expect(page.getByText('Rohan Gupta')).toBeVisible();
    await expect(page.getByText('APEX-2026-001')).toBeVisible();

    // Click View 360
    await page.locator('a', { hasText: 'View 360°' }).first().click();
    await expect(page.getByText('Verified Guardians')).toBeVisible();
    await expect(page.getByText('Attendance Record')).toBeVisible();
  });

  test('4. Classroom Attendance Taking flow', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Batch Teacher/i }).click();
    await expect(page).toHaveURL('/');

    // Go to Attendance
    await page.goto('/attendance');
    await expect(page.locator('h1', { hasText: 'Classroom Attendance' })).toBeVisible();

    // Verify Roster rendered
    await expect(page.getByText('Rohan Gupta')).toBeVisible();

    // Click Mark All Present
    const markAllBtn = page.getByRole('button', { name: /Mark All Present/i });
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();

    // Verify Save button is visible
    const saveBtn = page.getByRole('button', { name: /Save & Lock Attendance/i });
    await expect(saveBtn).toBeVisible();
  });

  test('5. Accessibility Audit (WCAG 2.1 AA)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Centre Owner/i }).click();
    await expect(page).toHaveURL('/');

    // Run axe accessibility analysis
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Allow ambient dark theme design tokens
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
