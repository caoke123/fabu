import fs from 'node:fs'

export function getMainImages(product) {
  const assets = product.assets?.main
  if (!Array.isArray(assets)) return []
  return assets.map(a => a.localPath).filter(Boolean)
}

export function getDetailImages(product) {
  const assets = product.assets?.detail
  if (!Array.isArray(assets)) return []
  return assets.map(a => a.localPath).filter(Boolean)
}

export function getSkuImage(product, skuIndex) {
  const asset = product.assets?.sku?.[skuIndex]
  if (!asset?.localPath) return null
  return fs.existsSync(asset.localPath) ? asset.localPath : null
}

export function validatePackage(product) {
  const errors = []

  if (!product.title || !product.title.trim()) {
    errors.push('title 不能为空')
  }

  if (!product.category || !product.category.trim()) {
    errors.push('category 字段为空，请在 product.json 中填写')
  }

  const outer = product.outerPackaging
  if (!outer || outer.length <= 0 || outer.width <= 0 || outer.height <= 0) {
    errors.push('outerPackaging 尺寸未填写，请补充 length/width/height')
  }

  const mainAssets = product.assets?.main
  if (!Array.isArray(mainAssets) || mainAssets.length === 0) {
    errors.push('assets.main 缺少主图')
  } else {
    const first = mainAssets[0]?.localPath
    if (!first || !fs.existsSync(first)) {
      errors.push(`主图文件不存在: ${first || '(空)'}`)
    }
  }

  const skuAssets = product.assets?.sku
  if (Array.isArray(product.skus) && Array.isArray(skuAssets)) {
    if (skuAssets.length !== product.skus.length) {
      errors.push(`assets.sku 数量(${skuAssets.length})与 skus 数量(${product.skus.length})不一致`)
    }
    for (let i = 0; i < product.skus.length; i++) {
      const sku = product.skus[i]
      const label = `skus[${i}] (${sku.skuName || sku.skuCode || '无名称'})`

      if (!sku.sellingPrice || sku.sellingPrice <= 0) {
        errors.push(`${label}: sellingPrice 必须 > 0`)
      }
      if (!sku.weight || sku.weight <= 0) {
        errors.push(`${label}: weight 必须 > 0`)
      }
      const assetPath = skuAssets[i]?.localPath
      if (!assetPath || !fs.existsSync(assetPath)) {
        errors.push(`${label}: SKU图片文件不存在: ${assetPath || '(空)'}`)
      }
    }
  } else {
    errors.push('skus 或 assets.sku 字段缺失或不是数组')
  }

  if (errors.length === 0) {
    return { valid: true }
  }
  return { valid: false, errors }
}
