import { expect, test } from '@playwright/test'
import path from 'node:path'

const sampleKaraokePath = path.join(
  process.cwd(),
  'src',
  'assets',
  'catalog',
  'minecraft',
  'Short_Minecraft.karaoke.json',
)

test('catalog search and demo playback state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Catalogue' }).click()

  await expect(page.locator('.line-count')).toHaveText('12 titre(s)')
  await page.getByRole('searchbox', { name: 'Rechercher un titre' }).fill('Démo 10')

  await expect(page.locator('.catalog-search__meta')).toHaveText('1 / 12 titre(s)')
  await expect(page.locator('.catalog-track__title')).toHaveText('Démo 10')

  await page.locator('.catalog-track').click()

  await expect(page.locator('.lyrics-display__title')).toHaveText('Démo 10')
  await expect(page.locator('.lyrics-display__artist')).toHaveText('Karaoke Maker')
  await expect(page.locator('[role="progressbar"]')).toHaveCount(1)
})

test('settings language and color update the app state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()

  await expect(page.getByRole('heading', { name: 'Préférences' })).toBeVisible()
  await expect(page.getByText('Raccourcis', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Choisir English (États-Unis)' }).click()

  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible()
  await expect(page.getByText('Shortcuts', { exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')

  await page.getByRole('button', { name: 'Choose Français (France)' }).click()
  await page.getByLabel('Couleur principale').fill('#73a9ff')

  await expect(page.locator('.color-picker code')).toHaveText('#73A9FF')
  await page.getByRole('button', { name: 'Restaurer la couleur par défaut' }).click()
  await expect(page.locator('.color-picker code')).toHaveText('#7BD2BD')
})

test('generator imports an existing karaoke JSON for editing', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="file"]').nth(2).setInputFiles(sampleKaraokePath)

  await expect(page.getByRole('heading', { name: 'Minecraft UDSS' })).toBeVisible()
  await expect(page.getByText('Timeline des lignes')).toBeVisible()
  await expect(page.locator('.timeline-block')).toHaveCount(30)
  await expect(page.getByRole('button', { name: 'Exporter' })).toBeEnabled()

  await page.getByLabel('Offset').fill('120')
  await page.getByLabel('Offset').press('Tab')
  await expect(page.locator('.timeline-offset__value')).toContainText('+00:00.120')
})
