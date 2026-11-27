import { Mark, Student } from '../models/school.js';

export const TERMS = ['Term 1', 'Term 2', 'Term 3'];
export const EXAMS = ['Opener', 'Mid-Term', 'End-Term'];

export const gradeOf = (n) => (n >= 80 ? 'A' : n >= 70 ? 'B' : n >= 60 ? 'C' : n >= 50 ? 'D' : 'E');
const REMARKS = { A: 'Excellent', B: 'Very good', C: 'Good', D: 'Fair', E: 'Needs improvement' };
const round1 = (n) => Math.round(n * 10) / 10;
const mean = (list) => list.reduce((s, x) => s + x, 0) / list.length;

export function parseTermYear(src) {
  const term = String(src.term || '');
  const year = Number(src.year);
  if (!TERMS.includes(term) || !(year >= 2000 && year <= 2100)) return null;
  return { term, year };
}

// Marks of one class -> per student: subject averages, total and mean
function summarise(marks) {
  const bySt = new Map();
  for (const m of marks) {
    if (m.score == null) continue;
    if (!bySt.has(m.admNo)) bySt.set(m.admNo, {});
    const subs = bySt.get(m.admNo);
    if (!subs[m.subject]) subs[m.subject] = {};
    subs[m.subject][m.exam] = m.score;
  }
  const out = new Map();
  for (const [admNo, subs] of bySt) {
    const rows = Object.entries(subs)
      .map(([subject, scores]) => {
        const average = round1(mean(Object.values(scores)));
        const grade = gradeOf(average);
        return { subject, scores, average, grade, remark: REMARKS[grade] };
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));
    const total = round1(rows.reduce((s, r) => s + r.average, 0));
    const meanScore = round1(total / rows.length);
    out.set(admNo, { rows, total, mean: meanScore, grade: gradeOf(meanScore) });
  }
  return out;
}

// Position by mean score. Equal means share a position.
function rank(summary) {
  const list = [...summary.entries()].map(([admNo, s]) => ({ admNo, mean: s.mean })).sort((a, b) => b.mean - a.mean);
  const position = {};
  list.forEach((x, i) => {
    position[x.admNo] = i > 0 && x.mean === list[i - 1].mean ? position[list[i - 1].admNo] : i + 1;
  });
  return { position, outOf: list.length };
}

export async function buildReportCard({ admNo, term, year }) {
  const student = await Student.findOne({ admNo }).select('admNo name class').lean();
  if (!student) return null;
  const mine = await Mark.find({ admNo, term, year }).lean();
  const cls = mine[0]?.class || student.class;
  const summary = summarise(await Mark.find({ class: cls, term, year }).lean());
  const s = summary.get(admNo);
  const { position, outOf } = rank(summary);
  return {
    student: { admNo, name: student.name, class: cls },
    term, year, exams: EXAMS,
    subjects: s?.rows || [],
    total: s?.total ?? null,
    mean: s?.mean ?? null,
    grade: s?.grade ?? null,
    position: s ? position[admNo] : null,
    outOf,
  };
}

export async function buildClassResults({ cls, term, year }) {
  const marks = await Mark.find({ class: cls, term, year }).lean();
  const summary = summarise(marks);
  const { position } = rank(summary);
  const names = await Student.find({ admNo: { $in: [...summary.keys()] } }).select('admNo name').lean();
  const nameOf = Object.fromEntries(names.map((s) => [s.admNo, s.name]));

  const subjects = [...new Set(marks.map((m) => m.subject))].sort();
  const students = [...summary.entries()]
    .map(([admNo, s]) => ({
      admNo,
      name: nameOf[admNo] || admNo,
      averages: Object.fromEntries(s.rows.map((r) => [r.subject, r.average])),
      total: s.total,
      mean: s.mean,
      grade: s.grade,
      position: position[admNo],
    }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  const subjectMeans = subjects.map((subject) => {
    const vals = students.map((st) => st.averages[subject]).filter((v) => v != null);
    return { subject, mean: vals.length ? round1(mean(vals)) : null };
  });

  return {
    class: cls, term, year, subjects, students, subjectMeans,
    classMean: students.length ? round1(mean(students.map((s) => s.mean))) : null,
  };
}
// Every student's report card for one class, in name order (for printing a whole class)
export async function buildClassReportCards({ cls, term, year }) {
  const summary = summarise(await Mark.find({ class: cls, term, year }).lean());
  const { position, outOf } = rank(summary);
  const names = await Student.find({ admNo: { $in: [...summary.keys()] } }).select('admNo name').lean();
  const nameOf = Object.fromEntries(names.map((s) => [s.admNo, s.name]));
  return [...summary.entries()]
    .map(([admNo, s]) => ({
      student: { admNo, name: nameOf[admNo] || admNo, class: cls },
      term, year, exams: EXAMS,
      subjects: s.rows, total: s.total, mean: s.mean, grade: s.grade,
      position: position[admNo], outOf,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
}