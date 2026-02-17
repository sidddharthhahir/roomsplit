export function formatCents(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(2)}`;
}

export function parseCentsFromEuros(euros: string | number): number {
  const value = typeof euros === 'string' ? parseFloat(euros) : euros;
  return Math.round(value * 100);
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}