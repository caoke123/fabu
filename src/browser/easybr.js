import axios from 'axios'
import config from '../config.js'

const http = axios.create({
  baseURL: config.easybr.api,
  timeout: 10000
})

export async function checkStatus() {
  try {
    const res = await http.get('/auto/status')
    if (res.data?.code === 0) {
      return { ok: true }
    }
    throw new Error('EasyBR API 返回异常状态码')
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ERR_BAD_REQUEST' || err.code === 'ETIMEDOUT') {
      throw new Error('EasyBR API 无响应，请确认 EasyBR 已启动')
    }
    throw err
  }
}

export async function getBrowserList(page = 1, limit = 30) {
  try {
    const res = await http.get('/auto/getBrowerList', { params: { page, limit } })
    return res.data?.data ?? []
  } catch (err) {
    throw new Error(`获取浏览器列表失败: ${err.message}`)
  }
}

export async function openBrowser(browserId) {
  try {
    const res = await http.post('/auto/openBrower', { browerid: browserId })
    if (res.data?.code === 0 && res.data?.data) {
      return {
        ws: res.data.data.ws,
        http: res.data.data.http
      }
    }
    throw new Error(`打开浏览器失败: ${JSON.stringify(res.data)}`)
  } catch (err) {
    if (err.message.startsWith('打开浏览器失败')) {
      throw err
    }
    throw new Error(`EasyBR 打开浏览器异常: ${err.message}`)
  }
}

export async function closeBrowser(browserId) {
  try {
    const res = await http.post('/auto/closeBrower', { browerid: browserId })
    if (res.data?.code === 0) {
      return { ok: true }
    }
    throw new Error(`关闭浏览器失败: ${JSON.stringify(res.data)}`)
  } catch (err) {
    if (err.message.startsWith('关闭浏览器失败')) {
      throw err
    }
    throw new Error(`EasyBR 关闭浏览器异常: ${err.message}`)
  }
}
