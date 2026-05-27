import { logger } from './logger.js'

export async function retry(fn, options = {}) {
  const max = options.max ?? 3
  const delay = options.delay ?? 2000
  const onRetry = options.onRetry ?? (() => {})

  let lastError
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < max) {
        logger.warn(`第 ${attempt} 次尝试失败: ${err.message}，${delay}ms 后重试`)
        onRetry(err, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}
