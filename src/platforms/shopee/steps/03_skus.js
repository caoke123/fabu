import { SELECTORS } from '../selectors.js'
import config from '../config.js'
import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { getSkuImage } from '../../../utils/fileHelper.js'
import { scrollIntoView } from '../../../utils/selector.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function batchFillCommonFields(page, product, config) {
  try {
    await scrollIntoView(page, '.product-batch-operation-bar')
    await delay(500)
    const batchBar = await page.$('.product-batch-operation-bar')
    if (!batchBar) { logger.warn('未找到批量填写区'); return }

    const jitSelect = await batchBar.$('.ssc-select')
    if (jitSelect) {
      await jitSelect.click()
      await delay(500)
      await page.waitForSelector('.ssc-option', { state: 'attached', timeout: 5000 })
      await delay(300)
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('.ssc-option')) {
          if (el.textContent?.trim() === '是' && getComputedStyle(el).display !== 'none') {
            el.click(); return
          }
        }
      })
      await delay(config.timing.actionDelay)
      logger.info('批量 JIT 已选「是」')
    }

    const fillMap = {
      '起订量':   String(config.fixedValues.minOrder),
      '单位：天': String(product.shopee.leadTime),
    }
    const inputs = await batchBar.$$('input')
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder') || ''
      const value = fillMap[placeholder]
      if (value !== undefined) {
        await input.click()
        await input.fill(value)
        await delay(300)
        logger.info(`批量填写 ${placeholder}: ${value}`)
      }
    }

    await page.click('.apply-btn')
    await delay(config.timing.actionDelay * 2)
    logger.info('批量填写已应用')

  } catch (e) {
    logger.warn(`批量填写失败: ${e.message}`)
  }
}

export async function run(page, product) {
  logger.info('=== Step 03: SKU 规格 ===')

  try {
    await page.waitForSelector(SELECTORS.sku.variantNameInputFallback, { timeout: 10000 })
    logger.info('SKU 区块已加载')
    await scrollIntoView(page, SELECTORS.sku.variantNameInput)
    await page.fill(SELECTORS.sku.variantNameInputFallback, config.fixedValues.variantName)
    await page.keyboard.press('Enter')
    logger.info(`变体名称已填入: ${config.fixedValues.variantName}`)
    await delay(config.timing.actionDelay)
  } catch (err) {
    await captureError(page, '03_skus_变体名称')
    throw err
  }

  for (let i = 0; i < product.skus.length; i++) {
    const sku = product.skus[i]
    logger.info(`添加 SKU ${i+1}/${product.skus.length}: ${sku.skuName}`)

    try {
      const nameInputs = await page.$$('.recommendation-input')
      const nameInput = nameInputs[i + 1]
      if (!nameInput) {
        logger.warn(`SKU ${i+1} 未找到名称输入框`)
        continue
      }
      const nameInputEl = await nameInput.$('input') || nameInput
      await nameInputEl.click()
      await nameInputEl.fill(sku.skuName)
      await page.keyboard.press('Enter')
      await delay(config.timing.actionDelay)
      logger.info(`SKU 名称已填入: ${sku.skuName}`)

      const skuImagePath = getSkuImage(product, i)
      if (skuImagePath) {
        logger.info(`上传 SKU 图片 ${i+1}: ${skuImagePath}`)
        try {
          await scrollIntoView(page, '.option-image-required')
          await delay(500)

          const imgAreas = await page.$$('.option-image-required')
          const imgArea = imgAreas[i]

          if (imgArea) {
            const existingImg = await imgArea.$('.ssc-upload-picture-card-img-uploading-wrapper-success')
            if (existingImg) {
              await existingImg.hover()
              await delay(300)
              const deleteBtn = await existingImg.$('ul li:nth-child(2) svg')
              if (deleteBtn) {
                await deleteBtn.click()
                await delay(config.timing.actionDelay)
                logger.info(`SKU ${i+1} 默认图片已删除`)
              }
            }

            const fileInput = await imgArea.$('input[type="file"]')
            if (fileInput) {
              await fileInput.setInputFiles(skuImagePath)
              await delay(config.timing.uploadWait)
              logger.info(`SKU ${i+1} 图片上传完成`)
            } else {
              logger.warn(`SKU ${i+1} 未找到 file input`)
            }
          }
        } catch (err) {
          logger.warn(`SKU ${i+1} 图片上传异常: ${err.message}`)
          await captureError(page, `03_skus_图片_${i+1}`)
        }
      } else {
        logger.warn(`SKU ${i+1}: SKU 图片文件不存在，跳过上传`)
      }
      await delay(config.timing.actionDelay)

      if (i < product.skus.length - 1) {
        await page.click(SELECTORS.sku.addVariantBtn)
        await delay(config.timing.actionDelay)
        logger.info('已点击添加变体')
      }
    } catch (err) {
      await captureError(page, `03_skus_选项_${i+1}`)
      throw err
    }
  }

  try {
    await page.waitForSelector(SELECTORS.sku.tableContainer, { timeout: 10000 })
    logger.info('价格表格已渲染')
    await delay(config.timing.actionDelay)
  } catch (err) {
    await captureError(page, '03_skus_等待表格')
    throw new Error('SKU 价格表格未渲染')
  }

  await batchFillCommonFields(page, product, config)

  for (let i = 0; i < product.skus.length; i++) {
    const sku = product.skus[i]
    const rowNum = i + 1

    try {
      await page.evaluate((r) => {
        const rows = document.querySelectorAll('table tbody tr')
        if (rows[r-1]) rows[r-1].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, rowNum)
      await delay(800)

      logger.info(`填写 表格行 ${rowNum}/${product.skus.length}: ${sku.skuName}`)

      const rowInputs = await page.$$(`table tbody tr:nth-child(${rowNum}) input`)

      try {
        await rowInputs[1].click()
        await rowInputs[1].fill(String(sku.sellingPrice))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 售价: ${sku.sellingPrice}`)
      } catch(e) { logger.warn(`行${rowNum} 售价失败: ${e.message}`) }

      try {
        await rowInputs[3].click()
        await rowInputs[3].fill(sku.skuCode)
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 卖家货号: ${sku.skuCode}`)
      } catch(e) { logger.warn(`行${rowNum} 卖家货号失败: ${e.message}`) }

      try {
        await rowInputs[5].click()
        await rowInputs[5].fill(String(sku.weight / 1000))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 重量: ${sku.weight / 1000}kg`)
      } catch(e) { logger.warn(`行${rowNum} 重量失败: ${e.message}`) }

      try {
        await rowInputs[6].click()
        await rowInputs[6].fill(String(product.outerPackaging.length))
        await delay(config.timing.skuRowDelay)
      } catch(e) { logger.warn(`行${rowNum} 长度失败: ${e.message}`) }

      try {
        await rowInputs[7].click()
        await rowInputs[7].fill(String(product.outerPackaging.height))
        await delay(config.timing.skuRowDelay)
      } catch(e) { logger.warn(`行${rowNum} 高度失败: ${e.message}`) }

      try {
        await rowInputs[8].click()
        await rowInputs[8].fill(String(product.outerPackaging.width))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 尺寸: ${product.outerPackaging.length}x${product.outerPackaging.height}x${product.outerPackaging.width}cm`)
      } catch(e) { logger.warn(`行${rowNum} 宽度失败: ${e.message}`) }

      try {
        const invClicked = await page.evaluate((rowNum) => {
          const rows = document.querySelectorAll('table tbody tr')
          const row = rows[rowNum - 1]
          if (!row) return false
          const placeholder = row.querySelector('.ssc-select-single-placeholder')
          if (placeholder) {
            let el = placeholder
            while (el && !el.className?.includes('ssc-select')) {
              el = el.parentElement
            }
            if (el) { el.click(); return true }
          }
          return false
        }, rowNum)

        if (invClicked) {
          await delay(config.timing.actionDelay)
          await page.waitForSelector('.ssc-option', { state: 'attached', timeout: 5000 })
          await delay(300)
          await page.evaluate(() => {
            for (const el of document.querySelectorAll('.ssc-option')) {
              if (el.textContent?.includes('default') && !el.classList.contains('disabled')) {
                el.click(); return
              }
            }
          })
          await delay(config.timing.actionDelay)
          logger.info(`行${rowNum} 邀请规格已选择`)
        } else {
          logger.warn(`行${rowNum} 未找到邀请规格触发器`)
        }
      } catch(e) { logger.warn(`行${rowNum} 邀请规格失败: ${e.message}`) }

      logger.success(`表格行 ${rowNum}/${product.skus.length} 填写完成`)
    } catch (err) {
      await captureError(page, `03_skus_row_${rowNum}`)
      throw err
    }
  }

  logger.success('=== Step 03 SKU 规格填写完成 ===')
  return { success: true }
}
