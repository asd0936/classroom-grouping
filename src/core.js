export function randomInt(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) {
    throw new RangeError('随机范围无效');
  }
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % max;
}

export function shuffled(items, random = randomInt) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createGroups(students, groupSize, random = randomInt) {
  if (!Number.isSafeInteger(groupSize) || groupSize < 1) {
    throw new Error('请输入大于 0 的整数作为每组人数');
  }
  const present = students.flatMap((student, index) => student.absent ? [] : [index]);
  if (!present.length) throw new Error('没有可参与分组的同学');
  const members = shuffled(present, random);
  const count = Math.ceil(members.length / groupSize);
  const base = Math.floor(members.length / count);
  const extra = members.length % count;
  let start = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = base + (index < extra ? 1 : 0);
    const group = members.slice(start, start + size);
    start += size;
    return group;
  });
}

export function chooseGroup(groups, drawn, random = randomInt) {
  const remaining = groups.map((_, index) => index).filter(index => !drawn.includes(index));
  if (!remaining.length) throw new Error('本节课所有小组都已经抽过了');
  return remaining[random(remaining.length)];
}

export function paginateGroups(groups, page) {
  const pageCount = Math.max(1, Math.ceil(groups.length / 30));
  const currentPage = Math.max(0, Math.min(page, pageCount - 1));
  const start = currentPage * 30;
  return { groups: groups.slice(start, start + 30), start, page: currentPage, pageCount };
}

export function formatStudentLabel(students, index) {
  const student = students[index];
  if (student.id) return `${student.name}（${student.id}）`;
  const sameName = students.some((other, otherIndex) => otherIndex !== index && other.name === student.name);
  return sameName ? `${student.name}（名单序号 ${index + 1}）` : student.name;
}

const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, '');

export function studentsFromRows(sheets) {
  for (const rows of sheets) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex] || [];
      const nameColumn = row.findIndex(value => /^(姓名|学生姓名|name)$/i.test(normalize(value)));
      if (nameColumn < 0) continue;
      const idColumn = row.findIndex(value => /^(学号|学生学号|studentid)$/i.test(normalize(value)));
      const students = rows.slice(rowIndex + 1).flatMap(cells => {
        const name = String(cells?.[nameColumn] ?? '').trim();
        const id = idColumn < 0 ? '' : String(cells?.[idColumn] ?? '').trim();
        if (!name || (idColumn >= 0 && !id)) return [];
        return [{ name, id, absent: false }];
      });
      if (!students.length) throw new Error('找到了姓名列，但没有找到学生数据，请检查名单');
      const ids = students.map(student => student.id).filter(Boolean);
      if (new Set(ids).size !== ids.length) throw new Error('名单中存在重复学号，请检查后重新导入');
      return students;
    }
  }
  throw new Error('未找到“姓名”列，请检查名单的表头');
}
