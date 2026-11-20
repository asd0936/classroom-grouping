import './style.css';
import { chooseGroup, createGroups } from './core.js';
import { parseRoster } from './import.js';

const STORAGE_KEY = 'classroom-grouping-v1';
const app = document.querySelector('#app');
const emptyState = () => ({ students: [], groups: [], drawn: [] });
let state = emptyState();
let activeTab = 'roster';
let groupSize = '5';
let busy = false;
let notice = '';
let noticeType = 'info';

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.students) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.drawn) ||
        !parsed.students.every(student => typeof student.name === 'string' && typeof student.id === 'string' && typeof student.absent === 'boolean') ||
        !parsed.groups.every(group => Array.isArray(group) && group.every(index => Number.isInteger(index) && index >= 0 && index < parsed.students.length)) ||
        !parsed.drawn.every(index => Number.isInteger(index) && index >= 0 && index < parsed.groups.length) ||
        new Set(parsed.drawn).size !== parsed.drawn.length) {
      throw new Error('保存的数据格式不正确');
    }
    state = parsed;
  }
} catch (error) {
  notice = `无法读取本机数据：${error.message}。可以清除本机数据后重新导入。`;
  noticeType = 'error';
}

function save(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    return true;
  } catch (error) {
    notice = `保存失败，本次操作未生效：${error.message}。请检查浏览器存储权限或空间。`;
    noticeType = 'error';
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function setNotice(message, type = 'info') {
  notice = message;
  noticeType = type;
}

function memberLabel(index) {
  const student = state.students[index];
  const sameName = state.students.filter(other => other.name === student.name).length > 1;
  return sameName ? `${student.name}（${student.id || `名单序号 ${index + 1}`}）` : student.name;
}

function icon(name) {
  const paths = {
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    spark: '<path d="m12 3 1.8 5.7L19.5 10.5l-5.7 1.8L12 18l-1.8-5.7-5.7-1.8 5.7-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function pageHeader(kicker, title, description) {
  return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="description">${description}</p></div><div class="heading-decoration" aria-hidden="true">✦</div></div>`;
}

function rosterView() {
  const present = state.students.filter(student => !student.absent).length;
  return `${pageHeader('STEP 01 / 准备名单', '先认识一下大家', '导入上课名单，勾选请假的同学，让今天的相遇从这里开始。')}
    <div class="roster-layout">
      <section class="panel upload-panel">
        <div class="section-top"><div><span class="section-label">CLASS LIST</span><h2>导入课堂名单</h2></div><span class="small-badge">本地处理</span></div>
        <label class="upload-zone ${busy ? 'disabled' : ''}">
          <input id="roster-file" type="file" accept=".xls,.xlsx" ${busy ? 'disabled' : ''}>
          <span class="upload-icon">${icon('upload')}</span>
          <strong>${state.students.length ? '点击更换名单' : '点击选择名单文件'}</strong>
          <span>支持 .xls / .xlsx 格式</span>
        </label>
        <div class="privacy-note">${icon('lock')}<span>名单仅保存在当前浏览器，不会上传。使用公共电脑后，请清除本机数据。</span></div>
      </section>
      <section class="panel attendance-panel">
        <div class="section-top"><div><span class="section-label">ATTENDANCE</span><h2>今日出勤</h2></div><span class="small-badge">${state.students.length} 位同学</span></div>
        ${state.students.length ? `
          <div class="stats"><div><strong>${present}</strong><span>参与分组</span></div><div><strong>${state.students.length - present}</strong><span>请假同学</span></div></div>
          <p class="list-hint">勾选今天请假的同学</p>
          <div class="student-list">${state.students.map((student, index) => `
            <label class="student-row ${student.absent ? 'is-absent' : ''}">
              <span class="student-avatar">${escapeHtml(student.name.slice(-1))}</span>
              <span class="student-name">${escapeHtml(student.name)}${student.id ? `<small>${escapeHtml(student.id)}</small>` : ''}</span>
              <span class="check-label">${student.absent ? '已请假' : '请假'}</span>
              <input type="checkbox" data-absence="${index}" ${student.absent ? 'checked' : ''} ${busy ? 'disabled' : ''} aria-label="${escapeHtml(memberLabel(index))}请假">
            </label>`).join('')}</div>
          <button class="button primary wide" data-action="go-groups" ${busy ? 'disabled' : ''}>准备开始分组 ${icon('arrow')}</button>
        ` : `<div class="empty-state"><span class="empty-symbol">☺</span><strong>还没有导入名单</strong><p>导入后，即可在这里标记请假同学</p></div>`}
      </section>
    </div>`;
}

function groupCards(groups) {
  return `<div class="group-grid">${groups.map((group, index) => `
    <article class="group-card" style="--card-index:${Math.min(index, 12)}">
      <div class="group-card-top"><span class="group-number">${String(index + 1).padStart(2, '0')}</span><span class="member-count">${group.length} 人</span></div>
      <h3>第 ${index + 1} 组</h3>
      <div class="member-list">${group.map(member => `<span>${escapeHtml(memberLabel(member))}</span>`).join('')}</div>
    </article>`).join('')}</div>`;
}

function groupsView() {
  const present = state.students.filter(student => !student.absent).length;
  return `${pageHeader('STEP 02 / 随机分组', '遇见你的新搭子', '每一次随机，都是一次新的合作。准备好迎接今天的队友了吗？')}
    <section class="panel group-controls">
      <div><span class="section-label">LET’S TEAM UP</span><h2>设定每组人数</h2><p>当前 ${present} 人参与 · 各组人数尽量均衡，不超过设定人数</p></div>
      <div class="control-actions"><label class="number-control"><span>每组最多</span><input id="group-size" type="number" min="1" step="1" value="${escapeHtml(groupSize)}" ${busy ? 'disabled' : ''}><span>人</span></label>
      <button class="button primary" data-action="make-groups" ${busy || !present ? 'disabled' : ''}>${icon('spark')} ${state.groups.length ? '重新随机分组' : '开始随机分组'}</button></div>
    </section>
    ${busy ? `<div class="reveal-stage"><div class="orbit"><span>✦</span></div><h2>正在寻找最佳搭子…</h2><p>缘分正在悄悄排列，请稍等</p></div>` :
      state.groups.length ? `<div class="results-heading"><div><span class="section-label">THE TEAMS ARE READY</span><h2>今天的分组揭晓！</h2></div><button class="button secondary" data-action="go-draw">去抽取小组 ${icon('arrow')}</button></div>${groupCards(state.groups)}` :
      `<div class="empty-state large"><span class="empty-symbol">✳</span><strong>精彩的组合即将诞生</strong><p>${present ? '设置人数，点击上方按钮开始分组' : '请先导入名单并确认出勤情况'}</p></div>`}`;
}

function drawView() {
  const remaining = state.groups.length - state.drawn.length;
  const last = state.drawn.at(-1);
  return `${pageHeader('STEP 03 / 幸运抽选', '下一组，会是谁？', '把舞台交给惊喜。每组每节课只会被抽中一次。')}
    <section class="draw-layout"><div class="panel draw-main">
      <div class="draw-status"><span class="live-dot"></span> ${state.groups.length ? `本节课还有 ${remaining} 组等待揭晓` : '请先完成分组'}</div>
      ${busy ? `<div class="draw-orb spinning">?</div><h2>悬念正在升温…</h2><p>今天的幸运小组是</p>` :
        last !== undefined ? `<div class="draw-orb result-orb">${String(last + 1).padStart(2, '0')}</div><span class="winner-label">✨ 恭喜幸运小组 ✨</span><h2>第 ${last + 1} 组</h2><p>掌声有请以下同学上台汇报！</p><div class="winner-members">${state.groups[last].map(index => `<span>${escapeHtml(memberLabel(index))}</span>`).join('')}</div>` :
        `<div class="draw-orb">?</div><h2>谁将闪亮登场？</h2><p>点击按钮，揭晓下一组幸运同学</p>`}
      <button class="button primary draw-button" data-action="draw" ${busy || !remaining ? 'disabled' : ''}>${icon('spark')} ${remaining ? (last === undefined ? '开始抽取' : '抽取下一组') : (state.groups.length ? '所有小组已抽完' : '请先分组')}</button>
    </div><aside class="panel history-panel"><div class="section-top"><div><span class="section-label">TODAY’S MOMENTS</span><h2>抽取记录</h2></div><span class="small-badge">${state.drawn.length} / ${state.groups.length}</span></div>
      ${state.drawn.length ? `<ol class="history-list">${state.drawn.map((group, index) => `<li><span class="history-index">${String(index + 1).padStart(2, '0')}</span><span><strong>第 ${group + 1} 组</strong><small>${state.groups[group].map(member => escapeHtml(memberLabel(member))).join('、')}</small></span><span class="history-check">✓</span></li>`).join('')}</ol>` : `<div class="empty-state"><span class="empty-symbol">✧</span><strong>惊喜还在路上</strong><p>抽中的小组会记录在这里</p></div>`}
      <div class="history-note">已抽中的小组不会再次参与本节课的抽取。</div>
    </aside></section>`;
}

function render() {
  const tabs = [
    ['roster', 'users', '名单与出勤', '01'],
    ['groups', 'grid', '随机分组', '02'],
    ['draw', 'spark', '幸运抽组', '03'],
  ];
  app.innerHTML = `<div class="app-shell"><aside class="sidebar">
    <div class="brand"><div class="brand-icon">✳</div><div><strong>课堂搭子</strong><span>CLASSROOM TOGETHER</span></div></div>
    <div class="nav-caption">课堂流程 <span>CLASS FLOW</span></div>
    <nav aria-label="课堂流程">${tabs.map(([id, symbol, label, number]) => `<button class="nav-item ${activeTab === id ? 'active' : ''}" data-tab="${id}" ${busy ? 'disabled' : ''}>${icon(symbol)}<span>${label}</span><small>${number}</small></button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="sidebar-quote"><span>✦</span><p>每一次相遇，<br>都有新的可能。</p></div><button class="clear-button" data-action="clear" ${busy ? 'disabled' : ''}>清除本机数据</button><small>仅清除本网站保存的数据</small></div>
    </aside><main class="main-content"><div class="topbar"><span>让课堂多一点惊喜 <span class="topbar-star">✦</span></span><span class="local-tag">${icon('lock')} 数据仅保存在本机</span></div>
    ${notice ? `<div class="notice ${noticeType}" role="alert">${escapeHtml(notice)}<button data-action="dismiss" aria-label="关闭提示">×</button></div>` : ''}
    ${activeTab === 'roster' ? rosterView() : activeTab === 'groups' ? groupsView() : drawView()}
    <footer>MADE FOR LITTLE MOMENTS OF CONNECTION <span>✦</span></footer></main></div>`;
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.tab) {
    activeTab = button.dataset.tab;
    render();
    return;
  }
  switch (button.dataset.action) {
    case 'dismiss':
      setNotice('');
      break;
    case 'go-groups':
      activeTab = 'groups';
      break;
    case 'go-draw':
      activeTab = 'draw';
      break;
    case 'clear':
      if (!confirm('确定清除本机保存的名单、分组和抽取记录吗？原始名单文件不会被删除。')) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
        state = emptyState();
        activeTab = 'roster';
        setNotice('本机数据已清除。', 'success');
      } catch (error) {
        setNotice(`清除失败：${error.message}。请检查浏览器存储权限。`, 'error');
      }
      break;
    case 'make-groups': {
      if (state.groups.length && !confirm('重新分组会清除本节课已有的分组和抽取记录。确定继续吗？')) return;
      try {
        const groups = createGroups(state.students, Number(groupSize));
        if (!save({ ...state, groups, drawn: [] })) break;
        setNotice('');
        busy = true;
        render();
        setTimeout(() => { busy = false; render(); }, 2200);
      } catch (error) {
        setNotice(error.message, 'error');
      }
      break;
    }
    case 'draw':
      if (!state.groups.length || state.drawn.length >= state.groups.length) return;
      busy = true;
      setNotice('');
      render();
      setTimeout(() => {
        try {
          const selected = chooseGroup(state.groups, state.drawn);
          save({ ...state, drawn: [...state.drawn, selected] });
        } catch (error) {
          setNotice(error.message, 'error');
        }
        busy = false;
        render();
      }, 2400);
      break;
    default:
      return;
  }
  render();
});

app.addEventListener('input', event => {
  if (event.target.id === 'group-size') groupSize = event.target.value;
});

app.addEventListener('change', async event => {
  const target = event.target;
  if (target.id === 'roster-file') {
    const file = target.files?.[0];
    if (!file) return;
    if (state.students.length && !confirm('更换名单会清除当前分组和抽取记录。确定继续吗？')) {
      target.value = '';
      return;
    }
    busy = true;
    render();
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('名单文件不能超过 10 MB');
      const students = parseRoster(await file.arrayBuffer());
      if (save({ students, groups: [], drawn: [] })) {
        setNotice(`成功导入 ${students.length} 位同学。请确认今天的出勤情况。`, 'success');
      }
    } catch (error) {
      setNotice(`导入失败：${error.message}。请检查文件格式及“姓名”表头。`, 'error');
    }
    busy = false;
    render();
  } else if (target.dataset.absence !== undefined) {
    const index = Number(target.dataset.absence);
    if (state.groups.length && !confirm('修改出勤会清除当前分组和抽取记录，需要重新分组。确定继续吗？')) {
      render();
      return;
    }
    const students = state.students.map((student, i) => i === index ? { ...student, absent: target.checked } : student);
    if (save({ students, groups: [], drawn: [] })) setNotice('');
    render();
  }
});

render();
