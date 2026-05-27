import { SELECTORS } from '../selectors.js'
import globalConfig from '../../../config.js'
import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { clickWithFallback, scrollIntoView } from '../../../utils/selector.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function run(page, product) {
  logger.info('=== Step 04: 提交 ===')

  const mode = globalConfig.submitMode

  try {
    if (mode === 'draft') {
      logger.info('草稿模式：跳过提交，请人工检查后手动发布')
      await captureError(page, '04_submit_draft_final')
      logger.success('草稿模式完成，最终截图已保存')
      return { success: true, mode: 'draft' }
    }

    if (mode === 'publish') {
      logger.info('发布模式：开始提交')
      await scrollIntoView(page, SELECTORS.submit.publishBtn)
      await clickWithFallback(page, SELECTORS.submit.publishBtn, SELECTORS.submit.publishBtnFallback, '发布按钮')
      await delay(5000)
      await captureError(page, '04_submit_publish_final')
      logger.success('发布请求已提交')
      return { success: true, mode: 'publish' }
    }

    logger.warn(`未知提交模式: ${mode}，按草稿处理`)
    await captureError(page, '04_submit_unknown_final')
    return { success: true, mode: 'draft' }
  } catch (err) {
    await captureError(page, '04_submit')
    throw err
  }
}
