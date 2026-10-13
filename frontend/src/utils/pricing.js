// Price rules for the cart page (instant feedback while shopping).
// The SAME rules live in backend/cart/pricing.py – at checkout the backend
// recalculates everything, because the browser can be changed by the user.
//
// Order: subtotal → discount → GST → shipping (free above ₹500) → total

export const GST_PERCENT = 18
export const FREE_SHIPPING_MIN = 500
export const SHIPPING_FEE = 49

const round2 = value => Math.round(value * 100) / 100

export const calculateSummary = (items, discount = 0) => {
  const subtotal = round2(items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0))
  const appliedDiscount = Math.min(discount, subtotal) // never more than the subtotal
  const taxable = subtotal - appliedDiscount
  const tax = round2((taxable * GST_PERCENT) / 100)
  const shipping = taxable === 0 || taxable >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE

  return {
    subtotal,
    discount: appliedDiscount,
    tax,
    shipping,
    total: round2(taxable + tax + shipping),
    // How much more to add for free shipping (0 when already free)
    amountForFreeShipping: taxable > 0 && taxable < FREE_SHIPPING_MIN ? round2(FREE_SHIPPING_MIN - taxable) : 0,
  }
}
