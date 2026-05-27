import fs from 'node:fs'

export function getMainImages(product) {
  return (product.images?.main || []).map(img => img.localPath).filter(Boolean)
}

export function getDetailImages(product) {
  return (product.images?.detail || []).map(img => img.localPath).filter(Boolean)
}

export function getSkuImage(product, skuIndex) {
  return product.skus?.[skuIndex]?.images?.primary?.localPath || null
}

export function validatePackage(product) {
  const errors = []

  const category = product.platforms?.shopee?.category
  if (!category || category.length === 0) {
    errors.push('platforms.shopee.category 为空，请填写品类')
  }

  const mainImages = getMainImages(product)
  if (mainImages.length === 0) errors.push('images.main 为空，无主图')

  const skus = product.skus || []
  if (skus.length === 0) errors.push('skus 为空')
  skus.forEach((sku, i) => {
    if (!sku.pricing?.selling || sku.pricing.selling <= 0)
      errors.push(`skus[${i}] selling price 未填写`)
    if (!sku.weight || sku.weight <= 0)
      errors.push(`skus[${i}] weight 未填写`)
    if (!sku.images?.primary?.localPath)
      errors.push(`skus[${i}] SKU图片路径缺失`)
  })

  if (!product.platforms?.shopee?.invitation?.code)
    errors.push('platforms.shopee.invitation.code 未填写')

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors }
}
