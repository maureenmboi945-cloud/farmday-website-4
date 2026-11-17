const $ = (selector) => document.querySelector(selector);

// AUTOMATIC TIME-BASED GREETING
function updateGreeting() {
  const hour = new Date().getHours();
  const greeting = document.querySelector('.welcome h1');

  if (!greeting) return;

  if (hour >= 5 && hour < 12) {
    greeting.innerHTML = 'Good morning, Edwin <span>☀</span>';
  } else if (hour >= 12 && hour < 18) {
    greeting.innerHTML = 'Good afternoon, Edwin <span>🌤️</span>';
  } else {
    greeting.innerHTML = 'Good evening, Edwin <span>🌙</span>';
  }
}

updateGreeting();
setInterval(updateGreeting, 60000);

const readList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(`farmday-${key}`));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

let cows = readList('cows');
let tasks = readList('tasks');
let notes = readList('notes');
let milkLogs = readList('milkLogs');
let feedLogs = readList('feedLogs');
let newPhoto = '';
let newHealthDocs = [];

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const makeId = () => crypto.randomUUID();

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const showDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const todayKey = localDate();
const openDialog = (id) => $(id).showModal();
const amount = (value) => Number(value) || 0;

function persist() {
  try {
    localStorage.setItem('farmday-cows', JSON.stringify(cows));
    localStorage.setItem('farmday-tasks', JSON.stringify(tasks));
    localStorage.setItem('farmday-notes', JSON.stringify(notes));
    localStorage.setItem('farmday-milkLogs', JSON.stringify(milkLogs));
    localStorage.setItem('farmday-feedLogs', JSON.stringify(feedLogs));
    render();
    return true;
  } catch {
    alert('The browser could not save these records. Export a backup and remove a large photo or health document, then try again.');
    return false;
  }
}

// Add the new tracker sections and fields to the existing dashboard page.
const sideNav = $('.side-nav');
sideNav.insertAdjacentHTML('beforeend', '<a href="#milk-logs"><span>◷</span> Milk records</a><a href="#feeding-records"><span>≋</span> Feeding records</a>');

$('.topbar').insertAdjacentHTML('afterbegin', '<div class="backup-actions"><button class="quiet-button" id="export-backup">Export backup</button><button class="quiet-button" id="import-backup-button">Import backup</button><span class="backup-note">Saved in this browser</span><input id="import-backup-file" type="file" accept="application/json,.json" hidden></div>');

const cowGrid = $('#cow-form .form-grid');
cowGrid.insertAdjacentHTML('beforeend', `
  <label>Date delivered<input name="delivered" type="date"></label>
  <label>Seller name<input name="seller" maxlength="80" placeholder="Seller or farm"></label>
  <label>Purchase price (KSh)<input name="purchasePrice" type="number" min="0" step="1" placeholder="e.g. 85000"></label>
  <label>Transport date<input name="transportDate" type="date"></label>
  <label class="wide">Feed plan or usual feeding notes<input name="feedNotes" maxlength="120" placeholder="e.g. Napier grass, hay and dairy meal"></label>
  <label class="wide">Health documents (PDF or photos)<input id="health-documents" name="healthDocuments" type="file" accept="application/pdf,image/*" multiple><small class="field-help">Choose clear health or vaccination documents, up to 1 MB each.</small></label>
`);

$('.stats').insertAdjacentHTML('beforeend', `
  <article class="stat-card added-stat"><div class="stat-icon blue-icon">L</div><span class="stat-label">MILK TODAY</span><strong id="milk-total">0 <small>litres</small></strong><span class="stat-foot">Morning and evening logs</span></article>
  <article class="stat-card added-stat"><div class="stat-icon peach-icon">D</div><span class="stat-label">DELIVERED IN LAST 30 DAYS</span><strong id="delivery-count">0 <small>cows</small></strong><span class="stat-foot">From delivery dates entered</span></article>
`);

document.querySelectorAll('.blue-icon')[0].nextElementSibling.textContent = 'FEED LOGGED TODAY';

const cowHeader = $('#cow-table').closest('table').querySelector('thead tr');
cowHeader.lastElementChild.remove();
cowHeader.insertAdjacentHTML('beforeend', '<th>DELIVERED</th><th>MILK / DAY</th><th>FEED PLAN</th><th>DELIVERY DETAILS</th><th></th>');

$('.task-panel .panel-heading h2').textContent = 'Care tasks & reminders';

$('#task-form .dialog-actions').insertAdjacentHTML('beforebegin', `
  <div class="form-grid task-reminder-fields">
    <label>Reminder type<select name="category"><option>General care</option><option>Vaccination</option><option>Vet visit</option><option>Feeding</option><option>Other</option></select></label>
    <label>Due date<input name="dueDate" type="date"></label>
  </div>
`);

$('#notes').insertAdjacentHTML('beforebegin', `
  <section class="panel records-panel" id="milk-logs">
    <div class="panel-heading"><div><p class="eyebrow">MORNING &amp; EVENING</p><h2>Milk production log</h2></div><button class="button button-dark" id="add-milk-log">+ Record milk</button></div>
    <div class="record-summary"><strong id="week-milk-total">0 L</strong><span>logged in the past 7 days</span></div>
    <div id="milk-week-chart" class="milk-week-chart" role="img" aria-label="Daily milk production for the last seven days"></div>
    <div id="milk-log-list" class="record-list"></div>
    <div id="milk-empty" class="record-empty">Add morning and evening yields to see your weekly total and trend.</div>
  </section>
  <section class="panel records-panel" id="feeding-records">
    <div class="panel-heading"><div><p class="eyebrow">FEED TYPE &amp; AMOUNT</p><h2>Feeding records</h2></div><button class="button button-dark" id="add-feed-log">+ Record feed</button></div>
    <p class="panel-subtitle">Compare average recorded feed per day with milk yield for each cow over the past seven days.</p>
    <div class="table-wrap"><table class="comparison-table"><thead><tr><th>COW</th><th>AVERAGE FEED / DAY</th><th>AVERAGE MILK / DAY</th><th>RECENT FEED TYPES</th></tr></thead><tbody id="feed-comparison"></tbody></table></div>
    <div id="feed-log-list" class="record-list"></div>
    <div id="feed-empty" class="record-empty">Record feed type and amount to compare it with milk production.</div>
  </section>
`);

document.body.insertAdjacentHTML('beforeend', `
  <dialog id="milk-dialog" class="entry-dialog"><form id="milk-form"><button type="button" class="dialog-close" data-close>×</button><p class="eyebrow">MILK PRODUCTION</p><h2>Record milk yield</h2><label>Cow<select name="cow" id="milk-cow" required></select></label><label>Date<input name="date" type="date" required></label><div class="form-grid"><label>Morning yield (litres)<input name="morning" type="number" min="0" step="0.1" placeholder="e.g. 6"></label><label>Evening yield (litres)<input name="evening" type="number" min="0" step="0.1" placeholder="e.g. 5"></label></div><p class="form-hint">Log either period separately. A blank period keeps any existing entry; enter 0 to record no milk.</p><div class="dialog-actions"><button type="button" class="button button-soft" data-close>Cancel</button><button class="button button-dark">Save milk record</button></div></form></dialog>
  <dialog id="feed-dialog" class="entry-dialog"><form id="feed-form"><button type="button" class="dialog-close" data-close>×</button><p class="eyebrow">FEEDING RECORD</p><h2>Record feed offered</h2><label>Cow<select name="cow" id="feed-cow" required></select></label><div class="form-grid"><label>Date<input name="date" type="date" required></label><label>Feed type<input name="feedType" required maxlength="60" placeholder="e.g. Napier grass"></label><label>Amount (kg)<input name="amount" type="number" min="0.1" step="0.1" required placeholder="e.g. 8"></label><label>Feeding period<select name="period"><option>Daily total</option><option>Morning</option><option>Midday</option><option>Evening</option></select></label></div><label>Notes (optional)<input name="notes" maxlength="120" placeholder="e.g. Freshly cut"></label><div class="dialog-actions"><button type="button" class="button button-soft" data-close>Cancel</button><button class="button button-dark">Save feed record</button></div></form></dialog>
`);

document.head.insertAdjacentHTML('beforeend', `<style>
  .backup-actions{margin-right:auto;display:flex;gap:4px;align-items:center}.backup-actions .quiet-button{white-space:nowrap}.backup-note{font-size:9px;color:#89948b;margin-left:5px}
  .records-panel{margin-top:17px}.record-summary{display:flex;align-items:baseline;gap:8px;margin:20px 0 6px}.record-summary strong{font:700 23px Manrope,sans-serif;color:var(--green)}.record-summary span,.panel-subtitle,.form-hint,.field-help{font-size:11px;color:#849087}.panel-subtitle{line-height:1.6;margin:12px 0}
  .milk-week-chart{height:132px;display:grid;grid-template-columns:repeat(7,1fr);align-items:end;gap:9px;border-bottom:1px solid var(--line);padding:8px 3px 0}.milk-day{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;min-width:0}.milk-day strong{font-size:9px;color:#68746a;white-space:nowrap}.milk-day i{display:block;width:min(28px,70%);height:var(--bar-height,2%);min-height:3px;background:#77976c;border-radius:5px 5px 0 0}.milk-day small{font-size:9px;color:#89948b;padding-bottom:6px}
  .record-list{margin-top:14px}.record-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px 3px;border-top:1px solid #f0f2ef;font-size:11px}.record-row strong{display:block;font-size:11px}.record-row small{display:block;margin-top:4px;color:#89948b}.record-empty{padding:17px 5px 4px;color:#89948b;font-size:11px}.comparison-table td{white-space:normal;min-width:95px}.comparison-table td:first-child{font-weight:700}.comparison-table td small{display:block;font-weight:400;color:#89948b;margin-top:4px}.delivery-details summary{cursor:pointer;color:var(--green);font-weight:700;font-size:10px}.delivery-details dl{margin:8px 0;min-width:180px;white-space:normal}.delivery-details dt{font-size:9px;color:#89948b;margin-top:5px}.delivery-details dd{margin:2px 0 0;font-size:10px;overflow-wrap:anywhere}.delivery-details a{color:var(--green);text-decoration:underline}.task-copy small.task-due{color:#71806f}.task-row.task-overdue .task-due{color:#a85d42;font-weight:700}.task-row.task-done .task-due{color:#89948b}.form-hint{margin:9px 0 0;line-height:1.5}.field-help{display:block;margin-top:5px;font-weight:400}.task-reminder-fields{margin-top:4px}
  @media(max-width:720px){.topbar{height:auto;min-height:60px;flex-wrap:wrap;padding:9px 0;gap:7px}.backup-actions{order:3;width:100%;justify-content:flex-start;flex-wrap:wrap;gap:2px}.backup-actions .quiet-button{font-size:9px;padding:7px}.records-panel{margin-top:12px}.milk-week-chart{gap:4px}.milk-day i{width:min(21px,75%)}.comparison-table{min-width:580px}.record-row{font-size:10px}}
</style>`);

const resetCowPhoto = () => {
  newPhoto = '';
  $('#photo-preview').textContent = '🐄';
  $('#cow-photo').value = '';
  $('#health-documents').value = '';
  newHealthDocs = [];
};

const populateCowSelect = (selector) => {
  const select = $(selector);

  if (!cows.length && selector === '#note-cow') {
    select.innerHTML = '<option value="Unlisted cow">Unlisted cow (add cow later)</option>';
    select.disabled = false;
    return;
  }

  select.innerHTML = cows.length
    ? cows.map((cow) => `<option value="${esc(cow.id)}">${esc(cow.name)}${cow.breed ? ` · ${esc(cow.breed)}` : ''}</option>`).join('')
    : '<option value="" disabled selected>Add a cow first</option>';

  select.disabled = cows.length === 0;
};

function fileAsData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function photoData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 500 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

document.addEventListener('click', (event) => {
  if (event.target.matches('[data-close]')) event.target.closest('dialog').close();
});

$('#add-task').onclick = $('#empty-add').onclick = () => openDialog('#task-dialog');

$('#add-cow').onclick = $('#first-cow').onclick = $('#top-add-cow').onclick = () => openDialog('#cow-dialog');

$('#add-note').onclick = $('#first-note').onclick = () => {
  populateCowSelect('#note-cow');
  $('#note-form [name=date]').value = localDate();
  openDialog('#note-dialog');
};

$('#add-milk-log').onclick = () => {
  populateCowSelect('#milk-cow');
  $('#milk-form [name=date]').value = localDate();
  openDialog('#milk-dialog');
};

$('#add-feed-log').onclick = () => {
  populateCowSelect('#feed-cow');
  $('#feed-form [name=date]').value = localDate();
  openDialog('#feed-dialog');
};

$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  tasks.unshift({
    id: makeId(),
    title: data.get('title').trim(),
    area: data.get('area').trim(),
    category: data.get('category'),
    dueDate: data.get('dueDate'),
    done: false
  });

  event.currentTarget.reset();
  $('#task-dialog').close();
  persist();
});

$('#cow-photo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    newPhoto = await photoData(file);
    $('#photo-preview').innerHTML = `<img src="${newPhoto}" alt="Cow photo preview">`;
  } catch {
    alert('That photo could not be opened. Try another image.');
  }
});

$('#health-documents').addEventListener('change', async (event) => {
  const files = [...event.target.files];

  if (files.some((file) => file.size > 1024 * 1024)) {
    alert('Each health document must be 1 MB or smaller.');
    event.target.value = '';
    return;
  }

  if (files.some((file) => !file.type.startsWith('image/') && file.type !== 'application/pdf')) {
    alert('Use PDF files or photos for health documents.');
    event.target.value = '';
    return;
  }

  try {
    newHealthDocs = await Promise.all(files.map(async (file) => ({
      name: file.name,
      type: file.type,
      data: await fileAsData(file)
    })));
  } catch {
    alert('A health document could not be read. Please try again.');
    newHealthDocs = [];
  }
});

document.addEventListener('change', async (event) => {
  const id = event.target.dataset.photoCow;
  const file = event.target.files[0];

  if (!id || !file) return;

  try {
    const cow = cows.find((item) => item.id === id);
    if (cow) {
      cow.photo = await photoData(file);
      persist();
    }
  } catch {
    alert('That photo could not be opened. Try another image.');
  }
});

$('#cow-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  cows.unshift({
    id: makeId(),
    name: data.get('name').trim(),
    breed: data.get('breed').trim(),
    dob: data.get('dob'),
    feed: amount(data.get('feed')),
    problem: data.get('problem').trim(),
    photo: newPhoto,
    delivered: data.get('delivered'),
    seller: data.get('seller').trim(),
    purchasePrice: amount(data.get('purchasePrice')),
    transportDate: data.get('transportDate'),
    feedNotes: data.get('feedNotes').trim(),
    healthDocs: newHealthDocs
  });

  event.currentTarget.reset();
  resetCowPhoto();
  $('#cow-dialog').close();
  persist();
});

$('#note-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  notes.unshift({
    id: makeId(),
    cow: data.get('cow'),
    problem: data.get('problem').trim(),
    treatment: data.get('treatment').trim(),
    treatedBy: data.get('treatedBy').trim(),
    date: data.get('date'),
    details: data.get('details').trim()
  });

  event.currentTarget.reset();
  $('#note-dialog').close();
  persist();
});

$('#milk-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  const morning = data.get('morning') === '' ? null : amount(data.get('morning'));
  const evening = data.get('evening') === '' ? null : amount(data.get('evening'));

  if (morning === null && evening === null) {
    alert('Enter a morning yield, evening yield, or both.');
    return;
  }

  const existing = milkLogs.find((log) => log.cow === data.get('cow') && log.date === data.get('date'));

  if (existing) {
    if (morning !== null) existing.morning = morning;
    if (evening !== null) existing.evening = evening;
  } else {
    milkLogs.unshift({
      id: makeId(),
      cow: data.get('cow'),
      date: data.get('date'),
      morning,
      evening
    });
  }

  event.currentTarget.reset();
  $('#milk-dialog').close();
  persist();
});

$('#feed-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  feedLogs.unshift({
    id: makeId(),
    cow: data.get('cow'),
    date: data.get('date'),
    feedType: data.get('feedType').trim(),
    amount: amount(data.get('amount')),
    period: data.get('period'),
    notes: data.get('notes').trim()
  });

  event.currentTarget.reset();
  $('#feed-dialog').close();
  persist();
});

$('#export-backup').addEventListener('click', () => {
  const backup = {
    app: 'Farmday',
    version: 1,
    exportedAt: new Date().toISOString(),
    cows,
    tasks,
    notes,
    milkLogs,
    feedLogs
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `farmday-backup-${localDate()}.json`;
  link.click();

  URL.revokeObjectURL(url);
});

$('#import-backup-button').addEventListener('click', () => $('#import-backup-file').click());

$('#import-backup-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());

    if (!backup || !Array.isArray(backup.cows) || !Array.isArray(backup.tasks) || !Array.isArray(backup.notes)) {
      throw new Error('Invalid Farmday backup');
    }

    if (!confirm('Importing this backup will replace the records currently saved in this browser. Continue?')) return;

    cows = backup.cows;
    tasks = backup.tasks;
    notes = backup.notes;
    milkLogs = Array.isArray(backup.milkLogs) ? backup.milkLogs : [];
    feedLogs = Array.isArray(backup.feedLogs) ? backup.feedLogs : [];

    if (persist()) alert('Farmday backup restored successfully.');
  } catch (error) {
    alert(error.message === 'Invalid Farmday backup' ? error.message : 'Could not read this backup file.');
  } finally {
    event.target.value = '';
  }
});

function fileLink(documentRecord) {
  if (!documentRecord?.data) return '';
  return `<a href="${documentRecord.data}" download="${esc(documentRecord.name)}">${esc(documentRecord.name)}</a>`;
}

function renderMilk() {
  const logs = [...milkLogs].sort((a, b) => b.date.localeCompare(a.date));

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return localDate(date);
  });

  const daily = Object.fromEntries(days.map((day) => [day, 0]));

  for (const log of logs) {
    if (Object.hasOwn(daily, log.date)) {
      daily[log.date] += amount(log.morning) + amount(log.evening);
    }
  }

  const weekTotal = Object.values(daily).reduce((sum, value) => sum + value, 0);
  const max = Math.max(weekTotal ? 0.1 : 1, ...Object.values(daily));

  $('#week-milk-total').textContent = `${weekTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;

  $('#milk-week-chart').innerHTML = days.map((day) => `
    <div class="milk-day">
      <strong>${daily[day] ? `${daily[day].toLocaleString(undefined, { maximumFractionDigits: 1 })} L` : ''}</strong>
      <i style="--bar-height:${Math.max(3, daily[day] / max * 82)}%" aria-hidden="true"></i>
      <small>${new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small>
    </div>
  `).join('');

  $('#milk-log-list').innerHTML = logs.slice(0, 10).map((log) => {
    const cow = cows.find((item) => item.id === log.cow);
    const morning = log.morning === null || log.morning === undefined ? '—' : `${amount(log.morning)} L`;
    const evening = log.evening === null || log.evening === undefined ? '—' : `${amount(log.evening)} L`;

    return `<div class="record-row">
      <div>
        <strong>${esc(cow?.name || 'Removed cow')} · ${showDate(log.date)}</strong>
        <small>Morning ${morning} &nbsp;·&nbsp; Evening ${evening}</small>
      </div>
      <strong>${(amount(log.morning) + amount(log.evening)).toLocaleString(undefined, { maximumFractionDigits: 1 })} L</strong>
    </div>`;
  }).join('');

  $('#milk-empty').hidden = logs.length > 0;

  const todayTotal = milkLogs
    .filter((log) => log.date === todayKey)
    .reduce((sum, log) => sum + amount(log.morning) + amount(log.evening), 0);

  $('#milk-total').innerHTML = `${todayTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} <small>litres</small>`;
}

function renderFeedComparison() {
  const lastWeek = new Date();
  lastWeek.setHours(0, 0, 0, 0);
  lastWeek.setDate(lastWeek.getDate() - 6);

  const inWeek = (date) => date && date <= todayKey && new Date(`${date}T00:00:00`) >= lastWeek;

  const rows = cows.map((cow) => {
    const cowMilk = milkLogs.filter((log) => log.cow === cow.id && inWeek(log.date));
    const cowFeed = feedLogs.filter((log) => log.cow === cow.id && inWeek(log.date));

    const milkDays = new Set(cowMilk.map((log) => log.date));
    const feedDays = new Set(cowFeed.map((log) => log.date));

    const milk = milkDays.size
      ? cowMilk.reduce((sum, log) => sum + amount(log.morning) + amount(log.evening), 0) / milkDays.size
      : null;

    const feed = feedDays.size
      ? cowFeed.reduce((sum, log) => sum + amount(log.amount), 0) / feedDays.size
      : null;

    const types = [...new Set(cowFeed.map((log) => log.feedType))].slice(0, 3).join(', ');

    if (milk === null && feed === null) return '';

    return `<tr>
      <td>${esc(cow.name)}</td>
      <td>${feed === null ? '—' : `${feed.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg <small>${feedDays.size} logged days</small>`}</td>
      <td>${milk === null ? '—' : `${milk.toLocaleString(undefined, { maximumFractionDigits: 1 })} L <small>${milkDays.size} logged days</small>`}</td>
      <td>${esc(types || '—')}</td>
    </tr>`;
  }).filter(Boolean).join('');

  $('#feed-comparison').innerHTML = rows;

  const logs = [...feedLogs].sort((a, b) => b.date.localeCompare(a.date));

  $('#feed-log-list').innerHTML = logs.slice(0, 10).map((log) => {
    const cow = cows.find((item) => item.id === log.cow);

    return `<div class="record-row">
      <div>
        <strong>${esc(cow?.name || 'Removed cow')} · ${esc(log.feedType)}</strong>
        <small>${showDate(log.date)} · ${esc(log.period || 'Daily total')}${log.notes ? ` · ${esc(log.notes)}` : ''}</small>
      </div>
      <strong>${amount(log.amount).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong>
    </div>`;
  }).join('');

  $('#feed-empty').hidden = logs.length > 0;
}

function render() {
  const openTasks = tasks.filter((task) => !task.done).length;
  const doneTasks = tasks.length - openTasks;

  $('#cow-count').innerHTML = `${cows.length} <small>${cows.length === 1 ? 'cow' : 'cows'}</small>`;
  $('#remaining-count').innerHTML = `${openTasks} <small>${openTasks === 1 ? 'task' : 'tasks'}</small>`;
  $('#task-foot').textContent = openTasks ? `${doneTasks} completed` : 'You\'re all caught up';

  $('#followup-count').innerHTML = `${cows.filter((cow) => cow.problem).length} <small>open</small>`;

  const feedTotal = feedLogs
    .filter((log) => log.date === todayKey)
    .reduce((sum, log) => sum + amount(log.amount), 0);

  $('#feed-total').innerHTML = `${feedTotal.toLocaleString()} <small>kg / day</small>`;

  const recentDeliveries = cows.filter((cow) => {
    if (!cow.delivered) return false;

    const days = (new Date(`${todayKey}T00:00:00`) - new Date(`${cow.delivered}T00:00:00`)) / 86400000;

    return days >= 0 && days <= 30;
  }).length;

  $('#delivery-count').innerHTML = `${recentDeliveries} <small>${recentDeliveries === 1 ? 'cow' : 'cows'}</small>`;

  $('#task-list').innerHTML = tasks.map((task) => {
    const overdue = !task.done && task.dueDate && task.dueDate < todayKey;

    const detail = [
      task.category || 'General care',
      task.area,
      task.dueDate ? `${overdue ? 'Overdue · ' : 'Due · '}${showDate(task.dueDate)}` : 'No due date'
    ].filter(Boolean).join(' · ');

    return `<div class="task-row ${task.done ? 'task-done' : ''} ${overdue ? 'task-overdue' : ''}">
      <input class="task-check" type="checkbox" data-task="${esc(task.id)}" ${task.done ? 'checked' : ''} aria-label="Mark reminder complete">
      <div class="task-copy">
        <strong>${esc(task.title)}</strong>
        <small class="task-due">${esc(detail)}</small>
      </div>
      <button class="delete-task" data-delete-task="${esc(task.id)}" aria-label="Delete reminder">×</button>
    </div>`;
  }).join('');

  $('#empty-state').hidden = tasks.length > 0;

  const followups = cows.filter((cow) => cow.problem);

  $('#followup-list').innerHTML = followups.map((cow) => `
    <div class="block-row">
      <span class="block-dot dot-three"></span>
      <div class="block-info">
        <strong>${esc(cow.name)}</strong>
        <small>${esc(cow.problem)}</small>
      </div>
      <span class="block-status status-watch">Follow up</span>
    </div>
  `).join('');

  $('#followup-empty').hidden = followups.length > 0;

  $('#cow-table').innerHTML = cows.map((cow) => {
    const todayLogs = milkLogs.filter((log) => log.cow === cow.id && log.date === todayKey);

    const savedMilk = todayLogs.length
      ? todayLogs.reduce((sum, log) => sum + amount(log.morning) + amount(log.evening), 0)
      : null;

    const delivery = `<details class="delivery-details">
      <summary>View details</summary>
      <dl>
        <dt>Seller</dt><dd>${esc(cow.seller || '—')}</dd>
        <dt>Purchase price</dt><dd>${cow.purchasePrice ? `KSh ${amount(cow.purchasePrice).toLocaleString()}` : '—'}</dd>
        <dt>Transport date</dt><dd>${showDate(cow.transportDate)}</dd>
        <dt>Health documents</dt><dd>${(cow.healthDocs || []).length ? cow.healthDocs.map(fileLink).join('<br>') : 'None attached'}</dd>
      </dl>
    </details>`;

    return `<tr>
      <td>
        <span class="cow-thumb">${cow.photo ? `<img src="${cow.photo}" alt="${esc(cow.name)}">` : '🐄'}</span><br>
        <label class="cow-photo-edit">${cow.photo ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" data-photo-cow="${esc(cow.id)}" hidden></label>
      </td>
      <td>${esc(cow.name)}</td>
      <td>${esc(cow.breed || '—')}</td>
      <td>${showDate(cow.dob)}</td>
      <td>${amount(cow.feed).toLocaleString()} kg</td>
      <td><span class="health-pill ${cow.problem ? 'needs-care' : ''}">${cow.problem ? 'Needs care' : 'No issue recorded'}</span></td>
      <td>${showDate(cow.delivered)}</td>
      <td>${savedMilk === null ? '—' : `${savedMilk.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`}</td>
      <td>${esc(cow.feedNotes || '—')}</td>
      <td>${delivery}</td>
      <td><button class="row-delete" data-delete-cow="${esc(cow.id)}" aria-label="Delete cow">×</button></td>
    </tr>`;
  }).join('');

  $('#cows-empty').hidden = cows.length > 0;

  $('#notes-list').innerHTML = notes.map((note) => {
    const cow = cows.find((item) => item.id === note.cow);

    return `<div class="note-row">
      <span class="note-icon">♡</span>
      <div class="note-main">
        <strong>${esc(cow?.name || note.cow)} · ${esc(note.problem)}</strong>
        <p><b>Treatment:</b> ${esc(note.treatment)}</p>
        <p><b>Vet:</b> <span class="vet-label">${esc(note.treatedBy)}</span> · ${showDate(note.date)}</p>
        ${note.details ? `<p>${esc(note.details)}</p>` : ''}
      </div>
      <button class="row-delete" data-delete-note="${esc(note.id)}" aria-label="Delete note">×</button>
    </div>`;
  }).join('');

  $('#notes-empty').hidden = notes.length > 0;

  $('#progress-text').textContent = `${doneTasks} of ${tasks.length} completed`;

  const percent = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;

  $('#progress-percent').textContent = `${percent}%`;
  $('#progress-fill').style.width = `${percent}%`;

  renderMilk();
  renderFeedComparison();

  document.querySelectorAll('[data-task]').forEach((element) => {
    element.onchange = () => {
      const task = tasks.find((item) => item.id === element.dataset.task);
      if (task) task.done = element.checked;
      persist();
    };
  });

  document.querySelectorAll('[data-delete-task]').forEach((element) => {
    element.onclick = () => {
      tasks = tasks.filter((task) => task.id !== element.dataset.deleteTask);
      persist();
    };
  });

  document.querySelectorAll('[data-delete-cow]').forEach((element) => {
    element.onclick = () => {
      cows = cows.filter((cow) => cow.id !== element.dataset.deleteCow);
      persist();
    };
  });

  document.querySelectorAll('[data-delete-note]').forEach((element) => {
    element.onclick = () => {
      notes = notes.filter((note) => note.id !== element.dataset.deleteNote);
      persist();
    };
  });
}

render();