(() => {
"use strict";

const KEY = "fizen-hub-data-v1";
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const $ = s => document.querySelector(s);
const $all = s => [...document.querySelectorAll(s)];
let view = "dashboard", searchQuery = "", toastTimer;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

const defaultData = () => ({
  version: 1,
  theme: "light",
  accent: "#635bdb",
  tasks: [
    {id:uid(),title:"Изучить основы ASM",description:"Первый учебный проект",due:today(),priority:"high",done:false,project:"FIZEN OS"},
    {id:uid(),title:"Собрать первую версию FIZEN HUB",description:"Добавлять функции постепенно",due:"",priority:"normal",done:true,project:"FIZEN HUB"}
  ],
  projects: [
    {id:uid(),name:"FIZEN OS",description:"Собственная операционная система",status:"В процессе",color:"#635bdb",created:today()},
    {id:uid(),name:"FIZEN HUB",description:"Личная панель и набор инструментов",status:"В процессе",color:"#198754",created:today()}
  ],
  notes: [{
    id:uid(),title:"Идеи",body:"Записывай сюда идеи, которые не хочется потерять.",
    tags:"inbox",updated:new Date().toISOString()
  }],
  events: [],
  settings: {
    compact:false,
    style:"rounded",
    density:"comfortable",
    fontSize:"medium",
    layout:"two"
  }
});

function load() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if (x && x.version === 1) {
      const d = defaultData();
      return {
        ...d,
        ...x,
        settings: {...d.settings, ...(x.settings || {})}
      };
    }
  } catch (e) {}
  return defaultData();
}

let data = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    $("#saveState").textContent = "Сохранено";
  } catch (e) {
    $("#saveState").textContent = "Ошибка сохранения";
    notify("Не удалось сохранить. Экспортируй резервную копию.");
  }
}

function notify(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2300);
}

function fmtDate(d) {
  if (!d) return "Без срока";
  return new Date(d + "T12:00:00").toLocaleDateString("ru-RU", {
    day:"numeric", month:"short", year:"numeric"
  });
}

function pageHead(kicker, title, desc, action = "") {
  return `<div class="page-head"><div>
    <div class="eyebrow">${kicker}</div>
    <h1>${title}</h1><p>${desc}</p>
  </div>${action}</div>`;
}

function button(label, action, primary = false) {
  return `<button class="btn ${primary ? "primary" : ""}" data-action="${action}">${label}</button>`;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function activeTasks() {
  return data.tasks.filter(t => !t.done);
}

function hexToRgba(hex, a) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return `rgba(99,91,219,${a})`;
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}

function applyTheme() {
  const settings = data.settings || {};
  document.body.classList.toggle("dark", data.theme === "dark");
  document.body.dataset.style = settings.style || "rounded";
  document.body.dataset.density = settings.density || "comfortable";
  document.body.dataset.font = settings.fontSize || "medium";
  document.body.dataset.layout = settings.layout || "two";

  document.documentElement.style.setProperty("--accent", data.accent || "#635bdb");
  document.documentElement.style.setProperty("--accent2", hexToRgba(data.accent || "#635bdb", .12));
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", data.theme === "dark" ? "#15171c" : "#f6f7f9"
  );
}

function render() {
  applyTheme();
  $("#pageName").textContent = ({
    dashboard:"Обзор", tasks:"Задачи", projects:"Проекты",
    notes:"Заметки", calendar:"Планировщик",
    tools:"Dev Tools", settings:"Настройки и данные"
  })[view] || "Обзор";

  $("#taskBadge").textContent = activeTasks().length;
  $("#footerDate").textContent = new Date().toLocaleDateString("ru-RU", {
    day:"numeric", month:"long", year:"numeric"
  });

  const pages = {
    dashboard, tasks:tasksPage, projects:projectsPage,
    notes:notesPage, calendar:calendarPage,
    tools:toolsPage, settings:settingsPage
  };

  $("#app").innerHTML = (pages[view] || dashboard)();
  wirePage();
}

function taskRow(t){
return `<div class="list-row ${t.done?"done":""}">
<input class="check" type="checkbox" data-action="toggle-task" data-id="${t.id}" ${t.done?"checked":""} aria-label="Выполнено">
<div class="row-main">
<strong>${esc(t.title)}</strong>
<small>${esc(t.project||"Без проекта")} · ${fmtDate(t.due)}</small>
</div>
<span class="tag ${t.priority==="high"?"purple":""}">${t.priority==="high"?"Важно":t.priority==="low"?"Низкий":"Обычный"}</span>
<button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Редактировать">✎</button>
<button class="icon-btn danger" data-action="delete-task" data-id="${t.id}" title="Удалить задачу">🗑</button>
</div>`;
}
function dashboard() {
  const open = activeTasks().slice()
    .sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0,5);
  const projects = data.projects.slice(0,4);
  const notes = data.notes.slice()
    .sort((a,b) => (b.updated || "").localeCompare(a.updated || ""))
    .slice(0,3);
  const done = data.tasks.filter(t => t.done).length;

  return pageHead("YOUR WORKSPACE","С возвращением 👋",
    "Твои проекты, задачи и идеи — в одном месте.",
    button("+ Новая задача","add-task",true)
  ) + `<div class="cards">
    <div class="stat"><div class="stat-top">Активные задачи <span class="stat-icon">✓</span></div><strong>${activeTasks().length}</strong><small>задач ждут внимания</small></div>
    <div class="stat"><div class="stat-top">Проекты <span class="stat-icon">▦</span></div><strong>${data.projects.length}</strong><small>всего в рабочем пространстве</small></div>
    <div class="stat"><div class="stat-top">Заметки <span class="stat-icon">▤</span></div><strong>${data.notes.length}</strong><small>идеи и записи</small></div>
    <div class="stat"><div class="stat-top">Выполнено <span class="stat-icon">↗</span></div><strong>${done}</strong><small>задач завершено</small></div>
  </div>
  <div class="two-col">
    <section class="panel"><div class="panel-head"><h2>Ближайшие задачи</h2><button class="text-link" data-view="tasks">Все задачи →</button></div>
    <div class="list">${open.length ? open.map(taskRow).join("") : empty("Все задачи выполнены. Отличная работа!")}</div></section>
    <section class="panel"><div class="panel-head"><h2>Твои проекты</h2><button class="text-link" data-view="projects">Все проекты →</button></div>
    ${projects.length ? projects.map(p => `<div class="project-card">
      <h3><span style="color:${esc(p.color || "#635bdb")}">●</span> ${esc(p.name)}</h3>
      <p>${esc(p.description || "Без описания")}</p>
      <div class="project-meta"><span>${esc(p.status)}</span>
      <span>${data.tasks.filter(t => t.project === p.name && t.done).length}/${data.tasks.filter(t => t.project === p.name).length} задач</span></div>
    </div>`).join("") : empty("Добавь первый проект")}</section>
  </div>
  <section class="panel"><div class="panel-head"><h2>Последние заметки</h2><button class="text-link" data-view="notes">Открыть заметки →</button></div>
  <div class="list">${notes.length ? notes.map(n => `<div class="list-row">
    <span class="stat-icon">▤</span><div class="row-main"><strong>${esc(n.title)}</strong><small>${esc((n.body || "").slice(0,100) || "Пустая заметка")}</small></div>
    <button class="btn small" data-action="edit-note" data-id="${n.id}">Открыть</button>
  </div>`).join("") : empty("Заметок пока нет")}</div></section>`;
}

function tasksPage() {
  const list = data.tasks.filter(t =>
    !searchQuery || `${t.title} ${t.description} ${t.project}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return pageHead("ПЛАНИРОВАНИЕ","Задачи","Разбивай большие проекты на понятные следующие шаги.",button("+ Добавить задачу","add-task",true)) +
  `<div class="toolbar">
    <input class="field" id="taskFilter" placeholder="Найти задачу…" value="${esc(searchQuery)}">
    <select id="taskStatus" class="field"><option value="all">Все задачи</option><option value="open">Активные</option><option value="done">Выполненные</option></select>
    <select id="taskSort" class="field"><option value="due">По сроку</option><option value="priority">По приоритету</option><option value="new">Сначала новые</option></select>
  </div><section class="panel"><div class="list" id="taskList">${list.length ? list.map(taskRow).join("") : empty("Задач не найдено")}</div></section>`;
}

function projectsPage() {
  return pageHead("ОРГАНИЗАЦИЯ","Проекты","Большие идеи — в одном месте, с понятным прогрессом.",button("+ Новый проект","add-project",true)) +
  `<div class="note-grid">${data.projects.length ? data.projects.map(p => {
    const ts = data.tasks.filter(t => t.project === p.name);
    const done = ts.filter(t => t.done).length;
    const pct = ts.length ? Math.round(done / ts.length * 100) : 0;
    return `<article class="note-card"><h3><span style="color:${esc(p.color || "#635bdb")}">●</span> ${esc(p.name)}</h3>
      <p>${esc(p.description || "Без описания")}</p>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="project-meta"><span>${esc(p.status)}</span><span>${pct}% · ${done}/${ts.length}</span></div>
      <div class="note-foot" style="margin-top:15px">
        <button class="btn small" data-action="project-tasks" data-id="${p.id}">Задачи проекта</button>
        <div class="note-actions"><button class="btn small" data-action="edit-project" data-id="${p.id}">Изменить</button><button class="btn small danger" data-action="delete-project" data-id="${p.id}">×</button></div>
      </div></article>`;
  }).join("") : empty("Создай первый проект")}</div>`;
}

function notesPage() {
  const list = data.notes.filter(n =>
    !searchQuery || `${n.title} ${n.body} ${n.tags}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return pageHead("БАЗА ЗНАНИЙ","Заметки","Сохраняй идеи, инструкции, команды и мысли.",button("+ Новая заметка","add-note",true)) +
  `<div class="toolbar"><input class="field" id="noteFilter" placeholder="Поиск по заметкам…" value="${esc(searchQuery)}"><span class="muted">${list.length} заметок</span></div>
  <div class="note-grid">${list.length ? list.map(n => `<article class="note-card">
    <h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>
    <div class="note-foot"><span class="tag">${esc(n.tags || "без тегов")}</span>
    <div class="note-actions"><button class="btn small" data-action="edit-note" data-id="${n.id}">Изменить</button><button class="btn small danger" data-action="delete-note" data-id="${n.id}">×</button></div></div>
    <small class="muted" style="margin-top:8px">${new Date(n.updated).toLocaleDateString("ru-RU")}</small>
  </article>`).join("") : empty("Ничего не найдено")}</div>`;
}

function calendarPage() {
  const events = data.events.slice().sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  return pageHead("ВРЕМЯ И ПЛАНЫ","Планировщик","Встречи, дедлайны и напоминания в одном списке.",button("+ Событие","add-event",true)) +
  `<section class="panel"><div class="panel-head"><h2>События</h2><span class="muted">${events.length} записей</span></div>
  ${events.length ? events.map(e => `<div class="list-row">
    <div class="date-label" style="width:85px">${fmtDate(e.date)}<small style="display:block">${esc(e.time || "")}</small></div>
    <div class="row-main"><strong>${esc(e.title)}</strong><small>${esc(e.description || "")}</small></div>
    <button class="btn small" data-action="edit-event" data-id="${e.id}">Изменить</button>
    <button class="btn small danger" data-action="delete-event" data-id="${e.id}">×</button>
  </div>`).join("") : empty("Пока нет событий. Добавь важную дату или дедлайн.")}</section>
  <section class="panel"><div class="panel-head"><h2>Сроки задач</h2></div><div class="list">
  ${data.tasks.filter(t => t.due && !t.done).sort((a,b) => a.due.localeCompare(b.due)).map(t => `<div class="list-row">
    <div class="date-label">${fmtDate(t.due)}</div><div class="row-main"><strong>${esc(t.title)}</strong><small>${esc(t.project || "Без проекта")}</small></div>
    <span class="tag">${t.due < today() ? "Просрочена" : "Дедлайн"}</span>
  </div>`).join("") || empty("Нет активных задач со сроком")}</div></section>`;
}

function toolsPage() {
  return pageHead("НАБОР РАЗРАБОТЧИКА","Dev Tools","Полезные утилиты без отправки данных на сервер.") +
  `<div class="tool-grid">
  <section class="panel tool-card"><h3>JSON Formatter</h3><p>Проверка синтаксиса и форматирование JSON.</p>
    <textarea id="jsonInput" placeholder='{"name":"FIZEN","version":1}'></textarea>
    <div class="inline-buttons"><button class="btn primary" data-action="format-json">Форматировать</button><button class="btn" data-action="minify-json">Минифицировать</button><button class="btn" data-action="copy-json">Копировать результат</button></div>
    <div id="jsonOutput" class="tool-output">Результат появится здесь.</div></section>
  <section class="panel tool-card"><h3>Системы счисления</h3><p>Перевод целых чисел между BIN, DEC, HEX и OCT.</p>
    <input id="baseInput" class="field" value="255" placeholder="Число">
    <select id="baseFrom" class="field"><option value="10">Из DEC (10)</option><option value="2">Из BIN (2)</option><option value="16">Из HEX (16)</option><option value="8">Из OCT (8)</option></select>
    <button class="btn primary" data-action="convert-base">Конвертировать</button><div id="baseOutput" class="tool-output">DEC: 255 · HEX: FF · BIN: 11111111 · OCT: 377</div></section>
  <section class="panel tool-card"><h3>Генератор паролей</h3><p>Пароль создаётся в этом браузере. Не используй один пароль везде.</p>
    <div style="display:flex;gap:8px;align-items:center"><input id="passLength" class="field" type="number" min="8" max="128" value="20"><label class="muted"><input id="passSymbols" type="checkbox" checked> Символы</label></div>
    <button class="btn primary" data-action="make-password">Создать пароль</button><div id="passOutput" class="tool-output">Нажми «Создать пароль».</div><button class="btn small" data-action="copy-pass" style="margin-top:8px">Копировать</button></section>
  <section class="panel tool-card"><h3>HEX / RGB</h3><p>Конвертер цвета для CSS и интерфейсов.</p>
    <input id="colorInput" class="field" value="#635bdb" placeholder="#635bdb"><div id="colorPreview" style="height:48px;border-radius:8px;background:#635bdb;margin:8px 0"></div>
    <button class="btn primary" data-action="convert-color">Конвертировать</button><div id="colorOutput" class="tool-output">RGB(99, 91, 219)</div></section>
  <section class="panel tool-card"><h3>Unix timestamp</h3><p>Текущее время в секундах и конвертация даты.</p>
    <button class="btn primary" data-action="current-time">Текущий timestamp</button><input id="timestampInput" class="field" placeholder="Timestamp или дата ISO">
    <button class="btn" data-action="convert-time">Преобразовать</button><div id="timeOutput" class="tool-output">Результат появится здесь.</div></section>
  <section class="panel tool-card"><h3>Блокнот для кода</h3><p>Быстрый черновик с копированием и скачиванием.</p>
    <textarea id="codeScratch" placeholder="// Идея, команда или фрагмент кода…"></textarea>
    <div class="inline-buttons"><button class="btn" data-action="copy-scratch">Копировать</button><button class="btn" data-action="download-scratch">Скачать .txt</button></div></section>
  </div>`;
}
function settingsPage() {
  const size = JSON.stringify(data).length;
  const s = {
    style:"rounded", density:"comfortable",
    fontSize:"medium", layout:"two",
    ...(data.settings || {})
  };

  return pageHead("СИСТЕМА","Настройки и данные","Настрой внешний вид FIZEN HUB под себя.") +
  `<div class="settings-grid">
    <section class="panel">
      <div class="panel-head"><h2>Внешний вид</h2></div>

      <div class="setting-row">
        <div><strong>Тема</strong><small>Светлая или тёмная</small></div>
        <button class="btn" data-action="toggle-theme">${data.theme === "dark" ? "Тёмная" : "Светлая"} · переключить</button>
      </div>

      <div class="setting-row">
        <div><strong>Акцентный цвет</strong><small>Цвет кнопок и выделений</small></div>
        <input type="color" class="color-input" id="accentColor" value="${esc(data.accent || "#635bdb")}">
      </div>

      <div class="setting-control">
        <label for="themePreset">Готовая палитра</label>
        <select id="themePreset" class="field">
          <option value="">Выбрать палитру…</option>
          <option value="violet">Violet</option>
          <option value="ocean">Ocean</option>
          <option value="forest">Forest</option>
          <option value="sunset">Sunset</option>
          <option value="mono">Graphite</option>
        </select>
      </div>

      <div class="setting-control">
        <label for="styleSelect">Форма элементов</label>
        <select id="styleSelect" class="field">
          <option value="rounded" ${s.style === "rounded" ? "selected" : ""}>Скруглённая</option>
          <option value="sharp" ${s.style === "sharp" ? "selected" : ""}>Угловатая</option>
          <option value="pill" ${s.style === "pill" ? "selected" : ""}>Pill / капсулы</option>
        </select>
      </div>

      <div class="setting-control">
        <label for="densitySelect">Плотность интерфейса</label>
        <select id="densitySelect" class="field">
          <option value="compact" ${s.density === "compact" ? "selected" : ""}>Компактная</option>
          <option value="comfortable" ${s.density === "comfortable" ? "selected" : ""}>Обычная</option>
          <option value="airy" ${s.density === "airy" ? "selected" : ""}>Свободная</option>
        </select>
      </div>

      <div class="setting-control">
        <label for="fontSelect">Размер текста</label>
        <select id="fontSelect" class="field">
          <option value="small" ${s.fontSize === "small" ? "selected" : ""}>Маленький</option>
          <option value="medium" ${s.fontSize === "medium" ? "selected" : ""}>Обычный</option>
          <option value="large" ${s.fontSize === "large" ? "selected" : ""}>Крупный</option>
        </select>
      </div>

      <div class="setting-control">
        <label for="layoutSelect">Колонки Dev Tools</label>
        <select id="layoutSelect" class="field">
          <option value="one" ${s.layout === "one" ? "selected" : ""}>Одна</option>
          <option value="two" ${s.layout === "two" ? "selected" : ""}>Две</option>
          <option value="three" ${s.layout === "three" ? "selected" : ""}>Три</option>
        </select>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Резервная копия</h2></div>
      <p class="muted">Экспортируй задачи, проекты, заметки, события и настройки в JSON. Храни копию отдельно от устройства.</p>
      <div class="inline-buttons">
        <button class="btn primary" data-action="export-data">Экспортировать JSON</button>
        <button class="btn" data-action="import-data">Импортировать JSON</button>
        <input id="importFile" type="file" accept=".json,application/json" class="hidden">
      </div>
      <div class="setting-row"><div><strong>Объём данных</strong><small>Размер текущей базы в памяти</small></div><b>${(size / 1024).toFixed(1)} KB</b></div>
      <div class="setting-row"><div><strong>Сохранение</strong><small>Автосохранение после изменений</small></div><span class="tag">Включено</span></div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Горячие клавиши</h2></div>
      <div class="setting-row"><span>Открыть поиск</span><kbd class="kbd">Ctrl / ⌘ + K</kbd></div>
      <div class="setting-row"><span>Добавить задачу</span><kbd class="kbd">N</kbd></div>
      <div class="setting-row"><span>Перейти на обзор</span><kbd class="kbd">G</kbd></div>
      <p class="muted">Горячие клавиши не срабатывают, когда курсор находится в поле ввода.</p>
    </section>

    <section class="panel danger-zone">
      <div class="panel-head"><h2>Опасная зона</h2></div>
      <p class="muted">Сброс удалит данные FIZEN HUB в этом браузере. Сначала сделай резервную копию.</p>
      <button class="btn danger" data-action="reset-data">Сбросить все данные</button>
    </section>
  </div>`;
}

function modal(title, fields, submit) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = fields;
  $("#modal").showModal();
  $("#modalSave").onclick = e => {
    e.preventDefault();
    if (submit()) {
      $("#modal").close();
      save();
      render();
    }
  };
}

function field(label, name, value = "", type = "text", placeholder = "") {
  return `<div class="modal-field"><label for="f_${name}">${label}</label>
    <input class="field" id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
}

function area(label, name, value = "", placeholder = "") {
  return `<div class="modal-field"><label for="f_${name}">${label}</label>
    <textarea id="f_${name}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;
}

function selectField(label, name, opts, value) {
  return `<div class="modal-field"><label for="f_${name}">${label}</label>
    <select id="f_${name}" name="${name}" class="field">${opts.map(o =>
      `<option value="${esc(o[0])}" ${o[0] === value ? "selected" : ""}>${esc(o[1])}</option>`
    ).join("")}</select></div>`;
}

function val(n) {
  return $(`#f_${n}`).value.trim();
}

function addTask(existing) {
  const t = existing || {
    title:"", description:"", due:"",
    priority:"normal", project:"", done:false
  };

  modal(existing ? "Редактировать задачу" : "Новая задача",
    field("Название","title",t.title,"text","Что нужно сделать?") +
    area("Описание","description",t.description) +
    field("Срок","due",t.due,"date") +
    selectField("Приоритет","priority",[
      ["low","Низкий"],["normal","Обычный"],["high","Важно"]
    ],t.priority) +
    selectField("Проект","project",[
      ["","Без проекта"], ...data.projects.map(p => [p.name,p.name])
    ],t.project),
    () => {
      if (!val("title")) {
        notify("Укажи название задачи");
        return false;
      }
      Object.assign(t,{
        title:val("title"), description:val("description"),
        due:val("due"), priority:val("priority"), project:val("project")
      });
      if (!existing) {
        t.id = uid();
        data.tasks.unshift(t);
      }
      return true;
    }
  );
}

function addProject(p) {
  p = p || {name:"",description:"",status:"В процессе",color:data.accent};
  modal(p.id ? "Изменить проект" : "Новый проект",
    field("Название","name",p.name,"text","Например, FIZEN OS") +
    area("Описание","description",p.description) +
    selectField("Статус","status",[
      ["В процессе","В процессе"],["Запланирован","Запланирован"],
      ["На паузе","На паузе"],["Завершён","Завершён"]
    ],p.status) +
    `<div class="modal-field"><label>Цвет проекта</label><input id="f_color" class="color-input" type="color" value="${esc(p.color || data.accent)}"></div>`,
    () => {
      if (!val("name")) {
        notify("Укажи название проекта");
        return false;
      }
      const old = p.name;
      Object.assign(p,{
        name:val("name"), description:val("description"),
        status:val("status"), color:$("#f_color").value
      });
      if (!p.id) {
        p.id = uid();
        p.created = today();
        data.projects.unshift(p);
      }
      if (old !== p.name) {
        data.tasks.forEach(t => {
          if (t.project === old) t.project = p.name;
        });
      }
      return true;
    }
  );
}

function addNote(n) {
  n = n || {title:"",body:"",tags:""};
  modal(n.id ? "Редактировать заметку" : "Новая заметка",
    field("Заголовок","title",n.title,"text","Название") +
    area("Содержание","body",n.body,"Запиши идею или команду…") +
    field("Теги через запятую","tags",n.tags),
    () => {
      if (!val("title")) {
        notify("Укажи заголовок");
        return false;
      }
      Object.assign(n,{
        title:val("title"), body:$("#f_body").value,
        tags:val("tags"), updated:new Date().toISOString()
      });
      if (!n.id) {
        n.id = uid();
        data.notes.unshift(n);
      }
      return true;
    }
  );
}

function addEvent(e) {
  e = e || {title:"",description:"",date:today(),time:""};
  modal(e.id ? "Изменить событие" : "Новое событие",
    field("Название","title",e.title,"text","Что запланировано?") +
    field("Дата","date",e.date,"date") +
    field("Время","time",e.time,"time") +
    area("Описание","description",e.description),
    () => {
      if (!val("title") || !val("date")) {
        notify("Нужны название и дата");
        return false;
      }
      Object.assign(e,{
        title:val("title"), date:val("date"),
        time:val("time"), description:val("description")
      });
      if (!e.id) {
        e.id = uid();
        data.events.push(e);
      }
      return true;
    }
  );
}
function wirePage() {
  $all("[data-view]").forEach(b => b.onclick = () => go(b.dataset.view));

  $all("[data-action]").forEach(el => {
    const act = el.dataset.action, id = el.dataset.id;
    el.onclick = ev => {
      if (el.type === "checkbox") ev.stopPropagation();
      handle(act, id, el);
    };
  });

  const tf = $("#taskFilter");
  if (tf) tf.oninput = () => {
    searchQuery = tf.value;
    const status = $("#taskStatus")?.value || "all";
    const sort = $("#taskSort")?.value || "due";

    const list = data.tasks.filter(t =>
      (!searchQuery || `${t.title} ${t.description} ${t.project}`.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (status === "all" || (status === "open" && !t.done) || (status === "done" && t.done))
    );

    if (sort === "due") list.sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999"));
    if (sort === "priority") list.sort((a,b) => ({high:0,normal:1,low:2}[a.priority] - {high:0,normal:1,low:2}[b.priority]));
    if (sort === "new") list.reverse();

    $("#taskList").innerHTML = list.map(taskRow).join("") || empty("Задач не найдено");
    wirePage();
  };

  if (tf) {
    ["taskStatus","taskSort"].forEach(id => {
      $("#" + id).onchange = () => tf.oninput();
    });
  }

  const nf = $("#noteFilter");
  if (nf) nf.oninput = () => {
    searchQuery = nf.value;
    render();
    $("#noteFilter")?.focus();
  };

  const ac = $("#accentColor");
  if (ac) ac.oninput = () => {
    data.accent = ac.value;
    save();
    applyTheme();
  };

  const bindSetting = (id, key) => {
    const el = $("#" + id);
    if (!el) return;
    el.onchange = () => {
      data.settings = data.settings || {};
      data.settings[key] = el.value;
      save();
      applyTheme();
      notify("Настройки интерфейса сохранены");
    };
  };

  bindSetting("styleSelect","style");
  bindSetting("densitySelect","density");
  bindSetting("fontSelect","fontSize");
  bindSetting("layoutSelect","layout");

  const preset = $("#themePreset");
  if (preset) preset.onchange = () => {
    const palettes = {
      violet:"#635bdb",
      ocean:"#087ea4",
      forest:"#21865b",
      sunset:"#d65b45",
      mono:"#596273"
    };
    if (palettes[preset.value]) {
      data.accent = palettes[preset.value];
      save();
      render();
    }
  };
}

function handle(a, id, el) {
  const t = data.tasks.find(x => x.id === id);
  const p = data.projects.find(x => x.id === id);
  const n = data.notes.find(x => x.id === id);
  const e = data.events.find(x => x.id === id);

  switch (a) {
    case "add-task": addTask(); break;
    case "edit-task": if (t) addTask(t); break;
    case "delete-task":
if(t && confirm(`Удалить задачу «${t.title}»?`)){
data.tasks=data.tasks.filter(x=>x.id!==id);
save();
render();
notify("Задача удалена");
}
break;

    case "toggle-task":
      if (t) {
        t.done = el.checked;
        save();
        render();
      }
      break;

    case "add-project": addProject(); break;
    case "edit-project": if (p) addProject(p); break;

    case "delete-project":
      if (p && confirm(`Удалить проект «${p.name}»? Задачи останутся, но отвяжутся от проекта.`)) {
        data.tasks.forEach(t => {
          if (t.project === p.name) t.project = "";
        });
        data.projects = data.projects.filter(x => x.id !== id);
        save();
        render();
      }
      break;

    case "project-tasks":
      if (p) {
        go("tasks");
        searchQuery = p.name;
        render();
        $("#taskFilter").value = p.name;
        $("#taskFilter").oninput();
      }
      break;

    case "add-note": addNote(); break;
    case "edit-note": if (n) addNote(n); break;

    case "delete-note":
      if (n && confirm("Удалить заметку?")) {
        data.notes = data.notes.filter(x => x.id !== id);
        save();
        render();
      }
      break;

    case "add-event": addEvent(); break;
    case "edit-event": if (e) addEvent(e); break;

    case "delete-event":
      if (e && confirm("Удалить событие?")) {
        data.events = data.events.filter(x => x.id !== id);
        save();
        render();
      }
      break;

    case "toggle-theme":
      data.theme = data.theme === "dark" ? "light" : "dark";
      save();
      render();
      break;

    case "export-data": exportData(); break;
    case "import-data": $("#importFile").click(); break;

    case "reset-data":
      if (confirm("ТОЧНО удалить все данные FIZEN HUB из этого браузера? Сначала экспортируй копию.")) {
        localStorage.removeItem(KEY);
        data = defaultData();
        save();
        render();
        notify("Данные сброшены");
      }
      break;

    case "format-json":
    case "minify-json": jsonTool(a); break;
    case "copy-json": copyText($("#jsonOutput").textContent); break;
    case "convert-base": baseTool(); break;
    case "make-password": passwordTool(); break;
    case "copy-pass": copyText($("#passOutput").textContent); break;
    case "convert-color": colorTool(); break;

    case "current-time":
      $("#timeOutput").textContent =
        `${Math.floor(Date.now()/1000)} seconds\n${Date.now()} milliseconds\n${new Date().toISOString()}`;
      break;

    case "convert-time": timeTool(); break;
    case "copy-scratch": copyText($("#codeScratch").value); break;
    case "download-scratch": download($("#codeScratch").value || "", "fizen-code.txt", "text/plain"); break;
  }
}

function go(v) {
  view = v;
  searchQuery = "";
  $all(".nav-item").forEach(x => x.classList.toggle("active", x.dataset.view === v));
  $("#sidebar").classList.remove("open");
  render();
}

function exportData() {
  const blob = new Blob([
    JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)
  ], {type:"application/json"});
  downloadBlob(blob,`fizen-hub-backup-${today()}.json`);
  notify("Резервная копия подготовлена");
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function download(text, name, type) {
  downloadBlob(new Blob([text],{type}),name);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify("Скопировано");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    notify("Скопировано");
  }
}

function jsonTool(a) {
  try {
    const o = JSON.parse($("#jsonInput").value);
    $("#jsonOutput").textContent = JSON.stringify(o,null,a === "format-json" ? 2 : 0);
  } catch (e) {
    $("#jsonOutput").textContent = "Ошибка JSON: " + e.message;
  }
}

function baseTool() {
  const v = $("#baseInput").value.trim();
  const from = Number($("#baseFrom").value);
  try {
    const n = parseInt(v,from);
    if (!v || !Number.isSafeInteger(n) || n < 0 ||
        n.toString(from) !== v.toLowerCase().replace(/^0+(?=.)/,"")) {
      throw Error("Некорректное число");
    }
    $("#baseOutput").textContent =
      `DEC: ${n}\nHEX: ${n.toString(16).toUpperCase()}\nBIN: ${n.toString(2)}\nOCT: ${n.toString(8)}`;
  } catch (e) {
    $("#baseOutput").textContent = "Ошибка: введи корректное целое неотрицательное число.";
  }
}

function passwordTool() {
  const len = Math.max(8,Math.min(128,Number($("#passLength").value) || 20));
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789" +
    ($("#passSymbols").checked ? "!@#$%^&*()-_=+[]{}?" : "");
  const arr = new Uint32Array(len);

  if (window.crypto?.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.random() * 100000;

  $("#passOutput").textContent = Array.from(arr,x => chars[x % chars.length]).join("");
}

function colorTool() {
  let h = $("#colorInput").value.trim();

  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
    $("#colorOutput").textContent = "Ошибка: используй #RGB или #RRGGBB";
    return;
  }

  if (h.length === 4) h = "#" + h.slice(1).split("").map(c => c + c).join("");

  const nums = [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  $("#colorPreview").style.background = h;
  $("#colorOutput").textContent = `HEX: ${h.toUpperCase()}\nRGB: ${nums.join(", ")}\nCSS: rgb(${nums.join(", ")})`;
}

function timeTool() {
  const v = $("#timestampInput").value.trim();
  let d;

  if (!v) {
    $("#timeOutput").textContent = "Введи Unix timestamp или дату ISO";
    return;
  }

  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    d = new Date(Math.abs(n) < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(v);
  }

  $("#timeOutput").textContent = isNaN(d)
    ? "Не удалось распознать дату"
    : `${d.toISOString()}\nЛокально: ${d.toLocaleString("ru-RU")}\nUnix: ${Math.floor(d.getTime()/1000)}`;
}

$("#nav").addEventListener("click", e => {
  const b = e.target.closest("[data-view]");
  if (b) go(b.dataset.view);
});

$("#globalSearch").addEventListener("input", e => {
  searchQuery = e.target.value;
  if (!searchQuery) return;

  const q = searchQuery.toLowerCase();

  if (data.notes.some(n => `${n.title} ${n.body} ${n.tags}`.toLowerCase().includes(q))) view = "notes";
  else if (data.tasks.some(t => `${t.title} ${t.description} ${t.project}`.toLowerCase().includes(q))) view = "tasks";
  else if (data.projects.some(p => `${p.name} ${p.description}`.toLowerCase().includes(q))) view = "projects";
  else view = "notes";

  $all(".nav-item").forEach(x => x.classList.toggle("active", x.dataset.view === view));
  render();
  $("#globalSearch").value = searchQuery;

  const f = view === "notes" ? "#noteFilter" : view === "tasks" ? "#taskFilter" : null;
  if (f) {
    $(f).value = searchQuery;
    $(f).dispatchEvent(new Event("input"));
  }
});

$("#globalSearch").addEventListener("keydown", e => {
  if (e.key === "Escape") {
    e.target.value = "";
    searchQuery = "";
    go("dashboard");
  }
});

$("#themeBtn").onclick = () => {
  data.theme = data.theme === "dark" ? "light" : "dark";
  save();
  render();
};

$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");

$("#importFile").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;

  try {
    const obj = JSON.parse(await f.text());
    if (!obj || obj.version !== 1 ||
        !Array.isArray(obj.tasks) || !Array.isArray(obj.projects) ||
        !Array.isArray(obj.notes) || !Array.isArray(obj.events)) {
      throw Error("Неизвестный формат резервной копии");
    }

    if (!confirm("Импорт заменит текущие данные. Продолжить?")) return;

    const defaults = defaultData();
    data = {
      ...defaults,
      ...obj,
      settings: {...defaults.settings, ...(obj.settings || {})}
    };

    save();
    render();
    notify("Данные импортированы");
  } catch (err) {
    notify("Импорт не удался: " + err.message);
  } finally {
    e.target.value = "";
  }
});

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("#globalSearch").focus();
  }

  if (e.key === "Escape") $("#sidebar").classList.remove("open");

  if (!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName) &&
      !e.ctrlKey && !e.metaKey) {
    if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      addTask();
    }
    if (e.key.toLowerCase() === "g") go("dashboard");
  }
});

render();
})();