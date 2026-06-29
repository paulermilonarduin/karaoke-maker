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
const sampleAudioPath = path.join(
  process.cwd(),
  'src',
  'assets',
  'catalog',
  'minecraft',
  'Short_Minecraft.mp3',
)

test('catalog search and demo playback state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Que voulez-vous faire ?' })).toBeVisible()
  await page.getByRole('button', { name: /Ouvrir le catalogue/ }).click()
  await page.getByRole('searchbox', { name: 'Rechercher un titre' }).fill('Démo 10')

  await expect(page.locator('.catalog-track')).toHaveCount(1)
  await expect(page.locator('.catalog-track__title')).toHaveText('Démo 10')

  await page.locator('.catalog-track').click()

  await expect(page.locator('.lyrics-display__title')).toHaveText('Démo 10')
  await expect(page.locator('.lyrics-display__artist')).toHaveText('Karaoke Maker')
  await expect(page.locator('[role="progressbar"]')).toHaveCount(1)
})

test('settings language and color update the app state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click()

  await expect(page.getByRole('dialog', { name: 'Paramètres' })).toBeVisible()
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

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Que voulez-vous faire ?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ouvrir les paramètres' })).toBeFocused()
})

test('generator imports an existing karaoke JSON for editing', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Créer un karaoké/ }).click()
  await page.getByRole('button', { name: /Ouvrir un projet/ }).click()
  await page.locator('input[type="file"]').setInputFiles(sampleKaraokePath)
  await expect(page.getByRole('heading', { name: 'Sélectionnez la musique' })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles(sampleAudioPath)
  await page.getByRole('button', { name: 'Confirmer et continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Synchronisez les paroles' })).toBeVisible()
  await page.getByRole('button', { name: 'Ouvrir l’éditeur' }).click()

  await expect(page.getByRole('heading', { name: 'Minecraft UDSS' })).toBeVisible()
  await expect(page.getByText('Timeline des lignes')).toBeVisible()
  await expect(page.locator('.timeline-block')).toHaveCount(30)
  await expect(page.getByRole('button', { name: 'Exporter' })).toBeEnabled()

  await page.getByLabel('Offset').fill('120')
  await page.getByLabel('Offset').press('Tab')
  await expect(page.locator('.timeline-offset__value')).toContainText('+00:00.120')
})

test('new project wizard confirms audio and lyrics before editing', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Créer un karaoké/ }).click()
  await page.getByRole('button', { name: /Nouveau projet/ }).click()

  await expect(page.getByRole('heading', { name: 'Sélectionnez la musique' })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles(sampleAudioPath)
  await page.getByRole('button', { name: 'Confirmer et continuer' }).click()

  await expect(page.getByRole('heading', { name: 'Ajoutez les paroles' })).toBeVisible()
  await page.getByLabel('Paroles', { exact: true }).fill('Première ligne\nDeuxième ligne')
  await expect(page.getByText('2 lignes seront ajoutées à la timeline.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmer et continuer' }).click()

  await expect(page.getByRole('heading', { name: 'Synchronisez les paroles' })).toBeVisible()
  await page.getByRole('button', { name: 'Paroles', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ajoutez les paroles' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmer et continuer' }).click()
  await page.getByRole('button', { name: 'Ouvrir l’éditeur' }).click()

  await expect(page.getByText('Timeline des lignes')).toBeVisible()
  await expect(page.locator('.timeline-block')).toHaveCount(2)

  await page.getByRole('button', { name: 'Sauvegarder le projet' }).click()
  await expect(page.getByRole('button', { name: 'Projet sauvegardé' })).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Créer un karaoké/ }).click()
  await page.getByRole('button', { name: /Ouvrir un projet/ }).click()
  await expect(page.locator('.saved-project')).toHaveCount(1)
  await page.locator('.saved-project').click()

  await expect(page.getByRole('heading', { name: 'Short_Minecraft' })).toBeVisible()
  await expect(page.locator('.timeline-block')).toHaveCount(2)
})
