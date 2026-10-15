/*
 * Task Desk frontend.
 * 1) Deploy google-apps-script/Code.gs as a Web App.
 * 2) Paste its /exec URL below.
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZVHdSx9QFqXyn56EufV36vFP3JsO6kQ-_RjvsVrBEhioXIu77Qre6Bak1Ljtl7Rg/exec";
let tasks = [];
let toastTimer;
const $ = id => document.getElementById(id);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
function setConnection(state, message) {
  $('connection').className = `connection ${state}`;
  $('connection').textContent = message;
}
function jsonp(params) {
  return new Promise((resolve, reject) => {
    if (!SCRIPT_URL.startsWith('https://script.google.com/')) {
      reject(new Error('Add your Google Apps Script Web App URL in app.js first.')); return;
    }
    const callback = `taskDeskCallback_${Date.now()}_${Math.floor(Math.random()*100000)}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('Connection timed out. Check the Web App deployment and URL.')), 15000);
    function finish(error, data) {
      clearTimeout(timeout); delete window[callback]; script.remove();
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('Could not reach Google Apps Script. Check the URL and deployment access.'));
    script.src = `${SCRIPT_URL}?${new URLSearchParams({...params, callback})}`;
    document.body.appendChild(script);
  });
}
function postAction(action, payload={}) {
  return new Promise((resolve, reject) => {
    if (!SCRIPT_URL.startsWith('https://script.google.com/')) {
      reject(new Error('Add your Google Apps Script Web App URL in app.js first.')); return;
    }
    const form = document.createElement('form');
    form.method = 'POST'; form.action = SCRIPT_URL; form.target = 'postTarget'; form.style.display = 'none';
    const add = (name, value) => { const input = document.createElement('input'); input.name=name; input.value=value; form.appendChild(input); };
    add('action', action); add('payload', JSON.stringify(payload));
    document.body.appendChild(form);
    let settled = false;
    const done = () => { if (settled) return; settled=true; form.remove(); resolve(); };
    $('postTarget').onload = () => { if (form.isConnected) setTimeout(done, 500); };
    form.submit();
    setTimeout(done, 1800);
  });
}
async function loadTasks() {
  setConnection('', 'Connecting…');
  try {
    const result = await jsonp({action:'list'});
    if (!result || !result.ok) throw new Error(result?.error || 'Could not load tasks.');
    tasks = Array.isArray(result.tasks) ? result.tasks : [];
    setConnection('ok', 'Google Sheets connected');
    render();
  } catch (error) {
    setConnection('error', 'Not connected');
    $('taskList').innerHTML = `<div class="empty">${escapeHTML(error.message)}<br><br>Paste the deployed Web App URL into <b>app.js</b>, then refresh.</div>`;
    ['totalCount','pendingCount','completedCount','overdueCount'].forEach(id => $(id).textContent='—');
  }
}
function isOverdue(task) { return task.status !== 'Completed' && task.dueDate && task.dueDate < todayISO(); }
function render() {
  const pending=tasks.filter(t=>t.status!=='Completed'), completed=tasks.filter(t=>t.status==='Completed');
  $('totalCount').textContent=tasks.length; $('pendingCount').textContent=pending.length;
  $('completedCount').textContent=completed.length; $('overdueCount').textContent=pending.filter(isOverdue).length;
  $('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const filter=$('filterSelect').value;
  const shown=tasks.filter(t=>filter==='all'||(filter==='pending'&&t.status!=='Completed')||(filter==='completed'&&t.status==='Completed')||(filter==='overdue'&&isOverdue(t)));
  shown.sort((a,b)=> {
    if(a.status!==b.status) return a.status==='Completed'?1:-1;
    if(!a.dueDate) return 1; if(!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate);
  });
  if(!shown.length) { $('taskList').innerHTML='<div class="empty">No tasks here yet.<br>Add a task using the form.</div>'; return; }
  $('taskList').innerHTML=shown.map(t=>{
    const done=t.status==='Completed', overdue=isOverdue(t);
    const due=t.dueDate?new Date(`${t.dueDate}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'No due date';
    const priority=String(t.priority||'Medium').toLowerCase();
    return `<article class="task-item">
      <button class="check ${done?'done':''}" aria-label="${done?'Mark pending':'Mark complete'}" data-action="toggle" data-id="${escapeHTML(t.id)}">${done?'✓':''}</button>
      <div class="task-main"><div class="task-title ${done?'done':''}">${escapeHTML(t.title)}</div>
      ${t.notes?`<div class="task-notes">${escapeHTML(t.notes)}</div>`:''}
      <div class="task-meta"><span class="pill ${priority}">${escapeHTML(t.priority||'Medium')} priority</span><span class="pill ${overdue?'overdue':done?'complete':''}">${overdue?'Overdue':done?'Completed':escapeHTML(due)}</span></div></div>
      <div class="task-actions"><button class="icon-btn" data-action="edit" data-id="${escapeHTML(t.id)}" title="Edit task">Edit</button><button class="icon-btn" data-action="delete" data-id="${escapeHTML(t.id)}" title="Delete task">Delete</button></div>
    </article>`;
  }).join('');
}
function resetForm() {
  $('taskForm').reset(); $('taskId').value=''; $('formHeading').textContent='Add a task';
  $('saveBtn').textContent='Add task'; $('cancelBtn').classList.add('hidden');
}
$('taskForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const id=$('taskId').value;
  const task={id:id||`t_${Date.now()}`,title:$('title').value.trim(),dueDate:$('dueDate').value,priority:$('priority').value,status:id?(tasks.find(t=>t.id===id)?.status||'Pending'):'Pending',notes:$('notes').value.trim()};
  if(!task.title) return;
  $('saveBtn').disabled=true; $('saveBtn').textContent='Saving…';
  try {
    await postAction(id?'update':'add',task);
    notify('Task saved. Refreshing list…'); resetForm(); await new Promise(r=>setTimeout(r,900)); await loadTasks();
  } catch(err) { notify(err.message); }
  finally { $('saveBtn').disabled=false; $('saveBtn').textContent=$('taskId').value?'Save changes':'Add task'; }
});
$('cancelBtn').addEventListener('click',resetForm);
$('refreshBtn').addEventListener('click',loadTasks);
$('filterSelect').addEventListener('change',render);
$('taskList').addEventListener('click',async e=>{
  const btn=e.target.closest('button[data-action]'); if(!btn) return;
  const task=tasks.find(t=>t.id===btn.dataset.id); if(!task) return;
  const action=btn.dataset.action;
  if(action==='edit') {
    $('taskId').value=task.id; $('title').value=task.title; $('dueDate').value=task.dueDate||'';
    $('priority').value=task.priority||'Medium'; $('notes').value=task.notes||'';
    $('formHeading').textContent='Edit task'; $('saveBtn').textContent='Save changes'; $('cancelBtn').classList.remove('hidden');
    $('title').focus(); window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  } else if(action==='delete') {
    if(!confirm(`Delete "${task.title}"?`)) return;
    btn.disabled=true;
    try { await postAction('delete',{id:task.id}); notify('Task deleted.'); await new Promise(r=>setTimeout(r,800)); await loadTasks(); }
    catch(err){notify(err.message);}
  } else if(action==='toggle') {
    btn.disabled=true;
    try { await postAction('update',{...task,status:task.status==='Completed'?'Pending':'Completed'}); await new Promise(r=>setTimeout(r,800)); await loadTasks(); }
    catch(err){notify(err.message);}
  }
});
loadTasks();
