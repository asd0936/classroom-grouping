import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseGroup, createGroups, formatStudentLabel, paginateGroups, studentsFromRows } from '../src/core.js';

test('分组人数均衡，不超过上限，且请假同学不参与', () => {
  const students = Array.from({ length: 22 }, (_, i) => ({ name: `${i}`, absent: i === 3 }));
  const groups = createGroups(students, 5, () => 0);
  assert.deepEqual(groups.map(group => group.length), [5, 4, 4, 4, 4]);
  assert.equal(new Set(groups.flat()).size, 21);
  assert.ok(!groups.flat().includes(3));
});

test('拒绝无效人数及无人参与', () => {
  assert.throws(() => createGroups([{ absent: false }], 0), /大于 0/);
  assert.throws(() => createGroups([{ absent: true }], 3), /没有可参与/);
});

test('抽组排除已抽组，抽完后明确报错', () => {
  const groups = [[0], [1], [2]];
  assert.equal(chooseGroup(groups, [0, 2], () => 0), 1);
  assert.throws(() => chooseGroup(groups, [0, 1, 2]), /都已经抽过/);
});

test('每页最多 30 组，最后一页保留原始编号偏移', () => {
  const groups = Array.from({ length: 61 }, (_, index) => [index]);
  assert.deepEqual(paginateGroups(groups, 0), { groups: groups.slice(0, 30), start: 0, page: 0, pageCount: 3 });
  assert.deepEqual(paginateGroups(groups, 1), { groups: groups.slice(30, 60), start: 30, page: 1, pageCount: 3 });
  assert.deepEqual(paginateGroups(groups, 5), { groups: groups.slice(60), start: 60, page: 2, pageCount: 3 });
});

test('姓名后显示学号，没有学号的同名同学显示名单序号', () => {
  const students = [{ name: '小明', id: 'A01' }, { name: '小明', id: '' }, { name: '小红', id: '' }];
  assert.equal(formatStudentLabel(students, 0), '小明（A01）');
  assert.equal(formatStudentLabel(students, 1), '小明（名单序号 2）');
  assert.equal(formatStudentLabel(students, 2), '小红');
});

test('从包含说明行的表格中识别姓名及文本学号', () => {
  const sheets = [[['课程信息'], ['序号', '学号', '姓名', '学院'], ['1', 'A001', '小明', '学院']]];
  assert.deepEqual(studentsFromRows(sheets), [{ name: '小明', id: 'A001', absent: false }]);
});

test('识别缺少表头和重复学号', () => {
  assert.throws(() => studentsFromRows([[['编号']]]), /未找到/);
  assert.throws(() => studentsFromRows([[['学号', '姓名'], ['1', '甲'], ['1', '乙']]]), /重复学号/);
});
