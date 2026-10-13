/**
 * Utility functions for Date formatting and default date calculations.
 */

export interface DateFilterResult {
  date: string;       // Format: YYYY-MM-DD (cocok untuk input type="date")
  dateString: string; // Format: YYYYMMDD (cocok untuk query parameter API)
}

/**
 * Menghasilkan tanggal default mundur N hari dari hari ini.
 * @param daysBack Jumlah hari mundur (default: 3)
 */
export function getDefaultDateFilter(daysBack = 3): DateFilterResult {
  const currentDate = new Date();
  const targetDate = new Date(currentDate);
  targetDate.setDate(targetDate.getDate() - daysBack);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    dateString: `${year}${month}${day}`,
  };
}

/**
 * Format string tanggal input (YYYY-MM-DD) ke string API (YYYYMMDD).
 */
export function formatToApiDateString(dateVal: string): string {
  return (dateVal || '').replace(/-/g, '');
}

