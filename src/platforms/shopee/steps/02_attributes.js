import config from '../config.js'
import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { updateOverlay } from '../../../utils/overlay.js'
import { scrollIntoView } from '../../../utils/selector.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function selectAttribute(page, labelText, optionText, stepName) {
  try {
    const clicked = await page.evaluate((labelText) => {
      const items = document.querySelectorAll('.attribute-select-item')
      for (const item of items) {
        if (item.innerText && item.innerText.includes(labelText)) {
          const trigger = item.querySelector('.eds-selector__inner')
          if (trigger) {
            trigger.click()
            return true
          }
        }
      }
      return false
    }, labelText)

    if (!clicked) {
      logger.warn(`未找到属性项「${labelText}」，跳过`)
      return
    }

    await delay(config.timing.actionDelay)

    await page.waitForSelector('.eds-option', {
      state: 'attached',
      timeout: 8000
    })
    await delay(500)

    const optionClicked = await page.evaluate((optionText) => {
      const options = document.querySelectorAll('.eds-option')
      for (const el of options) {
        if (
          el.innerText &&
          el.innerText.trim() === optionText &&
          !el.classList.contains('disabled')
        ) {
          el.click()
          return true
        }
      }
      return false
    }, optionText)

    if (!optionClicked) {
      logger.warn(`未找到选项「${optionText}」，跳过`)
      return
    }

    await delay(config.timing.actionDelay)
    logger.info(`${labelText} 已选择: ${optionText}`)
    await updateOverlay(page, '属性', 'success', `${labelText}: ${optionText}`)

  } catch (e) {
    await captureError(page, `02_attributes_${stepName}`)
    logger.warn(`${labelText} 填写失败，跳过: ${e.message}`)
  }
}

export async function run(page, product) {
  logger.info('=== Step 02: 属性填写 ===')
  await updateOverlay(page, '属性', 'running', '开始填写属性')

  await page.waitForSelector('.attribute-select-container-new', { timeout: 10000 })
  logger.info('属性区已加载')
  await delay(1000)

  await scrollIntoView(page, '.attribute-select-container-new')

  await selectAttribute(page, '品牌', 'NoBrand', '品牌')
  await selectAttribute(page, '原产地', '中国大陆', '原产地')

  logger.success('=== Step 02 属性填写完成 ===')
  await updateOverlay(page, '属性', 'success', '属性填写完成')
}
