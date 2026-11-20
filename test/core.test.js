import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseGroup, createGroups, studentsFromRows } from '../src/core.js';

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

test('从包含说明行的表格中识别姓名及文本学号', () => {
  const sheets = [[['课程信息'], ['序号', '学号', '姓名', '学院'], ['1', 'A001', '小明', '学院']]];
  assert.deepEqual(studentsFromRows(sheets), [{ name: '小明', id: 'A001', absent: false }]);
});

test('识别缺少表头和重复学号', () => {
  assert.throws(() => studentsFromRows([[['编号']]]), /未找到/);
  assert.throws(() => studentsFromRows([[['学号', '姓名'], ['1', '甲'], ['1', '乙']]]), /重复学号/);
});
