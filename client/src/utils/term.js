const TZ = 'Africa/Nairobi';

export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export const currentTerm = () => {
  const m = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'numeric' }).format(new Date()));
  return m <= 4 ? 'Term 1' : m <= 8 ? 'Term 2' : 'Term 3';
};

export const currentYear = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date()));

export const yearOptions = () => [0, 1, 2].map((i) => currentYear() - i);