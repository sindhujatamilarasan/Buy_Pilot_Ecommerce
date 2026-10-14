// The server sends money as strings ("179.82") → numbers for <PriceSummary />
export const toSummary = server => {
  const n = key => Number(server[key])
  const taxable = n('subtotal') - n('discount')
  const freeMin = Number(server.free_shipping_min ?? 500)
  return {
    subtotal: n('subtotal'),
    discount: n('discount'),
    tax: n('tax'),
    shipping: n('shipping'),
    total: n('total'),
    amountForFreeShipping: taxable > 0 && taxable < freeMin ? freeMin - taxable : 0,
  }
}
