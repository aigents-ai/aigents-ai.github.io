// AI 자료실 — 공용 스크립트 (자료 목록 · 안내 페이지 공통)
// 새 안내를 추가할 때 이 파일은 고치지 않는다. assets/catalog.json 에 한 줄을 더하고 폴더 하나를 만든다.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = $('[data-page]')?.dataset.page;

let toastTimer;
function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

async function copyText(value, success) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      if (!copied) throw new Error('Copy unavailable');
    }
    notify(success);
  } catch {
    notify('자동 복사가 어려워요. 표시된 문구를 길게 눌러 직접 복사해주세요.');
  }
}

$$('[data-copy-url]').forEach(button => {
  button.addEventListener('click', () => copyText(location.href.split('#')[0], '이 페이지 링크를 복사했어요.'));
});
$$('[data-copy-target]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (target) copyText(target.textContent.trim(), button.dataset.copyMessage || '복사했어요. AI 입력창에 붙여넣으세요.');
  });
});

/* ── 자료 목록 ───────────────────────────── */
export const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim();

function corpusOf(guide) {
  const code = guide.code || '';
  return normalize([guide.title, guide.description, guide.category, code, code && `no.${code}`, code && `no ${code}`,
    code && String(Number(code)), ...(guide.keywords || [])].join(' '));
}
export function searchGuides(guides, query, category = '전체') {
  const terms = normalize(query).replace(/^#/, '').split(' ').filter(Boolean);
  return guides.filter(guide => (category === '전체' || guide.category === category)
    && terms.every(term => corpusOf(guide).includes(term)));
}

const SAFE_URL = /^[a-z0-9][a-z0-9_-]*\/(index\.html)?$/;
function isValid(g) {
  return g && ['title', 'description', 'category', 'url', 'updated', 'status'].every(key => typeof g[key] === 'string')
    && SAFE_URL.test(g.url) && /^\d{4}-\d{2}-\d{2}$/.test(g.updated)
    && Array.isArray(g.keywords) && g.keywords.every(word => typeof word === 'string');
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
const dot = date => date.replaceAll('-', '.');

function guideRow(guide) {
  const row = element('article', 'guide-row');
  const link = element('a');
  link.href = guide.url;
  const letter = element('span', 'guide-letter', guide.letter || 'AI');
  letter.setAttribute('aria-hidden', 'true');
  const copy = element('div', 'guide-copy');
  const meta = element('div', 'guide-meta');
  if (guide.code) meta.append(element('span', 'post-no', `No.${guide.code}`));
  meta.append(element('span', 'tag', guide.category), element('span', '', `${dot(guide.updated)} 확인`));
  if (guide.sample) meta.append(element('span', 'sample-badge', '견본'));
  copy.append(meta, element('h3', '', guide.title), element('p', '', guide.description), element('span', 'status-dot', guide.status));
  const arrow = element('span', 'row-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(letter, copy, arrow);
  row.append(link);
  return row;
}

function renderFeatured(guides) {
  const holder = $('#featured');
  if (!holder) return;
  const guide = guides.find(g => g.featured) || guides[0];
  if (!guide) {
    const empty = element('div', 'featured-note');
    empty.innerHTML = '<div class="note-top"><span>이번 안내</span><span>준비 중</span></div>'
      + '<div class="paper-ticket" aria-hidden="true"><span>AI GUIDE / COMING SOON</span><strong>곧</strong><small>NEW</small></div>'
      + '<div class="note-bottom"><div><span class="tag">안내</span><h2>첫 안내를 준비하고 있어요</h2><p>인스타그램 게시물과 함께 이곳에 올라와요.</p></div></div>';
    holder.replaceChildren(empty);
    return;
  }
  const ticket = guide.ticket || {};
  const link = element('a', 'featured-note');
  link.href = guide.url;
  link.setAttribute('aria-label', `${guide.title} 읽기`);
  const top = element('div', 'note-top');
  top.append(element('span', '', '이번 안내'), element('span', '', guide.code ? `No.${guide.code}` : dot(guide.updated)));
  const paper = element('div', 'paper-ticket');
  paper.setAttribute('aria-hidden', 'true');
  paper.append(element('span', '', ticket.label || 'AI GUIDE'), element('strong', '', ticket.big || guide.letter || 'AI'), element('small', '', ticket.unit || ''));
  const bottom = element('div', 'note-bottom');
  const text = element('div');
  const tag = element('span', 'tag', guide.category);
  text.append(tag);
  if (guide.sample) text.append(element('span', 'sample-badge', '견본'));
  text.append(element('h2', '', guide.title), element('p', '', guide.hook || guide.status));
  const arrow = element('span', 'round-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  bottom.append(text, arrow);
  link.append(top, paper, bottom);
  holder.replaceChildren(link);
}

async function initLibrary() {
  const input = $('#search-input');
  const clear = $('#search-clear');
  const list = $('#guide-list');
  const empty = $('#empty-state');
  const filters = $('#filters');
  let guides = [];
  let failed = false;
  try {
    const response = await fetch('assets/catalog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Catalog unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid catalog');
    guides = data.filter(isValid).sort((a, b) => b.updated.localeCompare(a.updated) || String(b.code).localeCompare(String(a.code)));
  } catch {
    failed = true;
  }
  renderFeatured(guides);

  // 주소에 ?q=001 이 있으면 바로 검색 (ManyChat DM 실패 시 안내 링크용)
  const params = new URLSearchParams(location.search);
  if (params.get('q')) input.value = params.get('q');

  let category = '전체';
  const categories = ['전체', ...new Set(guides.map(g => g.category))];
  filters.replaceChildren(...categories.map(name => {
    const button = element('button', 'filter', name);
    button.type = 'button';
    button.dataset.category = name;
    button.addEventListener('click', () => { category = name; render(); });
    return button;
  }));

  function render() {
    const visible = searchGuides(guides, input.value, category);
    list.replaceChildren(...visible.map(guideRow));
    empty.hidden = visible.length > 0;
    list.hidden = visible.length === 0;
    clear.hidden = input.value.length === 0;
    if (failed) {
      $('#empty-title').textContent = '자료 목록을 불러오지 못했어요.';
      $('#empty-text').textContent = '잠시 뒤 새로고침해 주세요.';
    } else if (guides.length === 0) {
      $('#empty-title').textContent = '첫 안내를 준비하고 있어요.';
      $('#empty-text').textContent = '인스타그램 게시물이 올라오면 이곳에 함께 모아둘게요.';
    } else {
      $('#empty-title').textContent = '찾는 자료가 아직 없어요.';
      $('#empty-text').textContent = '게시물 번호(예: 001)나 다른 검색어를 입력해 보세요.';
    }
    $('#reset-search').hidden = guides.length === 0;
    $('#result-count').textContent = input.value.trim() || category !== '전체' ? `찾은 자료 ${visible.length}개` : `자료 ${visible.length}개`;
    $$('.filter', filters).forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  $('#search-form').addEventListener('submit', event => event.preventDefault());
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => { if (event.key === 'Escape') { input.value = ''; render(); } });
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  $('#reset-search').addEventListener('click', () => { input.value = ''; category = '전체'; render(); input.focus(); });
  $$('[data-focus-search]').forEach(link => link.addEventListener('click', () => setTimeout(() => input.focus({ preventScroll: true }), 350)));
  render();
}

/* ── 안내 페이지 ─────────────────────────── */
function initTabs() {
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const key = `ai-guide-tab:${list.id}`;
    function activate(tab, focus) {
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
      if (focus) tab.focus();
      try { localStorage.setItem(key, tab.id); } catch {}
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, false));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
      });
    });
    try { const saved = document.getElementById(localStorage.getItem(key)); if (saved && tabs.includes(saved)) activate(saved, false); } catch {}
  });
}

function initChecklist() {
  const checks = $$('[data-check]');
  const status = $('#check-status');
  if (!checks.length || !status) return;
  const prefix = `ai-guide-check:${$('[data-guide-id]')?.dataset.guideId || location.pathname}:`;
  const progress = () => { status.textContent = `${checks.filter(x => x.checked).length} / ${checks.length} 확인`; };
  checks.forEach(check => {
    try { check.checked = localStorage.getItem(prefix + check.dataset.check) === '1'; } catch {}
    check.addEventListener('change', () => {
      try { localStorage.setItem(prefix + check.dataset.check, check.checked ? '1' : '0'); } catch {}
      progress();
    });
  });
  $('.reset-checks')?.addEventListener('click', () => {
    checks.forEach(check => { check.checked = false; try { localStorage.removeItem(prefix + check.dataset.check); } catch {} });
    progress();
    notify('체크 표시를 초기화했어요.');
  });
  progress();
}

if (page === 'library') initLibrary();
if (page === 'guide') { initTabs(); initChecklist(); }
