import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { updateOverlay } from '../../../utils/overlay.js'
import { handlePopups } from '../navigator.js'

const LABEL_MAP = {
  brand: '品牌',
  origin: '原产地',
  material: '材质',
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// ─── 输入框填写 ───
async function fillInput(page, labelName, textValue) {
  const formItem = page.locator('.attribute-select-item').filter({ hasText: labelName }).first()
  if (await formItem.count() === 0) {
    logger.warn(`  ⚠️ 未找到属性行: [${labelName}]`)
    return
  }

  const input = formItem.locator('input.eds-input, input[type="text"], textarea').first()
  if (await input.count() > 0) {
    await input.scrollIntoViewIfNeeded()
    await input.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await input.fill(textValue)
    logger.info(`  ✅ [输入框] ${labelName} → "${textValue}"`)
  } else {
    logger.warn(`  ⚠️ [${labelName}] 未找到 input.eds-input`)
  }
}

// ─── 普通下拉 ───
async function selectDropdown(page, labelName, targetValue) {
  const formItem = page.locator('.attribute-select-item').filter({ hasText: labelName }).first()
  if (await formItem.count() === 0) {
    logger.warn(`  ⚠️ 未找到属性行: [${labelName}]`)
    return
  }

  const trigger = formItem.locator('.eds-select, .eds-selector__inner').first()
  if (await trigger.count() === 0) {
    logger.warn(`  ⚠️ [${labelName}] 未找到下拉触发器`)
    return
  }

  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await page.waitForTimeout(600)

  const popover = page.locator(
    '.eds-popover:visible, .eds-dropdown:visible, [class*="dropdown"]:visible, [class*="popover"]:visible'
  ).last()
  const options = popover.locator('.eds-option, [class*="option" i]')
  const count = await options.count()
  let matched = false

  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).textContent()
    if (text.trim() === targetValue) {
      await options.nth(i).click()
      matched = true
      break
    }
  }

  if (!matched) {
    await trigger.click()
    logger.warn(`  ⚠️ [${labelName}] 未找到值 "${targetValue}"，已收起`)
  } else {
    logger.info(`  ✅ [下拉] ${labelName} → "${targetValue}"`)
  }
  await page.waitForTimeout(300)
}

// ─── 搜索下拉 ───
async function fillSearchDropdown(page, labelName, targetValue) {
  const formItem = page.locator('.attribute-select-item').filter({ hasText: labelName }).first()
  if (await formItem.count() === 0) {
    logger.warn(`  ⚠️ 未找到属性行: [${labelName}]`)
    return
  }

  const trigger = formItem.locator('.eds-select, .eds-selector__inner').first()
  if (await trigger.count() === 0) {
    logger.warn(`  ⚠️ [${labelName}] 未找到下拉触发器`)
    return
  }

  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await page.waitForTimeout(600)

  const popover = page.locator('.eds-popover:visible, .eds-dropdown:visible, [class*="popover"]:visible').last()
  const searchInput = popover.locator('input[type="text"], input.eds-input').first()

  if (await searchInput.count() > 0 && await searchInput.isVisible()) {
    await searchInput.fill(targetValue)
    await page.waitForTimeout(800)

    const options = popover.locator('.eds-option, [class*="option" i]')
    const count = await options.count()
    let matched = false

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent()
      if (text.trim() === targetValue) {
        await options.nth(i).click()
        matched = true
        break
      }
    }

    if (!matched) {
      const addNewBtn = popover.locator(
        'text="添加新选项", text="Add Custom Value", [class*="add" i]'
      ).first()
      if (await addNewBtn.count() > 0 && await addNewBtn.isVisible()) {
        await addNewBtn.click()
      } else {
        await searchInput.press('Enter')
      }
    }
    logger.info(`  ✅ [搜索下拉] ${labelName} → "${targetValue}"`)
  } else {
    logger.warn(`  ⚠️ [${labelName}] popover 内无搜索框，回退普通下拉`)
    await selectDropdown(page, labelName, targetValue)
  }
  await page.waitForTimeout(300)
}

// ─── 自定义值下拉 (图案等需点"添加新选项"的字段) ───
async function fillCustomValueDropdown(page, labelName, targetValue) {
  const formItem = page.locator('.attribute-select-item').filter({ hasText: labelName }).first()
  if (await formItem.count() === 0) {
    logger.warn(`  ⚠️ 未找到属性行: [${labelName}]`)
    return
  }

  const trigger = formItem.locator('.eds-select, .eds-selector__inner').first()
  if (await trigger.count() === 0) {
    logger.warn(`  ⚠️ [${labelName}] 未找到下拉触发器`)
    return
  }

  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await page.waitForTimeout(600)

  // 1. 点击 "添加新选项"
  const addBtn = page.locator('.eds-option-add').first()
  if (await addBtn.count() > 0 && await addBtn.isVisible()) {
    await addBtn.click()
    await page.waitForTimeout(500)

    // 2. 填入自定义值
    const addInput = page.locator('.eds-option-add input').first()
    if (await addInput.count() > 0 && await addInput.isVisible()) {
      await addInput.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Backspace')
      await page.keyboard.type(targetValue, { delay: 50 })
      await page.waitForTimeout(300)

      // 3. 点击确认按钮
      const confirmBtn = page.locator('.eds-option-add__add-confirm-icon, .eds-option-add button').first()
      if (await confirmBtn.count() > 0 && await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(300)
        logger.info(`  ✅ [自定义下拉] ${labelName} → "${targetValue}"`)
      } else {
        await addInput.press('Enter')
        logger.info(`  ✅ [自定义下拉] ${labelName} → "${targetValue}" (Enter)`)
      }
    }
  } else {
    // 回退：普通下拉
    logger.warn(`  ⚠️ [${labelName}] 未找到添加新选项，回退普通下拉`)
    await selectDropdown(page, labelName, targetValue)
  }
  await page.waitForTimeout(300)
}
export async function run(page, product) {
  logger.info('=== Step 02: 属性填写 ===')
  await updateOverlay(page, '属性', 'running', '开始填写属性')

  const attrs = product.platforms?.shopee?.attributes
  if (!attrs || Object.keys(attrs).length === 0) {
    logger.info('⚠️ 无属性数据，跳过')
    await updateOverlay(page, '属性', 'success', '无属性，已跳过')
    return
  }

  await page.waitForSelector('.attribute-select-container-new', { timeout: 10000 })
  await delay(1000)

  await handlePopups(page)

  // 先展开"显示更多"
  try {
    const showMoreBtn = page.locator(
      '.attribute-select-showmore, .eds-button.primary-link-button',
      { hasText: /显示更多|Show more/ }
    ).first()
    if (await showMoreBtn.count() > 0 && await showMoreBtn.isVisible()) {
      logger.info('🔍 展开 [显示更多] …')
      await showMoreBtn.click()
      await page.waitForTimeout(600)
    }
  } catch (e) {
    logger.warn(`展开显示更多失败: ${e.message}`)
  }

  for (const [key, value] of Object.entries(attrs)) {
    const labelName = LABEL_MAP[key] || key
    logger.info(`⚙️ [${key}] → "${value}"`)

    try {
      if (labelName.includes('尺寸') || labelName.includes('Size') || labelName.includes('长宽高')) {
        await fillInput(page, labelName, value)
      } else if (labelName === '图案' || labelName === 'Pattern') {
        await fillCustomValueDropdown(page, labelName, value)
      } else if (labelName === '材质') {
        await fillSearchDropdown(page, labelName, value)
      } else {
        await selectDropdown(page, labelName, value)
      }
      await updateOverlay(page, '属性', 'success', `${labelName}: ${value}`)
    } catch (e) {
      await captureError(page, `02_attributes_${key}`)
      logger.warn(`${labelName} 填写失败: ${e.message}`)
    }
  }

  logger.success('=== Step 02 属性填写完成 ===')
  await updateOverlay(page, '属性', 'success', '属性填写完成')
}
