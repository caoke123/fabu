/**
 * shopee.selectors.js
 * Shopee 发布流程全部页面选择器
 *
 * 维护说明：
 *   - 每个选择器标注【稳定性】：高 / 中 / 低
 *   - 低稳定性选择器在 Shopee 改版后最先失效，优先检查
 *   - 改版后只改此文件，业务逻辑代码不动
 *   - 每次更新请修改「lastVerified」日期
 *
 * lastVerified: 2026-05-26
 */

export const SELECTORS = {

  // ─────────────────────────────────────────────
  // STEP 0：入口导航
  // URL: https://seller.scs.shopee.cn/product/invitation/list
  // ─────────────────────────────────────────────
  entry: {

    // 左侧菜单「机会商品」
    // 稳定性：低（nth-child 随菜单增减变化）
    sidebarMenuItem:
      '#app > div > div.app-sidebar.sidebar-container-wrapper > ul > li:nth-child(2) > ul > li.ssc-menu-item.non-active.active > span > span',
    sidebarMenuItemFallback:
      '.ssc-menu-item:has-text("机会商品")',

    // Tab「普通商品邀请」
    // 稳定性：极低（ID 含随机 hash，每次发版必变）⚠️ 只用 Fallback
    tabNormalInvitation:
      '#ssc-tabs__3a000f29 > div.ssc-tabs-bar > div > div > div > div > div:nth-child(4) > span',
    tabNormalInvitationFallback:
      '.ssc-tabs-bar span:has-text("普通商品邀请")',

    // 邀请 ID 输入框
    // 稳定性：高
    invitationIdInput:
      '#app-main-container > div > div > div.content > div.search-bar > div.select-input-search-bar.search-bar-filter-group > span > div > input',
    invitationIdInputFallback:
      'input[placeholder*="邀请"]',

    // 搜索按钮
    // 稳定性：中
    searchBtn:
      '#app-main-container > div > div > div.content > div.search-bar > div.btn-group > button.ssc-button.ssc-btn-type-primary',
    searchBtnFallback:
      'button.ssc-btn-type-primary:has-text("搜索")',

    // 「立即报名」—— 列表卡片按钮（hover/点击触发抽屉）
    // 稳定性：中
    respondButton:
      '.respond-button',
    respondButtonFallback:
      '//*[@id="app-main-container"]/div/div/div[3]/div[3]/div/div[3]/button',

    // 「立即报名」—— 抽屉内创建按钮（点击打开新窗口）
    // 稳定性：中
    createBtn:
      '.create-btn',
  },


  // ─────────────────────────────────────────────
  // STEP 1：基础信息
  // ─────────────────────────────────────────────
  basicInfo: {

    // 品类选择输入框（点击触发级联下拉）
    // 稳定性：中
    categoryInput:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div > div.listing-basic-info > form > div.basic-form-item-category-container.sbs-product-form-container > div > div > span > div > span > span > div > div > div.ssc-input-cascader-container-single > input',
    categoryInputFallback:
      '.basic-form-item-category-container .ssc-input-cascader-container-single input',

    // 品类级联第 1 级：女包
    // 稳定性：低 ⚠️ 只用 Fallback（文字匹配）
    categoryL1:
      'body > span:nth-child(33) > div > div > ul > div > div > li > span.ssc-cascader-node-label',
    categoryL1Fallback:
      '.ssc-cascader-node-label:has-text("女包")',

    // 品类级联第 2 级：包包配饰
    // 稳定性：低 ⚠️ 只用 Fallback
    categoryL2:
      'body > span:nth-child(33) > div > div > ul:nth-child(2) > div > div > li:nth-child(9) > span.ssc-cascader-node-label',
    categoryL2Fallback:
      '.ssc-cascader-node-label:has-text("包包配饰")',

    // 品类级联第 3 级：吊饰
    // 稳定性：低 ⚠️ 只用 Fallback
    categoryL3:
      'body > span:nth-child(33) > div > div > ul:nth-child(3) > div > div > li:nth-child(3) > span.ssc-cascader-node-label',
    categoryL3Fallback:
      '.ssc-cascader-node-label:has-text("吊饰")',

    // 删除预填主图（邀请商品可能预填图片，需先清除）
    // 稳定性：低
    deleteMainImage:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-item_images-container.sbs-product-form-container > div > div > span > div > div > div > ul > li.ssc-upload-picture-card.ssc-upload-picture-card.ssc-upload-picture-card-sortable > div.ssc-upload-picture-card-img-uploading-wrapper.ssc-upload-picture-card-img-uploading-wrapper-success > ul > li:nth-child(2) > svg > path',
    deleteMainImageFallback:
      '.basic-form-item-item_images-container .ssc-upload-picture-card-img-uploading-wrapper-success li:nth-child(2) svg',

    // 主图上传区域（点击触发 file dialog）
    // 稳定性：中
    mainImageUploadArea:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-item_images-container.sbs-product-form-container > div > div > span > div > div > div > ul > li > div',
    mainImageUploadAreaFallback:
      '.basic-form-item-item_images-container .ssc-upload-picture-card:not(.ssc-upload-picture-card-sortable) > div',

    // 商品标题输入框
    // 稳定性：高
    titleInput:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-item_name-container.sbs-product-form-container > div > div > span > div > div > input',
    titleInputFallback:
      '.basic-form-item-item_name-container input',

    // 商品描述富文本编辑区
    // 稳定性：中
    descriptionEditor:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-description-container.sbs-product-form-container > div > div > span > div > div > div > span > div > div > div > div > div > div > div.editor-outer',
    descriptionEditorFallback:
      '.basic-form-item-description-container .editor-outer',

    // 描述区工具栏「插入图片」按钮（步骤 17）
    // 稳定性：中
    descriptionImageBtn:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-description-container.sbs-product-form-container > div > div > span > div > div > div > span > div > div > div > div > div > div > div.toolbar-container > div.toolbar-container-left > div > div > div.popover-wrap.field-disabled-tips > div > div',
    descriptionImageBtnFallback:
      '.basic-form-item-description-container .toolbar-container-left .popover-wrap',

    // 描述图片弹窗「本地上传」选项 + file input
    // 稳定性：低（改版后变为 eds-popper 体系）
    descriptionImageLocalUpload:
      '.eds-dropdown-item',
    descriptionImageFileInput:
      '.eds-upload__input',

    // 母货号输入框（对应 productNo）
    // 稳定性：高
    parentSkuInput:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(1) > div.listing-basic-info > form > div.basic-form-item-parent_sku-container.sbs-product-form-container > div > div > span > div > div > input',
    parentSkuInputFallback:
      '.basic-form-item-parent_sku-container input',
  },


  // ─────────────────────────────────────────────
  // STEP 2：属性填写
  // ─────────────────────────────────────────────
  attributes: {

    // 品牌下拉触发器
    // 稳定性：低（nth-child 依赖属性渲染顺序）
    brandSelector:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(2) > div.listing-scs-attribute > span > div > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div.degrade-wrap.edit-row-right-medium > div > div > div > div > div > div > div > div.eds-selector__inner.placeholder.line-clamp--1',
    brandSelectorFallback:
      '.listing-scs-attribute .eds-selector__inner.placeholder',

    // 品牌选项「No Brand」
    // 稳定性：低（body popper 位置不固定）⚠️ 优先用 Fallback
    brandNoBrand:
      'body > div.eds-popper-container > div > ul > div.eds-select__menu.eds-select__menu_no_top_radius > div > div > div.wrap > div:nth-child(1) > div',
    brandNoBrandFallback:
      '.eds-select__menu div:has-text("No Brand")',

    // 原产地下拉触发器
    // 稳定性：低
    originSelector:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(2) > div.listing-scs-attribute > span > div > div > div > div > div:nth-child(2) > div:nth-child(1) > div > div.edit-row-right-medium > div > div > div > div > div > div > div.eds-selector.single-selector.clearable.eds-selector--large',
    originSelectorFallback:
      '.listing-scs-attribute .eds-selector.single-selector.clearable',

    // 原产地选项「中国大陆」
    // 稳定性：低（body nth-child 不固定）⚠️ 优先用 Fallback
    originChina:
      'body > div:nth-child(36) > div > ul > div.eds-select__menu.eds-select__menu_no_top_radius.eds-select__menu_no_bottom_radius > div > div:nth-child(3)',
    originChinaFallback:
      '.eds-select__menu div:has-text("中国大陆")',
  },


  // ─────────────────────────────────────────────
  // STEP 3：SKU 规格
  // ─────────────────────────────────────────────
  sku: {

    // 变体名称输入框（输入「款式」）
    // 稳定性：中
    variantNameInput:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(3) > div.scs-variations > section > div > form > div > div > section > div > div:nth-child(2) > div > div.recommendation-input > div > input',
    variantNameInputFallback:
      '.scs-variations div:nth-child(2) .recommendation-input input',

    // 变体选项输入框（每个 SKU 名称）
    // 稳定性：中
    // ⚠️ 每输入一个选项按 Enter 后，下一个选项继续用同一选择器
    variantOptionInput:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(3) > div.scs-variations > section > div > form > div > div > section > div > div:nth-child(3) > div > div.recommendation-input > div > input',
    variantOptionInputFallback:
      '.scs-variations div:nth-child(3) .recommendation-input input',

    // 删除 SKU 图片按钮（步骤 25）
    // 稳定性：低
    deleteSkuImage:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(3) > div.scs-variations > section > div > form > div > div > section > div > div:nth-child(3) > div > div.image-upload-mini-card.option-image-required > div > ul > li > div.ssc-upload-picture-card-img-uploading-wrapper.ssc-upload-picture-card-img-uploading-wrapper-success > ul > li:nth-child(2) > svg > path',
    deleteSkuImageFallback:
      '.option-image-required .ssc-upload-picture-card-img-uploading-wrapper-success li:nth-child(2) svg',

    // SKU 图片上传区域（步骤 26，第一个 SKU）
    // 稳定性：中
    // ⚠️ 多个 SKU 时通过 nth-child 动态定位，见 getSkuImageUploadSelector()
    skuImageUpload:
      '#app-main-container > div > div > div > section.listing-layout-content-section > div.listing-layout-content-container.listing-layout-content-container-shadow > section.listing-layout-content > div:nth-child(3) > div.scs-variations > section > div > form > div > div > section > div > div:nth-child(3) > div > div.image-upload-mini-card.option-image-required > div > ul > li > div > svg > use',
    skuImageUploadFallback:
      '.option-image-required .ssc-upload-picture-card:not(.ssc-upload-picture-card-sortable) > div',

    // 「添加变体」按钮（步骤 26.1，每输入完一个 SKU 选项后点击添加下一个）
    // 稳定性：中
    addVariantBtn:
      '.scs-variations section > div > form > div > div > section > div > button',
    addVariantBtnFallback:
      '.scs-variations section > div > form div > div > section > div > button',

    // ── SKU 价格表格 ──────────────────────────────
    // ⚠️ 以下为第 1 行（tr:nth-child(1)）的选择器
    // 多行时请使用 getSkuRowSelectors(n) 动态生成

    // 邀请规格下拉（步骤 27）
    tableInvitationSpec:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(4) > div > div > div > div > span > div > div > span > span:nth-child(1) > div > div > span.ssc-select-content',

    // 当前供货价 / 售价（步骤 28）
    tableSellingPrice:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(7) > div > div > div > div > span > div > div > input',

    // JIT 触发器已移至 03_skus.js 动态拼接 `td:nth-child(8) .ssc-select`
    // JIT 选项通过 page.evaluate 文字匹配 `.ssc-option`，无需静态选择器

    // 起订量（步骤 31，列号 10）
    tableMinOrder:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(10) > div > div > div > div > span > div > div > input',

    // 卖家货号 / SKU 编码（步骤 32，列号 11）
    tableSkuCode:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(11) > div > div > div > div > span > div > div > input',

    // 重量 kg（步骤 33，列号 13）
    tableWeight:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(13) > div > div > div > div > span > div > div > input',

    // 长度 cm（步骤 34，列号 14）
    tableLength:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(14) > div > div > div > div > span > div > div > input',

    // 高度 cm（步骤 35，列号 15）
    tableHeight:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(15) > div > div > div > div > span > div > div > input',

    // 宽度 cm（步骤 36，列号 16）
    tableWidth:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(16) > div > div > div > div > span > div > div > input',

    // 备货时间（步骤 37，列号 17）
    tableLeadTime:
      'table > tbody:nth-child(3) > tr:nth-child(1) > td:nth-child(17) > div > div > div > div > span > div > div > input',

    // 表格容器（用于等待表格渲染完成）
    tableContainer:
      '.ssc-table.listing-model-list',
  },


  // ─────────────────────────────────────────────
  // STEP 4：提交
  // ─────────────────────────────────────────────
  submit: {
    // 提交/发布按钮（步骤 38）
    // 稳定性：中
    publishBtn:
      '#app-main-container > div > div > div > section.listing-layout-operation > div.operation-area > span:nth-child(3) > button',
    publishBtnFallback:
      '.operation-area span:nth-child(3) button',
  },

}


// ─────────────────────────────────────────────
// 动态选择器工具函数
// ─────────────────────────────────────────────

/**
 * 动态生成 SKU 价格表格第 N 行的所有字段选择器
 * @param {number} rowIndex - 行号，从 1 开始
 *
 * 用法：
 *   const sel = getSkuRowSelectors(2)
 *   await page.fill(sel.sellingPrice, '11')
 */
export function getSkuRowSelectors(rowIndex) {
  const base = `table > tbody:nth-child(3) > tr:nth-child(${rowIndex})`
  const cell = (col) =>
    `${base} > td:nth-child(${col}) > div > div > div > div > span > div > div > input`
  return {
    invitationSpec: `${base} > td:nth-child(4)  div.ssc-select-content`,
    sellingPrice:   cell(7),
    minOrder:       cell(10),
    skuCode:        cell(11),
    weight:         cell(13),
    length:         cell(14),
    height:         cell(15),
    width:          cell(16),
    leadTime:       cell(17),
  }
}

/**
 * 动态生成第 N 个 SKU 图片上传区域的选择器
 * @param {number} index - SKU 序号，从 1 开始
 *
 * 用法：
 *   const sel = getSkuImageUploadSelector(2)
 *   await page.setInputFiles(sel, '/path/to/image.jpg')
 */
export function getSkuImageUploadSelector(index) {
  return `.scs-variations section div:nth-child(3) .option-image-required:nth-child(${index}) input[type="file"]`
}
