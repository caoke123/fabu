/**
 * shopee.config.js
 * Shopee 发布流程配置
 *
 * 这是唯一需要长期维护的配置文件。
 * Shopee 页面改版后，只需更新此文件中的对应参数，代码逻辑不动。
 *
 * lastVerified: 2026-05-25
 */

export default {

  // ─────────────────────────────────────────────
  // 页面 URL
  // ─────────────────────────────────────────────
  urls: {
    invitationList:     'https://seller.scs.shopee.cn/product/invitation/list',
    createPagePattern:  '/product/create',   // 用于验证是否成功进入发布页
  },


  // ─────────────────────────────────────────────
  // 发布流程步骤定义（顺序即执行顺序）
  // ─────────────────────────────────────────────
  flow: [
    {
      id:          'entry',
      name:        '进入发布页',
      description: '机会商品列表 → 输入邀请ID → 搜索 → 立即报名(卡片) → 立即报名(抽屉) → 直接提名 → 确认弹窗',
      file:        '00_entry.js',
    },
    {
      id:          'basicInfo',
      name:        '基础信息',
      description: '选品类(3级) → 删除预填主图 → 上传主图 → 填标题 → 填描述(图片+文字) → 填母货号',
      file:        '01_basicInfo.js',
    },
    {
      id:          'attributes',
      name:        '属性填写',
      description: '品牌(No Brand) → 原产地(中国大陆)',
      file:        '02_attributes.js',
    },
    {
      id:          'skus',
      name:        'SKU 规格',
      description: '填变体名称(款式) → 逐个添加SKU选项+上传SKU图 → 逐行填写价格表格',
      file:        '03_skus.js',
    },
    {
      id:          'submit',
      name:        '提交发布',
      description: '点击提交按钮',
      file:        '04_submit.js',
    },
  ],


  // ─────────────────────────────────────────────
  // 品类路径映射
  // key   = product.json 中 category 字段的值
  // value = 页面上逐级点击的文字数组（顺序不能变）
  // ─────────────────────────────────────────────
  categories: {
    '包包挂件': ['女包', '包包配饰', '吊饰'],
    // '手机挂饰': [],   // 待运营对接后补充
    // '车载配饰': [],   // 待运营对接后补充
  },


  // ─────────────────────────────────────────────
  // 弹窗自动处理配置
  // 在每次页面导航/关键操作后调用 handlePopups()
  // ─────────────────────────────────────────────
  popup: {
    enabled:  true,
    waitMs:   2000,   // 等待弹窗出现的最长时间（ms）

    // 关闭按钮文字/选择器，按顺序尝试
    // 遇到新弹窗时，把关闭按钮文字追加到此数组
    closeSelectors: [
      'button:has-text("我知道了")',
      'button:has-text("确认")',
      'button:has-text("关闭")',
      'button:has-text("取消")',
      '.ssc-message-box-action-button',
      '[aria-label="Close"]',
      '[aria-label="关闭"]',
    ],
  },


  // ─────────────────────────────────────────────
  // SKU 价格表格列号
  // Shopee 改版导致列位移时，只改这里的数字
  // ─────────────────────────────────────────────
  skuTableColumns: {
    invitationSpec:  4,   // 邀请规格
    sellingPrice:    7,   // 当前供货价（售价）
    jit:             8,   // 是否 JIT（直发）
    minOrder:        10,  // 起订量  ← 修正：原记录笔误为11，实际为10
    skuCode:         11,  // 卖家货号
    // 列号 12 为空列（量显示列），跳过
    weight:          13,  // 重量（kg）
    length:          14,  // 长度（cm）
    height:          15,  // 高度（cm）
    width:           16,  // 宽度（cm）
    leadTime:        17,  // 备货时间（天）
  },


  // ─────────────────────────────────────────────
  // 固定填写值（所有产品通用，不从 product.json 读取）
  // ─────────────────────────────────────────────
  fixedValues: {
    brand:        'No Brand',
    origin:       '中国大陆',
    variantName:  '款式',     // 变体名称固定填「款式」
    jit:          '是',       // 是否直发
    minOrder:     5,          // 起订量（件）
  },


  // ─────────────────────────────────────────────
  // 操作节奏（ms）
  // ─────────────────────────────────────────────
  timing: {
    actionDelay:   800,    // 每次点击/输入后等待
    uploadWait:    4000,   // 图片上传后等待（等待完成）
    pageTimeout:   30000,  // 页面加载超时
    popupWait:     2000,   // 等待弹窗出现
    skuRowDelay:   600,    // 每个 SKU 行处理间隔
    cascadeDelay:  500,    // 级联下拉每级点击间隔
  },


  // ─────────────────────────────────────────────
  // 浮窗 UI 配置
  // ─────────────────────────────────────────────
  ui: {
    alwaysOnTop: true,
    width:       320,
    height:      500,
    position:    { x: 'right', y: 'bottom' },  // 右下角
  },

}
