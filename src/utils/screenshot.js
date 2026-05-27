import fs from 'node:fs'
import path from 'node:path'
import { logger } from './logger.js'

const SCREENSHOT_DIR = 'screenshots'

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
}

function getTimestamp() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  const h = String(t.getHours()).padStart(2, '0')
  const min = String(t.getMinutes()).padStart(2, '0')
  const s = String(t.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}-${min}-${s}`
}

export async function captureError(page, stepName) {
  ensureScreenshotDir()
  const filename = `${getTimestamp()}_${stepName}.png`
  const filepath = path.join(SCREENSHOT_DIR, filename)
  try {
    await page.screenshot({ path: filepath, fullPage: true })
    logger.error(`截图已保存: ${filepath}`)
  } catch (err) {
    logger.warn(`截图失败: ${err.message}`)
  }
}
