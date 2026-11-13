export function formatCount(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  if (num < 1000) return num.toString();
  
  const thousands = num / 1000;
  if (thousands % 1 === 0) {
    return `${thousands}K`;
  }
  
  // Keep one decimal place if it has a fraction, e.g., 1500 -> 1.5K
  return `${thousands.toFixed(1).replace(/\.0$/, '')}K`;
}
