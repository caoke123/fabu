import fs from 'node:fs'
import path from 'node:path'
import { program } from 'commander'
import config from './config.js'
import * as easybr from './browser/easybr.js'
import * as connect from './browser/connect.js'
import { logger } from './utils/logger.js'
import { captureError } from './utils/screenshot.js'
import { validatePackage } from './utils/fileHelper.js'
import { publish } from './platforms/shopee/index.js'

program
  .requiredOption('--json <path>', 'product.json 文件路径')
  .option('--platform <platform>', '目标平台', 'shopee')
  .option('--mode <mode>', 'draft | publish，覆盖 .env SUBMIT_MODE')
  .option('--browser <id>', '浏览器ID，覆盖 .env 配置')
  .option('--step <step>', '仅执行指定步骤: entry | basicInfo | attributes | skus | submit')
  .parse()

const options = program.opts()

async function main() {
  const jsonPath = path.resolve(options.json)
  if (!fs.existsSync(jsonPath)) {
    logger.error(`product.json 文件不存在: ${jsonPath}`)
    process.exit(1)
  }

  let product
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    product = JSON.parse(raw)
    logger.info(`已读取 product.json: ${product.productNo || '未知货号'}`)
  } catch (err) {
    logger.error(`product.json 解析失败: ${err.message}`)
    process.exit(1)
  }

  const validation = validatePackage(product)
  if (!validation.valid) {
    logger.error('素材包验证失败:')
    for (const err of validation.errors) {
      logger.error(`  - ${err}`)
    }
    process.exit(1)
  }
  logger.success('素材包验证通过')

  if (options.mode) {
    config.submitMode = options.mode
    logger.info(`提交模式: ${options.mode}`)
  }

  await easybr.checkStatus()
  logger.success('EasyBR API 连接正常')

  const browserId = options.browser || config.easybr.browserId.shopee
  if (!browserId) {
    logger.error('未配置浏览器ID，请在 .env 文件或 --browser 参数中指定')
    process.exit(1)
  }

  logger.info(`正在打开浏览器: ${browserId}`)
  const { ws } = await easybr.openBrowser(browserId)
  logger.success(`浏览器已就绪, ws: ${ws}`)

  const { browser, page } = await connect.connectToBrowser(ws)
  logger.success('Playwright 已接管浏览器')

  try {
    await publish(page, product)
  } catch (err) {
    await captureError(page, 'publish_error')
    throw err
  }

  await connect.disconnect(browser)
  logger.info('程序正常退出')
}

main().catch(async (err) => {
  logger.error(err.message)
  process.exit(1)
})
