import { SELECTORS } from './selectors.js'
import config from './config.js'
import { clickWithFallback, fillWithFallback } from '../../utils/selector.js'
import { logger } from '../../utils/logger.js'
import { navigateTo } from '../../browser/connect.js'
import { updateOverlay } from '../../utils/overlay.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function handlePopups(page) {
  if (!config.popup.enabled) return
  await delay(config.timing.popupWait)
  for (const sel of config.popup.closeSelectors) {
    try {
      const btn = await page.$(sel)
      if (btn) {
        await btn.click()
        logger.info(`弹窗已关闭: ${sel}`)
        await delay(config.timing.actionDelay)
      }
    } catch {
      // 点不到就跳过
    }
  }
}

export async function goToCreateProduct(page, product) {
  logger.info('=== 开始入口导航流程 ===')

  // 1. 导航到邀请列表
  logger.info(`导航到邀请列表: ${config.urls.invitationList}`)
  await navigateTo(page, config.urls.invitationList)
  await delay(config.timing.actionDelay)

  // 2. 点击左侧菜单「机会商品」
  await clickWithFallback(
    page,
    SELECTORS.entry.sidebarMenuItem,
    SELECTORS.entry.sidebarMenuItemFallback,
    '机会商品菜单'
  )
  await delay(config.timing.actionDelay)

  // 3. 点击 Tab「普通商品邀请」—— 只用 fallback
  logger.info('点击普通商品邀请 Tab')
  await page.waitForSelector(SELECTORS.entry.tabNormalInvitationFallback, { timeout: 8000 })
  await page.click(SELECTORS.entry.tabNormalInvitationFallback)
  logger.info('普通商品邀请 Tab (fallback)')
  await delay(config.timing.actionDelay)

  // 4. 填入邀请 ID
  const invitationId = product.shopee?.invitationId
  if (!invitationId) throw new Error('product.json 缺少 shopee.invitationId')
  await fillWithFallback(
    page,
    SELECTORS.entry.invitationIdInput,
    SELECTORS.entry.invitationIdInputFallback,
    invitationId,
    '邀请ID'
  )
  await delay(config.timing.actionDelay)

  // 5. 点击搜索
  await clickWithFallback(
    page,
    SELECTORS.entry.searchBtn,
    SELECTORS.entry.searchBtnFallback,
    '搜索按钮'
  )
  await delay(config.timing.actionDelay * 2)

  // 6. 点击卡片上第一个「立即报名」打开详情抽屉
  await page.click(SELECTORS.entry.respondButton)
  logger.info('点击第一个立即报名，等待抽屉展开')
  await delay(1500)

  // 7. 获取抽屉内 .create-btn 的坐标
  const createBtn = page.locator(SELECTORS.entry.createBtn)
  const btnBox = await createBtn.boundingBox({ timeout: 8000 })
  if (!btnBox) throw new Error('未找到抽屉内 .create-btn 按钮')

  const centerX = btnBox.x + btnBox.width / 2
  const centerY = btnBox.y + btnBox.height / 2
  logger.info(`找到 .create-btn 坐标: (${Math.round(centerX)}, ${Math.round(centerY)})`)

  // 8. hover .create-btn 触发下拉菜单
  await page.mouse.move(centerX, centerY)
  logger.info(`hover .create-btn: (${Math.round(centerX)}, ${Math.round(centerY)})`)
  await delay(1500)

  // 9+10. 文字匹配点击「直接提品」同时捕获新窗口
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 15000 }),
    page.evaluate(() => {
      const allElements = document.querySelectorAll('li, div, span, a')
      for (const el of allElements) {
        if (el.innerText && el.innerText.trim() === '直接提品') {
          el.click()
          return true
        }
      }
      return false
    })
  ])
  await newPage.waitForLoadState('domcontentloaded', { timeout: config.timing.pageTimeout })

  // 处理发布页入口弹窗「是」按钮
  try {
    await newPage.waitForSelector('button:has-text("是")', { timeout: 8000 })
    await newPage.click('button:has-text("是")')
    logger.info('已点击弹窗「是」')
    await delay(800)
  } catch {
    logger.warn('未检测到入口弹窗，继续执行')
  }

  await delay(1000)

  await updateOverlay(newPage, '入口', 'success', '已进入发布页')
  return newPage
}

export async function selectCategory(page, categoryKey) {
  const levels = config.categories[categoryKey]
  if (!levels || levels.length === 0) {
    throw new Error(`未找到品类配置: ${categoryKey}`)
  }

  logger.info(`开始选择品类: ${categoryKey} -> ${levels.join(' / ')}`)

  await clickWithFallback(
    page,
    SELECTORS.basicInfo.categoryInput,
    SELECTORS.basicInfo.categoryInputFallback,
    '打开品类选择'
  )
  await delay(config.timing.cascadeDelay)

  for (const levelText of levels) {
    const sel = `.ssc-cascader-node-label:has-text("${levelText}")`
    logger.info(`点击品类: ${levelText}`)
    await page.waitForSelector(sel, { timeout: 8000 })
    await page.click(sel)
    await delay(config.timing.cascadeDelay)
  }

  try {
    await page.waitForSelector(SELECTORS.basicInfo.categoryInputFallback, { timeout: 5000 })
    const selected = await page.$eval(
      SELECTORS.basicInfo.categoryInputFallback,
      el => el.value
    )
    logger.success(`品类已选中: ${selected}`)
  } catch {
    logger.warn('无法读取品类选中值，跳过验证')
  }
}

export async function isOnCreatePage(page) {
  return page.url().includes(config.urls.createPagePattern)
}
