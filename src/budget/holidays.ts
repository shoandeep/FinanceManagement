/**
 * Malaysian public holidays + working-day helpers. Fully offline / static data
 * (no network — CSP-safe). Operates on 'YYYY-MM-DD' local dates, deterministic.
 *
 * Scope: national (federal) holidays plus the major state holidays, keyed by the
 * user's profile state. Dates follow the official federal/state gazette; the
 * Islamic- and lunar-calendar holidays (Hari Raya, Awal Muharram, Maulidur Rasul,
 * Chinese New Year, Deepavali, Thaipusam, Wesak, Nuzul Al-Quran) are the published
 * dates and may be adjusted by a day per the official announcement. Treated as
 * reminders — they never move money. Extend the YEARS tables as new years gazette.
 */
import { addDaysISO, dayOfWeekMon0 } from './dates';
import type { MalaysianState } from '../model/types';

export interface StateInfo {
  id: MalaysianState;
  label: string;
}

/** All 13 states + 3 federal territories, for the profile selector. */
export const MALAYSIAN_STATES: StateInfo[] = [
  { id: 'johor', label: 'Johor' },
  { id: 'kedah', label: 'Kedah' },
  { id: 'kelantan', label: 'Kelantan' },
  { id: 'melaka', label: 'Melaka' },
  { id: 'negeri-sembilan', label: 'Negeri Sembilan' },
  { id: 'pahang', label: 'Pahang' },
  { id: 'penang', label: 'Penang' },
  { id: 'perak', label: 'Perak' },
  { id: 'perlis', label: 'Perlis' },
  { id: 'selangor', label: 'Selangor' },
  { id: 'terengganu', label: 'Terengganu' },
  { id: 'sabah', label: 'Sabah' },
  { id: 'sarawak', label: 'Sarawak' },
  { id: 'kuala-lumpur', label: 'Kuala Lumpur' },
  { id: 'labuan', label: 'Labuan' },
  { id: 'putrajaya', label: 'Putrajaya' },
];

export const STATE_LABEL: Record<MalaysianState, string> = Object.fromEntries(
  MALAYSIAN_STATES.map((s) => [s.id, s.label]),
) as Record<MalaysianState, string>;

/**
 * States whose official rest days are Friday & Saturday (so Sunday is a working
 * day). The rest of Malaysia rests Saturday & Sunday.
 */
const FRIDAY_SATURDAY_STATES = new Set<MalaysianState>(['johor', 'kedah', 'kelantan', 'terengganu']);

/** The two weekend days as Mon=0…Sun=6 indices, for the given state. */
export function weekendDays(state?: MalaysianState): [number, number] {
  return state && FRIDAY_SATURDAY_STATES.has(state) ? [4, 5] : [5, 6];
}

/** Is the date a weekend in the given state (defaults to Sat/Sun)? */
export function isWeekend(dateISO: string, state?: MalaysianState): boolean {
  const dow = dayOfWeekMon0(dateISO);
  const [a, b] = weekendDays(state);
  return dow === a || dow === b;
}

/** Human label for the weekend convention, e.g. "Sat & Sun". */
export function weekendLabel(state?: MalaysianState): string {
  return state && FRIDAY_SATURDAY_STATES.has(state) ? 'Fri & Sat' : 'Sat & Sun';
}

interface HolidayEntry {
  name: string;
  /** If set, the holiday applies ONLY to these states. */
  only?: MalaysianState[];
  /** If set, the holiday is national EXCEPT these states. */
  except?: MalaysianState[];
}

// Convenience scope lists.
const FT: MalaysianState[] = ['kuala-lumpur', 'labuan', 'putrajaya'];
const THAIPUSAM_STATES: MalaysianState[] = [
  'johor', 'kedah', 'kuala-lumpur', 'putrajaya', 'negeri-sembilan', 'penang', 'perak', 'selangor',
];
// Nuzul Al-Quran is observed in most states; not in Johor, Melaka or Sarawak.
const NO_NUZUL: MalaysianState[] = ['johor', 'melaka', 'sarawak'];
// New Year's Day is not a holiday in these states.
const NO_NEW_YEAR: MalaysianState[] = ['johor', 'kedah', 'kelantan', 'perlis', 'terengganu'];

/** Build helpers keep the year tables terse. */
const nat = (name: string, except?: MalaysianState[]): HolidayEntry => (except ? { name, except } : { name });
const only = (name: string, states: MalaysianState[]): HolidayEntry => ({ name, only: states });

/**
 * Holiday table, keyed by ISO date → entries on that date. Multiple entries per
 * day are possible (e.g. a national holiday coinciding with a state one).
 */
const HOLIDAYS: Record<string, HolidayEntry[]> = {
  /* ---------------------------------------------------------------- 2025 */
  '2025-01-01': [nat("New Year's Day", NO_NEW_YEAR)],
  '2025-01-29': [nat('Chinese New Year')],
  '2025-01-30': [nat('Chinese New Year (2nd day)')],
  '2025-02-01': [only('Federal Territory Day', FT)],
  '2025-02-11': [only('Thaipusam', THAIPUSAM_STATES)],
  '2025-03-18': [nat('Nuzul Al-Quran', NO_NUZUL)],
  '2025-03-31': [nat('Hari Raya Aidilfitri')],
  '2025-04-01': [nat('Hari Raya Aidilfitri (2nd day)')],
  '2025-05-01': [nat('Labour Day')],
  '2025-05-12': [nat('Wesak Day')],
  '2025-05-30': [only('Pesta Kaamatan', ['sabah', 'labuan'])],
  '2025-05-31': [only('Pesta Kaamatan (2nd day)', ['sabah', 'labuan'])],
  '2025-06-01': [only('Gawai Dayak', ['sarawak'])],
  '2025-06-02': [nat("Yang di-Pertuan Agong's Birthday"), only('Gawai Dayak (2nd day)', ['sarawak'])],
  '2025-06-07': [nat('Hari Raya Aidiladha'), only('Hari Raya Aidiladha (2nd day)', ['kelantan', 'terengganu'])],
  '2025-06-27': [nat('Awal Muharram')],
  '2025-07-12': [only("Penang Governor's Birthday", ['penang'])],
  '2025-07-22': [only('Sarawak Day', ['sarawak'])],
  '2025-08-24': [only("Melaka Governor's Birthday", ['melaka'])],
  '2025-08-31': [nat('National Day (Merdeka)')],
  '2025-09-05': [nat('Maulidur Rasul')],
  '2025-09-16': [nat('Malaysia Day')],
  '2025-10-04': [only("Sabah Governor's Birthday", ['sabah'])],
  '2025-10-11': [only("Sarawak Governor's Birthday", ['sarawak'])],
  '2025-10-20': [nat('Deepavali', ['sarawak'])],
  '2025-12-25': [nat('Christmas Day')],

  /* ---------------------------------------------------------------- 2026 */
  '2026-01-01': [nat("New Year's Day", NO_NEW_YEAR)],
  '2026-02-01': [only('Thaipusam', THAIPUSAM_STATES), only('Federal Territory Day', FT)],
  '2026-02-17': [nat('Chinese New Year')],
  '2026-02-18': [nat('Chinese New Year (2nd day)')],
  '2026-03-08': [nat('Nuzul Al-Quran', NO_NUZUL)],
  '2026-03-20': [nat('Hari Raya Aidilfitri')],
  '2026-03-21': [nat('Hari Raya Aidilfitri (2nd day)')],
  '2026-05-01': [nat('Labour Day')],
  '2026-05-27': [nat('Hari Raya Aidiladha'), only('Hari Raya Aidiladha (2nd day)', ['kelantan', 'terengganu'])],
  '2026-05-30': [only('Pesta Kaamatan', ['sabah', 'labuan'])],
  '2026-05-31': [nat('Wesak Day'), only('Pesta Kaamatan (2nd day)', ['sabah', 'labuan'])],
  '2026-06-01': [nat("Yang di-Pertuan Agong's Birthday"), only('Gawai Dayak', ['sarawak'])],
  '2026-06-02': [only('Gawai Dayak (2nd day)', ['sarawak'])],
  '2026-06-16': [nat('Awal Muharram')],
  '2026-07-11': [only("Penang Governor's Birthday", ['penang'])],
  '2026-07-22': [only('Sarawak Day', ['sarawak'])],
  '2026-08-24': [only("Melaka Governor's Birthday", ['melaka'])],
  '2026-08-25': [nat('Maulidur Rasul')],
  '2026-08-31': [nat('National Day (Merdeka)')],
  '2026-09-16': [nat('Malaysia Day')],
  '2026-10-03': [only("Sabah Governor's Birthday", ['sabah'])],
  '2026-10-10': [only("Sarawak Governor's Birthday", ['sarawak'])],
  '2026-11-08': [nat('Deepavali', ['sarawak'])],
  '2026-12-25': [nat('Christmas Day')],

  /* ---------------------------------------------------------------- 2027 */
  '2027-01-01': [nat("New Year's Day", NO_NEW_YEAR)],
  '2027-02-06': [nat('Chinese New Year')],
  '2027-02-07': [nat('Chinese New Year (2nd day)')],
  '2027-02-01': [only('Federal Territory Day', FT)],
  '2027-02-21': [only('Thaipusam', THAIPUSAM_STATES)],
  '2027-02-26': [nat('Nuzul Al-Quran', NO_NUZUL)],
  '2027-03-10': [nat('Hari Raya Aidilfitri')],
  '2027-03-11': [nat('Hari Raya Aidilfitri (2nd day)')],
  '2027-05-01': [nat('Labour Day')],
  '2027-05-16': [nat('Hari Raya Aidiladha'), only('Hari Raya Aidiladha (2nd day)', ['kelantan', 'terengganu'])],
  '2027-05-20': [nat('Wesak Day')],
  '2027-05-30': [only('Pesta Kaamatan', ['sabah', 'labuan'])],
  '2027-05-31': [only('Pesta Kaamatan (2nd day)', ['sabah', 'labuan'])],
  '2027-06-01': [only('Gawai Dayak', ['sarawak'])],
  '2027-06-02': [only('Gawai Dayak (2nd day)', ['sarawak'])],
  '2027-06-06': [nat('Awal Muharram')],
  '2027-06-07': [nat("Yang di-Pertuan Agong's Birthday")],
  '2027-07-10': [only("Penang Governor's Birthday", ['penang'])],
  '2027-07-22': [only('Sarawak Day', ['sarawak'])],
  '2027-08-15': [nat('Maulidur Rasul')],
  '2027-08-24': [only("Melaka Governor's Birthday", ['melaka'])],
  '2027-08-31': [nat('National Day (Merdeka)')],
  '2027-09-16': [nat('Malaysia Day')],
  '2027-10-02': [only("Sabah Governor's Birthday", ['sabah'])],
  '2027-10-09': [only("Sarawak Governor's Birthday", ['sarawak'])],
  '2027-10-28': [nat('Deepavali', ['sarawak'])],
  '2027-12-25': [nat('Christmas Day')],
};

/**
 * State ruler / Governor birthdays + Good Friday (Sabah & Sarawak), merged into
 * the table above. Fixed-date birthdays repeat each year; the "Nth weekday"
 * birthdays (Kedah = 3rd Sunday of June, Perak = 1st Friday of November) and
 * Good Friday are listed per year. Per the respective state gazette.
 */
const STATE_EXTRA: [string, HolidayEntry][] = [
  // Johor — Sultan of Johor's Birthday (23 Mar)
  ['2025-03-23', only("Sultan of Johor's Birthday", ['johor'])],
  ['2026-03-23', only("Sultan of Johor's Birthday", ['johor'])],
  ['2027-03-23', only("Sultan of Johor's Birthday", ['johor'])],
  // Kedah — Sultan of Kedah's Birthday (3rd Sunday of June)
  ['2025-06-15', only("Sultan of Kedah's Birthday", ['kedah'])],
  ['2026-06-21', only("Sultan of Kedah's Birthday", ['kedah'])],
  ['2027-06-20', only("Sultan of Kedah's Birthday", ['kedah'])],
  // Kelantan — Sultan of Kelantan's Birthday (11–12 Nov, two days)
  ['2025-11-11', only("Sultan of Kelantan's Birthday", ['kelantan'])],
  ['2025-11-12', only("Sultan of Kelantan's Birthday (2nd day)", ['kelantan'])],
  ['2026-11-11', only("Sultan of Kelantan's Birthday", ['kelantan'])],
  ['2026-11-12', only("Sultan of Kelantan's Birthday (2nd day)", ['kelantan'])],
  ['2027-11-11', only("Sultan of Kelantan's Birthday", ['kelantan'])],
  ['2027-11-12', only("Sultan of Kelantan's Birthday (2nd day)", ['kelantan'])],
  // Negeri Sembilan — Yang di-Pertuan Besar's Birthday (14 Jan)
  ['2025-01-14', only("Yang di-Pertuan Besar's Birthday", ['negeri-sembilan'])],
  ['2026-01-14', only("Yang di-Pertuan Besar's Birthday", ['negeri-sembilan'])],
  ['2027-01-14', only("Yang di-Pertuan Besar's Birthday", ['negeri-sembilan'])],
  // Pahang — Sultan of Pahang's Birthday (30 Jul)
  ['2025-07-30', only("Sultan of Pahang's Birthday", ['pahang'])],
  ['2026-07-30', only("Sultan of Pahang's Birthday", ['pahang'])],
  ['2027-07-30', only("Sultan of Pahang's Birthday", ['pahang'])],
  // Perak — Sultan of Perak's Birthday (1st Friday of November)
  ['2025-11-07', only("Sultan of Perak's Birthday", ['perak'])],
  ['2026-11-06', only("Sultan of Perak's Birthday", ['perak'])],
  ['2027-11-05', only("Sultan of Perak's Birthday", ['perak'])],
  // Perlis — Raja of Perlis's Birthday (17 Jul)
  ['2025-07-17', only("Raja of Perlis's Birthday", ['perlis'])],
  ['2026-07-17', only("Raja of Perlis's Birthday", ['perlis'])],
  ['2027-07-17', only("Raja of Perlis's Birthday", ['perlis'])],
  // Selangor — Sultan of Selangor's Birthday (11 Dec)
  ['2025-12-11', only("Sultan of Selangor's Birthday", ['selangor'])],
  ['2026-12-11', only("Sultan of Selangor's Birthday", ['selangor'])],
  ['2027-12-11', only("Sultan of Selangor's Birthday", ['selangor'])],
  // Terengganu — Sultan of Terengganu's Birthday (26 Apr)
  ['2025-04-26', only("Sultan of Terengganu's Birthday", ['terengganu'])],
  ['2026-04-26', only("Sultan of Terengganu's Birthday", ['terengganu'])],
  ['2027-04-26', only("Sultan of Terengganu's Birthday", ['terengganu'])],
  // Good Friday — Sabah & Sarawak only
  ['2025-04-18', only('Good Friday', ['sabah', 'sarawak'])],
  ['2026-04-03', only('Good Friday', ['sabah', 'sarawak'])],
  ['2027-03-26', only('Good Friday', ['sabah', 'sarawak'])],
];
for (const [d, e] of STATE_EXTRA) (HOLIDAYS[d] ??= []).push(e);

export interface ResolvedHoliday {
  name: string;
  /** True for a nationwide holiday, false for a state-specific one. */
  national: boolean;
}

/** Does a holiday entry apply to the given state (undefined state ⇒ national-only view)? */
function applies(e: HolidayEntry, state?: MalaysianState): boolean {
  if (e.only) return state != null && e.only.includes(state);
  if (e.except) return state == null || !e.except.includes(state);
  return true; // national
}

/** Public holidays on a date for the given state (national + that state's). */
export function holidaysOn(dateISO: string, state?: MalaysianState): ResolvedHoliday[] {
  const entries = HOLIDAYS[dateISO];
  if (!entries) return [];
  return entries
    .filter((e) => applies(e, state))
    .map((e) => ({ name: e.name, national: !e.only }));
}

/** Is the date a public holiday for the given state? */
export function isPublicHoliday(dateISO: string, state?: MalaysianState): boolean {
  return holidaysOn(dateISO, state).length > 0;
}

/** A weekend or a public holiday — i.e. not a normal pay/working day. */
export function isNonWorkingDay(dateISO: string, state?: MalaysianState): boolean {
  return isWeekend(dateISO, state) || isPublicHoliday(dateISO, state);
}

/**
 * The latest working day on or before `dateISO`, stepping back over weekends and
 * public holidays (so a holiday that falls on a Monday chains back to Friday).
 * Bounded so a data gap can never loop forever.
 */
export function previousWorkingDay(dateISO: string, state?: MalaysianState): string {
  let d = dateISO;
  for (let i = 0; i < 31 && isNonWorkingDay(d, state); i++) {
    d = addDaysISO(d, -1);
  }
  return d;
}
