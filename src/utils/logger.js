import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'

const LOG_DIR = 'logs'

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFilePath() {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return path.join(LOG_DIR, `${y}-${m}-${d}.log`)
}

function timestamp() {
  const t = new Date()
  const h = String(t.getHours()).padStart(2, '0')
  const min = String(t.getMinutes()).padStart(2, '0')
  const s = String(t.getSeconds()).padStart(2, '0')
  return `${h}:${min}:${s}`
}

function writeLog(level, msg) {
  ensureLogDir()
  const line = `[${timestamp()}] [${level}] ${msg}`
  fs.appendFileSync(getLogFilePath(), line + '\n', 'utf-8')
}

function info(msg) {
  console.log(chalk.blue(`[${timestamp()}] [INFO] ${msg}`))
  writeLog('INFO', msg)
}

function warn(msg) {
  console.log(chalk.yellow(`[${timestamp()}] [WARN] ${msg}`))
  writeLog('WARN', msg)
}

function error(msg) {
  console.log(chalk.red(`[${timestamp()}] [ERROR] ${msg}`))
  writeLog('ERROR', msg)
}

function success(msg) {
  console.log(chalk.green(`[${timestamp()}] [SUCCESS] ${msg}`))
  writeLog('SUCCESS', msg)
}

export const logger = { info, warn, error, success }
