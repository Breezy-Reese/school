import { Router } from 'express';
import { Student, SchoolClass } from '../models/school.js';
import { yy, nextNumber } from '../utils/helpers.js';

const r = Router();
const MAX_ROWS = 1500;

const str = (v) => String(v ?? '').trim();
const compact = (v) => str(v).toLowerCase().replace(/\s+/g, '');
const lower = (v) => str(v).toLowerCase().replace(/\s+/g, ' ');
const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY or YYYY-MM-DD
function parseDate(v) {
  const t = str(v);
  if (!t) return { ok: true };
  let y; let m; let d; let match;
  if ((match = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = match;
  else if ((match = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/))) [, d, m, y] = match;
  else return { ok: false };
  y = +y; m = +m; d = +d;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return { ok: false };
  return { ok: true, value: date };
}

function parseGender(v) {
  const t = compact(v);
  if (!t) return { ok: true };
  if (['m', 'male', 'boy'].includes(t)) return { ok: true, value: 'Male' };
  if (['f', 'female', 'girl'].includes(t)) return { ok: true, value: 'Female' };
  if (t === 'other') return { ok: true, value: 'Other' };
  return { ok: false };
}

function parseStatus(v) {
  const t = compact(v);
  if (!t || t === 'active') return { ok: true, value: 'Active' };
  if (t === 'transferred') return { ok: true, value: 'Transferred' };
  if (['passedout', 'alumni', 'graduated'].includes(t)) return { ok: true, value: 'Passed Out' };
  return { ok: false };
}

function parseCategory(v) {
  const t = compact(v);
  if (!t) return { ok: true };
  if (t === 'day') return { ok: true, value: 'Day' };
  if (['boarding', 'boarder'].includes(t)) return { ok: true, value: 'Boarding' };
  return { ok: false };
}

// Excel often drops the leading zero from phone numbers, so put it back
function parsePhone(v) {
  const t = str(v).replace(/[\s\-()]/g, '');
  if (!t) return { ok: true };
  let n = t.replace(/^\+/, '');
  if (/^254[17]\d{8}$/.test(n)) n = `0${n.slice(3)}`;
  else if (/^[17]\d{8}$/.test(n)) n = `0${n}`;
  return /^0[17]\d{8}$/.test(n) ? { ok: true, value: n } : { ok: false };
}

// Validate and tidy one row. Returns the cleaned student data and any problems.
function cleanRow(raw, row, classByKey, newClasses, createClasses) {
  const errors = [];
  const data = {};
  const put = (key, value) => { if (value !== undefined && value !== '') data[key] = value; };

  const name = str(raw.name).replace(/\s+/g, ' ');
  if (!name) errors.push('Name is missing');
  else if (name.length > 120) errors.push('Name is too long');
  else put('name', name);

  const clsRaw = str(raw.class).replace(/\s+/g, ' ');
  if (!clsRaw) {
    errors.push('Class is missing');
  } else {
    const key = compact(clsRaw);
    const found = classByKey[key] || newClasses.get(key);
    if (found) put('class', found);
    else if (createClasses && clsRaw.length <= 40) { newClasses.set(key, clsRaw); put('class', clsRaw); }
    else errors.push(`Class "${clsRaw}" is not set up`);
  }

  put('section', str(raw.section).slice(0, 20));

  const g = parseGender(raw.gender);
  if (!g.ok) errors.push(`Gender "${str(raw.gender)}" is not recognised (use Male or Female)`);
  else put('gender', g.value);

  const dob = parseDate(raw.dob);
  if (!dob.ok) errors.push(`Date of birth "${str(raw.dob)}" is not a valid date (use DD/MM/YYYY)`);
  else put('dob', dob.value);

  const adm = parseDate(raw.admissionDate);
  if (!adm.ok) errors.push(`Admission date "${str(raw.admissionDate)}" is not a valid date (use DD/MM/YYYY)`);
  else put('admissionDate', adm.value);

  const st = parseStatus(raw.status);
  if (!st.ok) errors.push(`Status "${str(raw.status)}" is not recognised (Active, Transferred or Passed Out)`);
  else put('status', st.value);

  const cat = parseCategory(raw.category);
  if (!cat.ok) errors.push(`Category "${str(raw.category)}" is not recognised (Day or Boarding)`);
  else put('category', cat.value);

  const phone = parsePhone(raw.phone);
  if (!phone.ok) errors.push(`Phone "${str(raw.phone)}" should look like 0712345678`);
  else put('phone', phone.value);

  const alt = parsePhone(raw.altPhone);
  if (!alt.ok) errors.push(`Alt phone "${str(raw.altPhone)}" should look like 0712345678`);
  else put('altPhone', alt.value);

  const email = str(raw.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push(`Email "${email}" is not valid`);
  else put('email', email);

  put('fatherName', str(raw.fatherName).slice(0, 120));
  put('motherName', str(raw.motherName).slice(0, 120));
  put('nationalId', str(raw.nationalId).slice(0, 40));
  put('penNo', str(raw.penNo).slice(0, 40));
  put('previousSchool', str(raw.previousSchool).slice(0, 150));

  const admNo = str(raw.admNo).toUpperCase().replace(/\s+/g, '');
  if (admNo.length > 30) errors.push('Admission number is too long');
  else put('admNo', admNo);

  return { row, errors, data };
}

// Same name + class + (date of birth, or phone) is treated as the same student
const dupKey = (name, cls, dob, phone) =>
  `${lower(name)}|${cls}|${dob || String(phone || '').replace(/\s/g, '')}`;

async function newAdmNo() {
  for (let i = 0; i < 50; i++) {
    const adm = `ADM-${yy()}-${await nextNumber(`adm-${yy()}`)}`;
    if (!(await Student.exists({ admNo: adm }))) return adm;
  }
  throw new Error('Could not generate an admission number');
}

// dryRun: true  -> only check the file and report
// dryRun: false -> check again, then save the valid rows
r.post('/students', async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : null;
  const dryRun = req.body.dryRun !== false; // anything but an explicit false is a dry run
  const createClasses = req.body.createClasses === true;

  if (!rows || rows.length === 0) return res.status(400).json({ message: 'The file has no student rows' });
  if (rows.length > MAX_ROWS) {
    return res.status(400).json({ message: `Import at most ${MAX_ROWS} students at a time. Split the file and import it in parts.` });
  }

  const classes = await SchoolClass.find().sort({ order: 1 });
  const classByKey = Object.fromEntries(classes.map((c) => [compact(c.name), c.name]));
  const newClasses = new Map();

  const cleaned = rows.map((raw, i) =>
    cleanRow(raw || {}, i + 2, classByKey, newClasses, createClasses)); // row 1 of the file is the header

  // Look up what already exists
  const adms = cleaned.map((c) => c.data.admNo).filter(Boolean);
  const classNames = [...new Set(cleaned.map((c) => c.data.class).filter(Boolean))];
  const [dbAdm, dbStudents] = await Promise.all([
    adms.length ? Student.find({ admNo: { $in: adms } }).select('admNo').lean() : [],
    classNames.length ? Student.find({ class: { $in: classNames } }).select('name class dob phone').lean() : [],
  ]);
  const dbAdmSet = new Set(dbAdm.map((s) => s.admNo));
  const dbKeys = new Set(dbStudents.map((s) => dupKey(s.name, s.class, isoDay(s.dob), s.phone)));

  const seenAdm = new Set();
  const seenKeys = new Set();

  const results = cleaned.map((c) => {
    const item = { ...c, status: 'ok', messages: [...c.errors] };
    if (item.messages.length) { item.status = 'error'; return item; }

    if (c.data.admNo) {
      if (dbAdmSet.has(c.data.admNo)) item.messages.push(`Admission number ${c.data.admNo} already exists`);
      else if (seenAdm.has(c.data.admNo)) item.messages.push(`Admission number ${c.data.admNo} appears twice in the file`);
      if (item.messages.length) { item.status = 'error'; return item; }
      seenAdm.add(c.data.admNo);
    }

    const key = dupKey(c.data.name, c.data.class, isoDay(c.data.dob), c.data.phone);
    if (dbKeys.has(key) || seenKeys.has(key)) {
      item.status = 'duplicate';
      item.messages.push('Looks like a student who is already in the system or earlier in this file');
      return item;
    }
    seenKeys.add(key);
    return item;
  });

  const count = (s) => results.filter((x) => x.status === s).length;
  const report = {
    total: results.length,
    ok: count('ok'),
    duplicates: count('duplicate'),
    errors: count('error'),
    newClasses: [...newClasses.values()],
    problems: results
      .filter((x) => x.status !== 'ok')
      .slice(0, 300)
      .map((x) => ({ row: x.row, name: x.data.name || '(no name)', type: x.status, messages: x.messages })),
  };

  if (dryRun) return res.json(report);

  // Save for real
  if (newClasses.size) {
    const top = classes.reduce((m, c) => Math.max(m, c.order || 0), 0);
    try {
      await SchoolClass.insertMany([...newClasses.values()].map((name, k) => ({ name, order: top + k + 1 })), { ordered: false });
    } catch { /* a class that already exists is fine */ }
  }

  let created = 0;
  const failed = [];
  for (const item of results.filter((x) => x.status === 'ok')) {
    try {
      const admNo = item.data.admNo || (await newAdmNo());
      await Student.create({ ...item.data, admNo });
      created += 1;
    } catch (err) {
      failed.push({
        row: item.row,
        name: item.data.name,
        message: err.code === 11000 ? 'Admission number already exists' : err.message,
      });
    }
  }
  res.json({ ...report, created, failed });
});

export default r;