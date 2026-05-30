# YutuPublisher v1.5 — Shopee 自动化铺货系统

## 项目概述

基于 Node.js + Playwright + EasyBR 指纹浏览器的 Shopee 卖家中心自动化上货工具。通过 CDP (Chrome DevTools Protocol) 接管指纹浏览器，模拟人工操作完成商品创建全流程。

- **运行环境**: Node.js 18+, PowerShell 7+
- **模块规范**: ESM (`"type": "module"`)
- **许可证**: 内部使用

---

## 目录结构

```
shopee自动化发布/
├── .env                          # 环境配置
├── package.json                  # 项目依赖与脚本
├── shopee.config.js              # 主配置（参考副本）
├── product.json                  # 商品素材包（外部提供）
├── logs/                         # 运行日志（按日期）
├── screenshots/                  # 错误截图
└── src/
    ├── index.js                  # CLI 入口
    ├── config.js                 # 环境变量加载
    ├── browser/
    │   ├── easybr.js             # EasyBR API 客户端
    │   └── connect.js            # Playwright CDP 连接
    ├── platforms/
    │   └── shopee/
    │       ├── index.js          # 平台发布编排器
    │       ├── config.js         # Shopee 配置
    │       ├── navigator.js      # 入口导航 & 通用工具
    │       ├── selectors.js      # DOM 选择器库
    │       └── steps/
    │           ├── 01_basicInfo.js   # 基础信息
    │           ├── 02_attributes.js  # 属性填写
    │           ├── 03_skus.js        # SKU 规格
    │           └── 04_submit.js      # 提交发布
    └── utils/
        ├── fileHelper.js         # 素材验证 & 路径提取
        ├── logger.js             # 日志（控制台 + 文件）
        ├── overlay.js            # 浏览器浮窗（已停用）
        ├── retry.js              # 重试机制
        ├── screenshot.js         # 截图工具
        └── selector.js           # 选择器工具（主/备策略）
```

---

## 环境变量 (`.env`)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EASYBR_API` | `http://127.0.0.1:3001` | EasyBR 浏览器管理 API |
| `SHOPEE_BROWSER_ID` | `6a13f0325f9fe94260238993` | 指纹浏览器实例 ID |
| `SUBMIT_MODE` | `draft` | 提交模式: `draft`（仅截图）或 `publish`（实际发布） |
| `ACTION_DELAY` | `800` | 每次操作后等待 (ms) |
| `UPLOAD_WAIT` | `4000` | 图片上传等待 (ms) |
| `PAGE_TIMEOUT` | `30000` | 页面加载超时 (ms) |
| `MAX_RETRIES` | `1` | 步骤失败重试次数 |
| `RETRY_DELAY` | `1000` | 重试间隔 (ms) |

---

## CLI 使用

```bash
# 草稿模式（默认，仅填写不发布）
node src/index.js --json "D:\素材包\product.json"

# 发布模式
node src/index.js --json "D:\素材包\product.json" --mode publish

# 指定浏览器
node src/index.js --json "D:\素材包\product.json" --browser <browser_id>

# 单步执行
node src/index.js --json "D:\素材包\product.json" --step basicInfo
```

**参数说明**:
- `--json` (必填): `product.json` 绝对路径
- `--mode`: `draft | publish`，覆盖 `.env` 配置
- `--browser`: 浏览器 ID，覆盖 `.env` 配置
- `--step`: 仅执行指定步骤 (`entry | basicInfo | attributes | skus | submit`)

---

## 核心架构

```
                     CLI (src/index.js)
                          │
         ┌────────────────┼──────────────────┐
    src/config.js    src/browser/       src/utils/
    (环境变量)       ├─ easybr.js       ├─ logger.js
                     ├─ connect.js      ├─ selector.js
                     │                  ├─ retry.js
                     │                  ├─ fileHelper.js
                     │                  ├─ screenshot.js
                     │                  └─ overlay.js
                     │
            src/platforms/shopee/
            ├─ config.js
            ├─ index.js (publish 编排)
            ├─ navigator.js (入口导航)
            ├─ selectors.js (DOM 选择器)
            └─ steps/
                 ├─ 01_basicInfo.js
                 ├─ 02_attributes.js
                 ├─ 03_skus.js
                 └─ 04_submit.js
```

---

## 发布流程

### Step 0: 入口导航 (`navigator.js`)

`goToCreateProduct(page, product)`:
1. 导航到邀请列表 → 点击"机会商品"菜单 → "普通商品邀请" Tab
2. 填入邀请 ID (`product.platforms.shopee.invitation.code`)
3. 搜索 → 点击卡片"立即报名" → hover `.create-btn` → 点击"直接提品"
4. 捕获新标签页 → 处理"是"确认弹窗 → 返回发布页 Page 对象

### Step 01: 基础信息 (`01_basicInfo.js:11`)

`run(page, product)`:
1. **选品类**: 映射 `category` → `config.categories` → 级联选择 (如 `女包 > 包包配件 > 吊饰`)
2. **删预填主图**: 邀请商品可能有预填图，全部删除
3. **上传主图**: 一次性上传 `product.images.main[]`
4. **填写标题**: `product.platforms.shopee.title`
5. **填写母货号**: `product.productNo`
6. **填写描述 + 上传详情图**: 富文本编辑器 → 描述文字 + `product.images.detail[]`

### Step 02: 属性填写 (`02_attributes.js:185`)

`run(page, product)`:
- 按属性类型分派不同填写策略:
  - 普通下拉 (`selectDropdown`): 品牌、原产地、商品类型等
  - 搜索下拉 (`fillSearchDropdown`): 材质
  - 自定义值下拉 (`fillCustomValueDropdown`): 图案
  - 输入框 (`fillInput`): 尺寸类属性
- 先展开"显示更多"按钮

### Step 03: SKU 规格 (`03_skus.js:11`)

`run(page, product)`:
1. **变体名称**: 固定填"款式"
2. **逐个添加 SKU**: 填入 `nameEn` → 上传 SKU 图 → 点击"添加变体"
3. **价格表格**: 逐行填写邀请规格、JIT、售价、起订量、卖家货号、重量、尺寸、备货时间

### Step 04: 提交 (`04_submit.js:11`)

`run(page, product)`:
- `draft` 模式: 截最终截图，不点任何按钮
- `publish` 模式: 点击"发布"按钮，等待 5s，截图

---

## 错误处理

| 机制 | 位置 | 说明 |
|------|------|------|
| 选择器主/备策略 | `selector.js` | 每个 DOM 操作配备 primary + fallback 选择器 |
| 步骤重试 | `retry.js` | 每个步骤外包裹 `retry()`，默认重试 1 次 |
| 错误截图 | `screenshot.js` | 每个 catch 块调用 `captureError()` |
| 弹窗自动关闭 | `navigator.js:12` | `handlePopups()` 含 8 个关闭按钮选择器优先级列表 |
| 日志双通道 | `logger.js` | 控制台（颜色） + 文件（`logs/YYYY-MM-DD.log`） |

---

## Product JSON 示例

```json
{
  "productNo": "J2605-0002",
  "internal": {
    "title": "毛绒动物相机护目镜包包挂件",
    "description": "...",
    "category": "包包挂件"
  },
  "platforms": {
    "shopee": {
      "title": "Shopee 英文标题...",
      "description": "[Cute Plush Bear...]",
      "category": ["女包", "包包配件", "吊饰"],
      "attributes": {
        "brand": "NoBrand",
        "origin": "中国大陆",
        "材质": "Plush",
        "图案": "Cartoon Animal Camera",
        "商品类型": "其他",
        "Custom Product": "No"
      },
      "logistics": { "leadTime": 5, "minimumOrderQty": 5, "jit": true },
      "invitation": { "code": "IVCN202507240989" }
    }
  },
  "skus": [
    {
      "index": 0,
      "skuCode": "BG-MX-0001",
      "nameEn": "Bear Goggles Camera Charm",
      "weight": 60,
      "size": { "length": 8, "width": 8, "height": 12, "unit": "cm" },
      "pricing": { "selling": 28, "currency": "CNY" },
      "stock": 100,
      "images": { "primary": { "localPath": "..." } }
    }
  ],
  "images": {
    "main": [{ "index": 0, "localPath": "..." }],
    "detail": [{ "index": 0, "localPath": "..." }]
  }
}
```

---

## 浏览器管理 (EasyBR)

| API 端点 | 方法 | 用途 |
|----------|------|------|
| `/auto/status` | GET | 健康检查 |
| `/auto/getBrowerList` | GET | 获取浏览器列表 |
| `/auto/openBrower` | POST | 打开浏览器，返回 `{ ws, http }` |
| `/auto/closeBrower` | POST | 关闭浏览器 |

Playwright 通过 `chromium.connectOverCDP(ws)` 接管已打开的浏览器。

---

## 已有问题 & 改进方向

| 问题 | 影响 | 建议 |
|------|------|------|
| 选择器稳定性 | CSS 路径含 nth-child/hash 类名 | 多使用基于文本的 fallback 选择器 |
| 图片上传为固定等待 | 网速慢时可能未完成 | 改用轮询检测上传进度 |
| 无诊断/热词/标题优化 | v1.3-v1.4 功能已移除 | 需要时从 git 历史恢复 `keywords_service.js` |
| 右下角浮窗已停用 | `overlay.js:6 OVERLAY_ENABLED = false` | 需重新设计时改为 `true` |
| 缺少单元测试 | 依赖真机浏览器验证 | 可抽象步骤逻辑为纯函数测试 |

---

## 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-05 | 初始版本：基础填表、主备选择器、EasyBR 集成 |
| v1.1 | 2026-05 | 修复 `handlePopups` 30s 超时 (增加 visible 检查 + 3s 超时) |
| v1.2 | 2026-05 | 属性填写重构：支持搜索下拉、自定义值下拉 |
| v1.3 | 2026-05 | 诊断热词提取 (`keywords_service.js` + popover 强制点击) |
| v1.4 | 2026-05 | AI 标题优化管道 (DeepSeek → Doubao，异步非阻塞 + 自审计) |
| v1.5 | 2026-05 | **移除所有 AI 模块**，恢复纯净填表流程 |
