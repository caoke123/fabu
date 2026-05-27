import { chromium } from 'playwright'
import config from '../config.js'
import { logger } from '../utils/logger.js'

export async function connectToBrowser(wsEndpoint) {
  logger.info(`正在连接浏览器: ${wsEndpoint}`)
  const browser = await chromium.connectOverCDP(wsEndpoint)
  logger.info('CDP 连接成功')

  const contexts = browser.contexts()
  if (contexts.length === 0) {
    throw new Error('未找到浏览器上下文，请确认浏览器已打开')
  }

  const context = contexts[0]
  let page = context.pages()[0]

  if (!page) {
    logger.info('未找到已有页面，新建页面')
    page = await context.newPage()
  }

  return { browser, context, page }
}

export async function navigateTo(page, url) {
  logger.info(`导航到: ${url}`)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: config.delay.page
  })
}

export async function disconnect(browser) {
  logger.info('断开浏览器连接')
  await browser.close()
}
