
const DB_NAME='APP_PROJECT_DB_V2'; const STORE='store';
let db=null;
let appData={
  activeProjectIndex:0,
  cloudUrl:"",
  apiKey:"",
  zoom:100,
  dark:false,
  projects:[{name:"Project Utama",items:[
    {label:"Github",type:"url",value:"https://github.com"},
    {label:"Catatan Kode",type:"code",value:"function hello(){\n  console.log('hi');\n}"}
  ]}]
};
let currentEditId=null, isOnTop=false, isGlobalOnTop=false;
let drag={on:false, x:0, y:0};

function openDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=e=>{
      if(!e.target.result.objectStoreNames.contains(STORE)){
        e.target.result.createObjectStore(STORE,{keyPath:'id'});
      }
    };
    r.onsuccess=e=>{db=e.target.result; res(db);};
    r.onerror=e=>rej(e.target.error);
  });
}
async function saveIDB(){
  if(!db) await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put({id:'main',data:appData,ts:Date.now()});
    tx.oncomplete=()=>res();
    tx.onerror=()=>rej();
  });
}
async function loadIDB(){
  if(!db) await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get('main');
    req.onsuccess=()=>res(req.result?req.result.data:null);
    req.onerror=()=>rej();
  });
}
function esc(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

async function init(){
  try{
    const legacy=localStorage.getItem('APP_PROJECT_DATA');
    const idb=await loadIDB().catch(()=>null);
    if(idb) appData=idb;
    else if(legacy){ try{ appData=JSON.parse(legacy); }catch(e){} }
  }catch(e){}
  sanitize();
  renderAll();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}
function sanitize(){
  if(!appData.projects || !Array.isArray(appData.projects) || !appData.projects.length){
    appData.projects=[{name:"Project Utama",items:[]}];
  }
  if(appData.activeProjectIndex>=appData.projects.length) appData.activeProjectIndex=0;
  appData.projects.forEach(p=>{ if(!Array.isArray(p.items)) p.items=[]; });
  if(!appData.zoom) appData.zoom=100;
  const cu=document.getElementById('cloudUrl'); if(cu) cu.value=appData.cloudUrl||"";
  const ak=document.getElementById('apiKey'); if(ak) ak.value=appData.apiKey||"";
  const zr=document.getElementById('zoomRange'); if(zr) zr.value=appData.zoom;
  const zv=document.getElementById('zoomVal'); if(zv) zv.textContent=appData.zoom+'%';
  setZoom(appData.zoom,false);
  if(appData.dark){
    document.body.classList.add('dark');
    const dbtn=document.getElementById('darkBtn'); if(dbtn) dbtn.textContent='☀️';
  }
}
async function save(){
  sanitize();
  await saveIDB();
  localStorage.setItem('APP_PROJECT_DATA',JSON.stringify(appData));
  renderStats();
}
function renderAll(){ renderDropdown(); loadProject(); renderStats(); }
function renderStats(){
  const p=appData.projects.length;
  const active=appData.projects[appData.activeProjectIndex];
  const totalItems=appData.projects.reduce((s,x)=>s+x.items.length,0);
  const elA=document.getElementById('sActive'); if(elA) elA.textContent=active?(active.name.slice(0,12)): '-';
  const elP=document.getElementById('sTotalP'); if(elP) elP.textContent=p;
  const elI=document.getElementById('sTotalI'); if(elI) elI.textContent=totalItems;
  const elC=document.getElementById('compCount'); if(elC) elC.textContent=active?active.items.length:0;
  const elT=document.getElementById('sTime'); if(elT) elT.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function renderDropdown(){
  const sel=document.getElementById('projectSelect'); if(!sel) return;
  sel.innerHTML='';
  appData.projects.forEach((pr,i)=>{
    const o=document.createElement('option');
    o.value=i; o.textContent=pr.name||('Project '+(i+1));
    if(i===appData.activeProjectIndex) o.selected=true;
    sel.appendChild(o);
  });
}
function loadProject(){
  const pr=appData.projects[appData.activeProjectIndex]; if(!pr) return;
  const pn=document.getElementById('projectName'); if(pn) pn.value=pr.name||'';
  const c=document.getElementById('dynamicItemsContainer'); if(!c) return;
  c.innerHTML='';
  pr.items.forEach((it,idx)=>{
    const row=document.createElement('div'); row.className='item-row';
    const isText=['text','code','json','note'].includes(it.type);
    row.innerHTML=
      '<div class="item-top">'+
        '<div class="item-move">'+
          '<button class="move-btn" onclick="moveItem('+idx+',-1)" title="Naik">▲</button>'+
          '<button class="move-btn" onclick="moveItem('+idx+',1)" title="Turun">▼</button>'+
        '</div>'+
        '<input type="text" value="'+esc(it.label)+'" class="input input-xs" placeholder="Label" oninput="updLabel('+idx+',this.value)">'+
        '<select class="input input-xs" onchange="updType('+idx+',this.value)">'+
          '<option value="url" '+(it.type==='url'?'selected':'')+'>URL</option>'+
          '<option value="folder" '+(it.type==='folder'?'selected':'')+'>Folder</option>'+
          '<option value="text" '+(it.type==='text'?'selected':'')+'>Teks</option>'+
          '<option value="code" '+(it.type==='code'?'selected':'')+'>Code</option>'+
          '<option value="json" '+(it.type==='json'?'selected':'')+'>JSON</option>'+
          '<option value="note" '+(it.type==='note'?'selected':'')+'>Note</option>'+
        '</select>'+
        '<button class="btn btn-danger btn-xs" onclick="delItem('+idx+')">🗑️</button>'+
      '</div>'+
      '<div class="item-bottom">'+
        '<input type="'+(it.type==='url'?'url':'text')+'" value="'+esc(it.value)+'" class="input val" placeholder="'+(isText?'Klik Popup...':'Path / Value')+'" oninput="updVal('+idx+',this.value)" '+(isText?'readonly onclick="openPopup('+idx+')"':'')+'>'+
        '<div class="item-actions">'+
          (it.type==='url'?'<button class="btn btn-info btn-xs" onclick="openItem('+idx+')">Buka</button>':'')+
          '<button class="btn btn-secondary btn-xs" onclick="copyItem('+idx+')">Salin</button>'+
          (isText?'<button class="btn btn-primary btn-xs" onclick="openPopup('+idx+')">⧉ Popup</button>':'')+
        '</div>'+
      '</div>';
    c.appendChild(row);
  });
}
async function updateProjectName(){ appData.projects[appData.activeProjectIndex].name=document.getElementById('projectName').value; await save(); renderDropdown(); }
async function switchProject(){ appData.activeProjectIndex=parseInt(document.getElementById('projectSelect').value)||0; await save(); loadProject(); }
async function createNewProject(){ appData.projects.push({name:"Project Baru "+(appData.projects.length+1),items:[]}); appData.activeProjectIndex=appData.projects.length-1; await save(); renderAll(); }
async function deleteCurrentProject(){ if(appData.projects.length<=1){alert("Minimal 1 project");return;} if(confirm("Hapus project ini?")){ appData.projects.splice(appData.activeProjectIndex,1); appData.activeProjectIndex=0; await save(); renderAll(); } }
async function addDynamicItem(){ appData.projects[appData.activeProjectIndex].items.push({label:"Komponen Baru",type:"url",value:""}); await save(); loadProject(); }
async function delItem(i){ appData.projects[appData.activeProjectIndex].items.splice(i,1); await save(); loadProject(); }
async function moveItem(i,dir){
  const arr=appData.projects[appData.activeProjectIndex].items;
  const ni=i+dir; if(ni<0||ni>=arr.length) return;
  const tmp=arr[i]; arr[i]=arr[ni]; arr[ni]=tmp;
  await save(); loadProject();
}
async function updLabel(i,v){ appData.projects[appData.activeProjectIndex].items[i].label=v; await save(); }
async function updVal(i,v){ appData.projects[appData.activeProjectIndex].items[i].value=v; await save(); }
async function updType(i,t){ appData.projects[appData.activeProjectIndex].items[i].type=t; await save(); loadProject(); }
function openItem(i){
  let it=appData.projects[appData.activeProjectIndex].items[i];
  let u=(it.value||'').trim(); if(!u) return;
  if(!u.startsWith('http')) u='https://'+u;
  window.open(u,'_blank');
}
function copyItem(i){
  const v=appData.projects[appData.activeProjectIndex].items[i].value||'';
  navigator.clipboard.writeText(v).then(()=>{ alert("Disalin: "+v.slice(0,80)); });
}
function executeAllUrlsDelayed(){
  const urls=appData.projects[appData.activeProjectIndex].items.filter(x=>x.type==='url' && (x.value||'').trim());
  if(!urls.length){ alert("Tidak ada URL"); return; }
  const btn=document.getElementById('openAllBtn'); const info=document.getElementById('delayInfo');
  if(btn) btn.disabled=true;
  let idx=0;
  const interval=setInterval(()=>{
    if(idx>=urls.length){
      clearInterval(interval);
      if(btn){ btn.disabled=false; btn.textContent='🚀 Buka Semua (Delay)'; }
      if(info) info.textContent='Selesai '+urls.length+' URL';
      setTimeout(()=>{ if(info) info.textContent=''; },2500);
      return;
    }
    let u=(urls[idx].value||'').trim(); if(!u.startsWith('http')) u='https://'+u;
    window.open(u,'_blank');
    if(btn) btn.textContent='Buka '+(idx+1)+'/'+urls.length+'...';
    if(info) info.textContent='Membuka '+(idx+1)+'/'+urls.length+' delay 1.2s';
    idx++;
  },1200);
}
function switchTab(n){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('tab'+n); if(t) t.classList.add('active');
  const p=document.getElementById('page'+n); if(p) p.classList.add('active');
}
function saveCloudUrlData(){ const el=document.getElementById('cloudUrl'); appData.cloudUrl=el?el.value.trim():''; save(); }
function saveApiKey(){ const el=document.getElementById('apiKey'); appData.apiKey=el?el.value.trim():''; save(); }
function syncToCloud(){
  const u=appData.cloudUrl; if(!u){ alert("Isi URL Cloud dulu"); return; }
  fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(appData)})
  .then(()=>alert("Backup Cloud dikirim")).catch(e=>alert(e.message));
}
function exportJSON(){
  const b=new Blob([JSON.stringify(appData,null,2)],{type:'application/json'});
  dl(b,'APP_'+Date.now()+'.json');
}
function exportCSV(){
  let rows=[];
  appData.projects.forEach(p=>{
    p.items.forEach(it=>{
      rows.push([p.name.replace(/"/g,'""'), it.label.replace(/"/g,'""'), it.type, it.value.replace(/"/g,'""')].map(x=>'"'+x+'"').join(','));
    });
  });
  const csv=['"project_name","label","type","value"',...rows].join('\n');
  const b=new Blob([csv],{type:'text/csv'});
  dl(b,'APP_'+Date.now()+'.csv');
}
function exportPNG(){
  const c=document.createElement('canvas'); c.width=1200;
  const total=appData.projects.reduce((s,p)=>s+p.items.length,0)+10;
  c.height=Math.max(500,total*28+120);
  const ctx=c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#2563eb'; ctx.fillRect(0,0,c.width,60);
  ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.fillText('APP PROJECT BACKUP',20,38);
  let y=90; ctx.fillStyle='#000'; ctx.font='12px monospace';
  appData.projects.forEach((p,i)=>{
    ctx.fillText('['+(i+1)+'] '+p.name,20,y); y+=20;
    p.items.forEach(it=>{
      ctx.fillText(' - '+it.label+' ('+it.type+'): '+(it.value||'').slice(0,90),40,y); y+=18;
    }); y+=8;
  });
  c.toBlob(blob=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const pngBuf=reader.result;
      const jsonStr=JSON.stringify(appData);
      const marker=new TextEncoder().encode("||BACKUP_JSON||"+jsonStr);
      const comb=new Uint8Array(pngBuf.byteLength+marker.byteLength);
      comb.set(new Uint8Array(pngBuf),0);
      comb.set(marker,pngBuf.byteLength);
      dl(new Blob([comb],{type:'image/png'}),'APP_'+Date.now()+'.png');
    };
    reader.readAsArrayBuffer(blob);
  });
}
function dl(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
}
function importJSON(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d.projects) throw 'invalid';
      appData=d; save(); renderAll(); alert("Restore JSON OK");
    }catch(err){ alert("JSON invalid"); }
  };
  r.readAsText(f);
}
function importCSV(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const lines=ev.target.result.split('\n').filter(l=>l.trim());
      lines.shift();
      const map={};
      lines.forEach(line=>{
        let cols=[]; let cur=''; let inQ=false;
        for(let ch of line){
          if(ch==='"'){ inQ=!inQ; cur+=ch; }
          else if(ch===',' && !inQ){ cols.push(cur); cur=''; }
          else cur+=ch;
        }
        cols.push(cur);
        const clean=s=>s.replace(/^"|"$/g,'').replace(/""/g,'"');
        const pn=clean(cols[0]||''), lb=clean(cols[1]||''), tp=clean(cols[2]||'url'), val=clean(cols[3]||'');
        if(!map[pn]) map[pn]={name:pn,items:[]};
        map[pn].items.push({label:lb,type:tp,value:val});
      });
      appData.projects=Object.values(map);
      appData.activeProjectIndex=0;
      save(); renderAll(); alert("Restore CSV OK");
    }catch(err){ alert("CSV fail "+err); }
  };
  r.readAsText(f);
}
function importPNG(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const txt=new TextDecoder().decode(new Uint8Array(ev.target.result));
      const idx=txt.indexOf("||BACKUP_JSON||");
      if(idx===-1){ alert("PNG bukan hasil Export PNG app ini"); return; }
      const js=txt.slice(idx+15);
      appData=JSON.parse(js);
      save(); renderAll(); alert("Restore PNG OK");
    }catch(err){ alert("PNG fail"); }
  };
  r.readAsArrayBuffer(f);
}
function resetAll(){
  if(confirm("Hapus semua data IndexedDB?")){
    indexedDB.deleteDatabase(DB_NAME);
    localStorage.removeItem('APP_PROJECT_DATA');
    location.reload();
  }
}
function clearCache(){
  if('caches' in window){
    caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>alert("Cache cleared"));
  }
}
function openPopup(idx){
  currentEditId=idx;
  const it=appData.projects[appData.activeProjectIndex].items[idx];
  document.getElementById('popupTitle').textContent=it.label||'Editor';
  document.getElementById('popupLabel').value=it.label;
  document.getElementById('popupType').value=it.type;
  document.getElementById('popupValue').value=it.value;
  document.getElementById('popupChar').textContent=(it.value||'').length+' char';
  document.getElementById('popupOverlay').classList.remove('hidden');
  document.getElementById('fabOnTop').classList.remove('hidden');
}
function closePopup(){
  document.getElementById('popupOverlay').classList.add('hidden');
  document.getElementById('fabOnTop').classList.add('hidden');
  currentEditId=null;
}
function copyPopup(){
  const v=document.getElementById('popupValue').value;
  navigator.clipboard.writeText(v).then(()=>alert("Copied "+v.length+" char"));
}
async function savePopup(){
  if(currentEditId===null) return;
  const it=appData.projects[appData.activeProjectIndex].items[currentEditId];
  it.label=document.getElementById('popupLabel').value;
  it.type=document.getElementById('popupType').value;
  it.value=document.getElementById('popupValue').value;
  await save(); loadProject(); closePopup();
}
function toggleOnTop(){
  const box=document.getElementById('popupBox');
  isOnTop=!isOnTop;
  if(isOnTop){
    box.classList.add('on-top','pinned');
    document.getElementById('onTopBtn').textContent='📌 ON';
    document.getElementById('fabOnTop').classList.add('on');
  }else{
    box.classList.remove('on-top','pinned');
    document.getElementById('onTopBtn').textContent='📌 Pin';
    document.getElementById('fabOnTop').classList.remove('on');
  }
}
function toggleGlobalOnTop(){
  const tb=document.querySelector('.topbar');
  isGlobalOnTop=!isGlobalOnTop;
  if(isGlobalOnTop){
    tb.classList.add('on-top');
    document.getElementById('globalOnTopBtn').textContent='📌 On Top ON';
  }else{
    tb.classList.remove('on-top');
    document.getElementById('globalOnTopBtn').textContent='📌 On Top';
  }
}
function toggleDark(){
  appData.dark=!appData.dark;
  document.body.classList.toggle('dark',appData.dark);
  document.getElementById('darkBtn').textContent=appData.dark?'☀️':'🌙';
  save();
}
function setZoom(val,saveFlag=true){
  const pct=parseInt(val);
  const el=document.getElementById('zoomVal'); if(el) el.textContent=pct+'%';
  const shell=document.getElementById('shell'); if(shell) shell.style.zoom=pct+'%';
  if(saveFlag){ appData.zoom=pct; save(); }
}
(function(){
  const head=document.getElementById('popupDrag');
  const box=document.getElementById('popupBox');
  if(!head||!box) return;
  head.addEventListener('mousedown',e=>{
    drag.on=true; drag.x=e.clientX-box.offsetLeft; drag.y=e.clientY-box.offsetTop;
  });
  window.addEventListener('mousemove',e=>{
    if(!drag.on) return;
    box.style.left=(e.clientX-drag.x)+'px';
    box.style.top=(e.clientY-drag.y)+'px';
    box.style.transform='none';
    box.style.position='fixed';
  });
  window.addEventListener('mouseup',()=>drag.on=false);
})();
document.addEventListener('DOMContentLoaded',init);


function executeAllUrlsDelayed(){
  const urls=appData.projects[appData.activeProjectIndex].items.filter(x=>x.type==='url' && (x.value||'').trim());
  if(!urls.length){ alert("Tidak ada URL"); return; }
  const all=urls.map(u=>{let v=(u.value||'').trim(); if(!v.startsWith('http')) v='https://'+v; return v;}).join('\n');
  navigator.clipboard.writeText(all).then(()=>{
    alert("✅ "+urls.length+" URL disalin ke clipboard!\n\nPaste di browser / buka 1-1 biar gak keblok popup blocker.\n\n"+all.slice(0,300));
  });
  // Optional: buka 1 tab pertama saja sebagai contoh (ini pasti jalan karena langsung dari klik)
  if(urls.length>0){
    let u=(urls[0].value||'').trim(); if(!u.startsWith('http')) u='https://'+u;
    // window.open(u,'_blank'); // Uncomment kalau mau buka 1 pertama saja
  }
}
