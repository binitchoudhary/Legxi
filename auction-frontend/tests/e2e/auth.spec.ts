import { test, expect } from '@playwright/test';

test.describe('Layer 4 Client Authentication & Lifecycle E2E', () => {
  test('1. Unauthenticated user accessing protected route is redirected to /login with redirect query param', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/admin/dashboard');

    // Should redirect to login page with encoded redirect param
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdashboard/, { timeout: 10000 });
  });

  test('2. Successful login establishes session, connects WebSocket, and redirects to role dashboard', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@legxi.com');
    await page.fill('input[type="password"]', 'Password123!');

    // Setup wait for authenticated WebSocket or Polling handshake
    const socketEventPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/proxy/socket.io') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await page.click('button[type="submit"]');

    // Admin user redirects to admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

    // Verify socket connection initiated
    const socketRes = await socketEventPromise;
    expect(socketRes).toBeTruthy();
  });

  test('3. Session survives browser refresh without flashing or returning to login', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@legxi.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

    // Reload page
    await page.reload();

    // Verify we remain on /admin/dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test('4. Logout revokes session, clears state, and redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@legxi.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

    // Click Sign Out
    const signOutBtn = page.getByText(/sign out/i).first();
    await signOutBtn.click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Subsequent access to /admin/dashboard redirects to /login
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdashboard/, { timeout: 10000 });
  });
});
