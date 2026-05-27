import { logger } from './logger.js'

export async function clickWithFallback(page, primary, fallback, label) {
  try {
    await page.waitForSelector(primary, { timeout: 3000 })
    await page.click(primary)
    logger.info(`${label} (primary)`)
  } catch {
    logger.warn(`primary 失效，尝试 fallback: ${label}`)
    await page.waitForSelector(fallback, { timeout: 8000 })
    await page.click(fallback)
    logger.info(`${label} (fallback)`)
  }
}

export async function fillWithFallback(page, primary, fallback, value, label) {
  try {
    await page.waitForSelector(primary, { timeout: 3000 })
    await page.fill(primary, String(value))
    logger.info(`${label}: ${value} (primary)`)
  } catch {
    logger.warn(`primary 失效，尝试 fallback: ${label}`)
    await page.waitForSelector(fallback, { timeout: 8000 })
    await page.fill(fallback, String(value))
    logger.info(`${label}: ${value} (fallback)`)
  }
}

export async function waitForWithFallback(page, primary, fallback, label, timeout = 8000) {
  try {
    await page.waitForSelector(primary, { timeout: 3000 })
    logger.info(`元素已出现: ${label} (primary)`)
    return true
  } catch {
    logger.warn(`primary 未出现，尝试 fallback: ${label}`)
    await page.waitForSelector(fallback, { timeout })
    logger.info(`元素已出现: ${label} (fallback)`)
    return true
  }
}

/**
 * 滚动元素到屏幕中央并高亮显示
 * @param {Page} page
 * @param {string} selector - 要滚动到的元素选择器
 */
export async function scrollIntoView(page, selector) {
  try {
    await page.evaluate((selector) => {
      const el = document.querySelector(selector)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const original = el.style.outline
      el.style.outline = '2px solid #1890ff'
      el.style.transition = 'outline 0.3s'
      setTimeout(() => { el.style.outline = original }, 1500)
    }, selector)
    await page.waitForTimeout(400)
  } catch {
    // 静默失败，不影响主流程
  }
}
