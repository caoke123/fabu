import { SELECTORS } from '../selectors.js'
import config from '../config.js'
import { logger } from '../../../utils/logger.js'
import { captureError } from '../../../utils/screenshot.js'
import { clickWithFallback, fillWithFallback, scrollIntoView } from '../../../utils/selector.js'
import { getMainImages, getDetailImages } from '../../../utils/fileHelper.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function run(page, product) {
  logger.info('=== Step 01: 基础信息填写 ===')

  // 1. 选品类
  try {
    await scrollIntoView(page, '.ssc-input-cascader-container-single')
    const { selectCategory } = await import('../navigator.js')
    await selectCategory(page, product.category)
  } catch (err) {
    await captureError(page, '01_basicInfo_选品类')
    throw err
  }

  // 2. 删除预填主图
  try {
    logger.info('检查预填主图...')
    let i = 0
    while (true) {
      const imgs = await page.$$('.basic-form-item-item_images-container .ssc-upload-picture-card-img-uploading-wrapper-success')
      if (!imgs[0]) break

      await imgs[0].hover()
      await delay(500)

      const deleteBtn = await imgs[0].$('ul > li:nth-child(2) > svg')
      if (deleteBtn) {
        await deleteBtn.click()
        await delay(config.timing.actionDelay)
        i++
        logger.info(`已删除预填主图 ${i}`)
      } else {
        break
      }
    }
    if (i === 0) {
      logger.info('无预填主图，跳过删除')
    } else {
      logger.success(`预填主图已清除，共 ${i} 张`)
    }
  } catch (err) {
    await captureError(page, '01_basicInfo_删除预填主图')
    throw err
  }
  await delay(config.timing.actionDelay)

  // 3. 上传主图
  try {
    const mainImages = getMainImages(product)
    if (mainImages.length === 0) {
      throw new Error('主图目录无图片')
    }
    logger.info(`准备一次性上传 ${mainImages.length} 张主图`)

    await scrollIntoView(page, '.basic-form-item-item_images-container')

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click(SELECTORS.basicInfo.mainImageUploadAreaFallback).catch(
        () => page.click(SELECTORS.basicInfo.mainImageUploadArea)
      )
    ])
    await fileChooser.setFiles(mainImages)
    await delay(config.timing.uploadWait * mainImages.length)

    try {
      await page.waitForSelector(
        '.basic-form-item-item_images-container .ssc-upload-picture-card-img-uploading-wrapper-success',
        { timeout: config.timing.uploadWait * 2 }
      )
      logger.success(`主图上传完成，共 ${mainImages.length} 张`)
    } catch {
      logger.warn('主图上传验证超时')
    }
  } catch (err) {
    await captureError(page, '01_basicInfo_上传主图')
    throw err
  }
  await delay(config.timing.actionDelay)

  // 4. 填写标题
  try {
    await scrollIntoView(page, SELECTORS.basicInfo.titleInput)
    await fillWithFallback(
      page,
      SELECTORS.basicInfo.titleInput,
      SELECTORS.basicInfo.titleInputFallback,
      product.shopee.title,
      '填写标题'
    )
    const actualTitle = await page.$eval(SELECTORS.basicInfo.titleInputFallback, el => el.value)
    if (actualTitle !== product.shopee.title) {
      logger.warn(`标题验证不一致: 期望="${product.shopee.title}" 实际="${actualTitle}"`)
    } else {
      logger.success('标题验证通过')
    }
  } catch (err) {
    await captureError(page, '01_basicInfo_填写标题')
    throw err
  }
  await delay(config.timing.actionDelay)

  // 5. 填写母货号
  try {
    await scrollIntoView(page, SELECTORS.basicInfo.parentSkuInput)
    await fillWithFallback(
      page,
      SELECTORS.basicInfo.parentSkuInput,
      SELECTORS.basicInfo.parentSkuInputFallback,
      product.productNo,
      '填写母货号'
    )
    const actualSku = await page.$eval(SELECTORS.basicInfo.parentSkuInputFallback, el => el.value)
    if (actualSku !== product.productNo) {
      logger.warn(`母货号验证不一致: 期望="${product.productNo}" 实际="${actualSku}"`)
    } else {
      logger.success('母货号验证通过')
    }
  } catch (err) {
    await captureError(page, '01_basicInfo_填写母货号')
    throw err
  }
  await delay(config.timing.actionDelay)

  // 6. 填写描述 + 详情图上传
  try {
    logger.info('填写商品描述')
    await scrollIntoView(page, '.editor-outer')
    await page.waitForSelector(SELECTORS.basicInfo.descriptionEditorFallback, { timeout: 8000 })
    await page.click(SELECTORS.basicInfo.descriptionEditorFallback)
    await delay(500)
    const descText = (product.shopee?.descriptionText || '').replace(/\[IMAGE\]/g, '').trim()
    await page.keyboard.type(descText)
    await delay(config.timing.actionDelay)

    const detailImages = getDetailImages(product)
    if (detailImages.length > 0) {
      logger.info(`准备一次性上传 ${detailImages.length} 张详情图`)

      // 点击「插入图片」按钮，打开弹出菜单
      await clickWithFallback(page,
        SELECTORS.basicInfo.descriptionImageBtn,
        SELECTORS.basicInfo.descriptionImageBtnFallback,
        '描述-插入图片按钮'
      )
      await delay(config.timing.actionDelay)

      // 等待弹出菜单（不要求 visible，只要 attached 即可操作隐藏的 file input）
      await page.waitForSelector('.eds-popper.image-upload-popper', {
        state: 'attached',
        timeout: 5000
      })

      // 直接操作 file input，一次传入所有详情图
      const fileInput = await page.$(SELECTORS.basicInfo.descriptionImageFileInput)
      if (!fileInput) throw new Error('未找到详情图 file input')

      await fileInput.setInputFiles(detailImages)
      await delay(config.timing.uploadWait * detailImages.length)

      logger.success(`详情图上传完成，共 ${detailImages.length} 张`)
    } else {
      logger.info('无详情图，跳过上传')
    }

    const descEl = await page.$(SELECTORS.basicInfo.descriptionEditorFallback)
    if (descEl) {
      const text = await descEl.textContent()
      if (text && text.trim().length > 0) {
        logger.success('描述已填入并验证通过')
      } else {
        logger.warn('描述编辑器内未检测到文字，请人工确认')
      }
    }
  } catch (err) {
    await captureError(page, '01_basicInfo_填写描述')
    throw err
  }

  logger.success('=== Step 01 基础信息填写完成 ===')
  return { success: true }
}
