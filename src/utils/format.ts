export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function formatDateVi(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const datePart = isoDate.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function formatDateTimeVi(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—';
  const datePart = formatDateVi(isoDateTime);
  if (isoDateTime.includes('T')) {
    const timePart = isoDateTime.split('T')[1]?.slice(0, 5);
    return timePart ? `${datePart} ${timePart}` : datePart;
  }
  return datePart;
}

export function daysUntil(targetDateStr: string): number {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = new Date(todayStr + 'T00:00:00').getTime();
  const target = new Date(targetDateStr.slice(0, 10) + 'T00:00:00').getTime();
  return Math.floor((target - today) / (1000 * 60 * 60 * 24));
}
