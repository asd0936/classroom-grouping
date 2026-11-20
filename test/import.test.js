import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseRoster } from '../src/import.js';

test('导入 HTML 格式的 xls 文件', () => {
  const html = '<html><meta charset="utf-8"><table><tr><td>学号</td><td>姓名</td></tr><tr><td>A01</td><td>小明</td></tr></table></html>';
  assert.deepEqual(parseRoster(new TextEncoder().encode(html)), [{ id: 'A01', name: '小明', absent: false }]);
});

test('导入真正的 xlsx 文件', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['学号', '姓名'], ['A01', '小明']]), '名单');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  assert.deepEqual(parseRoster(bytes), [{ id: 'A01', name: '小明', absent: false }]);
});
