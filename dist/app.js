import { all, matches, filter } from './core.js';
const $ = s => document.querySelector(s),
  app = $('#app'),
  KEY = 'codebreaker-v1';
let data;
try {
  data = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  data = {};
}
if (!Array.isArray(data.records)) data.records = [];
if (!data.settings) data.settings = { theme: 'dark' };
let game = data.game && Array.isArray(data.game.guesses) ? data.game : null,
  screen = game ? 'home' : 'home',
  input = '',
  notice = '',
  busy = false,
  worker = null,
  analysis = '';
const save = () => {
  data.game = game;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
};
const elapsed = g =>
  Math.floor(((g.endedAt || Date.now()) - g.startedAt) / 1000);
const time = n =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
function randomSecret() {
  const a = new Uint32Array(4);
  crypto.getRandomValues(a);
  return Array.from(a, x => String(x % 10)).join('');
}
function start(mode) {
  if (
    game?.status === 'playing' &&
    !confirm('当前案件尚未结束，开始新游戏将中止这一局。确定继续吗？')
  )
    return;
  if (game?.status === 'playing') finish('aborted');
  game = {
    id: Date.now(),
    mode,
    difficulty: $('#difficulty')?.value || 'casual',
    status: 'playing',
    secret: mode === 'player' ? randomSecret() : null,
    guesses: [],
    startedAt: Date.now(),
    assistance: 'off',
    usedAssist: false,
    current: mode === 'computer' ? '0000' : null,
  };
  input = '';
  notice = '';
  analysis = '';
  screen = 'game';
  save();
  render();
}
function finish(status) {
  game.status = status;
  game.endedAt = Date.now();
  if (game.mode === 'computer' && status === 'won')
    game.secret = game.guesses.at(-1).guess;
  data.records.unshift(JSON.parse(JSON.stringify(game)));
  data.records = data.records.slice(0, 50);
  save();
}
function digits(value, kind = '') {
  return `<div class="digits">${Array.from({ length: 4 }, (_, i) => `<div class="digit ${kind} ${kind === 'entry' && i === value.length ? 'active' : ''}">${esc(value[i] || (kind === 'secret' ? '•' : '—'))}</div>`).join('')}</div>`;
}
function header() {
  return `<nav class="nav"><div class="brand"><span class="mark">⌗</span><span>数字破译者</span></div><div class="navlinks"><button class="link" data-action="rules">游戏规则</button><button class="link" data-action="records">历史成绩</button><button class="link" data-action="theme" aria-label="切换明暗主题">${data.settings.theme === 'light' ? '◐' : '☼'}</button></div></nav>`;
}
function hero() {
  return `<div class="hero"><div><div class="eyebrow">THE NUMBER DETECTIVE &nbsp; / &nbsp; 01</div><h1>每个数字，都有迹可循。</h1><p>四位数字，万种可能。用逻辑破解密码。</p></div><div class="hero-side">A GAME OF LOGIC<br>0000 — 9999</div></div>`;
}
function home() {
  return `<div class="grid"><section class="card main-card"><div class="card-top"><span class="label">CASE FILE &nbsp; / &nbsp; 新的案件</span><span class="tag">准备就绪</span></div><h2 class="main-title">准备好开始推理了吗？</h2><p class="sub">选择你的角色，开启一场数字与逻辑的较量。</p><div class="mode-grid"><button class="option mode" data-action="start-player"><span class="eyebrow">01 / DECODE</span><strong>我来猜 <span>↗</span></strong><span>系统出题，凭借线索找到密码。</span></button><button class="option mode" data-action="start-computer"><span class="eyebrow">02 / CHALLENGE</span><strong>电脑来猜 <span>↗</span></strong><span>心中想好数字，看看电脑如何推理。</span></button></div><div class="selects"><label class="muted" for="difficulty">难度</label><select id="difficulty"><option value="casual">休闲 · 不限次数</option><option value="challenge">挑战 · 10 次</option><option value="extreme">极限 · 7 次</option></select>${game?.status === 'playing' ? '<button class="secondary" data-action="continue">继续上局 →</button>' : ''}</div></section><aside class="card side-card"><div class="card-top"><h2 class="side-heading">游戏说明</h2><span class="label">HOW TO PLAY</span></div><div class="divider"></div><p class="results"><strong>01</strong> &nbsp; 猜一个四位数字<br><span class="muted">数字可以重复，也可以以 0 开头。</span></p><p class="results"><strong>02</strong> &nbsp; 获得位置命中数<br><span class="muted">只有数字和位置都正确才算命中，不会告诉你具体是哪一位。</span></p><p class="results"><strong>03</strong> &nbsp; 整理线索，破解密码<br><span class="muted">例如谜底 1234，猜测 1299，得到 2 位命中。</span></p><div class="divider"></div><span class="label">YOUR MIND IS THE BEST TOOL.</span></aside></div>`;
}
function history(g) {
  return `<div class="history-head"><span>轮次</span><span>猜测数字</span><span style="text-align:right">位置命中</span></div><div class="scroll">${
    g.guesses.length
      ? [...g.guesses]
          .map((x, i) => ({ x, i }))
          .reverse()
          .map(
            ({ x, i }) =>
              `<div class="history-row ${i === g.guesses.length - 1 ? 'latest' : ''}"><span>${String(i + 1).padStart(2, '0')}</span><span class="number">${x.guess}</span><span class="hit"><span class="hit-count">${x.matches}</span> ${g.mode === 'computer' && g.status === 'playing' ? `<button class="small-button" data-edit="${i}" title="修改反馈">✎</button>` : ''}</span></div>`,
          )
          .join('')
      : '<div class="empty"><div class="empty-icon">⌁</div>线索还在等待被发现<br>你的每一次猜测都会记录在这里</div>'
  }</div>`;
}
function assistant(g) {
  if (
    g.mode !== 'player' ||
    g.status !== 'playing' ||
    g.difficulty === 'extreme'
  )
    return '';
  let c = filter(g.guesses);
  return `<div class="divider"></div><div class="card-top"><span class="label">推理助手</span><select id="assist"><option value="off" ${g.assistance === 'off' ? 'selected' : ''}>关闭</option><option value="basic" ${g.assistance === 'basic' ? 'selected' : ''}>基础辅助</option><option value="advanced" ${g.assistance === 'advanced' ? 'selected' : ''}>高级辅助</option></select></div>${g.assistance !== 'off' ? `<p class="results">剩余 <strong>${c.length.toLocaleString()}</strong> 种可能，已排除 ${(10000 - c.length).toLocaleString()} 种。</p><div class="tip">${[0, 1, 2, 3].map(i => `第 ${i + 1} 位：${[...new Set(c.map(x => x[i]))].sort().join('、')}`).join('<br>')}</div>${g.assistance === 'advanced' ? `<p><button class="secondary" data-action="recommend" ${busy ? 'disabled' : ''}>${busy ? '正在计算…' : '计算推荐猜测'}</button></p><div class="tip">${analysis}</div><details><summary class="tip">查看全部候选</summary><p class="tip">${c.join('、')}</p></details>` : ''}` : ''}`;
}
function gameView() {
  let g = game,
    playing = g.status === 'playing',
    limit =
      g.difficulty === 'challenge' ? 10 : g.difficulty === 'extreme' ? 7 : 0,
    c = filter(g.guesses);
  return `<div class="grid"><section class="card main-card"><div class="card-top"><span class="label">CASE FILE &nbsp; / &nbsp; ${g.mode === 'player' ? '我来猜' : '电脑来猜'}</span><span class="tag">${playing ? '● 调查进行中' : g.status === 'won' ? '✓ 案件已破解' : g.status === 'lost' ? '案件未破解' : '已中止'}</span></div>${playing ? (g.mode === 'player' ? `<h2 class="main-title">输入你的猜测</h2><p class="sub">观察每条线索，找出隐藏的四位密码。</p><div class="input-wrap" id="input-wrap">${digits(input, 'entry')}<input class="digit-input" id="guess" inputmode="numeric" autocomplete="off" maxlength="4" value="${input}" aria-label="输入四位猜测数字"></div><div class="controls"><button class="primary" data-action="submit">提交猜测 &nbsp; →</button></div><p class="tip">输入四位数字，按 Enter 提交。数字可以重复。</p>` : `<h2 class="main-title">电脑的第 ${g.guesses.length + 1} 次猜测</h2><p class="sub">对照心中的数字，有几个位置完全正确？</p>${digits(g.current || '', 'secret')}<div class="feedback">${[0, 1, 2, 3, 4].map(n => `<button class="option" data-feedback="${n}" ${busy ? 'disabled' : ''}>${n}</button>`).join('')}</div><p class="tip">${busy ? '正在计算下一步，请稍候…' : '请选择位置命中数，数字相同但位置不同不计入。'}</p><p class="tip">剩余候选 ${c.length.toLocaleString()} · 已排除 ${(10000 - c.length).toLocaleString()} ${g.guesses.length ? '· <button class="small-button" data-action="undo">撤销上一步</button>' : ''}</p>`) : `<h2 class="main-title">${g.status === 'won' ? '漂亮，密码已破解。' : '这次还差一点。'}</h2><p class="sub">${g.status === 'won' ? '每一条线索，都让答案更近一步。' : '每一次尝试都是下一次推理的线索。'}</p>${digits(g.secret || '????', 'secret')}<div class="controls"><button class="primary" data-action="again">再来一局 →</button><button class="secondary" data-action="home">返回首页</button></div><div class="divider"></div><div class="results"><strong>案件复盘</strong><br>共进行了 ${g.guesses.length} 次猜测，用时 ${time(elapsed(g))}。${g.guesses.length ? `首轮命中 ${g.guesses[0].matches} 位；结合每轮位置命中数，逐步排除不符合条件的数字。` : ''}${g.usedAssist ? ' 本局使用了推理助手。' : ' 本局没有使用推理助手。'}</div>`}${notice ? `<p class="error" role="alert">${esc(notice)}</p>` : ''}<div class="divider"></div><div class="meta"><div><span class="label">猜测次数</span><strong>${String(g.guesses.length).padStart(2, '0')}${limit ? ` <small class="muted">/ ${limit}</small>` : ''}</strong></div><div><span class="label">用时</span><strong id="timer">${time(elapsed(g))}</strong></div></div></section><aside class="card side-card"><div class="card-top"><h2 class="side-heading">线索记录</h2><span class="count">${String(g.guesses.length).padStart(2, '0')} ENTRIES</span></div>${history(g)}${assistant(g)}<div class="divider"></div><div class="card-top"><span class="label">CASE NOTES / 记录你的推理</span>${playing ? `<button class="link" data-action="abort">中止本局 ↗</button>` : ''}</div><textarea id="notes" placeholder="在这里记下你的发现…" style="width:100%;min-height:75px;background:transparent;color:inherit;border:0;resize:vertical;margin-top:12px;outline:none;font:inherit">${esc(g.notes || '')}</textarea></aside></div>`;
}
function render() {
  document.body.classList.toggle('light', data.settings.theme === 'light');
  app.innerHTML = `<div class="shell">${header()}${hero()}${screen === 'home' ? home() : gameView()}<footer class="bottom-note"><span>数字破译者 &nbsp; / &nbsp; 一场关于逻辑的游戏</span><span>THINK CLEARLY. GUESS WISELY.</span></footer></div><dialog id="dialog"></dialog>`;
  if (screen === 'game' && game.mode === 'player' && game.status === 'playing') {
    const field = $('#guess');
    if (field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }
}
function calculate(c, history, done) {
  busy = true;
  render();
  worker?.terminate();
  worker = new Worker('worker.js', { type: 'module' });
  worker.onmessage = e => {
    busy = false;
    worker.terminate();
    worker = null;
    done(e.data);
    save();
    render();
  };
  worker.onerror = () => {
    busy = false;
    notice = '计算失败，请重试。';
    render();
  };
  worker.postMessage({ candidates: c, history });
}
function submit() {
  if (!game || game.status !== 'playing' || busy) return;
  if (!/^\d{4}$/.test(input)) {
    notice = '请输入完整的四位数字。';
    render();
    return;
  }
  let repeated = game.guesses.some(x => x.guess === input);
  if (repeated && !confirm('这个数字已经猜过，仍要提交并计入次数吗？')) return;
  let m = matches(input, game.secret);
  game.guesses.push({ guess: input, matches: m });
  input = '';
  notice = '';
  if (m === 4) finish('won');
  else if (
    (game.difficulty === 'challenge' && game.guesses.length >= 10) ||
    (game.difficulty === 'extreme' && game.guesses.length >= 7)
  )
    finish('lost');
  save();
  render();
}
function feedback(n) {
  if (busy || game.status !== 'playing') return;
  let entry = { guess: game.current, matches: n },
    next = [...game.guesses, entry],
    c = filter(next);
  if (!c.length) {
    notice =
      '当前反馈与之前的结果存在矛盾，没有任何数字可以同时满足所有记录。请检查或修改之前的反馈。';
    render();
    return;
  }
  game.guesses = next;
  notice = '';
  if (n === 4) {
    finish('won');
    render();
    return;
  }
  save();
  calculate(c, next, g => {
    game.current = g;
  });
}
function dialog(html) {
  let d = $('#dialog');
  d.innerHTML = `<div class="card-top"><span class="label">数字破译者</span><button class="link" data-close>关闭 ✕</button></div>${html}`;
  d.showModal();
}
function records() {
  let rows = data.records;
  dialog(
    `<h2>历史成绩</h2><div class="selects"><button class="secondary" data-stats="player">我来猜</button><button class="secondary" data-stats="computer">电脑来猜</button></div><div id="record-body"></div>`,
  );
  showStats('player');
}
function showStats(mode) {
  let rows = data.records.filter(x => x.mode === mode),
    wins = rows.filter(x => x.status === 'won'),
    avg = wins.length
      ? (wins.reduce((a, x) => a + x.guesses.length, 0) / wins.length).toFixed(
          1,
        )
      : '—';
  $('#record-body').innerHTML =
    `<div class="stats"><div class="stat">总局数<b>${rows.length}</b></div><div class="stat">胜率<b>${rows.length ? Math.round((wins.length / rows.length) * 100) + '%' : '—'}</b></div><div class="stat">胜利局数<b>${wins.length}</b></div><div class="stat">最少次数<b>${wins.length ? Math.min(...wins.map(x => x.guesses.length)) : '—'}</b></div><div class="stat">平均次数（胜局）<b>${avg}</b></div><div class="stat">最快通关<b>${wins.length ? time(Math.min(...wins.map(elapsed))) : '—'}</b></div></div><div class="scroll">${rows.length ? rows.map(x => `<details><summary>${new Date(x.endedAt).toLocaleString()} · ${x.status === 'won' ? '胜利' : x.status === 'lost' ? '失败' : '中止'} · ${x.guesses.length} 次 · ${time(elapsed(x))}</summary><p>谜底：${x.status === 'aborted' ? '未公开' : esc(x.secret || '未公开')} · ${x.usedAssist ? '使用辅助' : '未使用辅助'}</p>${x.guesses.map((h, i) => `<div>${i + 1}. ${h.guess} — ${h.matches} / 4</div>`).join('')}</details>`).join('') : '<p class="muted">还没有记录，开始第一场游戏吧。</p>'}</div>`;
}
function updateGuessInput(field, composing = false) {
  const raw = field.value;
  input = raw.replace(/\D/g, '').slice(0, 4);
  if (!composing && raw !== input) {
    const start = field.selectionStart ?? raw.length;
    const end = field.selectionEnd ?? start;
    const cleanPos = pos => Math.min(raw.slice(0, pos).replace(/\D/g, '').length, 4);
    field.value = input;
    field.setSelectionRange(cleanPos(start), cleanPos(end));
  }
  $('#input-wrap .digits').outerHTML = digits(input, 'entry');
}
app.addEventListener('input', e => {
  if (e.target.id === 'guess') updateGuessInput(e.target, e.isComposing);
  if (e.target.id === 'notes') {
    game.notes = e.target.value;
    save();
  }
});
app.addEventListener('compositionend', e => {
  if (e.target.id === 'guess') updateGuessInput(e.target);
});
app.addEventListener('change', e => {
  if (e.target.id === 'assist') {
    game.assistance = e.target.value;
    if (game.assistance !== 'off') game.usedAssist = true;
    save();
    render();
  }
});
app.addEventListener('keydown', e => {
  if (e.target.id === 'guess' && e.key === 'Enter') submit();
});
app.addEventListener('click', e => {
  let t = e.target.closest('button,[data-edit],#input-wrap');
  if (!t) return;
  if (t.id === 'input-wrap') {
    $('#guess').focus();
    return;
  }
  if (t.dataset.close !== undefined) {
    $('#dialog').close();
    return;
  }
  if (t.dataset.stats) {
    showStats(t.dataset.stats);
    return;
  }
  if (t.dataset.feedback !== undefined) {
    feedback(Number(t.dataset.feedback));
    return;
  }
  if (t.dataset.edit !== undefined) {
    let i = Number(t.dataset.edit),
      n = prompt(
        `将第 ${i + 1} 轮的命中数修改为（0–4）：`,
        game.guesses[i].matches,
      );
    if (n === null) return;
    if (!/^[0-4]$/.test(n)) {
      notice = '请输入 0 到 4 的数字。';
      render();
      return;
    }
    let next = game.guesses.slice(0, i + 1);
    next[i] = { ...next[i], matches: Number(n) };
    let c = filter(next);
    if (!c.length) {
      notice = '修改后的反馈与之前的结果矛盾，请检查。';
      render();
      return;
    }
    game.guesses = next;
    notice = '';
    if (Number(n) === 4) {
      finish('won');
      render();
    } else
      calculate(c, next, g => {
        game.current = g;
      });
    return;
  }
  switch (t.dataset.action) {
    case 'start-player':
      start('player');
      break;
    case 'start-computer':
      start('computer');
      break;
    case 'continue':
      screen = 'game';
      render();
      break;
    case 'submit':
      submit();
      break;
    case 'undo':
      if (!busy && game.guesses.length) {
        let last = game.guesses.pop();
        game.current = last.guess;
        notice = '已撤销上一轮反馈，请重新选择。';
        save();
        render();
      }
      break;
    case 'home':
      screen = 'home';
      render();
      break;
    case 'again': {
      let mode = game.mode;
      screen = 'home';
      render();
      start(mode);
      break;
    }
    case 'abort':
      if (confirm('确定中止当前案件吗？')) {
        finish('aborted');
        screen = 'home';
        render();
      }
      break;
    case 'theme':
      data.settings.theme = data.settings.theme === 'light' ? 'dark' : 'light';
      save();
      render();
      break;
    case 'rules':
      dialog(
        '<h2>游戏规则</h2><p>密码由四位数字组成，每位均为 0–9，允许重复和前导零。</p><p>每次猜测只反馈数字和位置都正确的个数，不提示具体位置。四位全部命中即为胜利。</p><p>例如谜底为 1234，猜测 1299，得到 2 位命中；猜测 4321，得到 0 位命中。</p><p>休闲模式不限次数；挑战模式限 10 次；极限模式限 7 次且不能使用辅助。</p>',
      );
      break;
    case 'records':
      records();
      break;
    case 'recommend': {
      let c = filter(game.guesses);
      calculate(c, game.guesses, g => {
        let bins = [0, 0, 0, 0, 0];
        c.forEach(x => bins[matches(x, g)]++);
        analysis = `推荐 ${g}：尽量减少最坏情况下的剩余候选。反馈 0–4 对应 ${bins.join('、')} 种。`;
      });
      break;
    }
  }
});
setInterval(() => {
  let el = $('#timer');
  if (el && game?.status === 'playing') el.textContent = time(elapsed(game));
}, 1000);
render();
