export const ET_MONTH_NAMES = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ",
  "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ",
  "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጷጉሜ",
];

export const ET_WEEKDAY_SHORT = [
  "እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "አርብ", "ቅዳ",
];

export function toEthiopian(date: Date): { day: number; month: number; year: number } {
  const yr = date.getFullYear();
  const mo = date.getMonth() + 1;
  const dy = date.getDate();

  const a = Math.floor((14 - mo) / 12);
  const y = yr + 4800 - a;
  const m = mo + 12 * a - 3;
  const jdn =
    dy +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const etYear =
    4 * Math.floor((jdn - 1723856) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const etMonth = Math.floor(n / 30) + 1;
  const etDay = (n % 30) + 1;

  return { day: etDay, month: etMonth, year: etYear };
}

export function formatEtDatePill(date: Date): {
  weekday: string;
  day: string;
  month: string;
} {
  const et = toEthiopian(date);
  return {
    weekday: ET_WEEKDAY_SHORT[date.getDay()] ?? "",
    day: String(et.day),
    month: ET_MONTH_NAMES[(et.month - 1) % 13] ?? "",
  };
}
