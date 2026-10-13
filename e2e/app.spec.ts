import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';

/** Fixed USD → PEN rate so conversions are deterministic. */
async function mockExchangeRate(page: Page): Promise<void> {
  await page.route('**/open.er-api.com/**', (route) =>
    route.fulfill({ json: { result: 'success', rates: { PEN: 4 }, time_last_update_utc: '' } }),
  );
}

/** Starts the test already signed in (demo data comes from the seed). */
async function signedIn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!localStorage.getItem('lvl.session.v1')) localStorage.setItem('lvl.session.v1', '"e2e_player"');
  });
}

async function expectNoA11yViolations(page: Page): Promise<void> {
  // Let fonts and styles settle first: contrast is computed from what is actually painted.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    // Outlined step numbers ("01", "02") are decorative and aria-hidden; the real step label is
    // sr-only text. WCAG 1.4.3 exempts decorative text, but axe reads their transparent fill.
    .exclude('.text-outline')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(
    results.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} ${JSON.stringify(n.any[0]?.data ?? '')}`),
    ),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await mockExchangeRate(page);
});

test('landing: prerendered content, live rate and no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('dinero');
  await expect(page.getByText('US$ 1 = S/ 4.000')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('the dashboard asks for a session and returns to the requested page', async ({ page }) => {
  await page.goto('/app/transferir');
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fapp%2Ftransferir$/);

  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await expect(page.getByText('Escribe un gamertag para continuar.')).toBeVisible();

  await page.getByLabel('Gamertag').fill('e2e_player');
  await page.getByRole('button', { name: 'Entrar al panel' }).click();

  await expect(page).toHaveURL(/\/app\/transferir$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Transferir' })).toBeFocused();
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await signedIn(page);
  });

  test('every dashboard page passes axe', async ({ page }) => {
    for (const path of [
      '/app',
      '/app/movimientos',
      '/app/transferir',
      '/app/cofres',
      '/app/tarjetas',
      '/app/botin',
      '/app/misiones',
      '/app/squad',
      '/app/prestamos',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoA11yViolations(page);
    }
  });

  test('transfer soles to dollars end to end', async ({ page }) => {
    await page.goto('/app/transferir');
    await page.getByRole('button', { name: 'Revisar transferencia' }).click();
    await expect(page.getByRole('alert')).toContainText('Escribe cuánto quieres enviar.');

    await page.getByLabel('Monto').fill('100');
    await expect(page.getByText('Llegan US$ 25.00')).toBeVisible();
    await page.getByRole('button', { name: 'Revisar transferencia' }).click();

    await expect(page.getByRole('heading', { name: 'Confirma los datos' })).toBeFocused();
    await page.getByRole('button', { name: 'Confirmar y enviar' }).click();
    await expect(page.getByRole('heading', { name: '¡Transferencia enviada!' })).toBeVisible();

    await page.getByRole('link', { name: 'Resumen' }).first().click();
    await expect(page.getByText('S/ 1,184.50')).toBeVisible();
    await expect(page.getByText('US$ 235.00')).toBeVisible();
  });

  test('a virtual card purchase earns XP, cashback and a level up', async ({ page }) => {
    await page.goto('/app/tarjetas');
    await page.getByRole('combobox', { name: 'Tienda' }).click();
    await page.getByRole('option', { name: 'Suscripción de streaming' }).click();
    await page.getByLabel('Monto', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Pagar con la tarjeta' }).click();

    const receipt = page.getByRole('status').filter({ hasText: 'Pagaste' });
    await expect(receipt).toContainText('+60 XP');
    await expect(receipt).toContainText('Cashback S/ 1.20 (2%)');
    await expect(receipt).toContainText('¡Subiste al nivel 13!');
  });

  test('frozen cards cannot pay and deleting asks first', async ({ page }) => {
    await page.goto('/app/tarjetas');
    const freeze = page.getByRole('button', { name: 'Congelar' });
    await freeze.click();
    await expect(page.getByRole('button', { name: 'Congelada' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Necesitas una tarjeta activa')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('¿Eliminar «Tienda nueva»?')).toBeVisible();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('status').first()).toHaveText('Eliminaste la tarjeta «Tienda nueva».');
    await expect(page.getByRole('heading', { name: 'No tienes tarjetas virtuales' })).toBeVisible();
  });

  test('the themed select works with the keyboard alone', async ({ page }) => {
    await page.goto('/app/movimientos');
    const account = page.getByRole('combobox', { name: 'Cuenta' });
    await account.focus();
    await page.keyboard.press('ArrowDown');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { name: 'Todas las cuentas' })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toContainText('Cuenta en dólares');
    await expect(account).toBeFocused();
    await expect(page.getByText('4 movimientos')).toBeVisible();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(account).toHaveAttribute('aria-expanded', 'false');
  });

  test('an activated partner offer applies to the next card purchase', async ({ page }) => {
    await page.goto('/app/botin');
    await page.getByRole('button', { name: 'Activar +10% de cashback en gift cards' }).click();
    await expect(page.getByRole('button', { name: 'Desactivar +10% de cashback en gift cards' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: 'Usar ahora' }).click();

    await expect(page).toHaveURL(/\/app\/tarjetas\?tienda=gift$/);
    await expect(page.getByText('Se aplica:')).toBeVisible();
    await page.getByLabel('Monto', { exact: true }).fill('50');
    await page.getByRole('button', { name: 'Pagar con la tarjeta' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Pagaste' })).toContainText('Cofre Andino: +S/ 5.00 de cashback extra');
  });

  test('saving into a goal completes a weekly mission that pays XP', async ({ page }) => {
    await page.goto('/app/cofres');
    await page.getByLabel('Monto', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status').first()).toHaveText('Guardaste S/ 60.00 en «Consola nueva».');
    await expect(page.getByText('S/ 300.00').first()).toBeVisible();

    await page.goto('/app/misiones');
    await page.getByRole('button', { name: 'Reclamar 200 XP' }).click();
    await expect(page.getByRole('status').first()).toContainText('+200 XP');
    await expect(page.getByText('Reclamada').first()).toBeVisible();
  });

  test('split a subscription and record a payment from the squad', async ({ page }) => {
    await page.goto('/app/squad');
    await page.getByRole('button', { name: 'Registrar pago de Diego' }).first().click();
    await expect(page.getByText('2 de 3 pagaron')).toBeVisible();

    await page.getByLabel('Servicio').fill('Música');
    await page.getByLabel('Precio mensual').fill('30');
    await page.getByRole('checkbox', { name: /Ana/ }).check();
    await expect(page.getByText('Cada uno paga S/ 15.00')).toBeVisible();
    await page.getByRole('button', { name: 'Pagar y dividir' }).click();

    await expect(page.getByRole('heading', { name: 'Música' })).toBeVisible();
    await expect(page.getByText('0 de 1 pagaron')).toBeVisible();
  });

  test('loan simulator: monthly payment for the default loan', async ({ page }) => {
    await page.goto('/app/prestamos');
    await expect(page.getByText('TEA 26.50%')).toBeVisible();
    await expect(page.getByText('S/ 263.70')).toBeVisible();
    await page.getByText('Ver cronograma de pagos').click();
    await expect(page.getByRole('table')).toContainText('24');
  });

  test('mobile navigation keeps five items and hides the rest under "Más" @mobile', async ({ page }) => {
    await page.goto('/app');
    const bar = page.getByRole('navigation', { name: 'Panel' }).last();
    await expect(bar.getByRole('listitem')).toHaveCount(5);

    const more = bar.getByRole('button', { name: 'Más' });
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mas-menu').getByRole('link', { name: 'Squad' }).click();

    await expect(page).toHaveURL(/\/app\/squad$/);
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    );
  });
});
