# 雨图发布器（YutuPublisher）开发文档

> 项目名称：**YutuPublisher**
> 版本：v1.0.0
> 技术栈：Node.js 20 + Playwright + EasyBR Local API
> 平台：Windows
> 更新日期：2026-05-24

---

## 一、项目定位

YutuPublisher 是一个命令行工具，读取雨图分拣系统生成的 `product.json`，通过 EasyBR 指纹浏览器 API 接管已登录的平台账号，使用 Playwright 自动完成商品发布表单的填写与提交。

**核心原则：**
- 每一步操作后必须验证结果，不做"盲填"
- 遇到不确定的页面状态，截图保存并暂停等待人工确认，不猜测
- 所有操作有完整日志，失败可从断点续跑
- 平台无关架构，今天支持 Shopee，未来可接 Temu / TikTok

---

## 二、目录结构

```
yutu-publisher/
├── package.json
├── package-lock.json
├── .env                          # 本地配置（不提交 git）
├── .env.example                  # 配置模板
├── .gitignore
├── README.md
│
├── src/
│   ├── index.js                  # CLI 入口
│   ├── config.js                 # 读取 .env，统一配置出口
│   │
│   ├── browser/
│   │   ├── easybr.js             # EasyBR Local API 封装
│   │   └── connect.js            # Playwright 连接 & 页面工厂
│   │
│   ├── platforms/
│   │   └── shopee/
│   │       ├── index.js          # Shopee 发布主流程编排
│   │       ├── navigator.js      # 页面导航（打开发布页、品类选择）
│   │       ├── steps/
│   │       │   ├── 01_basicInfo.js      # 商品名称、主图、参考号
│   │       │   ├── 02_description.js    # 描述文字 + 详情图上传
│   │       │   ├── 03_attributes.js     # 属性填写
│   │       │   ├── 04_skus.js           # 规格、SKU图、价格、库存
│   │       │   └── 05_submit.js         # 草稿 / 发布
│   │       └── selectors.js      # 所有页面选择器集中管理
│   │
│   └── utils/
│       ├── fileHelper.js         # 本地路径解析、图片列表获取
│       ├── logger.js             # 带时间戳的日志（同时写文件）
│       ├── screenshot.js         # 截图工具（失败时自动截图）
│       └── retry.js              # 通用重试函数
│
├── logs/                         # 运行日志（自动生成，不提交 git）
└── screenshots/                  # 错误截图（自动生成，不提交 git）
```

---

## 三、依赖清单

```json
{
  "name": "yutu-publisher",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "publish": "node src/index.js --platform shopee"
  },
  "dependencies": {
    "playwright": "^1.44.0",
    "dotenv": "^16.4.5",
    "axios": "^1.7.2",
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "glob": "^10.4.1"
  }
}
```

安装命令：
```bash
npm install
npx playwright install chromium
```

---

## 四、.env 配置

```env
# ===== EasyBR =====
EASYBR_API=http://127.0.0.1:3001
# EasyBR 中 Shopee 账号对应的浏览器窗口 ID
SHOPEE_BROWSER_ID=你的browerid

# ===== 发布行为 =====
# draft = 保存草稿（推荐，人工复核后再发布）
# publish = 直接发布
SUBMIT_MODE=draft

# ===== 操作节奏 =====
# 每次操作后等待时间（毫秒），模拟人工操作，避免触发风控
ACTION_DELAY=800
# 图片上传后等待时间（毫秒），等待上传完成
UPLOAD_WAIT=3000
# 页面加载超时（毫秒）
PAGE_TIMEOUT=30000

# ===== 重试配置 =====
MAX_RETRIES=3
RETRY_DELAY=2000
```

---

## 五、各模块开发规范

### 5.1 `src/config.js`

统一读取 `.env`，对外导出配置对象，不在其他模块直接读取 `process.env`。

```javascript
// 导出结构示例
export default {
  easybr: {
    api: 'http://127.0.0.1:3001',
    browserId: { shopee: 'xxx' }
  },
  submitMode: 'draft',         // 'draft' | 'publish'
  delay: {
    action: 800,
    upload: 3000,
    page: 30000
  },
  retry: {
    max: 3,
    delay: 2000
  }
}
```

---

### 5.2 `src/browser/easybr.js`

封装所有 EasyBR Local API 调用。

**必须实现的方法：**

```javascript
// 检查 EasyBR API 是否正常运行
async function checkStatus()
// 返回: { ok: true } | throws Error

// 获取所有浏览器窗口列表
async function getBrowserList()
// 返回: [{ browerid, groupname, ... }]

// 打开指定浏览器窗口
async function openBrowser(browserId)
// 返回: { ws: 'ws://...', http: 'http://...' }
// 如果窗口已打开，直接返回已有连接信息（调用 /auto/openedList 检查）

// 关闭指定浏览器窗口
async function closeBrowser(browserId)
// 返回: { ok: true }
```

**实现要点：**
- 所有请求用 `axios`，统一设置 `timeout: 10000`
- `openBrowser` 调用前先查 `/auto/openedList`，已开着就不重复打开
- 所有方法失败时 `throw` 带明确描述的 `Error`，不吞异常

---

### 5.3 `src/browser/connect.js`

负责 Playwright 与 EasyBR 浏览器的连接管理。

```javascript
// 连接到已打开的 EasyBR 浏览器，返回 { browser, context, page }
async function connectToBrowser(wsEndpoint)

// 导航到指定 URL，等待页面稳定
async function navigateTo(page, url)

// 关闭连接（不关闭浏览器本身）
async function disconnect(browser)
```

**实现要点：**
- 使用 `chromium.connectOverCDP(wsEndpoint)` 接管已有浏览器
- 连接后获取已有 page（`browser.contexts()[0].pages()[0]`），不新开 tab
- 如果没有已有 page，才新建一个
- `navigateTo` 使用 `waitUntil: 'domcontentloaded'`，不用 `networkidle`（Shopee 后台有长轮询）

---

### 5.4 `src/utils/fileHelper.js`

根据 `product.json` 的 `localPath` 解析所有本地图片路径。

```javascript
// 获取主图列表（按文件名自然排序）
function getMainImages(localPath)
// 返回: ['D:\\...\\产品主图\\主图_1.jpg', ...]

// 获取详情图列表（按文件名自然排序）
function getDetailImages(localPath)
// 返回: ['D:\\...\\详情图\\详情图_1.jpg', ...]

// 获取指定 SKU 的图片路径
function getSkuImage(localPath, skuName)
// 返回: 'D:\\...\\SKU图\\橙黄棒球绳结_1.jpg' | null
// 匹配规则: 文件名以 skuName 开头（startsWith）

// 验证素材包完整性（发布前调用）
function validatePackage(product)
// 检查项:
//   - localPath 目录是否存在
//   - 产品主图目录是否有至少1张图
//   - SKU图目录中每个 skuName 是否都能匹配到图片
//   - shopee.title 是否非空
//   - skus 每项 sellingPrice > 0
//   - skus 每项 stock > 0
// 返回: { valid: true } | { valid: false, errors: ['...'] }
```

**实现要点：**
- 使用 `glob` 库获取目录下所有图片（支持 jpg/jpeg/png/webp）
- 文件排序使用 `localeCompare` 的自然排序（`numeric: true`）
- Windows 路径分隔符统一用 `path.join`，不手拼

---

### 5.5 `src/utils/retry.js`

通用重试函数，避免在每个 step 里写重复的 try/catch 重试逻辑。

```javascript
// 重试执行异步函数
async function retry(fn, options)
// options: { max: 3, delay: 2000, onRetry: (err, attempt) => {} }
// 每次重试前等待 delay ms
// 超过 max 次后 throw 最后一次的 error
```

---

### 5.6 `src/utils/screenshot.js`

```javascript
// 截图并保存到 screenshots/ 目录
async function captureError(page, stepName)
// 文件名格式: screenshots/2026-05-24T10-30-00_stepName.png
// 同时在日志中输出截图路径
```

---

### 5.7 `src/utils/logger.js`

```javascript
// 日志级别: info / warn / error / success
// 同时输出到控制台（带颜色，用 chalk）和日志文件
// 日志文件: logs/YYYY-MM-DD.log
// 格式: [10:30:00] [INFO] 消息内容

export const logger = {
  info(msg) {},
  warn(msg) {},
  error(msg) {},
  success(msg) {}
}
```

---

### 5.8 `src/platforms/shopee/selectors.js`

**所有 Shopee 页面选择器集中在此文件管理，步骤模块只从这里引用，不在步骤里硬编码选择器。**

这是防止"幻觉"的关键设计——开发者在真实浏览器中用 DevTools 确认选择器后填入此文件，而不是让 AI 猜测。

```javascript
export const SELECTORS = {
  // 商品名称输入框
  productTitle: 'input[placeholder*="商品名称"], input[placeholder*="Product Name"]',

  // 主图上传区域
  mainImageUpload: '/* 待开发者在真实页面确认后填入 */',

  // 详情描述区
  descriptionEditor: '/* 待确认 */',
  descriptionImageBtn: '/* 待确认 */',

  // 属性区
  brandInput: '/* 待确认 */',
  originSelect: '/* 待确认 */',
  materialInput: '/* 待确认 */',

  // 规格区
  skuSpecName: '/* 待确认 */',
  addSkuOptionBtn: '/* 待确认 */',
  skuPriceInput: '/* 待确认 */',
  skuStockInput: '/* 待确认 */',
  skuCodeInput: '/* 待确认 */',

  // 提交
  saveDraftBtn: '/* 待确认 */',
  publishBtn: '/* 待确认 */',
}
```

> **开发流程说明：** 每个选择器在开发对应 step 之前，必须先打开真实 Shopee 后台，用 Chrome DevTools 定位元素，确认选择器能唯一命中后，再填入此文件，再写 step 代码。切勿凭记忆或猜测填写。

---

### 5.9 `src/platforms/shopee/navigator.js`

负责导航和品类选择，这是最复杂的部分之一。

```javascript
// 导航到创建商品页面
async function goToCreateProduct(page)
// URL: https://seller.shopee.cn/portal/product/add（或对应站点）

// 选择品类（支持多级联动下拉）
async function selectCategory(page, categoryPath)
// categoryPath 示例: '女包 / 包包配件 / 挂件'
// 实现逻辑:
//   1. 点击品类选择框
//   2. 逐级点击：女包 → 包包配件 → 挂件
//   3. 确认品类已选中（验证页面上显示的品类文字）
//   4. 等待品类相关属性字段加载完成

// 验证当前是否在创建商品页
async function isOnCreatePage(page)
// 返回: true | false
```

**品类路径配置：**

在 `src/platforms/shopee/config.js` 中维护品类映射，不在代码里硬编码中文：

```javascript
export const CATEGORY_MAP = {
  'bag_pendant':    '女包 / 包包配件 / 挂件',
  'phone_pendant':  '手机壳 / 手机配件 / 挂件',     // 待确认实际路径
  'car_accessory':  '汽车用品 / 车内饰品 / 挂件',   // 待确认实际路径
}
```

`product.json` 中 `category` 字段（如 `"包包挂件"`）与上面 key 的映射关系，在此文件维护。

---

### 5.10 各 Step 模块开发规范

每个 step 模块导出一个异步函数，签名统一：

```javascript
// 参数: page（Playwright Page对象）, product（完整product.json对象）
// 返回: { success: true } | throws Error
export async function run(page, product) { ... }
```

**每个 step 必须遵守以下规则：**

1. **操作前验证**：检查目标元素存在，不存在则 throw 明确错误
2. **操作后验证**：填写后 `page.inputValue()` 或 `page.textContent()` 确认内容已写入
3. **每步之间 delay**：使用 `config.delay.action` 的间隔，模拟人工节奏
4. **截图保障**：catch 到错误时先截图再 throw
5. **日志**：每个关键操作前后都要 `logger.info()`

**Step 04_skus.js 特别说明（最复杂）：**

```
SKU 填写流程:
1. 找到规格名称输入框，输入「颜色」
2. 循环 skus 数组:
   a. 点击「添加选项」
   b. 输入 skuName（如「橙黄棒球绳结」）
   c. 上传该 SKU 对应的图片
   d. 等待图片上传完成（轮询检查，最多等 UPLOAD_WAIT ms）
3. 点击「确认」生成 SKU 价格表格
4. 循环价格表格的每一行（与 skus 顺序对应）:
   a. 填写 sellingPrice
   b. 填写 stock
   c. 填写 skuCode（卖家货号）
5. 验证每行数据已正确写入

SKU 顺序对应：Shopee 生成表格的行顺序与添加选项的顺序一致，
按 product.json 中 skus 数组的顺序添加即可。
```

---

### 5.11 `src/platforms/shopee/index.js`（主流程编排）

```javascript
export async function publish(page, product) {
  // 1. 验证素材包完整性
  const validation = validatePackage(product)
  if (!validation.valid) throw new Error(validation.errors.join('\n'))

  // 2. 导航到创建商品页
  await goToCreateProduct(page)
  await selectCategory(page, getCategoryPath(product.category))

  // 3. 逐步执行
  const steps = [basicInfo, description, attributes, skus, submit]
  for (const step of steps) {
    logger.info(`执行步骤: ${step.name}`)
    await retry(() => step.run(page, product), config.retry)
    await delay(config.delay.action)
  }

  logger.success(`发布完成: ${product.productNo}`)
}
```

---

### 5.12 `src/index.js`（CLI 入口）

```javascript
// 使用 commander 解析命令行参数
// 用法:
//   node src/index.js --json ./product.json --platform shopee
//   node src/index.js --json ./product.json --platform shopee --mode publish

// 参数说明:
//   --json      product.json 文件路径（必填）
//   --platform  目标平台，目前只支持 shopee（默认 shopee）
//   --mode      draft | publish，覆盖 .env 中的 SUBMIT_MODE
//   --browser   浏览器窗口ID，覆盖 .env 中的 SHOPEE_BROWSER_ID

// 执行流程:
// 1. 读取并解析 product.json
// 2. 调用 validatePackage，打印验证结果，有错误则退出
// 3. 调用 easybr.openBrowser(browserId)，获取 ws://
// 4. Playwright connectOverCDP(ws)
// 5. 调用对应平台的 publish(page, product)
// 6. 完成后 easybr.closeBrowser(browserId)
// 7. 全程 try/catch，失败时截图 + 记录日志 + 退出码 1
```

---

## 六、错误处理策略

| 错误类型 | 处理方式 |
|----------|---------|
| EasyBR API 无响应 | 打印错误说明，退出，不尝试直接启动 Playwright |
| 浏览器窗口未登录 | 截图提示，退出，要求人工登录后重试 |
| 元素找不到 | 截图 + 记录选择器，throw，由 retry 重试 |
| 图片文件不存在 | validatePackage 阶段提前拦截，不进入操作 |
| 上传超时 | 截图 + 记录，throw，由 retry 重试 |
| 超过最大重试次数 | 截图 + 完整日志，退出码 1，人工介入 |
| Shopee 页面结构变化 | 元素找不到会触发上述流程，通过截图人工判断是否需要更新 selectors.js |

---

## 七、开发阶段与验收标准

### Phase 1 — 基础连接（验收：能截图）
- [ ] EasyBR API 封装完成，能正确打开浏览器并获取 ws
- [ ] Playwright connectOverCDP 成功，能对当前页面截图
- [ ] 日志系统可用

### Phase 2 — 基础信息（验收：标题和主图正确填入）
- [ ] `selectors.js` 中标题、主图选择器已在真实页面确认
- [ ] 商品名称填入并验证
- [ ] 主图逐张上传，等待完成，验证缩略图出现
- [ ] 参考号填入

### Phase 3 — 描述区（验收：详情图和文字出现在描述编辑器中）
- [ ] 描述编辑器选择器已确认
- [ ] 详情图逐张上传
- [ ] 文字描述填入

### Phase 4 — 属性（验收：品牌、原产地、材质正确填入）
- [ ] 品牌输入 / 选择
- [ ] 原产地下拉选择
- [ ] 材质输入

### Phase 5 — SKU（验收：6个颜色选项、图片、价格、库存全部正确）
- [ ] 颜色规格名称填入
- [ ] 6个 SKU 选项添加完成，每项有图片
- [ ] 价格表格每行数据正确

### Phase 6 — 提交与收尾（验收：草稿保存成功，日志完整）
- [ ] 保存草稿成功
- [ ] 日志文件完整
- [ ] 错误截图机制验证

---

## 八、给 OpenCode 的开发指引

**开始开发前请先做：**

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env`，填入真实的 `SHOPEE_BROWSER_ID`
3. 启动 EasyBR，确保 API 状态正常：访问 `http://127.0.0.1:3001/auto/status`
4. 在 EasyBR 中打开 Shopee 对应的浏览器窗口，手动登录并导航到卖家后台

**开发每个 step 之前必须：**

1. 在真实的 Shopee 创建商品页面，打开 Chrome DevTools
2. 定位该步骤所需的每一个页面元素
3. 将选择器填入 `selectors.js`，确认能唯一命中
4. 再开始写 step 代码

**禁止的做法：**
- 禁止凭记忆或猜测填写 CSS 选择器
- 禁止在 step 模块内硬编码选择器字符串
- 禁止省略操作后的验证步骤
- 禁止捕获异常后不截图直接继续
