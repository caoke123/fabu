/**
 * overlay.js
 * 在浏览器页面右下角注入实时进度悬浮窗
 */

export async function updateOverlay(page, step, status, message) {
  const colors = { running: '#1890ff', success: '#52c41a', error: '#ff4d4f', warn: '#faad14' }
  const icons  = { running: '⏳', success: '✅', error: '❌', warn: '⚠️' }
  const color  = colors[status] || '#1890ff'
  const icon   = icons[status]  || '⏳'
  const time   = new Date().toLocaleTimeString('zh-CN', { hour12: false })

  try {
    await page.evaluate(({ step, message, color, icon, time }) => {
      const ID = '__yutu_overlay__'
      let box = document.getElementById(ID)
      if (!box) {
        box = document.createElement('div')
        box.id = ID
        box.style.cssText = `
          position: fixed; bottom: 20px; right: 20px;
          width: 320px; max-height: 400px; overflow-y: auto;
          background: rgba(0,0,0,0.85); color: #fff;
          font-size: 13px; font-family: monospace;
          border-radius: 8px; padding: 12px; z-index: 999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4); line-height: 1.6;
        `
        const title = document.createElement('div')
        title.style.cssText = 'font-weight:bold; font-size:14px; margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:6px;'
        title.textContent = '🐇 YutuPublisher'
        box.appendChild(title)
        const log = document.createElement('div')
        log.id = '__yutu_log__'
        box.appendChild(log)
        document.body.appendChild(box)
      }
      const log = document.getElementById('__yutu_log__')
      const line = document.createElement('div')
      line.style.cssText = `color: ${color}; margin: 2px 0;`
      line.textContent = `${icon} [${time}] ${step}: ${message}`
      log.appendChild(line)
      while (log.children.length > 20) log.removeChild(log.firstChild)
      box.scrollTop = box.scrollHeight
    }, { step, message, color, icon, time })
  } catch {
    // 页面不可用时静默失败，不影响主流程
  }
}

export async function clearOverlay(page) {
  try {
    await page.evaluate(() => {
      const box = document.getElementById('__yutu_overlay__')
      if (box) box.remove()
    })
  } catch {
    // 静默失败
  }
}
