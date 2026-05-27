import dotenv from 'dotenv'

dotenv.config()

export default {
  easybr: {
    api: process.env.EASYBR_API,
    browserId: {
      shopee: process.env.SHOPEE_BROWSER_ID
    }
  },
  submitMode: process.env.SUBMIT_MODE || 'draft',
  delay: {
    action: Number(process.env.ACTION_DELAY) || 800,
    upload: Number(process.env.UPLOAD_WAIT) || 4000,
    page:   Number(process.env.PAGE_TIMEOUT) || 30000
  },
  retry: {
    max:   Number(process.env.MAX_RETRIES) || 1,
    delay: Number(process.env.RETRY_DELAY) || 1000
  }
}
