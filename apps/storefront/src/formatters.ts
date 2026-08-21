const hryvniaNumberFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 0,
});

export function formatHryvnia(amountUah: number): string {
  return `${hryvniaNumberFormatter.format(amountUah)} ₴`;
}
