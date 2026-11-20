import * as XLSX from 'xlsx';
import { studentsFromRows } from './core.js';

export function parseRoster(buffer) {
  const bytes = new Uint8Array(buffer);
  const prefix = new TextDecoder('windows-1252').decode(bytes.subarray(0, 2048));
  const isHtml = /^\s*(?:<!doctype\s+html|<html\b|<head\b|<table\b)/i.test(prefix);
  let workbook;
  if (isHtml) {
    const encoding = /charset\s*=\s*["']?\s*(?:gb2312|gbk|gb18030)/i.test(prefix) ? 'gb18030' : 'utf-8';
    const text = new TextDecoder(encoding).decode(bytes);
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    workbook = XLSX.read(bytes, { type: 'array' });
  }
  const sheets = workbook.SheetNames.map(name =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    })
  );
  return studentsFromRows(sheets);
}
