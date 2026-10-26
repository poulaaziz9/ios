// Parsing a competition's questions from a spreadsheet (Excel or CSV).
//
// One question per row; the first row may be a header:
//   A: السؤال | B: رقم الإجابة الصحيحة | C: النقاط (اختياري) | D…I: الاختيارات (2–6)
// The correct answer may also be written as the text of one of the options.

export type ImportedQuestion = { question: string; options: string[]; correct_index: number; points: number };
export type ImportError = { row: number; message: string };

export const TEMPLATE_HEADER = ["السؤال", "رقم الإجابة الصحيحة", "النقاط", "اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"];
export const TEMPLATE_EXAMPLE = ["مين اللي عمد السيد المسيح؟", "2", "10", "بطرس الرسول", "يوحنا المعمدان", "يعقوب الرسول", "موسى النبي"];

const MAX_OPTIONS = 6;
export const MAX_QUESTIONS = 200;

const cell = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** A whole number written with Latin or Arabic-Indic digits, else null. */
const asInt = (v: string) => {
  const latin = v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return /^\d+(\.0+)?$/.test(latin) ? Number.parseInt(latin, 10) : null;
};

export function parseQuestionRows(rows: unknown[][], defaultPoints: number) {
  const questions: ImportedQuestion[] = [];
  const errors: ImportError[] = [];

  rows.forEach((raw, i) => {
    const row = raw.map(cell);
    const n = i + 1; // spreadsheet row number
    if (row.every((c) => !c)) return;
    const [question = "", correctRaw = "", pointsRaw = "", ...rest] = row;
    // A first row whose answer column isn't a number is the header.
    if (i === 0 && asInt(correctRaw) === null && !rest.includes(correctRaw)) return;

    const options = rest.filter(Boolean).slice(0, MAX_OPTIONS);
    if (!question) return errors.push({ row: n, message: "السؤال فاضي" });
    if (options.length < 2) return errors.push({ row: n, message: "لازم اختيارين على الأقل" });

    const byNumber = asInt(correctRaw);
    const correct = byNumber !== null ? byNumber - 1 : options.indexOf(correctRaw);
    if (correct < 0 || correct >= options.length) {
      return errors.push({ row: n, message: `الإجابة الصحيحة لازم تكون رقم من ١ لـ ${options.length.toLocaleString("ar-EG")}` });
    }

    const points = pointsRaw ? asInt(pointsRaw) : defaultPoints;
    if (points === null) return errors.push({ row: n, message: "النقاط لازم تكون رقم" });

    questions.push({ question, options, correct_index: correct, points });
  });

  if (questions.length > MAX_QUESTIONS) {
    errors.push({ row: 0, message: `أقصى عدد ${MAX_QUESTIONS} سؤال في الملف` });
  }
  return { questions, errors };
}

/** Minimal CSV reader: quotes, BOM, and comma / semicolon / tab separators. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t", "،"].reduce((best, s) =>
    firstLine.split(s).length > firstLine.split(best).length ? s : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
