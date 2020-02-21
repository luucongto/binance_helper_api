import ApiInfo from './api_info'
module.exports = {
  calculateQty (orderParams) {
    let filter = ApiInfo[orderParams.pair]
    if (orderParams.quantity < filter.minQty || orderParams.quantity > filter.maxQty) {
      return 0
    }
    let oldQty = orderParams.quantity
    const step = Math.round(1 / filter.stepSize)
    let newQty = Math.floor(oldQty * step) / step
    console.log('calculateQty', oldQty, orderParams.pair, step, newQty)
    return newQty
  }
}
