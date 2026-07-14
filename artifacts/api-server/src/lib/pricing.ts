// Hidden platform fee applied to every customer-facing price.
// Vendors always set/see/get paid on their own listed price ("vendor price").
// Customers only ever see the marked-up "display price" — never the vendor
// price, never the fee amount, never a breakdown.
export const PLATFORM_FEE_RATE = 0.05;

export function toCustomerDisplayPriceNaira(vendorPriceNaira: number): number {
  return Math.round(vendorPriceNaira * (1 + PLATFORM_FEE_RATE));
}

// Off-schedule ("à la carte") purchases — a customer buying directly from a
// vendor on a day their plan doesn't cover, with no active subscription
// required. This markup is deliberately much higher than PLATFORM_FEE_RATE
// so an à la carte meal always costs more than the same meal would on a
// subscription day, keeping the subscription the better deal. It is
// tracked entirely separately from the 5% subscription markup (never mixed
// into the same figure) so ChopPlan's off-schedule revenue can be reported
// independently — see paymentsTable.offScheduleMarkupNaira.
export const OFF_SCHEDULE_MARKUP_RATE = 0.35;

// Vendors can have an admin-configured override percentage (whole number,
// e.g. 40 = 40%) stored on vendorsTable.offScheduleMarkupPercent; null falls
// back to the global OFF_SCHEDULE_MARKUP_RATE.
export function resolveOffScheduleMarkupRate(vendorOverridePercent: number | null | undefined): number {
  if (vendorOverridePercent === null || vendorOverridePercent === undefined) {
    return OFF_SCHEDULE_MARKUP_RATE;
  }
  return vendorOverridePercent / 100;
}

export interface OffSchedulePricing {
  vendorPriceNaira: number;
  offScheduleMarkupNaira: number;
  totalPriceNaira: number;
}

// Always computed server-side from the meal's raw vendor price — never
// trust a client-supplied price or markup for an à la carte purchase.
export function computeOffSchedulePricing(
  vendorPriceNaira: number,
  vendorOverridePercent: number | null | undefined
): OffSchedulePricing {
  const rate = resolveOffScheduleMarkupRate(vendorOverridePercent);
  const offScheduleMarkupNaira = Math.round(vendorPriceNaira * rate);
  return {
    vendorPriceNaira,
    offScheduleMarkupNaira,
    totalPriceNaira: vendorPriceNaira + offScheduleMarkupNaira,
  };
}
