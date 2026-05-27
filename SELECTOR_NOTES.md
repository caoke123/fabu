# 选择器风险分析与开发注意事项

> lastVerified: 2026-05-25
> 开发前必读，Shopee 每次改版后重新核对本文件

---

## 一、稳定性总览

| 步骤 | 选择器 | 稳定性 | 原因 |
|------|--------|:------:|------|
| 入口 | 左侧菜单「机会商品」 | 🔴 低 | nth-child 随菜单增减变化 |
| 入口 | Tab「普通商品邀请」 | 🔴 极低 | ID 含随机 hash，每次发版必变 |
| 入口 | 邀请ID输入框 | 🟢 高 | 固定容器 + 语义 class |
| 入口 | 搜索按钮 | 🟡 中 | 含语义 class |
| 入口 | 「直接提名」下拉 | 🔴 低 | body > span 位置不固定 |
| 入口 | 确认弹窗按钮 | 🟡 中 | message-box class 相对稳定 |
| 基础 | 品类级联（3级） | 🔴 低 | nth-child 依赖数据列表顺序 |
| 基础 | 标题/母货号输入框 | 🟢 高 | 含 item_name / parent_sku 语义名 |
| 基础 | 描述编辑器 | 🟡 中 | editor-outer class 相对稳定 |
| 基础 | 描述图片本地上传 | 🔴 低 | body > div:nth-child(46) 不固定 |
| 属性 | 品牌/原产地触发器 | 🔴 低 | nth-child 依赖属性字段渲染顺序 |
| 属性 | No Brand / 中国大陆选项 | 🔴 低 | body 下 popper 位置完全不固定 |
| SKU | 变体名称/选项输入框 | 🟡 中 | .recommendation-input 语义稳定 |
| SKU | 添加变体按钮 | 🟡 中 | 容器内唯一 button |
| SKU | 表格各列 input | 🟡 中 | 列号已配置化，改版只改数字 |
| SKU | JIT「是」选项 | 🔴 低 | body > span:nth-child(40) 不固定 |
| 提交 | 发布按钮 | 🟡 中 | operation-area class 相对稳定 |

---

## 二、代码中必须实现 Fallback 的场景

所有 🔴 低稳定性选择器，代码中必须实现 primary → fallback 降级：

```javascript
// utils/selector.js 中封装统一的带 fallback 操作函数

export async function clickWithFallback(page, primary, fallback, label) {
  try {
    await page.waitForSelector(primary, { timeout: 3000 })
    await page.click(primary)
    logger.info(`✅ ${label}`)
  } catch {
    logger.warn(`⚠️ primary 失效，尝试 fallback：${label}`)
    await page.waitForSelector(fallback, { timeout: 8000 })
    await page.click(fallback)
    logger.info(`✅ ${label} (fallback)`)
  }
}

export async function fillWithFallback(page, primary, fallback, value, label) {
  try {
    await page.waitForSelector(primary, { timeout: 3000 })
    await page.fill(primary, value)
    logger.info(`✅ ${label}: ${value}`)
  } catch {
    logger.warn(`⚠️ primary 失效，尝试 fallback：${label}`)
    await page.fill(fallback, value)
    logger.info(`✅ ${label}: ${value} (fallback)`)
  }
}
```

---

## 三、特殊操作说明

### 3.1 Tab「普通商品邀请」
ID 含随机 hash，**直接跳过 primary，只用 fallback**：
```javascript
await page.click('.ssc-tabs-bar span:has-text("普通商品邀请")')
```

### 3.2 品类级联（3级）
每级下拉在 body 下动态渲染，nth-child 不可靠。
**实现策略：文字匹配点击 + 等待下一级出现**：
```javascript
async function selectCategory(page, levels) {
  await page.click(SELECTORS.basicInfo.categoryInput)
  for (const levelText of levels) {
    await page.waitForSelector(`.ssc-cascader-node-label:has-text("${levelText}")`)
    await page.click(`.ssc-cascader-node-label:has-text("${levelText}")`)
    await delay(config.timing.cascadeDelay)
  }
  // 验证最终选中文字
  const selected = await page.textContent('.ssc-input-cascader-container-single input')
  logger.info(`品类已选中：${selected}`)
}
```

### 3.3 描述图片「本地上传」（步骤 17.1）
弹出的上传菜单是 body 下动态 popper，nth-child(46) 极不稳定。
**只用文字 fallback**：
```javascript
await page.click('.ssc-dropdown-menu li:has-text("本地上传")')
// 然后用 fileChooser 处理文件选择
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.click('.ssc-dropdown-menu li:has-text("本地上传")')
])
await fileChooser.setFiles(imagePath)
```

### 3.4 SKU 图片上传（步骤 26）
Shopee 图片上传用隐藏的 `<input type="file">`，
**不要 click() 触发，直接 setInputFiles()**：
```javascript
const fileInput = await page.$('.option-image-required input[type="file"]')
await fileInput.setInputFiles(skuImagePath)
await page.waitForTimeout(config.timing.uploadWait)
// 验证缩略图已出现
await page.waitForSelector('.option-image-required .ssc-upload-picture-card-img-uploading-wrapper-success')
```

### 3.5 「添加变体」按钮（步骤 26.1）
每输入完一个 SKU 名称后，点击「添加变体」添加下一个，
循环直到所有 SKU 添加完毕：
```javascript
for (const sku of product.skus) {
  await page.fill(SELECTORS.sku.variantOptionInput, sku.skuNameEn)
  await page.keyboard.press('Enter')
  await delay(config.timing.actionDelay)
  // 如果不是最后一个，点击添加变体
  if (sku !== product.skus.at(-1)) {
    await page.click(SELECTORS.sku.addVariantBtn)
    await delay(config.timing.actionDelay)
  }
}
```

### 3.6 SKU 表格多行（步骤 27-37）
用 `getSkuRowSelectors(n)` 动态生成每行选择器：
```javascript
import { getSkuRowSelectors } from '../config/shopee.selectors.js'

// 等待表格渲染完成
await page.waitForSelector(SELECTORS.sku.tableContainer)

for (let i = 0; i < product.skus.length; i++) {
  const sku = product.skus[i]
  const sel = getSkuRowSelectors(i + 1)   // 行号从 1 开始

  await page.fill(sel.sellingPrice, String(sku.sellingPrice))
  await delay(config.timing.skuRowDelay)

  // JIT 下拉
  await page.click(sel.jitTrigger)
  await page.click(SELECTORS.sku.tableJitYesFallback)

  await page.fill(sel.minOrder,  String(config.fixedValues.minOrder))
  await page.fill(sel.skuCode,   sku.skuCode)
  await page.fill(sel.weight,    String(sku.weight / 1000))  // g → kg
  await page.fill(sel.length,    String(product.outerPackaging.length))
  await page.fill(sel.height,    String(product.outerPackaging.height))
  await page.fill(sel.width,     String(product.outerPackaging.width))
  await page.fill(sel.leadTime,  String(product.shopee.leadTime))
}
```

### 3.7 删除预填主图（步骤 13）
邀请商品进入发布页时平台可能预填图片，需先清除：
```javascript
const existingImgs = await page.$$('.basic-form-item-item_images-container .ssc-upload-picture-card-sortable')
for (const img of existingImgs) {
  await img.hover()
  await delay(300)
  await page.click(SELECTORS.basicInfo.deleteMainImageFallback)
  await delay(config.timing.actionDelay)
}
```

---

## 四、改版后维护流程

```
1. 查看错误日志，找到失败步骤
2. 打开 screenshots/ 目录，查看失败截图
3. 打开真实 Shopee 页面，导航到对应步骤
4. DevTools 重新定位元素，确认新选择器
5. 只更新 config/shopee.selectors.js 对应字段
6. 如果是表格列位移，只更新 config/shopee.config.js 的 skuTableColumns
7. 重新运行，验证通过
代码逻辑文件（steps/）不需要改动。
```

---

## 五、待确认事项

```
□ 描述图片「本地上传」弹窗触发后的 file input 实际选择器
  （步骤 17.1，需在真实页面用 DevTools 确认 input[type="file"] 位置）
  回复：本地文件夹选择框，按照数据给出的本地文件路径，选择对应的图片

□ 主图上传的 file input 是否为隐藏 input
  （步骤 14，需确认是点击 div 触发 filechooser 还是直接操作 hidden input）
  回复：点击主图上传，是打开本地文件夹路径

□ 变体选项输入完成的确认方式
  （步骤 24，是按 Enter 确认，还是点击某个「确认」按钮？）
  回复：自动保存

□ 起订量列号已修正为 10（原记录步骤 31 笔误，与步骤 30 选择器相同已排除）
  ✅ 已在 skuTableColumns.minOrder = 10 中修正
```
