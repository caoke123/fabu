import { SELECTORS } from '../selectors.js'
import config from '../config.js'
import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { getSkuImage } from '../../../utils/fileHelper.js'
import { scrollIntoView, waitForUploadByCount } from '../../../utils/selector.js'
import { handlePopups } from '../navigator.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function run(page, product) {
  logger.info('=== Step 03: SKU 规格 ===')

  await handlePopups(page)
  await delay(500)

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
    logger.info(`添加 SKU ${i+1}/${product.skus.length}: ${sku.nameEn}`)

    try {
      const nameInputs = await page.$$('.recommendation-input')
      const nameInput = nameInputs[i + 1]
      if (!nameInput) {
        logger.warn(`SKU ${i+1} 未找到名称输入框`)
        continue
      }
      const nameInputEl = await nameInput.$('input') || nameInput
      await nameInputEl.click()
      await nameInputEl.fill(sku.nameEn)
      await page.keyboard.press('Enter')
      await delay(config.timing.actionDelay)
      logger.info(`SKU 名称已填入: ${sku.nameEn}`)

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
              await waitForUploadByCount(page, 1, 'sku')
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

  for (let i = 0; i < product.skus.length; i++) {
    const sku = product.skus[i]
    const rowNum = i + 1
    const logistics = product.platforms.shopee.logistics

    try {
      await page.evaluate((r) => {
        const rows = document.querySelectorAll('table tbody tr.ssc-table-row')
        if (rows[r-1]) rows[r-1].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, rowNum)
      await delay(800)

      logger.info(`填写 表格行 ${rowNum}/${product.skus.length}: ${sku.nameEn}`)

      const rowBase = `table tbody tr.ssc-table-row:nth-child(${rowNum})`
      const rowSelects = await page.$$(`${rowBase} .ssc-select`)
      const rowInputs  = await page.$$(`${rowBase} input`)

      // 1. 邀请规格 (.ssc-select 第0项) — 仅首行填写
      if (i === 0 && rowSelects.length > 0) {
        try {
          await rowSelects[0].scrollIntoViewIfNeeded()
          await page.waitForTimeout(200)
          await rowSelects[0].click()
          await page.waitForTimeout(600)

          const success = await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('.ssc-option'))
            const activeOption = options.find(el => {
              const rect = el.getBoundingClientRect()
              const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none'
              return isVisible && el.textContent && el.textContent.includes('default')
            })
            if (activeOption) { activeOption.click(); return true }
            return false
          })

          if (success) {
            logger.info(`行${rowNum} 邀请规格已选择`)
          } else {
            logger.warn(`行${rowNum} 未找到可见的邀请规格 default 选项`)
          }
          await page.waitForTimeout(400)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)
        } catch(e) { logger.warn(`行${rowNum} 邀请规格失败: ${e.message}`) }
      }

      // 2. JIT (.ssc-select 第1项)
      if (logistics && logistics.jit !== undefined && rowSelects.length > 1) {
        try {
          await rowSelects[1].scrollIntoViewIfNeeded()
          await page.waitForTimeout(200)
          await rowSelects[1].click()
          await page.waitForTimeout(600)

          const jitTargetText = logistics.jit ? '是' : '否'
          const success = await page.evaluate((targetText) => {
            const options = Array.from(document.querySelectorAll('.ssc-option'))
            const activeOption = options.find(el => {
              const rect = el.getBoundingClientRect()
              const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none'
              return isVisible && el.textContent && el.textContent.trim() === targetText
            })
            if (activeOption) { activeOption.click(); return true }
            return false
          }, jitTargetText)

          if (success) {
            logger.info(`行${rowNum} JIT: ${jitTargetText}`)
          } else {
            logger.warn(`行${rowNum} 未找到可见的 JIT 选项: ${jitTargetText}`)
          }
          await page.waitForTimeout(400)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(200)
        } catch(e) { logger.warn(`行${rowNum} JIT失败: ${e.message}`) }
      }

      // 2. 售价 [1]
      try {
        await rowInputs[1].fill(String(sku.pricing.selling))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 售价: ${sku.pricing.selling}`)
      } catch(e) { logger.warn(`行${rowNum} 售价失败: ${e.message}`) }

      // 3. 起订量 [2]
      if (logistics && logistics.minimumOrderQty) {
        try {
          await rowInputs[2].fill(String(logistics.minimumOrderQty))
        } catch(e) { logger.warn(`行${rowNum} 起订量失败: ${e.message}`) }
      }

      // 4. 卖家货号 [3]
      try {
        await rowInputs[3].fill(sku.skuCode)
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 卖家货号: ${sku.skuCode}`)
      } catch(e) { logger.warn(`行${rowNum} 卖家货号失败: ${e.message}`) }

      // 5. 重量 [5]
      try {
        await rowInputs[5].fill(String(sku.weight / 1000))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 重量: ${sku.weight / 1000}kg`)
      } catch(e) { logger.warn(`行${rowNum} 重量失败: ${e.message}`) }

      // 6. 尺寸 [6]长度 [7]高度 [8]宽度
      try {
        await rowInputs[6].fill(String(sku.size.length))
        await delay(config.timing.skuRowDelay)
      } catch(e) { logger.warn(`行${rowNum} 长度失败: ${e.message}`) }
      try {
        await rowInputs[7].fill(String(sku.size.height))
        await delay(config.timing.skuRowDelay)
      } catch(e) { logger.warn(`行${rowNum} 高度失败: ${e.message}`) }
      try {
        await rowInputs[8].fill(String(sku.size.width))
        await delay(config.timing.skuRowDelay)
        logger.info(`行${rowNum} 尺寸: ${sku.size.length}x${sku.size.height}x${sku.size.width}cm`)
      } catch(e) { logger.warn(`行${rowNum} 宽度失败: ${e.message}`) }

      // 7. 备货时间 [9]
      if (logistics && logistics.leadTime) {
        try {
          await rowInputs[9].fill(String(logistics.leadTime))
        } catch(e) { logger.warn(`行${rowNum} 备货时间失败: ${e.message}`) }
      }

      logger.success(`表格行 ${rowNum}/${product.skus.length} 填写完成`)
    } catch (err) {
      await captureError(page, `03_skus_row_${rowNum}`)
      throw err
    }
  }

  logger.success('=== Step 03 SKU 规格填写完成 ===')
  return { success: true }
}
