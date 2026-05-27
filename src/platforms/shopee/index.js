import globalConfig from '../../config.js'
import config from './config.js'
import { logger } from '../../utils/logger.js'
import { retry } from '../../utils/retry.js'
import { validatePackage } from '../../utils/fileHelper.js'
import { goToCreateProduct } from './navigator.js'
import * as basicInfo  from './steps/01_basicInfo.js'
import * as attributes from './steps/02_attributes.js'
import * as skus       from './steps/03_skus.js'
import * as submit     from './steps/04_submit.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function publish(page, product) {
  const validation = validatePackage(product)
  if (!validation.valid) {
    throw new Error('素材包验证失败:\n' + validation.errors.join('\n'))
  }
  logger.success('素材包验证通过')

  const publishPage = await goToCreateProduct(page, product)

  const steps = [
    { name: 'basicInfo',  fn: basicInfo.run },
    { name: 'attributes', fn: attributes.run },
    { name: 'skus',       fn: skus.run },
    { name: 'submit',     fn: submit.run },
  ]

  for (const step of steps) {
    logger.info(`执行步骤: ${step.name}`)
    await retry(
      () => step.fn(publishPage, product),
      {
        max: globalConfig.retry.max,
        delay: globalConfig.retry.delay,
        onRetry: (err, n) => logger.warn(`重试第${n}次：${step.name} - ${err.message}`)
      }
    )
    await delay(config.timing.actionDelay)
  }

  logger.success(`发布完成: ${product.productNo}`)
}
