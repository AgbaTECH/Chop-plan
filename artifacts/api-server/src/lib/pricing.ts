// Hidden platform fee applied to every customer-facing price.
// Vendors always set/see/get paid on their own listed price ("vendor price").
// Customers only ever see the marked-up "display price" — never the vendor
// price, never the fee amount, never a breakdown.
export const PLATFORM_FEE_RATE = 0.05;

export function toCustomerDisplayPriceNaira(vendorPriceNaira: number): number {
  return Math.round(vendorPriceNaira * (1 + PLATFORM_FEE_RATE));
}
