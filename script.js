// NEXA V53 — authentication layer
window.NEXA_AUTH = { authenticated:false, user:null, mode:'login' };
const AUTH_KEYS = ['nexa','nexaStore','nexaCart','nexaGoals','nexaAccount','nexaDocuments','nexaPurchases'];
function localWorkspaceSnapshot(){
  return { products:d.products||[], orders:d.orders||[], expenses:d.expenses||[], clients:d.clients||[], purchases:JSON.parse(localStorage.getItem('nexaPurchases')||'[]'), documents:JSON.parse(localStorage.getItem('nexaDocuments')||'[]'), store:JSON.parse(localStorage.getItem('nexaStore')||'{}'), goals:JSON.parse(localStorage.getItem('nexaGoals')||'{}'), account:JSON.parse(localStorage.getItem('nexaAccount')||'{}') };
}
function hasLocalActivity(w){ return (w.products?.length||0)+(w.orders?.length||0)+(w.expenses?.length||0)+(w.clients?.length||0)+(w.purchases?.length||0)+(w.documents?.length||0)>0 || !!w.account?.businessName; }
function isDirectFilePreview(){ return window.location.protocol==='file:'; }
function demoUsers(){ try{return JSON.parse(localStorage.getItem('nexaDemoUsers')||'[]')}catch{return []} }
function saveDemoUsers(users){ localStorage.setItem('nexaDemoUsers',JSON.stringify(users)); }
async function demoAPI(path, options={}){
  const method=(options.method||'GET').toUpperCase();
  const body=options.body?JSON.parse(options.body):{};
  const users=demoUsers();
  let current=null; try{ current=JSON.parse(sessionStorage.getItem('nexaDemoSession')||'null'); }catch{}
  if(path==='/auth/me' && method==='GET') return {authenticated:!!current,user:current};
  if(path==='/auth/register' && method==='POST'){
    const email=String(body.email||'').trim().toLowerCase();
    if(!email.includes('@')) throw new Error('Adresse email invalide.');
    if(String(body.password||'').length<8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    if(users.some(u=>u.email===email)) throw new Error('Un compte existe déjà avec cet email.');
    const user={id:'demo-'+Date.now(),email,createdAt:new Date().toISOString()}; users.push(user); saveDemoUsers(users); sessionStorage.setItem('nexaDemoSession',JSON.stringify(user)); return {ok:true,user};
  }
  if(path==='/auth/login' && method==='POST'){
    const email=String(body.email||'').trim().toLowerCase();
    if(String(body.password||'').length<8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    const user=users.find(u=>u.email===email); if(!user) throw new Error('Compte introuvable dans le mode aperçu. Crée d’abord un compte.');
    sessionStorage.setItem('nexaDemoSession',JSON.stringify(user)); return {ok:true,user};
  }
  if(path==='/auth/logout' && method==='POST'){ sessionStorage.removeItem('nexaDemoSession'); return {ok:true}; }
  if(path==='/workspace' && method==='GET') return JSON.parse(localStorage.getItem('nexaDemoWorkspace')||'{}');
  if(path==='/workspace' && method==='PUT'){ localStorage.setItem('nexaDemoWorkspace',JSON.stringify(body)); return {ok:true}; }
  throw new Error('Action indisponible dans le mode aperçu. Lance le serveur NEXA pour le mode réel.');
}
async function apiJSON(path, options={}){
  if(isDirectFilePreview()) return demoAPI(path,options);
  let r;
  try{ r=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options}); }
  catch(e){ const err=new Error('Impossible de joindre le serveur NEXA. Lance le serveur puis recharge la page.'); err.cause=e; throw err; }
  let data={}; try{data=await r.json()}catch{} if(!r.ok){const e=new Error(data.error||'Erreur serveur');e.status=r.status;throw e} return data;
}
function authMessage(text,ok=false){const el=document.getElementById('authMessage');if(el){el.textContent=text||'';el.classList.toggle('ok',!!ok)}}
function authModeNote(){const el=document.querySelector('.auth-note');if(el&&isDirectFilePreview())el.textContent='Mode aperçu local : tu peux tester l’interface sans serveur. Pour le vrai mode sécurisé, lance le serveur NEXA.'}
function setAuthMode(mode){window.NEXA_AUTH.mode=mode;const reg=mode==='register';document.getElementById('authTitle').textContent=reg?'Créer ton compte NEXA':'Bienvenue sur NEXA';document.getElementById('authSubtitle').textContent=reg?'Crée un espace personnel pour ton activité.':'Connecte-toi pour accéder à ton espace entreprise.';document.getElementById('authSubmit').textContent=reg?'Créer mon compte':'Se connecter';document.getElementById('authToggle').textContent=reg?'J’ai déjà un compte':'Créer un compte';document.getElementById('authPassword').autocomplete=reg?'new-password':'current-password';const c=document.getElementById('authConsent');if(c)c.hidden=!reg;const t=document.getElementById('authTerms');if(t)t.checked=false;authMessage('')}
function showLegalDoc(kind){const privacy=kind==='privacy';const title=privacy?'Politique de confidentialité':'Conditions d’utilisation';const body=privacy?`<span class="eyebrow">BROUILLON V56</span><h2>${title}</h2><p>Ce document est une base de travail pour le prototype NEXA. Il devra être finalisé avant un lancement public.</p><p><b>Données :</b> NEXA vise à minimiser les informations collectées et à utiliser les données uniquement pour fournir et sécuriser le service.</p><p><b>Utilisateurs mineurs :</b> des protections renforcées et des règles d’âge adaptées seront nécessaires.</p><p><b>Vos droits :</b> les mécanismes d’accès, correction et suppression seront définis dans la version finale.</p>`:`<span class="eyebrow">BROUILLON V56</span><h2>${title}</h2><p>NEXA aide les entrepreneurs à organiser leur activité. L’utilisateur reste responsable de son activité et des données qu’il saisit.</p><p>Les paiements du prototype sont simulés. Les services financiers réels nécessiteront des partenaires et autorisations appropriés.</p><p>L’utilisation frauduleuse, nuisible ou illégale du service sera interdite.</p>`;let m=document.getElementById('legalQuickModal');if(!m){m=document.createElement('div');m.id='legalQuickModal';m.className='legal-quick-modal';m.innerHTML='<div class="legal-quick-card"><button type="button" class="x" onclick="closeLegalDoc()">×</button><div id="legalQuickBody"></div></div>';document.body.appendChild(m)}document.getElementById('legalQuickBody').innerHTML=body;m.classList.add('show')}
function closeLegalDoc(){document.getElementById('legalQuickModal')?.classList.remove('show')}
function showLegalSection(kind){const privacy=kind==='privacy';document.getElementById('legalPrivacy').hidden=!privacy;document.getElementById('legalTerms').hidden=privacy;document.querySelectorAll('.legal-tab').forEach((b,i)=>b.classList.toggle('active',privacy?i===0:i===1))}
function showAuth(show=true){document.getElementById('authGate')?.classList.toggle('hidden',!show);document.body.classList.toggle('auth-locked',show)}
function mergeRecords(localArr,remoteArr,keyFn){
  const out=Array.isArray(localArr)?localArr.slice():[];
  const seen=new Set(out.map(x=>keyFn(x)));
  (Array.isArray(remoteArr)?remoteArr:[]).forEach(x=>{const k=keyFn(x);if(!seen.has(k)){seen.add(k);out.push(x)}});
  return out;
}
function mergeWorkspace(w){
  const remote=w||{};
  return {
    products:mergeRecords(d.products,remote.products,x=>String(x?.name||'').trim().toLowerCase()),
    orders:mergeRecords(d.orders,remote.orders,x=>JSON.stringify([x?.createdAt,x?.client,x?.product,x?.quantity,x?.amount,x?.channel])),
    expenses:mergeRecords(d.expenses,remote.expenses,x=>JSON.stringify([x?.createdAt,x?.description,x?.amount])),
    clients:mergeRecords(d.clients,remote.clients,x=>String(x?.name||'').trim().toLowerCase()),
    purchases:mergeRecords(JSON.parse(localStorage.getItem('nexaPurchases')||'[]'),remote.purchases,x=>JSON.stringify([x?.createdAt,x?.supplier,x?.product,x?.quantity,x?.amount])),
    documents:mergeRecords(JSON.parse(localStorage.getItem('nexaDocuments')||'[]'),remote.documents,x=>String(x?.id||x?.number||JSON.stringify(x))),
    store:{...JSON.parse(localStorage.getItem('nexaStore')||'{}'),...(remote.store||{})},
    goals:{...JSON.parse(localStorage.getItem('nexaGoals')||'{}'),...(remote.goals||{})},
    account:{...JSON.parse(localStorage.getItem('nexaAccount')||'{}'),...(remote.account||{})},
    cart:remote.cart||JSON.parse(localStorage.getItem('nexaCart')||'[]')
  };
}
function applyRemoteWorkspace(w){
  const merged=mergeWorkspace(w);
  localStorage.setItem('nexa',JSON.stringify({products:merged.products,orders:merged.orders,expenses:merged.expenses,clients:merged.clients}));
  localStorage.setItem('nexaPurchases',JSON.stringify(merged.purchases));
  localStorage.setItem('nexaDocuments',JSON.stringify(merged.documents));
  localStorage.setItem('nexaStore',JSON.stringify(merged.store));
  localStorage.setItem('nexaCart',JSON.stringify(merged.cart));
  localStorage.setItem('nexaGoals',JSON.stringify(merged.goals));
  localStorage.setItem('nexaAccount',JSON.stringify(merged.account));
  d=JSON.parse(localStorage.getItem('nexa'))||d;
}
let syncTimer=null;
async function syncWorkspace(){ if(!window.NEXA_AUTH.authenticated)return; try{await apiJSON('/workspace',{method:'PUT',body:JSON.stringify(localWorkspaceSnapshot())})}catch(e){console.warn('NEXA sync:',e.message)} }
function scheduleWorkspaceSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncWorkspace,800)}
async function afterLogin(user){
  window.NEXA_AUTH={authenticated:true,user,mode:'login'};
  document.getElementById('authUserEmail').textContent=user.email;
  showAuth(false);
  const remote=await apiJSON('/workspace');
  if(isLegacyDemoActivity(remote)){
    remote.orders=[]; remote.expenses=[]; remote.clients=[];
    try{await apiJSON('/workspace',{method:'PUT',body:JSON.stringify(remote)})}catch{}
  }
  const remoteHas=hasLocalActivity(remote);
  const local=localWorkspaceSnapshot();
  if(!remoteHas && hasLocalActivity(local)){ await apiJSON('/workspace',{method:'PUT',body:JSON.stringify(local)}); }
  else if(remoteHas){ applyRemoteWorkspace(remote); await apiJSON('/workspace',{method:'PUT',body:JSON.stringify(localWorkspaceSnapshot())}); }
  document.getElementById('authForm')?.reset();
  if(typeof render==='function')render();
  if(typeof renderStore==='function')renderStore();
  if(typeof renderInsights==='function')renderInsights();
  if(typeof renderGoals==='function')renderGoals();
  if(typeof renderDocuments==='function')renderDocuments();
  if(typeof renderPayments==='function')renderPayments();
  if(typeof renderValidation==='function')renderValidation();
  if(typeof renderGrowth==='function')renderGrowth();
  if(typeof renderRetention==='function')renderRetention();
}
async function bootAuth(){
  try{const me=await apiJSON('/auth/me'); if(me.authenticated){await afterLogin(me.user)}else showAuth(true)}catch(e){showAuth(true);authMessage('Le serveur NEXA est indisponible. Lance NEXA avec le script V53.')} 
}
document.addEventListener('DOMContentLoaded',()=>{
  const requestedAuth = new URLSearchParams(window.location.search).get('auth');
  setAuthMode(requestedAuth==='register'?'register':'login');
  authModeNote();
  document.getElementById('authToggle')?.addEventListener('click',()=>setAuthMode(window.NEXA_AUTH.mode==='login'?'register':'login'));
  document.getElementById('authForm')?.addEventListener('submit',async e=>{e.preventDefault();const email=document.getElementById('authEmail').value.trim();const password=document.getElementById('authPassword').value;const mode=window.NEXA_AUTH.mode;if(mode==='register'&&!document.getElementById('authTerms')?.checked){authMessage('Accepte les Conditions d’utilisation et la Politique de confidentialité pour continuer.');return}const btn=document.getElementById('authSubmit');btn.disabled=true;authMessage(mode==='register'?'Création du compte…':'Connexion…');try{const out=await apiJSON('/auth/'+(mode==='register'?'register':'login'),{method:'POST',body:JSON.stringify({email,password})});await afterLogin(out.user);authMessage('',true)}catch(err){authMessage(err.message||'Une erreur est survenue.')}finally{btn.disabled=false}});
  document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await syncWorkspace();try{await apiJSON('/auth/logout',{method:'POST'})}catch{}window.NEXA_AUTH={authenticated:false,user:null,mode:'login'};showAuth(true);setAuthMode('login');document.getElementById('authUserEmail').textContent='';});
  bootAuth();
  setInterval(()=>{if(window.NEXA_AUTH.authenticated)syncWorkspace()},5000);
});
let d=JSON.parse(localStorage.getItem('nexa'))||{products:[{name:'Sac premium',price:15000,icon:'👜',stock:10,lowStock:5},{name:'T-shirt',price:10000,icon:'👕',stock:20,lowStock:5}],orders:[],expenses:[],clients:[]};
// V67 CLEAN START: remove only the known legacy demo activity that produced
// 50,000 FCFA revenue / 20,000 FCFA expenses. Real user records are preserved.
function isLegacyDemoActivity(w){
  if(!w || !Array.isArray(w.orders) || !Array.isArray(w.expenses)) return false;
  const revenue=w.orders.reduce((a,o)=>a+Number(o?.amount||0),0);
  const expenses=w.expenses.reduce((a,o)=>a+Number(o?.amount||0),0);
  return revenue===50000 && expenses===20000 && (w.orders.length>0 || w.expenses.length>0);
}
function cleanLegacyDemoData(){
  let changed=false;
  if(isLegacyDemoActivity(d)){
    d.orders=[]; d.expenses=[]; d.clients=[]; changed=true;
  }
  try{
    const raw=localStorage.getItem('nexaDemoWorkspace');
    if(raw){const w=JSON.parse(raw);if(isLegacyDemoActivity(w)){w.orders=[];w.expenses=[];w.clients=[];localStorage.setItem('nexaDemoWorkspace',JSON.stringify(w));changed=true;}}
  }catch{}
  localStorage.setItem('nexaV67CleanStart','1');
  return changed;
}
cleanLegacyDemoData();
if(!Array.isArray(d.clients))d.clients=[];
d.orders.forEach(o=>{if(o.client&&!d.clients.some(c=>c.name===o.client))d.clients.push({name:o.client,phone:'',notes:''})});
d.products.forEach(p=>{if(p.stock==null)p.stock=0;if(p.lowStock==null)p.lowStock=5;if(p.cost==null)p.cost=0;if(p.category==null)p.category='Autre'});
d.orders.forEach(o=>{if(o.quantity==null)o.quantity=1;if(o.createdAt==null)o.createdAt=0;if(o.stockMovement==null)o.stockMovement={product:o.product,quantity:o.quantity}});
d.orders.forEach(o=>{if(o.channel==null)o.channel='Manuel';if(o.payment==null)o.payment='Non précisé';if(o.phone==null)o.phone='';if(o.deliveryMode==null)o.deliveryMode='Non précisé';if(o.deliveryStatus==null)o.deliveryStatus=(o.status==='Livrée'?'Livrée':'À préparer');if(o.deliveryFee==null)o.deliveryFee=0;});d.expenses.forEach(x=>{if(x.category==null)x.category='Autre'});
// V21: migrate legacy records without dates so Reports stays consistent with existing data.
const legacyDate=Date.now();d.orders.forEach(o=>{if(!Number(o.createdAt)){o.createdAt=legacyDate;o.dateEstimated=true}if(!o.paymentStatus)o.paymentStatus=(o.payment==='À la livraison'?'À encaisser':'Payée');if(!o.deliveryAddress)o.deliveryAddress='';if(!o.deliveryNote)o.deliveryNote=''});d.expenses.forEach(x=>{if(!Number(x.createdAt)){x.createdAt=legacyDate;x.dateEstimated=true}});const save=()=>{localStorage.setItem('nexa',JSON.stringify(d));scheduleWorkspaceSync()},money=n=>new Intl.NumberFormat('fr-FR').format(n)+' FCFA',sum=a=>a.reduce((x,y)=>x+Number(y.amount||0),0),esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function renderCommercialCenter(){
  const root=document.getElementById('launchChecklist');
  if(!root)return;
  const d=load(); const products=d.products||[]; const orders=d.orders||[];
  const store=JSON.parse(localStorage.getItem('nexaStore')||'{}');
  const checks=[
    ['Catalogue produit', products.length>0],
    ['Prix de vente renseignés', products.length>0 && products.every(p=>Number(p.price)>0)],
    ['Stock suivi', products.length>0 && products.every(p=>p.stock!=null)],
    ['Boutique configurée', !!(store.name||store.storeName||store.slug)],
    ['Première commande enregistrée', orders.length>0],
    ['Suivi des encaissements', orders.some(o=>o.paymentStatus)]
  ];
  root.innerHTML=checks.map(x=>`<div class="check-row"><span>${x[1]?'✓':'○'}</span><span>${x[0]}</span></div>`).join('');
  const c=document.getElementById('commercialCatalog'); if(c)c.textContent=products.length?products.length+' produit(s)':'À préparer';
  const st=document.getElementById('commercialStore'); if(st)st.textContent=(store.name||store.storeName)?'Configurée':'À configurer';
  const o=document.getElementById('commercialOrders'); if(o)o.textContent=orders.length?orders.length+' commande(s)':'Aucune commande';
}
function render(){let r=sum(d.orders),e=sum(d.expenses),p=r-e,q=Math.min(100,Math.round(r/500000*100));['rev','fr'].forEach(x=>document.getElementById(x).textContent=money(r));['exp','fe'].forEach(x=>document.getElementById(x).textContent=money(e));['profit','fp'].forEach(x=>document.getElementById(x).textContent=money(p));document.getElementById('count').textContent=d.orders.length;let unpaid=d.orders.filter(o=>o.paymentStatus==='À encaisser').reduce((a,o)=>a+Number(o.amount||0),0);let ub=document.getElementById('unpaidAmount');if(ub)ub.textContent=money(unpaid);document.getElementById('goal').textContent=money(r)+' / 500 000 FCFA';document.getElementById('bar').style.width=q+'%';document.getElementById('pct').textContent=q+'%';document.getElementById('pc').textContent=d.products.length;document.getElementById('del').textContent=d.orders.filter(o=>o.status==='Livrée').length;document.getElementById('avg').textContent=money(d.orders.length?Math.round(r/d.orders.length):0);renderProducts();renderInventoryInsights();renderOrders();renderClients();renderDocuments();let unpaidOrders=d.orders.filter(o=>o.paymentStatus==='À encaisser');let fu=document.getElementById('financeUnpaid');if(fu)fu.textContent=money(unpaidOrders.reduce((a,o)=>a+Number(o.amount||0),0));let fuc=document.getElementById('financeUnpaidCount');if(fuc)fuc.textContent=unpaidOrders.length;document.getElementById('financeList').innerHTML=[...d.orders.map(o=>`<tr><td>Revenu</td><td>${esc(o.product)}</td><td>Vente</td><td>${money(o.amount)}</td><td>—</td></tr>`),...d.expenses.map((x,i)=>`<tr><td>Dépense</td><td>${esc(x.description)}</td><td>${esc(x.category||'Autre')}</td><td>${money(x.amount)}</td><td><button class="edit" onclick="editExpense(${i})">✏️</button> <button class="delete" onclick="deleteExpense(${i})">🗑️</button></td></tr>`)].join('')||'<tr><td colspan="5">Aucune opération.</td></tr>';
let recent=d.orders.slice(-4).reverse();document.getElementById('recentCount').textContent=d.orders.length?`${d.orders.length} commande${d.orders.length>1?'s':''}`:'';document.getElementById('recent').innerHTML=recent.map(o=>`<div class="activity-row"><b>${esc(o.client)}</b> — ${esc(o.product)} <strong>${money(o.amount)}</strong></div>`).join('')||'Aucune commande pour le moment.';
let goalLeft=Math.max(0,500000-r);document.getElementById('goalDetail').textContent=r>=500000?'Objectif atteint 🎉':`Encore ${money(goalLeft)} à réaliser.`;
let prodMap={};d.orders.forEach(o=>{let k=o.product||'Produit';if(!prodMap[k])prodMap[k]={qty:0,revenue:0};prodMap[k].qty+=Number(o.quantity||1);prodMap[k].revenue+=Number(o.amount||0)});let tops=Object.entries(prodMap).sort((a,b)=>b[1].qty-a[1].qty).slice(0,3);document.getElementById('topProducts').innerHTML=tops.map(([name,v],i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><div class="rank-main"><b>${esc(name)}</b><small>${v.qty} unité${v.qty>1?'s':''} vendue${v.qty>1?'s':''}</small></div><strong>${money(v.revenue)}</strong></div>`).join('')||'Pas encore de ventes.';
let clientMap={};d.orders.forEach(o=>{let k=o.client||'Client';if(!clientMap[k])clientMap[k]={orders:0,revenue:0};clientMap[k].orders++;clientMap[k].revenue+=Number(o.amount||0)});let topc=Object.entries(clientMap).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,3);document.getElementById('topClients').innerHTML=topc.map(([name,v],i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><div class="rank-main"><b>${esc(name)}</b><small>${v.orders} commande${v.orders>1?'s':''}</small></div><strong>${money(v.revenue)}</strong></div>`).join('')||'Pas encore de clients.';
let low=d.products.filter(x=>Number(x.stock||0)<=Number(x.lowStock??5));let alerts=[];if(low.length)alerts.push(`<div class="alert-item alert-warning">⚠️ <b>${low.length} produit${low.length>1?'s':''}</b> ${low.length>1?'ont':'a'} un stock faible : ${low.slice(0,3).map(x=>esc(x.name)).join(', ')}.</div>`);if(p<0)alerts.push(`<div class="alert-item alert-warning">📉 Tes dépenses dépassent actuellement tes revenus de <b>${money(Math.abs(p))}</b>.</div>`);if(!low.length&&p>=0)alerts.push('<div class="alert-item alert-success">✅ Aucun stock faible détecté et ton résultat est positif.</div>');document.getElementById('smartAlerts').innerHTML=alerts.join('')||'<div class="alert-item">💡 Ajoute une première commande pour obtenir des recommandations intelligentes.</div>';
document.getElementById('pendingCount').textContent=d.orders.filter(o=>o.status==='En attente').length;document.getElementById('confirmedCount').textContent=d.orders.filter(o=>o.status==='Confirmée').length;document.getElementById('deliveredCount').textContent=d.orders.filter(o=>o.status==='Livrée').length;document.getElementById('storeOrdersCount').textContent=d.orders.filter(o=>o.channel==='Boutique').length;let gross=d.orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0);document.getElementById('insight').textContent=d.orders.length?(p>=0?(tops[0]?`Ton produit le plus vendu est « ${tops[0][0]} ». 🚀`:'Ton activité est positive. 🚀'):'Analyse tes dépenses.'):'Commence par enregistrer ta première vente.';document.getElementById('itext').textContent=d.orders.length?`NEXA analyse ${d.orders.length} commande${d.orders.length>1?'s':''}, ${d.products.length} produit${d.products.length>1?'s':''} et tes dépenses pour t'aider à piloter ton activité.`:'Tes indicateurs apparaîtront ici au fur et à mesure.';renderActivity();renderFinancialHealth();renderReports();renderNexaScore();renderOnboarding();save()}
function renderActivity(){let el=document.getElementById('activityTimeline');if(!el)return;let events=[];d.orders.forEach(o=>events.push({t:Number(o.createdAt||0),html:`<div class="activity-row"><span>🛍️</span><div><b>Commande · ${esc(o.client)}</b><small>${esc(o.product)} · ${money(o.amount)} · ${esc(o.status||'En attente')}</small></div></div>`}));d.expenses.forEach(x=>events.push({t:Number(x.createdAt||0),html:`<div class="activity-row"><span>💸</span><div><b>Dépense enregistrée</b><small>${esc(x.description)} · ${money(x.amount)}</small></div></div>`}));events.sort((a,b)=>b.t-a.t);el.innerHTML=events.slice(0,6).map(x=>x.html).join('')||'Aucune activité récente.'}

function renderFinancialHealth(){let r=sum(d.orders||[]),e=sum(d.expenses||[]),balance=r-e,rate=r?Math.round(e/r*100):0;let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v};set('cashBalance',money(balance));set('expenseRate',rate+'%');set('financeSignal',r===0&&e===0?'En attente':balance>=0?'Situation positive':'À surveiller');let map={};(d.expenses||[]).forEach(x=>{let k=x.category||'Autre';map[k]=(map[k]||0)+Number(x.amount||0)});let items=Object.entries(map).sort((a,b)=>b[1]-a[1]);let el=document.getElementById('expenseBreakdown');if(el)el.innerHTML=items.map(([k,v])=>`<div class="report-line"><span>💸 ${esc(k)}</span><strong>${money(v)}</strong></div>`).join('')||'Aucune dépense enregistrée.'}
function renderInventoryInsights(){
 let el=document.getElementById('inventoryInsights');if(!el)return;
 let now=Date.now(),start=now-30*86400000,orders=d.orders||[];
 let rows=d.products.map(p=>{
   let sold=orders.filter(o=>o.product===p.name&&Number(o.createdAt||0)>=start).reduce((a,o)=>a+Number(o.quantity||1),0);
   let daily=sold/30,stock=Number(p.stock||0),days=daily>0?Math.floor(stock/daily):null;
   let target=Math.ceil(daily*30),suggest=Math.max(0,target-stock);
   let status=stock<=0?'Rupture':daily>0&&days<=7?'Urgent':stock<=Number(p.lowStock??5)?'À surveiller':daily>0&&days<=30?'À prévoir':'OK';
   return {p,sold,daily,stock,days,suggest,status};
 }).sort((a,b)=>({Urgent:0,Rupture:0,'À surveiller':1,'À prévoir':2,OK:3}[a.status]-({Urgent:0,Rupture:0,'À surveiller':1,'À prévoir':2,OK:3}[b.status]) || b.sold-a.sold));
 if(!rows.length){el.innerHTML='<div class="empty">Ajoute des produits pour activer les prévisions de stock.</div>';return}
 el.innerHTML=rows.map(x=>{let icon=x.p.photo?`<img src="${x.p.photo}" alt="${esc(x.p.name)}">`:(x.p.icon||'📦');let forecast=x.daily>0?(x.days===0?'Rupture imminente':`≈ ${x.days} jour${x.days>1?'s':''} de stock`):'Pas assez de ventes';let badge=x.status==='OK'?'status-ok':x.status==='À prévoir'?'status-warn':x.status==='À surveiller'?'status-warn':'status-danger';return `<div class="inventory-row"><div class="inventory-product"><span class="inventory-pic">${x.p.photo?icon:icon}</span><div><b>${esc(x.p.name)}</b><small>${x.sold} unité${x.sold>1?'s':''} vendue${x.sold>1?'s':''} sur 30 jours</small></div></div><div><small>Stock</small><b>${x.stock}</b></div><div><small>Prévision</small><b>${forecast}</b></div><div><span class="inventory-badge ${badge}">${x.status}</span>${x.suggest>0?`<small class="reorder-note">Réappro. conseillé : +${x.suggest}</small>`:''}</div></div>`}).join('');
 renderPayments();
}

function renderProducts(){let q=(document.getElementById('productSearch')?.value||'').toLowerCase().trim(),f=document.getElementById('stockFilter')?.value||'all',cat=document.getElementById('productCategory')?.value||'all';let list=d.products.filter(x=>x.name.toLowerCase().includes(q)).filter(x=>f==='low'?Number(x.stock||0)<=Number(x.lowStock??5):f==='ok'?Number(x.stock||0)>Number(x.lowStock??5):true).filter(x=>cat==='all'||(x.category||'Autre')===cat);let cats=[...new Set(d.products.map(x=>x.category||'Autre'))];let sel=document.getElementById('productCategory');if(sel){let cur=sel.value;sel.innerHTML='<option value="all">Toutes les catégories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');sel.value=cats.includes(cur)?cur:'all'}document.getElementById('productList').innerHTML=list.map(x=>`<article class="product"><div class="pic">${x.photo?`<img src="${x.photo}" alt="${esc(x.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`:(x.icon||'📦')}</div><h3>${esc(x.name)}</h3><p class="muted">${esc(x.category||'Autre')}</p><p>Stock : <b>${Number(x.stock||0)}</b> ${Number(x.stock||0)<=Number(x.lowStock??5)?'<span class="stock-alert">⚠️ Stock faible</span>':''}</p><div class="price">${money(x.price)}</div><div class="margin-note">Coût : ${money(x.cost||0)} · Marge : <b>${money(Math.max(0,Number(x.price||0)-Number(x.cost||0)))}</b></div><div class="actions"><button class="edit" onclick="editProduct(${d.products.indexOf(x)})">✏️</button> <button class="delete" onclick="deleteProduct(${d.products.indexOf(x)})">🗑️</button></div></article>`).join('')||'<div class="empty">Aucun produit trouvé.</div>'}
function viewOrder(i){let o=d.orders[i];if(!o)return;let f=document.getElementById('form');document.getElementById('mt').textContent='Détails de la commande';f.innerHTML=`<div class="order-detail"><div class="detail-grid"><div><small>Client</small><b>${esc(o.client)}</b></div><div><small>Téléphone</small><b>${o.phone?esc(o.phone):'Non renseigné'}</b></div><div><small>Produit</small><b>${esc(o.product)}</b></div><div><small>Quantité</small><b>${Number(o.quantity||1)}</b></div><div><small>Montant</small><b>${money(o.amount)}</b></div><div><small>Paiement</small><b>${esc(o.payment||'Non précisé')}</b></div><div><small>Encaissement</small><b>${o.paymentStatus==='À encaisser'?'🔴 À encaisser':'🟢 Payée'}</b></div><div><small>Canal</small><b>${o.channel==='Boutique'?'🛍️ Boutique':'✍️ Manuel'}</b></div><div><small>Livraison</small><b>${esc(o.deliveryMode||'Non précisé')}</b></div><div><small>Suivi livraison</small><b>${esc(o.deliveryStatus||'À préparer')}</b></div><div><small>Frais livraison</small><b>${money(o.deliveryFee||0)}</b></div><div><small>Lieu de livraison</small><b>${o.deliveryAddress?esc(o.deliveryAddress):'Non renseigné'}</b></div><div><small>Note livraison</small><b>${o.deliveryNote?esc(o.deliveryNote):'Aucune'}</b></div><div><small>Statut</small><b>${esc(o.status||'En attente')}</b></div><div><small>Date</small><b>${o.createdAt?(new Date(o.createdAt).toLocaleString('fr-FR')+(o.dateEstimated?' · estimée':'') ):'Non renseignée'}</b></div></div></div><button type="button" class="submit" onclick="closeBox()">Fermer</button>`;f.onsubmit=null;document.getElementById('modal').classList.add('show')}
function printOrder(i){let o=d.orders[i];if(!o)return;let date=o.createdAt?new Date(o.createdAt).toLocaleString('fr-FR'):'Non renseignée';let w=window.open('','_blank','width=720,height=820');if(!w){alert('Autorise les fenêtres pop-up pour générer le reçu.');return}w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>NEXA — Reçu ${esc(o.client)}</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;padding:20px;color:#17171c}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #17171c;padding-bottom:18px;margin-bottom:24px}.logo{font-size:28px;font-weight:800}.muted{color:#666;font-size:13px}.box{border:1px solid #ddd;border-radius:14px;padding:18px;margin:14px 0}.row{display:flex;justify-content:space-between;gap:20px;padding:9px 0}.total{font-size:22px;font-weight:800;border-top:2px solid #17171c;margin-top:12px;padding-top:14px}.status{display:inline-block;padding:7px 10px;border-radius:20px;background:#eee;font-weight:700}@media print{body{margin:0;max-width:none}.no-print{display:none}}</style></head><body><header><div><div class="logo">NEXA</div><div class="muted">Reçu de commande</div></div><div class="muted">${date}</div></header><div class="box"><div class="row"><span>Client</span><b>${esc(o.client)}</b></div><div class="row"><span>Téléphone</span><b>${esc(o.phone||'Non renseigné')}</b></div><div class="row"><span>Produit</span><b>${esc(o.product)}</b></div><div class="row"><span>Quantité</span><b>${Number(o.quantity||1)}</b></div><div class="row"><span>Mode de paiement</span><b>${esc(o.payment||'Non précisé')}</b></div><div class="row"><span>Encaissement</span><b>${o.paymentStatus==='À encaisser'?'À payer':'Payée'}</b></div><div class="row"><span>Livraison</span><b>${esc(o.deliveryMode||'Non précisé')} · ${esc(o.deliveryStatus||'À préparer')}</b></div><div class="row"><span>Frais de livraison</span><b>${money(o.deliveryFee||0)}</b></div><div class="row"><span>Lieu de livraison</span><b>${esc(o.deliveryAddress||'Non renseigné')}</b></div><div class="row"><span>Note livraison</span><b>${esc(o.deliveryNote||'Aucune')}</b></div><div class="row"><span>Statut</span><b class="status">${esc(o.status||'En attente')}</b></div><div class="row total"><span>Total</span><b>${money(o.amount)}</b></div></div><p class="muted">Merci pour votre commande.</p><button class="no-print" onclick="window.print()">Imprimer</button></body></html>`);w.document.close();w.focus()}

function renderOrders(){let q=(document.getElementById('orderSearch')?.value||'').toLowerCase().trim(),f=document.getElementById('statusFilter')?.value||'all',df=document.getElementById('deliveryFilter')?.value||'all';renderDeliveryControl();let list=d.orders.map((o,i)=>({o,i})).filter(({o})=>[o.client,o.product,o.phone,o.deliveryAddress,o.deliveryNote,o.status,o.payment,o.paymentStatus,o.channel,o.deliveryMode,o.deliveryStatus].some(v=>String(v||'').toLowerCase().includes(q))).filter(({o})=>f==='all'||o.status===f).filter(({o})=>df==='all'||(o.deliveryStatus||'À préparer')===df);document.getElementById('orderList').innerHTML=list.map(({o,i})=>`<tr><td>${esc(o.client)}${o.phone?`<small class="row-meta">📞 ${esc(o.phone)}</small>`:''}</td><td>${esc(o.product)}<small class="row-meta">${o.channel==='Boutique'?'🛍️ Boutique':'✍️ Manuel'}</small></td><td>${Number(o.quantity||1)}×</td><td>${money(o.amount)}<small class="row-meta">${esc(o.payment||'Non précisé')}</small><small class="row-meta">${o.paymentStatus==='À encaisser'?'🔴 À encaisser':'🟢 Payée'}</small><small class="row-meta">🚚 ${esc(o.deliveryStatus||'À préparer')}</small></td><td><span class="status-pill status-${String(o.status||'').toLowerCase().replace(/[^a-zà-ÿ]+/g,'-')}">${esc(o.status)}</span><div class="status-actions"><button onclick="quickStatus(${i},'En attente')">Attente</button><button onclick="quickStatus(${i},'Confirmée')">Confirmer</button><button onclick="quickStatus(${i},'Livrée')">Livrer</button></div><div class="payment-actions"><button onclick="quickPayment(${i},'Payée')">Payée</button><button onclick="quickPayment(${i},'À encaisser')">À encaisser</button></div></td><td><button onclick="viewOrder(${i})">👁️</button> <button onclick="printOrder(${i})">🧾</button> <button class="edit" onclick="editOrder(${i})">✏️</button> <button class="delete" onclick="deleteOrder(${i})">🗑️</button></td></tr>`).join('')||'<tr><td colspan="6">Aucune commande trouvée.</td></tr>'}
function clientProfile(c){let orders=d.orders.filter(o=>o.client===c.name),total=sum(orders),last=orders.length?Math.max(...orders.map(o=>Number(o.createdAt||0))):0,days=last?Math.max(0,Math.floor((Date.now()-last)/86400000)):9999;let segment=orders.length>=5||total>=100000?'vip':orders.length>=2&&days<=45?'loyal':orders.length<=1&&days<=30?'new':orders.length&&days>45?'reactivate':'new';return {orders,total,last,days,segment}}
function segmentLabel(s){return s==='vip'?'⭐ VIP':s==='loyal'?'💚 Fidèle':s==='reactivate'?'🔔 À réactiver':'🆕 Nouveau'}
function renderClients(){let q=(document.getElementById('clientSearch')?.value||'').toLowerCase().trim(),sort=document.getElementById('clientSort')?.value||'recent',seg=(document.getElementById('clientSegment')?.value||'all');let profiles=d.clients.map(c=>({c,...clientProfile(c)})).filter(x=>[x.c.name,x.c.phone,x.c.notes].some(v=>String(v||'').toLowerCase().includes(q))).filter(x=>seg==='all'||x.segment===seg);profiles.sort((a,b)=>{if(sort==='revenue')return b.total-a.total;if(sort==='orders')return b.orders.length-a.orders.length;if(sort==='name')return a.c.name.localeCompare(b.c.name);return b.last-a.last});let all=d.clients.map(c=>({c,...clientProfile(c)})),vip=all.filter(x=>x.segment==='vip').length,loyal=all.filter(x=>x.segment==='loyal').length,newc=all.filter(x=>x.segment==='new').length,react=all.filter(x=>x.segment==='reactivate').length;let ci=document.getElementById('clientInsights');if(ci)ci.innerHTML=`<div class="client-insight"><b>${vip}</b><span>⭐ VIP</span></div><div class="client-insight"><b>${loyal}</b><span>💚 Fidèles</span></div><div class="client-insight"><b>${newc}</b><span>🆕 Nouveaux</span></div><div class="client-insight"><b>${react}</b><span>🔔 À réactiver</span></div>`;document.getElementById('clientList').innerHTML=profiles.map(x=>{let c=x.c,i=d.clients.indexOf(c),last=x.last?new Date(x.last).toLocaleDateString('fr-FR'):'—';return `<article class="product client-card"><div class="pic">👤</div><div class="client-segment">${segmentLabel(x.segment)}</div><h3>${esc(c.name)}</h3><p>${c.phone?`📞 ${esc(c.phone)}`:'Aucun téléphone enregistré'}</p><p><b>${x.orders.length}</b> commande${x.orders.length>1?'s':''} · <b>${money(x.total)}</b></p><p>Dernière commande : <b>${last}</b>${x.days<9999?` · ${x.days} j` :''}</p>${c.notes?`<div class="visual-note">${esc(c.notes)}</div>`:''}<div class="actions"><button onclick="viewClient(${i})">👁️ Voir</button><button onclick="clientFollowUp(${i})">💬 Relance</button><button class="edit" onclick="editClient(${i})">✏️</button><button class="delete" onclick="deleteClient(${i})">🗑️</button></div></article>`}).join('')||'<div class="empty">Aucun client trouvé.</div>'}
function clientFollowUp(i){let c=d.clients[i];if(!c)return;let p=clientProfile(c),msg=p.segment==='reactivate'?`Bonjour ${c.name}, cela fait un moment que nous ne t’avons pas vu. N’hésite pas à découvrir nos nouveautés 😊`:`Bonjour ${c.name}, merci pour ta confiance ! Nous espérons te revoir bientôt chez nous 🌷`;if(navigator.clipboard)navigator.clipboard.writeText(msg).then(()=>alert('Message de relance copié.')).catch(()=>alert(msg));else alert(msg)}
function viewClient(i){let c=d.clients[i];if(!c)return;let orders=d.orders.filter(o=>o.client===c.name).slice().reverse(),total=sum(orders);document.getElementById('mt').textContent='Fiche client';let f=document.getElementById('form');f.innerHTML=`<div class="client-profile"><div class="profile-avatar">👤</div><h2>${esc(c.name)}</h2><p>${c.phone?`📞 ${esc(c.phone)}`:'Aucun téléphone enregistré'}</p><div class="profile-stats"><div><b>${orders.length}</b><small>Commandes</small></div><div><b>${money(total)}</b><small>Total dépensé</small></div></div><h3>Historique</h3><div class="history">${orders.map(o=>`<div class="history-row"><span><b>${esc(o.product)}</b><small>${esc(o.status||'')}</small></span><strong>${money(o.amount)}</strong></div>`).join('')||'<p>Aucune commande enregistrée.</p>'}</div>${c.notes?`<div class="visual-note">📝 ${esc(c.notes)}</div>`:''}</div><button type="button" class="submit" onclick="closeBox()">Fermer</button>`;f.onsubmit=e=>e.preventDefault();document.getElementById('modal').classList.add('show')}
function deleteClient(i){if(confirm('Supprimer ce client ? Les commandes associées resteront conservées.')){d.clients.splice(i,1);save();render()}}
function editClient(i){let c=d.clients[i];openBox('client');document.getElementById('mt').textContent='Modifier le client';let f=document.getElementById('form');setTimeout(()=>{f.elements.name.value=c.name;f.elements.phone.value=c.phone||'';f.elements.notes.value=c.notes||''},0);f.onsubmit=e=>{e.preventDefault();let v=new FormData(f),old=c.name;c.name=v.get('name').trim();c.phone=v.get('phone').trim();c.notes=v.get('notes').trim();d.orders.forEach(o=>{if(o.client===old)o.client=c.name});closeBox();render()}}
function findProduct(name){return d.products.find(p=>p.name===name)}
function restoreOrderStock(o){let m=o.stockMovement||{product:o.product,quantity:Number(o.quantity||1)};let p=findProduct(m.product);if(p)p.stock=Number(p.stock||0)+Number(m.quantity||0)}
function applyOrderStock(productName,qty){let p=findProduct(productName);if(!p)return true;let stock=Number(p.stock||0);if(stock<qty){alert(`Stock insuffisant pour ${productName}. Stock disponible : ${stock}.`);return false}p.stock=stock-qty;return true}
function deleteOrder(i){if(confirm('Supprimer cette commande ?')){restoreOrderStock(d.orders[i]);d.orders.splice(i,1);save();render()}}
function deleteProduct(i){if(confirm('Supprimer ce produit ?')){d.products.splice(i,1);save();render()}}
function editProduct(i){let o=d.products[i];openBox('product');document.getElementById('mt').textContent='Modifier le produit';let f=document.getElementById('form');setTimeout(()=>{f.elements.name.value=o.name;f.elements.price.value=o.price;f.elements.cost.value=Number(o.cost||0);f.elements.category.value=o.category||'Autre';f.elements.icon.value=o.icon||'';f.elements.stock.value=Number(o.stock||0);f.elements.lowStock.value=Number(o.lowStock??5);setVisualMode(o.photo?'photo':'emoji');if(o.photo)showPhotoPreview(o.photo)},0);f.onsubmit=e=>{e.preventDefault();let x=new FormData(f);o.name=x.get('name');o.price=+x.get('price');o.cost=+x.get('cost');o.category=x.get('category')||'Autre';o.icon=x.get('icon')||'';o.stock=+x.get('stock');o.lowStock=+x.get('lowStock');if(f.dataset.visual==='photo'){if(f.dataset.newPhoto)o.photo=f.dataset.newPhoto;}else{o.photo='';}closeBox();render()}}
function quickPayment(i,status){if(!d.orders[i])return;d.orders[i].paymentStatus=status;save();render()}function quickStatus(i,status){if(!d.orders[i])return;d.orders[i].status=status;if(status==='Livrée')d.orders[i].deliveryStatus='Livrée';save();render()}function quickDelivery(i,status){if(!d.orders[i])return;d.orders[i].deliveryStatus=status;if(status==='Livrée')d.orders[i].status='Livrée';save();render()}function renderDeliveryControl(){let el=document.getElementById('deliveryControl');if(!el)return;let total=d.orders.length,prep=d.orders.filter(o=>(o.deliveryStatus||'À préparer')==='À préparer').length,transit=d.orders.filter(o=>(o.deliveryStatus||'À préparer')==='En livraison').length,done=d.orders.filter(o=>(o.deliveryStatus||'À préparer')==='Livrée').length,withAddress=d.orders.filter(o=>o.deliveryAddress).length;el.innerHTML=`<div class="delivery-grid"><div class="delivery-card"><small>Total commandes</small><b>${total}</b></div><div class="delivery-card"><small>🟡 À préparer</small><b>${prep}</b></div><div class="delivery-card"><small>🔵 En livraison</small><b>${transit}</b></div><div class="delivery-card"><small>🟢 Livrées</small><b>${done}</b></div><div class="delivery-card"><small>📍 Avec lieu renseigné</small><b>${withAddress}</b></div></div><div class="delivery-quick"><button onclick="setAllDelivery('En livraison')">🚚 Passer les commandes préparées en livraison</button><button onclick="setAllDelivery('Livrée')">✓ Marquer les commandes en livraison comme livrées</button></div>`}function setAllDelivery(status){let changed=0;d.orders.forEach(o=>{let ds=o.deliveryStatus||'À préparer';if((status==='En livraison'&&ds==='À préparer')||(status==='Livrée'&&ds==='En livraison')){o.deliveryStatus=status;if(status==='Livrée')o.status='Livrée';changed++}});if(changed){save();render()}else alert('Aucune commande à mettre à jour.')}
function editOrder(i){let o=d.orders[i];openBox('order');document.getElementById('mt').textContent='Modifier la commande';let f=document.getElementById('form');setTimeout(()=>{f.elements.client.value=o.client;f.elements.phone.value=o.phone||'';f.elements.product.value=o.product;f.elements.quantity.value=Number(o.quantity||1);f.elements.amount.value=o.amount;f.elements.payment.value=o.payment||'Non précisé';f.elements.paymentStatus.value=o.paymentStatus||'Payée';f.elements.deliveryMode.value=o.deliveryMode||'Non précisé';f.elements.deliveryFee.value=Number(o.deliveryFee||0);f.elements.deliveryStatus.value=o.deliveryStatus||(o.status==='Livrée'?'Livrée':'À préparer');f.elements.deliveryAddress.value=o.deliveryAddress||'';f.elements.deliveryNote.value=o.deliveryNote||'';f.elements.status.value=o.status},0);f.onsubmit=e=>{e.preventDefault();let x=new FormData(f),newProduct=x.get('product'),newQty=Number(x.get('quantity')||1),oldClient=o.client;restoreOrderStock(o);if(!applyOrderStock(newProduct,newQty)){if(!applyOrderStock(o.product,Number(o.quantity||1)))alert('Impossible de restaurer le stock initial.');return}o.client=x.get('client').trim();o.phone=(x.get('phone')||'').trim();o.product=newProduct;o.quantity=newQty;o.amount=+x.get('amount');o.payment=x.get('payment')||'Non précisé';o.paymentStatus=x.get('paymentStatus')||'Payée';o.deliveryMode=x.get('deliveryMode')||'Non précisé';o.deliveryFee=Number(x.get('deliveryFee')||0);o.deliveryStatus=x.get('deliveryStatus')||'À préparer';o.deliveryAddress=(x.get('deliveryAddress')||'').trim();o.deliveryNote=(x.get('deliveryNote')||'').trim();o.status=x.get('status');o.stockMovement={product:newProduct,quantity:newQty};let c=d.clients.find(c=>c.name.toLowerCase()===o.client.toLowerCase());if(c){if(o.phone)c.phone=o.phone}else d.clients.push({name:o.client,phone:o.phone,notes:''});closeBox();render()}}
function deleteExpense(i){if(confirm('Supprimer cette dépense ?')){d.expenses.splice(i,1);save();render()}}
function editExpense(i){let x=d.expenses[i];openBox('expense');document.getElementById('mt').textContent='Modifier la dépense';let f=document.getElementById('form');f.onsubmit=e=>{e.preventDefault();let v=new FormData(f);x.description=v.get('description');x.category=v.get('category')||'Autre';x.amount=+v.get('amount');closeBox();render()};setTimeout(()=>{f.elements.description.value=x.description;f.elements.category.value=x.category||'Autre';f.elements.amount.value=x.amount},0)}
function renderOnboarding(){
 const el=document.getElementById('onboardingSteps');if(!el)return;
 const a=JSON.parse(localStorage.getItem('nexaAccount')||'{}'), store=JSON.parse(localStorage.getItem('nexaStore')||'{}');
 const steps=[
  {title:'Configurer ton entreprise',desc:'Ajoute le nom de ton activité et ton pays.',done:!!(a.businessName&&a.businessName.trim()),action:()=>nav('page-account'),cta:'Ouvrir le compte'},
  {title:'Créer ton catalogue',desc:'Ajoute au moins un produit avec prix et stock.',done:(d.products||[]).length>0,action:()=>{nav('products');setTimeout(()=>openBox('product'),50)},cta:'Ajouter un produit'},
  {title:'Préparer ta boutique',desc:'Personnalise le nom et la description de ta boutique.',done:!!(store.name&&store.name.trim()),action:()=>nav('store'),cta:'Ouvrir la boutique'},
  {title:'Enregistrer une première commande',desc:'Teste le cycle de vente de NEXA.',done:(d.orders||[]).length>0,action:()=>{nav('orders');setTimeout(()=>openBox('order'),50)},cta:'Ajouter une commande'},
  {title:'Définir tes objectifs',desc:'Choisis un objectif de CA, de commandes et de résultat.',done:!!localStorage.getItem('nexaGoals'),action:()=>nav('goals'),cta:'Voir les objectifs'}
 ];
 const done=steps.filter(x=>x.done).length,pct=Math.round(done/steps.length*100);
 const set=(id,v)=>{let x=document.getElementById(id);if(x)x.textContent=v};
 set('onboardingPct',pct+'%');set('onboardingCount',done+' / '+steps.length+' étapes');set('onboardingTitle',done===steps.length?'Ton espace NEXA est prêt 🎉':'Construis ton espace étape par étape.');
 set('onboardingSubtitle',done===steps.length?'Toutes les bases sont configurées. Tu peux maintenant te concentrer sur ton activité.':'NEXA vérifie ce qui est déjà configuré et te montre la prochaine action utile.');
 const bar=document.getElementById('onboardingBar');if(bar)bar.style.width=pct+'%';
 el.innerHTML=steps.map((x,i)=>`<div class="onboarding-step ${x.done?'done':''}"><div class="step-number">${x.done?'✓':('0'+(i+1)).slice(-2)}</div><div class="step-copy"><strong>${x.title}</strong><p>${x.desc}</p></div><div class="step-status">${x.done?'Terminé':'À faire'}</div><button class="secondary" onclick="(${x.action.toString()})()">${x.cta}</button></div>`).join('');
 const next=steps.find(x=>!x.done);set('onboardingTip',next?`Prochaine étape : ${next.title}.`:'Tout est prêt. Continue à utiliser NEXA pour faire grandir ton activité.');
}

function renderNexaScore(){
 let orders=d.orders||[], products=d.products||[], expenses=d.expenses||[], clients=d.clients||[];
 let revenue=sum(orders), expense=sum(expenses), profit=revenue-expense;
 let gross=orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0);
 let marginRate=revenue?Math.max(0,Math.min(1,gross/revenue)):0;
 let salesScore=Math.min(20, Math.round(Math.min(1,orders.length/10)*12 + Math.min(1,revenue/500000)*8));
 let marginScore=revenue?Math.round(marginRate*20):0;
 let healthy=products.length?products.filter(p=>Number(p.stock||0)>Number(p.lowStock??5)).length/products.length:0;
 let stockScore=products.length?Math.round(healthy*20):0;
 let unpaid=orders.filter(o=>o.paymentStatus==='À encaisser').reduce((a,o)=>a+Number(o.amount||0),0);
 let cashScore=revenue?Math.round(Math.max(0,1-unpaid/revenue)*20):0;
 let repeat=clients.length?clients.filter(c=>(orders.filter(o=>o.client===c.name).length>=2)).length/clients.length:0;
 let customerScore=clients.length?Math.round(repeat*10):0;
 let score=Math.min(100,salesScore+marginScore+stockScore+cashScore+customerScore);
 let label=score>=80?'Excellente dynamique 🚀':score>=60?'Bonne dynamique 👍':score>=40?'À améliorer progressivement 🌱':score>0?'Début de construction 💡':'Pas encore assez de données';
 let advice=score>=80?'Continue à protéger ta marge et ton stock tout en gardant les encaissements à jour.':score>=60?'Ton activité est bien engagée. Travaille surtout les indicateurs les plus faibles ci-dessous.':score>0?'Concentre-toi sur les ventes régulières, la marge, le stock et les encaissements.':'Commence par enregistrer quelques opérations pour que NEXA puisse analyser ton activité.';
 let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v};
 set('nexaScoreValue',score);set('nexaScoreLabel',label);set('nexaScoreAdvice',advice);set('scoreSales',salesScore+'/20');set('scoreMargin',marginScore+'/20');set('scoreStock',stockScore+'/20');set('scoreCash',cashScore+'/20');
 let breakdown=document.getElementById('scoreBreakdown');
 if(breakdown)breakdown.innerHTML=[['Ventes',salesScore,20,'Volume de commandes et chiffre d’affaires'],['Marge',marginScore,20,'Marge brute estimée'],['Stock',stockScore,20,'Produits disponibles au-dessus du seuil'],['Encaissements',cashScore,20,'Part des ventes déjà encaissées'],['Clients',customerScore,10,'Part des clients ayant commandé plusieurs fois']].map(x=>`<div class="score-line"><div><b>${x[0]}</b><small>${x[3]}</small></div><strong>${x[1]}/${x[2]}</strong><i><em style="width:${Math.round(x[1]/x[2]*100)}%"></em></i></div>`).join('');
 let actions=[];
 if(salesScore<15)actions.push('📈 Enregistre régulièrement tes ventes et travaille ton objectif de CA.');
 if(marginScore<14)actions.push('💰 Vérifie les coûts d’achat de tes produits pour mieux protéger ta marge.');
 if(stockScore<14)actions.push('📦 Réapprovisionne les produits proches de la rupture.');
 if(cashScore<14)actions.push('💳 Mets à jour les commandes encore à encaisser.');
 if(customerScore<5&&clients.length)actions.push('🤝 Encourage les clients satisfaits à revenir et suis les clients à réactiver.');
 if(!actions.length)actions.push('🌟 Aucun point critique détecté. Continue sur cette dynamique.');
 let act=document.getElementById('scoreActions');if(act)act.innerHTML=actions.map(x=>`<div class="insight-item">${x}</div>`).join('');
}

function nav(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));let target=document.getElementById(p);if(!target)return;target.classList.add('active');document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x.dataset.p===p));let labels={home:'Bonjour 👋🏾',products:'Tes produits',documents:'Documents commerciaux',orders:'Tes commandes',clients:'Tes clients',store:'Ma boutique',purchases:'Achats & fournisseurs',finance:'Tes finances',stats:'Tes statistiques',reports:'Rapports',insights:'Insights',goals:'Objectifs','page-account':'Compte & sauvegarde',search:'Recherche globale',offers:'Offres NEXA','page-business-model':'Modèle économique','page-strategy':'Stratégie','page-retention':'Fidélisation','page-security':'Sécurité & confidentialité',onboarding:'Démarrage'};let names={home:'Dashboard',products:'Produits',documents:'Documents',orders:'Commandes',clients:'Clients',store:'Ma boutique',purchases:'Achats & fournisseurs',finance:'Finances',stats:'Statistiques',reports:'Rapports',insights:'Insights',goals:'Objectifs','page-account':'Compte',search:'Recherche',offers:'Offres',payments:'Paiements','page-business-model':'Modèle économique','page-strategy':'Stratégie','page-retention':'Fidélisation','page-security':'Sécurité', 'page-legal':'Confidentialité','page-company':'Entreprise', onboarding:'Démarrage'};document.getElementById('title').textContent=labels[p]||'NEXA';let crumb=document.getElementById('breadcrumb');if(crumb)crumb.textContent=names[p]||'NEXA'}document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.p));
let nexaDocuments=JSON.parse(localStorage.getItem('nexaDocuments')||'[]');
function saveDocuments(){localStorage.setItem('nexaDocuments',JSON.stringify(nexaDocuments));scheduleWorkspaceSync()}
function renderDocuments(){
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 set('docCount',nexaDocuments.length);set('docInvoiceCount',nexaDocuments.filter(x=>x.type==='Facture').length);set('docTotal',money(nexaDocuments.reduce((a,x)=>a+Number(x.amount||0),0)));
 const box=document.getElementById('documentList');if(!box)return;
 box.innerHTML=nexaDocuments.slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).map((x,i)=>`<div class="purchase-row"><div><b>🧾 ${esc(x.number)}</b><small>${esc(x.client||'Client')} · ${esc(x.product||'Vente')} · ${x.createdAt?new Date(x.createdAt).toLocaleDateString('fr-FR'):'—'}</small></div><strong>${money(x.amount)}</strong><button class="secondary" onclick="printDocument(${i})">Imprimer</button><button class="delete" onclick="deleteDocument(${i})">🗑️</button></div>`).join('')||'<div class="empty-state">Aucune facture. Crée ton premier document depuis une commande.</div>';
}
function openDocumentFromOrder(){
 if(!d.orders.length){alert('Crée d’abord une commande.');return}
 const f=document.getElementById('form');document.getElementById('mt').textContent='Nouvelle facture';
 f.innerHTML=`<div class="field"><label>Commande</label><select name="order" required>${d.orders.map((o,i)=>`<option value="${i}">${esc(o.client||'Client')} — ${esc(o.product||'Produit')} — ${money(o.amount||0)}</option>`).join('')}</select></div><button class="submit">Créer la facture</button>`;
 f.onsubmit=e=>{e.preventDefault();const o=d.orders[Number(new FormData(f).get('order'))];if(!o)return;const number='FAC-'+new Date().getFullYear()+'-'+String(nexaDocuments.length+1).padStart(4,'0');nexaDocuments.push({id:Date.now(),number,type:'Facture',client:o.client||'Client',phone:o.phone||'',product:o.product||'Vente',quantity:Number(o.quantity||1),amount:Number(o.amount||0),paymentStatus:o.paymentStatus||'À encaisser',createdAt:Date.now()});saveDocuments();closeBox();renderDocuments()};
 document.getElementById('modal').classList.add('show')
}
function printDocument(i){
 const x=nexaDocuments[i];if(!x)return;const a=nexaAccount||{};const w=window.open('','_blank');if(!w){alert('Autorise les fenêtres pour imprimer la facture.');return}
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(x.number)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:20px;color:#222}h1{margin-bottom:4px}.muted{color:#666}.box{border:1px solid #ddd;padding:18px;border-radius:12px;margin:22px 0}.total{font-size:22px;font-weight:700;text-align:right}@media print{button{display:none}}</style></head><body><h1>${esc(a.businessName||'NEXA')}</h1><div class="muted">Facture ${esc(x.number)} · ${new Date(x.createdAt).toLocaleDateString('fr-FR')}</div><div class="box"><b>Client</b><p>${esc(x.client)}</p>${x.phone?`<p>${esc(x.phone)}</p>`:''}</div><div class="box"><b>Vente</b><p>${esc(x.product)} · ${x.quantity} unité${x.quantity>1?'s':''}</p><div class="total">${money(x.amount)}</div><p class="muted">Paiement : ${esc(x.paymentStatus)}</p></div><button onclick="window.print()">Imprimer</button></body></html>`);w.document.close();w.focus()
}
function deleteDocument(i){if(!nexaDocuments[i]||!confirm('Supprimer cette facture ?'))return;nexaDocuments.splice(i,1);saveDocuments();renderDocuments()}

const modalEl=document.getElementById('modal'); if(modalEl){modalEl.addEventListener('click',e=>{if(e.target===modalEl)closeBox()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalEl.classList.contains('show'))closeBox()})}function setVisualMode(mode){let f=document.getElementById('form');f.dataset.visual=mode;document.getElementById('emojiMode').classList.toggle('active',mode==='emoji');document.getElementById('photoMode').classList.toggle('active',mode==='photo');document.getElementById('emojiFields').style.display=mode==='emoji'?'block':'none';document.getElementById('photoFields').style.display=mode==='photo'?'block':'none'}
function showPhotoPreview(src){let p=document.getElementById('photoPreview');p.innerHTML=src?`<img src="${src}" alt="Aperçu">`:'Aperçu de la photo';}
function openBox(t){let f=document.getElementById('form');document.getElementById('mt').textContent=t==='product'?'Ajouter un produit':t==='order'?'Nouvelle commande':'Ajouter une dépense';if(t==='product'){f.innerHTML='<div class="field"><label>Nom</label><input name="name" required></div><div class="field"><label>Prix de vente (FCFA)</label><input name="price" type="number" min="0" required></div><div class="field"><label>Coût d\'achat unitaire (FCFA)</label><input name="cost" type="number" min="0" value="0" required></div><div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="0" required></div><div class="field"><label>Seuil d’alerte stock</label><input name="lowStock" type="number" min="0" value="5" required></div><div class="field"><label>Visuel du produit</label><div class="visual-choice"><button type="button" id="emojiMode" onclick="setVisualMode(\'emoji\')">✨ Emoji</button><button type="button" id="photoMode" onclick="setVisualMode(\'photo\')">📷 Photo</button></div><div id="emojiFields"><input name="icon" placeholder="📦" maxlength="4"><div class="visual-note">Choisis un emoji pour représenter ton produit.</div></div><div id="photoFields" style="display:none"><input id="photoInput" type="file" accept="image/*"><div id="photoPreview" class="photo-preview">Aperçu de la photo</div><div class="visual-note">La photo est enregistrée dans ce prototype sur ton appareil.</div></div></div><button class="submit">Enregistrer</button>';f.dataset.visual='emoji';f.dataset.newPhoto='';setVisualMode('emoji');showPhotoPreview('');document.getElementById('photoInput').addEventListener('change',function(){let file=this.files&&this.files[0];if(!file)return;if(!file.type.startsWith('image/')){alert('Choisis une image.');this.value='';return}let reader=new FileReader();reader.onload=e=>{f.dataset.newPhoto=e.target.result;setVisualMode('photo');showPhotoPreview(e.target.result)};reader.readAsDataURL(file)});}if(t==='expense')f.innerHTML='<div class="field"><label>Description</label><input name="description" required></div><div class="field"><label>Catégorie</label><select name="category"><option>Stock</option><option>Transport</option><option>Marketing</option><option>Outils / logiciels</option><option>Livraison</option><option>Autre</option></select></div><div class="field"><label>Montant (FCFA)</label><input name="amount" type="number" min="0" required></div><button class="submit">Enregistrer</button>';if(t==='client')f.innerHTML='<div class="field"><label>Nom</label><input name="name" required></div><div class="field"><label>Téléphone (optionnel)</label><input name="phone" type="tel"></div><div class="field"><label>Note (optionnel)</label><textarea name="notes" rows="3" placeholder="Ex. préfère être livré le week-end…"></textarea></div><button class="submit">Enregistrer</button>';if(t==='order')f.innerHTML='<div class="field"><label>Client</label><input name="client" required></div><div class="field"><label>Téléphone (optionnel)</label><input name="phone" type="tel"></div><div class="field"><label>Produit</label><select name="product">'+d.products.map(x=>`<option>${esc(x.name)}</option>`).join('')+'</select></div><div class="field"><label>Quantité</label><input name="quantity" type="number" min="1" value="1" required></div><div class="field"><label>Montant total (FCFA)</label><input name="amount" type="number" min="0" required></div><div class="field"><label>Mode de paiement</label><select name="payment"><option>Non précisé</option><option>À la livraison</option><option>Wave — simulation</option><option>Orange Money — simulation</option><option>Espèces</option><option>Virement</option></select></div><div class="field"><label>Statut</label><select name="status"><option>En attente</option><option>Confirmée</option><option>Livrée</option></select></div><div class="field"><label>Encaissement</label><select name="paymentStatus"><option>Payée</option><option>À encaisser</option></select></div><div class="field"><label>Mode de livraison</label><select name="deliveryMode"><option>Non précisé</option><option>Retrait</option><option>Livraison locale</option><option>Livraison partenaire</option></select></div><div class="field"><label>Frais de livraison (FCFA)</label><input name="deliveryFee" type="number" min="0" value="0"></div><div class="field"><label>Suivi de livraison</label><select name="deliveryStatus"><option>À préparer</option><option>En livraison</option><option>Livrée</option></select></div><div class="field"><label>Lieu / adresse de livraison (optionnel)</label><input name="deliveryAddress" placeholder="Ex. Almadies, Dakar"></div><div class="field"><label>Note de livraison (optionnel)</label><textarea name="deliveryNote" rows="3" placeholder="Ex. appeler avant de livrer…"></textarea></div><button class="submit">Enregistrer</button>';f.onsubmit=e=>{e.preventDefault();let x=new FormData(f);if(t==='product')d.products.push({name:x.get('name'),price:+x.get('price'),cost:+x.get('cost'),category:x.get('category')||'Autre',stock:+x.get('stock'),lowStock:+x.get('lowStock'),icon:x.get('icon')||'',photo:f.dataset.visual==='photo'?(f.dataset.newPhoto||''):''});if(t==='order'){let product=x.get('product'),quantity=+x.get('quantity');if(!applyOrderStock(product,quantity))return;let clientName=x.get('client').trim(),phone=(x.get('phone')||'').trim(),existingClient=d.clients.find(c=>c.name.toLowerCase()===clientName.toLowerCase());if(existingClient){if(phone)existingClient.phone=phone}else d.clients.push({name:clientName,phone,notes:''});d.orders.push({client:clientName,phone,product,quantity,amount:+x.get('amount'),status:x.get('status'),payment:x.get('payment')||'Non précisé',paymentStatus:x.get('paymentStatus')||'Payée',deliveryMode:x.get('deliveryMode')||'Non précisé',deliveryFee:+(x.get('deliveryFee')||0),deliveryStatus:x.get('deliveryStatus')||'À préparer',deliveryAddress:(x.get('deliveryAddress')||'').trim(),deliveryNote:(x.get('deliveryNote')||'').trim(),channel:'Manuel',createdAt:Date.now(),stockMovement:{product,quantity}});}if(t==='expense')d.expenses.push({description:x.get('description'),category:x.get('category')||'Autre',amount:+x.get('amount'),createdAt:Date.now()});if(t==='client'){let name=x.get('name').trim();if(d.clients.some(c=>c.name.toLowerCase()===name.toLowerCase())){alert('Ce client existe déjà.');return}d.clients.push({name,phone:x.get('phone').trim(),notes:x.get('notes').trim()});}closeBox();render()};document.getElementById('modal').classList.add('show')}
function closeBox(){document.getElementById('modal').classList.remove('show')}
let storeSettings=JSON.parse(localStorage.getItem('nexaStore'))||{name:'Ma boutique',desc:'Découvrez nos produits et passez commande.',slug:'ma-boutique'};
let cart=JSON.parse(localStorage.getItem('nexaCart'))||[];
function saveStore(){localStorage.setItem('nexaStore',JSON.stringify(storeSettings));localStorage.setItem('nexaCart',JSON.stringify(cart));scheduleWorkspaceSync()}
function renderStore(){let q=(document.getElementById('storeSearch')?.value||'').toLowerCase().trim();document.getElementById('storeNameDisplay').textContent=storeSettings.name;document.getElementById('storeDescDisplay').textContent=storeSettings.desc;document.getElementById('storeLinkDisplay').textContent='nexa.store/'+storeSettings.slug;let ps=d.products.filter(p=>!q||p.name.toLowerCase().includes(q));document.getElementById('storeProducts').innerHTML=ps.map((p,i)=>{let idx=d.products.indexOf(p),stock=Number(p.stock||0);let visual=p.photo?`<img src="${p.photo}" alt="${esc(p.name)}">`:(p.icon||'📦');return `<article class="store-product"><div class="store-pic">${visual}</div><h3>${esc(p.name)}</h3><strong>${money(p.price)}</strong><small>${stock>0?stock+' disponible'+(stock>1?'s':''):'Rupture de stock'}</small><button ${stock<1?'disabled':''} onclick="addToCart(${idx})">${stock<1?'Indisponible':'Ajouter au panier'}</button></article>`}).join('')||'<div class="empty">Aucun produit trouvé.</div>';renderCart()}
function addToCart(i){let p=d.products[i];if(!p||Number(p.stock||0)<1)return;let item=cart.find(x=>x.product===p.name);if(item){if(item.quantity>=Number(p.stock||0)){alert('Stock maximum atteint.');return}item.quantity++}else cart.push({product:p.name,quantity:1,price:Number(p.price||0)});saveStore();renderCart()}
function removeFromCart(i){cart.splice(i,1);saveStore();renderCart()}
function changeCartQty(i,delta){let item=cart[i],p=findProduct(item.product);if(!item||!p)return;let next=item.quantity+delta;if(next<=0)return removeFromCart(i);if(next>Number(p.stock||0)){alert('Stock insuffisant.');return}item.quantity=next;saveStore();renderCart()}
function renderCart(){let total=0,count=0;cart.forEach(x=>{total+=x.price*x.quantity;count+=x.quantity});document.getElementById('cartCount').textContent=`${count} article${count>1?'s':''}`;document.getElementById('cartTotal').textContent=money(total);document.getElementById('cartItems').innerHTML=cart.map((x,i)=>`<div class="cart-row"><div><b>${esc(x.product)}</b><small>${money(x.price)} × ${x.quantity}</small></div><div><button class="qty" onclick="changeCartQty(${i},-1)">−</button><span>${x.quantity}</span><button class="qty" onclick="changeCartQty(${i},1)">+</button><button class="delete" onclick="removeFromCart(${i})">🗑️</button></div></div>`).join('')||'Ton panier est vide.'}
function openCheckout(){if(!cart.length){alert('Ajoute au moins un produit au panier.');return}document.getElementById('mt').textContent='Finaliser la commande';let f=document.getElementById('form');let total=cart.reduce((a,x)=>a+x.price*x.quantity,0);f.innerHTML=`<div class="checkout-summary"><b>Total : ${money(total)}</b><small>Prototype : aucune transaction réelle n’est effectuée.</small></div><div class="field"><label>Nom du client</label><input name="client" required></div><div class="field"><label>Contact (optionnel)</label><input name="phone" type="tel"></div><div class="field"><label>Mode de paiement</label><select name="payment"><option>À la livraison</option><option>Mobile Money — simulation</option><option>Espèces</option></select></div><div class="field"><label>Lieu / adresse de livraison (optionnel)</label><input name="deliveryAddress" placeholder="Ex. quartier, point de repère…"></div><div class="field"><label>Note de livraison (optionnel)</label><textarea name="deliveryNote" rows="3" placeholder="Ex. appeler avant de livrer…"></textarea></div><button class="submit">Confirmer la commande</button>`;f.onsubmit=e=>{e.preventDefault();let v=new FormData(f);cart.forEach(x=>{let p=findProduct(x.product);if(p)p.stock=Math.max(0,Number(p.stock||0)-x.quantity);let clientName=v.get('client').trim(),phone=(v.get('phone')||'').trim(),existing=d.clients.find(c=>c.name.toLowerCase()===clientName.toLowerCase());if(existing){if(phone)existing.phone=phone}else d.clients.push({name:clientName,phone,notes:''});d.orders.push({client:clientName,phone,product:x.product,quantity:x.quantity,amount:x.price*x.quantity,status:'En attente',payment:v.get('payment')||'À la livraison',paymentStatus:(v.get('payment')==='À la livraison'?'À encaisser':'Payée'),deliveryMode:'Livraison locale',deliveryFee:0,deliveryStatus:'À préparer',deliveryAddress:(v.get('deliveryAddress')||'').trim(),deliveryNote:(v.get('deliveryNote')||'').trim(),channel:'Boutique',createdAt:Date.now(),stockMovement:{product:x.product,quantity:x.quantity}})});cart=[];save();saveStore();closeBox();
function reportOrders(){let mode=document.getElementById('reportPeriod')?.value||'month',now=new Date(),start=new Date(0);if(mode==='month')start=new Date(now.getFullYear(),now.getMonth(),1);else if(mode!=='all')start=new Date(Date.now()-Number(mode)*86400000);return d.orders.filter(o=>{let t=Number(o.createdAt||0);return t>=start.getTime()&&t<=Date.now()})}
function reportExpenses(){let mode=document.getElementById('reportPeriod')?.value||'month',now=new Date(),start=new Date(0);if(mode==='month')start=new Date(now.getFullYear(),now.getMonth(),1);else if(mode!=='all')start=new Date(Date.now()-Number(mode)*86400000);return d.expenses.filter(x=>{let t=Number(x.createdAt||0);return t>=start.getTime()&&t<=Date.now()})}
function renderReports(){let orders=reportOrders(),expenses=reportExpenses(),r=sum(orders),e=sum(expenses),p=r-e,gross=orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0),avg=orders.length?Math.round(r/orders.length):0;let ids=['rrRevenue','rrExpenses','rrProfit'];[r,e,p].forEach((v,i)=>{let el=document.getElementById(ids[i]);if(el)el.textContent=money(v)});let oEl=document.getElementById('rrOrders');if(oEl)oEl.textContent=orders.length;let aEl=document.getElementById('rrAvg');if(aEl)aEl.textContent='Panier moyen : '+money(avg);let mode=document.getElementById('reportPeriod')?.value||'month',label=mode==='month'?'Ce mois':mode==='7'?'7 derniers jours':mode==='30'?'30 derniers jours':'Toute la période';let pl=document.getElementById('reportPeriodLabel');if(pl)pl.textContent=label;let rn=document.getElementById('rrRevenueNote');if(rn)rn.textContent=label;let pm={};orders.forEach(o=>{let k=o.product||'Produit';if(!pm[k])pm[k]={qty:0,revenue:0};pm[k].qty+=Number(o.quantity||1);pm[k].revenue+=Number(o.amount||0)});let tops=Object.entries(pm).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5);let rp=document.getElementById('reportProducts');if(rp)rp.innerHTML=tops.map(([n,v],i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><div class="rank-main"><b>${esc(n)}</b><small>${v.qty} unité${v.qty>1?'s':''}</small></div><strong>${money(v.revenue)}</strong></div>`).join('')||'Aucune vente sur cette période.';let cm={};orders.forEach(o=>{let k=o.channel||'Manuel';cm[k]=(cm[k]||0)+Number(o.amount||0)});let channels=Object.entries(cm).sort((a,b)=>b[1]-a[1]);let rc=document.getElementById('reportChannels');if(rc)rc.innerHTML=channels.map(([n,v])=>`<div class="report-line"><span>${n==='Boutique'?'🛍️':'✍️'} ${esc(n)}</span><strong>${money(v)}</strong></div>`).join('')||'Aucune vente sur cette période.';let rs=document.getElementById('reportSummary');if(rs){if(!orders.length&&!expenses.length)rs.textContent='Aucune activité sur la période sélectionnée.';else rs.innerHTML=`<b>${orders.length}</b> commande${orders.length>1?'s':''} pour <b>${money(r)}</b> de chiffre d’affaires. ${p>=0?'Ton résultat est positif.':'Tes dépenses dépassent tes revenus de '+money(Math.abs(p))+'.'}${tops[0]?` Ton produit moteur est <b>${esc(tops[0][0])}</b>.`:''} Marge brute estimée : <b>${money(gross)}</b>.`}}
function csvCell(v){let s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
function downloadCSV(filename,rows){let csv='\\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\\r\
');let blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportOrdersCSV(){let orders=reportOrders();downloadCSV('NEXA_commandes.csv',[['Client','Téléphone','Produit','Nombre','Montant FCFA','Statut','Paiement','Canal','Date'],...orders.map(o=>[o.client,o.phone,o.product,Number(o.quantity||1),Number(o.amount||0),o.status,o.payment,o.channel,o.createdAt?new Date(o.createdAt).toLocaleString('fr-FR'):''])]);}
function exportReportCSV(){let orders=reportOrders(),expenses=reportExpenses(),r=sum(orders),e=sum(expenses);downloadCSV('NEXA_rapport.csv',[['NEXA — Rapport','Valeur'],['Période',document.getElementById('reportPeriodLabel')?.textContent||''],['Chiffre d’affaires (FCFA)',r],['Dépenses (FCFA)',e],['Résultat (FCFA)',r-e],['Marge brute estimée (FCFA)',orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0)],['Commandes',orders.length],['Panier moyen (FCFA)',orders.length?Math.round(r/orders.length):0],[],['Produits','Unités','CA FCFA'],...Object.entries(orders.reduce((m,o)=>{let k=o.product||'Produit';if(!m[k])m[k]={q:0,r:0};m[k].q+=Number(o.quantity||1);m[k].r+=Number(o.amount||0);return m},{})).sort((a,b)=>b[1].r-a[1].r).map(([n,v])=>[n,v.q,v.r])]);}

function pct(v,t){return t>0?Math.min(100,Math.round(Number(v||0)/t*100)):0}
function renderGoals(){
 let now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1), end=new Date(now.getFullYear(),now.getMonth()+1,1), mo=(d.orders||[]).filter(o=>Number(o.createdAt||0)>=start.getTime()&&Number(o.createdAt||0)<end.getTime()), ex=(d.expenses||[]).filter(x=>Number(x.createdAt||0)>=start.getTime()&&Number(x.createdAt||0)<end.getTime());
 let r=sum(mo), e=sum(ex), prof=r-e, days=Math.max(1,Math.min(now.getDate(),new Date(now.getFullYear(),now.getMonth()+1,0).getDate())), monthDays=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), forecast=Math.round(r/days*monthDays);
 let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v};
 set('goalRevenue',money(r));set('goalRevenuePct',pct(r,goals.revenue)+'% de l’objectif');set('goalOrders',mo.length);set('goalOrdersPct',pct(mo.length,goals.orders)+'% de l’objectif');set('goalProfit',money(prof));set('goalProfitPct',pct(prof,goals.profit)+'% de l’objectif');set('goalForecast',money(forecast));
 set('goalRevenueTarget','Objectif : '+money(goals.revenue));set('goalOrdersTarget','Objectif : '+goals.orders);set('goalProfitTarget','Objectif : '+money(goals.profit));
 ['Revenue','Orders','Profit'].forEach((k,i)=>{let v=[r,mo.length,prof][i],t=[goals.revenue,goals.orders,goals.profit][i],el=document.getElementById('goal'+k+'Bar');if(el)el.style.width=pct(v,t)+'%'});
 set('goalPeriod',now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
 let proj=document.getElementById('goalProjection'); if(proj){if(!r)proj.textContent='Aucune vente ce mois-ci. Enregistre quelques commandes pour obtenir une projection.';else proj.innerHTML='Au rythme actuel, ton CA mensuel pourrait atteindre <b>'+money(forecast)+'</b>. '+(forecast>=goals.revenue?'Tu es sur une trajectoire qui peut atteindre l’objectif.':'Il manque environ <b>'+money(Math.max(0,goals.revenue-forecast))+'</b> à la projection pour atteindre l’objectif.')}
 let advice=document.getElementById('goalAdvice');if(advice){if(r>=goals.revenue)advice.textContent='🎉 Objectif de CA atteint. Concentre-toi maintenant sur la rentabilité et la régularité.';else if(prof>=goals.profit)advice.textContent='💚 Ton objectif de résultat est atteint. Continue à protéger ta marge.';else if(mo.length>=goals.orders)advice.textContent='🚀 Ton objectif de commandes est atteint. Travaille maintenant la valeur de chaque vente.';else advice.textContent='🎯 Choisis une priorité simple pour le mois : augmenter les ventes, protéger la marge ou accélérer les commandes.'}
}
function openGoalsSettings(){let f=document.getElementById('form');document.getElementById('mt').textContent='Configurer les objectifs';f.innerHTML=`<div class="field"><label>Objectif de chiffre d’affaires (FCFA)</label><input name="revenue" type="number" min="0" required></div><div class="field"><label>Objectif de commandes</label><input name="orders" type="number" min="0" required></div><div class="field"><label>Objectif de résultat (FCFA)</label><input name="profit" type="number" min="0" required></div><button class="submit">Enregistrer</button>`;f.elements.revenue.value=goals.revenue;f.elements.orders.value=goals.orders;f.elements.profit.value=goals.profit;f.onsubmit=e=>{e.preventDefault();goals={revenue:Number(f.elements.revenue.value||0),orders:Number(f.elements.orders.value||0),profit:Number(f.elements.profit.value||0)};saveGoals();closeBox();renderGoals()};document.getElementById('modal').classList.add('show')}

function renderInsights(){
 let orders=d.orders||[], expenses=d.expenses||[], now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1).getTime();
 let mo=orders.filter(o=>Number(o.createdAt||0)>=start), r=sum(mo), e=expenses.filter(x=>Number(x.createdAt||0)>=start).reduce((a,x)=>a+Number(x.amount||0),0);
 let gross=mo.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0);
 let avg=mo.length?Math.round(r/mo.length):0, low=(d.products||[]).filter(p=>Number(p.stock||0)<=Number(p.lowStock??5));
 let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v}; set('inRevenue',money(r));set('inGross',money(gross));set('inLow',low.length);set('inAvg',money(avg));
 set('inRevenueTrend',r>e?'Revenus au-dessus des dépenses':'Dépenses à surveiller');
 let actions=[];
 if(!orders.length) actions.push('🛍️ Enregistre ta première vente pour commencer ton analyse.');
 if(low.length) actions.push('⚠️ Réapprovisionne '+low.length+' produit'+(low.length>1?'s':'')+' en stock faible.');
 if(e>r&&e>0) actions.push('💸 Tes dépenses dépassent ton CA du mois : vérifie les charges prioritaires.');
 if(mo.length&&gross<=0) actions.push('📊 Ajoute les coûts d’achat de tes produits pour obtenir une marge plus fiable.');
 if(mo.length&&r>e&&low.length===0) actions.push('🚀 Ton activité est positive : concentre-toi sur tes produits les plus performants.');
 let ae=document.getElementById('insightActions');if(ae)ae.innerHTML=actions.map(x=>'<div class="activity-row"><span>'+x.slice(0,2)+'</span><div><b>'+esc(x.slice(2))+'</b></div></div>').join('')||'<div class="empty">Aucune priorité urgente. Continue à suivre ton activité.</div>';
 let pm={};mo.forEach(o=>{let k=o.product||'Produit';pm[k]=(pm[k]||0)+Number(o.amount||0)});
 let tops=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,3), pe=document.getElementById('insightProducts');if(pe)pe.innerHTML=tops.map(([n,v],i)=>'<div class="rank-row"><span class="rank-num">'+(i+1)+'</span><div class="rank-main"><b>'+esc(n)+'</b><small>CA généré</small></div><strong>'+money(v)+'</strong></div>').join('')||'<div class="empty">Pas encore assez de ventes pour classer les produits.</div>';
 let advice='';
 if(!mo.length) advice='Commence par enregistrer quelques ventes. NEXA pourra ensuite identifier tes produits moteurs, ta marge et les points à surveiller.';
 else if(e>r) advice='Ton premier objectif est de reprendre le contrôle des dépenses. Examine les charges qui peuvent être réduites ou reportées.';
 else if(low.length) advice='Ton activité est suivie, mais certains stocks sont faibles. Évite une rupture sur les produits qui se vendent le mieux.';
 else if(tops[0]) advice='Ton produit moteur actuel est '+tops[0][0]+'. Analyse son coût, sa marge et sa demande avant de décider d’augmenter son stock.';
 else advice='Continue à enregistrer tes opérations : plus NEXA dispose de données fiables, plus ses analyses deviennent utiles.';
 let ia=document.getElementById('insightAdvice');if(ia)ia.textContent=advice;
}

render();renderStore();renderInsights();renderGoals();alert('Commande enregistrée dans NEXA 🎉')};document.getElementById('modal').classList.add('show')}
function openStoreSettings(){document.getElementById('mt').textContent='Personnaliser la boutique';let f=document.getElementById('form');f.innerHTML=`<div class="field"><label>Nom de la boutique</label><input name="name" required></div><div class="field"><label>Description</label><textarea name="desc" rows="3"></textarea></div><div class="field"><label>Identifiant du lien</label><input name="slug" pattern="[a-z0-9-]+" required></div><button class="submit">Enregistrer</button>`;f.elements.name.value=storeSettings.name;f.elements.desc.value=storeSettings.desc;f.elements.slug.value=storeSettings.slug;f.onsubmit=e=>{e.preventDefault();let v=new FormData(f);storeSettings={name:v.get('name').trim(),desc:v.get('desc').trim(),slug:v.get('slug').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-')};saveStore();closeBox();renderStore()};document.getElementById('modal').classList.add('show')}
function copyStoreLink(){let text='nexa.store/'+storeSettings.slug;if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>alert('Lien copié : '+text)).catch(()=>alert(text))}else alert(text)}

function reportOrders(){let mode=document.getElementById('reportPeriod')?.value||'month',now=new Date(),start=new Date(0);if(mode==='month')start=new Date(now.getFullYear(),now.getMonth(),1);else if(mode!=='all')start=new Date(Date.now()-Number(mode)*86400000);return d.orders.filter(o=>{let t=Number(o.createdAt||0);return t>=start.getTime()&&t<=Date.now()})}
function reportExpenses(){let mode=document.getElementById('reportPeriod')?.value||'month',now=new Date(),start=new Date(0);if(mode==='month')start=new Date(now.getFullYear(),now.getMonth(),1);else if(mode!=='all')start=new Date(Date.now()-Number(mode)*86400000);return d.expenses.filter(x=>{let t=Number(x.createdAt||0);return t>=start.getTime()&&t<=Date.now()})}
function renderReports(){let orders=reportOrders(),expenses=reportExpenses(),r=sum(orders),e=sum(expenses),p=r-e,gross=orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0),avg=orders.length?Math.round(r/orders.length):0;let ids=['rrRevenue','rrExpenses','rrProfit'];[r,e,p].forEach((v,i)=>{let el=document.getElementById(ids[i]);if(el)el.textContent=money(v)});let oEl=document.getElementById('rrOrders');if(oEl)oEl.textContent=orders.length;let aEl=document.getElementById('rrAvg');if(aEl)aEl.textContent='Panier moyen : '+money(avg);let mode=document.getElementById('reportPeriod')?.value||'month',label=mode==='month'?'Ce mois':mode==='7'?'7 derniers jours':mode==='30'?'30 derniers jours':'Toute la période';let pl=document.getElementById('reportPeriodLabel');if(pl)pl.textContent=label;let rn=document.getElementById('rrRevenueNote');if(rn)rn.textContent=label;let pm={};orders.forEach(o=>{let k=o.product||'Produit';if(!pm[k])pm[k]={qty:0,revenue:0};pm[k].qty+=Number(o.quantity||1);pm[k].revenue+=Number(o.amount||0)});let tops=Object.entries(pm).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5);let rp=document.getElementById('reportProducts');if(rp)rp.innerHTML=tops.map(([n,v],i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><div class="rank-main"><b>${esc(n)}</b><small>${v.qty} unité${v.qty>1?'s':''}</small></div><strong>${money(v.revenue)}</strong></div>`).join('')||'Aucune vente sur cette période.';let cm={};orders.forEach(o=>{let k=o.channel||'Manuel';cm[k]=(cm[k]||0)+Number(o.amount||0)});let channels=Object.entries(cm).sort((a,b)=>b[1]-a[1]);let rc=document.getElementById('reportChannels');if(rc)rc.innerHTML=channels.map(([n,v])=>`<div class="report-line"><span>${n==='Boutique'?'🛍️':'✍️'} ${esc(n)}</span><strong>${money(v)}</strong></div>`).join('')||'Aucune vente sur cette période.';let rs=document.getElementById('reportSummary');if(rs){if(!orders.length&&!expenses.length)rs.textContent='Aucune activité sur la période sélectionnée.';else rs.innerHTML=`<b>${orders.length}</b> commande${orders.length>1?'s':''} pour <b>${money(r)}</b> de chiffre d’affaires. ${p>=0?'Ton résultat est positif.':'Tes dépenses dépassent tes revenus de '+money(Math.abs(p))+'.'}${tops[0]?` Ton produit moteur est <b>${esc(tops[0][0])}</b>.`:''} Marge brute estimée : <b>${money(gross)}</b>.`}}
function csvCell(v){let s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
function downloadCSV(filename,rows){let csv='\\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\\r\
');let blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportOrdersCSV(){let orders=reportOrders();downloadCSV('NEXA_commandes.csv',[['Client','Téléphone','Produit','Nombre','Montant FCFA','Statut','Paiement','Canal','Date'],...orders.map(o=>[o.client,o.phone,o.product,Number(o.quantity||1),Number(o.amount||0),o.status,o.payment,o.channel,o.createdAt?new Date(o.createdAt).toLocaleString('fr-FR'):''])]);}
function exportReportCSV(){let orders=reportOrders(),expenses=reportExpenses(),r=sum(orders),e=sum(expenses);downloadCSV('NEXA_rapport.csv',[['NEXA — Rapport','Valeur'],['Période',document.getElementById('reportPeriodLabel')?.textContent||''],['Chiffre d’affaires (FCFA)',r],['Dépenses (FCFA)',e],['Résultat (FCFA)',r-e],['Marge brute estimée (FCFA)',orders.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0)],['Commandes',orders.length],['Panier moyen (FCFA)',orders.length?Math.round(r/orders.length):0],[],['Produits','Unités','CA FCFA'],...Object.entries(orders.reduce((m,o)=>{let k=o.product||'Produit';if(!m[k])m[k]={q:0,r:0};m[k].q+=Number(o.quantity||1);m[k].r+=Number(o.amount||0);return m},{})).sort((a,b)=>b[1].r-a[1].r).map(([n,v])=>[n,v.q,v.r])]);}

function pct(v,t){return t>0?Math.min(100,Math.round(Number(v||0)/t*100)):0}
function renderGoals(){
 let now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1), end=new Date(now.getFullYear(),now.getMonth()+1,1), mo=(d.orders||[]).filter(o=>Number(o.createdAt||0)>=start.getTime()&&Number(o.createdAt||0)<end.getTime()), ex=(d.expenses||[]).filter(x=>Number(x.createdAt||0)>=start.getTime()&&Number(x.createdAt||0)<end.getTime());
 let r=sum(mo), e=sum(ex), prof=r-e, days=Math.max(1,Math.min(now.getDate(),new Date(now.getFullYear(),now.getMonth()+1,0).getDate())), monthDays=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), forecast=Math.round(r/days*monthDays);
 let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v};
 set('goalRevenue',money(r));set('goalRevenuePct',pct(r,goals.revenue)+'% de l’objectif');set('goalOrders',mo.length);set('goalOrdersPct',pct(mo.length,goals.orders)+'% de l’objectif');set('goalProfit',money(prof));set('goalProfitPct',pct(prof,goals.profit)+'% de l’objectif');set('goalForecast',money(forecast));
 set('goalRevenueTarget','Objectif : '+money(goals.revenue));set('goalOrdersTarget','Objectif : '+goals.orders);set('goalProfitTarget','Objectif : '+money(goals.profit));
 ['Revenue','Orders','Profit'].forEach((k,i)=>{let v=[r,mo.length,prof][i],t=[goals.revenue,goals.orders,goals.profit][i],el=document.getElementById('goal'+k+'Bar');if(el)el.style.width=pct(v,t)+'%'});
 set('goalPeriod',now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
 let proj=document.getElementById('goalProjection'); if(proj){if(!r)proj.textContent='Aucune vente ce mois-ci. Enregistre quelques commandes pour obtenir une projection.';else proj.innerHTML='Au rythme actuel, ton CA mensuel pourrait atteindre <b>'+money(forecast)+'</b>. '+(forecast>=goals.revenue?'Tu es sur une trajectoire qui peut atteindre l’objectif.':'Il manque environ <b>'+money(Math.max(0,goals.revenue-forecast))+'</b> à la projection pour atteindre l’objectif.')}
 let advice=document.getElementById('goalAdvice');if(advice){if(r>=goals.revenue)advice.textContent='🎉 Objectif de CA atteint. Concentre-toi maintenant sur la rentabilité et la régularité.';else if(prof>=goals.profit)advice.textContent='💚 Ton objectif de résultat est atteint. Continue à protéger ta marge.';else if(mo.length>=goals.orders)advice.textContent='🚀 Ton objectif de commandes est atteint. Travaille maintenant la valeur de chaque vente.';else advice.textContent='🎯 Choisis une priorité simple pour le mois : augmenter les ventes, protéger la marge ou accélérer les commandes.'}
}
function openGoalsSettings(){let f=document.getElementById('form');document.getElementById('mt').textContent='Configurer les objectifs';f.innerHTML=`<div class="field"><label>Objectif de chiffre d’affaires (FCFA)</label><input name="revenue" type="number" min="0" required></div><div class="field"><label>Objectif de commandes</label><input name="orders" type="number" min="0" required></div><div class="field"><label>Objectif de résultat (FCFA)</label><input name="profit" type="number" min="0" required></div><button class="submit">Enregistrer</button>`;f.elements.revenue.value=goals.revenue;f.elements.orders.value=goals.orders;f.elements.profit.value=goals.profit;f.onsubmit=e=>{e.preventDefault();goals={revenue:Number(f.elements.revenue.value||0),orders:Number(f.elements.orders.value||0),profit:Number(f.elements.profit.value||0)};saveGoals();closeBox();renderGoals()};document.getElementById('modal').classList.add('show')}

function renderInsights(){
 let orders=d.orders||[], expenses=d.expenses||[], now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1).getTime();
 let mo=orders.filter(o=>Number(o.createdAt||0)>=start), r=sum(mo), e=expenses.filter(x=>Number(x.createdAt||0)>=start).reduce((a,x)=>a+Number(x.amount||0),0);
 let gross=mo.reduce((acc,o)=>{let pr=findProduct(o.product);return acc+Math.max(0,Number(o.amount||0)-Number(pr?.cost||0)*Number(o.quantity||1))},0);
 let avg=mo.length?Math.round(r/mo.length):0, low=(d.products||[]).filter(p=>Number(p.stock||0)<=Number(p.lowStock??5));
 let set=(id,v)=>{let el=document.getElementById(id);if(el)el.textContent=v}; set('inRevenue',money(r));set('inGross',money(gross));set('inLow',low.length);set('inAvg',money(avg));
 set('inRevenueTrend',r>e?'Revenus au-dessus des dépenses':'Dépenses à surveiller');
 let actions=[];
 if(!orders.length) actions.push('🛍️ Enregistre ta première vente pour commencer ton analyse.');
 if(low.length) actions.push('⚠️ Réapprovisionne '+low.length+' produit'+(low.length>1?'s':'')+' en stock faible.');
 if(e>r&&e>0) actions.push('💸 Tes dépenses dépassent ton CA du mois : vérifie les charges prioritaires.');
 if(mo.length&&gross<=0) actions.push('📊 Ajoute les coûts d’achat de tes produits pour obtenir une marge plus fiable.');
 if(mo.length&&r>e&&low.length===0) actions.push('🚀 Ton activité est positive : concentre-toi sur tes produits les plus performants.');
 let ae=document.getElementById('insightActions');if(ae)ae.innerHTML=actions.map(x=>'<div class="activity-row"><span>'+x.slice(0,2)+'</span><div><b>'+esc(x.slice(2))+'</b></div></div>').join('')||'<div class="empty">Aucune priorité urgente. Continue à suivre ton activité.</div>';
 let pm={};mo.forEach(o=>{let k=o.product||'Produit';pm[k]=(pm[k]||0)+Number(o.amount||0)});
 let tops=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,3), pe=document.getElementById('insightProducts');if(pe)pe.innerHTML=tops.map(([n,v],i)=>'<div class="rank-row"><span class="rank-num">'+(i+1)+'</span><div class="rank-main"><b>'+esc(n)+'</b><small>CA généré</small></div><strong>'+money(v)+'</strong></div>').join('')||'<div class="empty">Pas encore assez de ventes pour classer les produits.</div>';
 let advice='';
 if(!mo.length) advice='Commence par enregistrer quelques ventes. NEXA pourra ensuite identifier tes produits moteurs, ta marge et les points à surveiller.';
 else if(e>r) advice='Ton premier objectif est de reprendre le contrôle des dépenses. Examine les charges qui peuvent être réduites ou reportées.';
 else if(low.length) advice='Ton activité est suivie, mais certains stocks sont faibles. Évite une rupture sur les produits qui se vendent le mieux.';
 else if(tops[0]) advice='Ton produit moteur actuel est '+tops[0][0]+'. Analyse son coût, sa marge et sa demande avant de décider d’augmenter son stock.';
 else advice='Continue à enregistrer tes opérations : plus NEXA dispose de données fiables, plus ses analyses deviennent utiles.';
 let ia=document.getElementById('insightAdvice');if(ia)ia.textContent=advice;
}

render();renderStore();renderInsights();renderGoals();
let purchases=JSON.parse(localStorage.getItem('nexaPurchases')||'null')||[];
function savePurchases(){localStorage.setItem('nexaPurchases',JSON.stringify(purchases));scheduleWorkspaceSync()}
function renderPurchases(){let q=(document.getElementById('supplierSearch')?.value||'').toLowerCase().trim(),total=purchases.reduce((a,x)=>a+Number(x.amount||0),0),units=purchases.reduce((a,x)=>a+Number(x.quantity||0),0),suppliers=[...new Set(purchases.map(x=>String(x.supplier||'').trim()).filter(Boolean))],set=(id,v)=>{let e=document.getElementById(id);if(e)e.textContent=v};set('purchaseTotal',money(total));set('purchaseUnits',units);set('supplierCount',suppliers.length);let sl=document.getElementById('supplierList');if(sl){let rows=suppliers.filter(n=>n.toLowerCase().includes(q)).map(n=>{let ps=purchases.filter(x=>x.supplier===n),spent=ps.reduce((a,x)=>a+Number(x.amount||0),0),last=ps.map(x=>Number(x.createdAt||0)).sort((a,b)=>b-a)[0];return `<div class="purchase-row"><div><b>${esc(n)}</b><small>${ps.length} achat${ps.length>1?'s':''} · dernier ${last?new Date(last).toLocaleDateString('fr-FR'):'—'}</small></div><strong>${money(spent)}</strong></div>`}).join('');sl.innerHTML=rows||'<div class="empty-state">Aucun fournisseur trouvé.</div>'}let pl=document.getElementById('purchaseList');if(pl){pl.innerHTML=purchases.slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,8).map(x=>`<div class="purchase-row"><div><b>${esc(x.product)}</b><small>${esc(x.supplier||'Fournisseur non renseigné')} · ${Number(x.quantity||0)} unité${Number(x.quantity||0)>1?'s':''}</small></div><strong>${money(x.amount)}</strong><button class="delete" onclick="deletePurchase(${purchases.indexOf(x)})">🗑️</button></div>`).join('')||'<div class="empty-state">Aucun achat enregistré.</div>'}let ins=document.getElementById('purchaseInsight');if(ins){if(!purchases.length)ins.textContent='Ajoute des achats pour suivre tes coûts de réapprovisionnement.';else{let avg=units?Math.round(total/units):0;ins.innerHTML=`Coût moyen d’achat : <b>${money(avg)}</b> par unité. Tu as enregistré <b>${purchases.length}</b> achat${purchases.length>1?'s':''}.`}}}
function deletePurchase(i){if(!purchases[i])return;if(!confirm('Supprimer cet achat ?'))return;purchases.splice(i,1);savePurchases();renderPurchases()}
function openPurchase(){let f=document.getElementById('form');document.getElementById('mt').textContent='Nouvel achat';f.innerHTML=`<div class="field"><label>Produit</label><select name="product" required>${(d.products||[]).map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')||'<option value="">Aucun produit</option>'}</select></div><div class="field"><label>Fournisseur</label><input name="supplier" placeholder="Nom du fournisseur" required></div><div class="field"><label>Quantité achetée</label><input name="quantity" type="number" min="1" value="1" required></div><div class="field"><label>Coût total (FCFA)</label><input name="amount" type="number" min="0" required></div><div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><button class="submit">Enregistrer l'achat</button>`;f.onsubmit=e=>{e.preventDefault();let v=new FormData(f),product=String(v.get('product')||'').trim(),quantity=Number(v.get('quantity')||0),amount=Number(v.get('amount')||0),date=v.get('date');if(!product||quantity<=0)return;let createdAt=date?new Date(date+'T12:00:00').getTime():Date.now();purchases.push({product,supplier:String(v.get('supplier')||'').trim(),quantity,amount,createdAt});let pr=findProduct(product);if(pr){pr.stock=Number(pr.stock||0)+quantity;let unit=quantity?amount/quantity:0;if(unit>0)pr.cost=Math.round(unit)}save();savePurchases();closeBox();render();renderPurchases()};document.getElementById('modal').classList.add('show')}

// NEXA V30 — account/profile + backup layer
let nexaAccount = JSON.parse(localStorage.getItem('nexaAccount') || 'null') || {businessName:'',ownerName:'',email:'',country:'Sénégal'};
function saveAccountProfile(){
  const businessName=(document.getElementById('accountBusinessName')?.value||'').trim();
  const ownerName=(document.getElementById('accountOwnerName')?.value||'').trim();
  const email=(document.getElementById('accountEmail')?.value||'').trim();
  const country=document.getElementById('accountCountry')?.value||'Sénégal';
  if(!businessName){
    const hint=document.getElementById('accountSaveHint');
    if(hint) hint.textContent='⚠️ Ajoute d’abord le nom de ton entreprise.';
    document.getElementById('accountBusinessName')?.focus();
    return false;
  }
  nexaAccount={businessName,ownerName,email,country};
  localStorage.setItem('nexaAccount',JSON.stringify(nexaAccount)); scheduleWorkspaceSync();
  const preview=document.getElementById('accountPreviewName');
  const meta=document.getElementById('accountPreviewMeta');
  if(preview) preview.textContent=businessName;
  if(meta) meta.textContent=(ownerName?ownerName+' · ':'')+country+(email?' · '+email:'');
  const status=document.getElementById('backupStatus');
  if(status) status.textContent='Profil enregistré avec succès ✓';
  const hint=document.getElementById('accountSaveHint');
  if(hint) hint.textContent='Modifications enregistrées sur cet appareil ✓';
  const btn=document.getElementById('saveAccountBtn');
  if(btn){
    const original='✓ Enregistrer les modifications';
    btn.textContent='✓ Enregistré !';
    setTimeout(()=>{if(document.getElementById('saveAccountBtn')) document.getElementById('saveAccountBtn').textContent=original},1800);
  }
  if(typeof updateOnboarding==='function') updateOnboarding();
  return true;
}
function renderAccount(){
  const a=nexaAccount||{};
  const ids={accountBusinessName:a.businessName||'',accountOwnerName:a.ownerName||'',accountEmail:a.email||'',accountCountry:a.country||'Sénégal'};
  Object.entries(ids).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v});
}
function exportNexaBackup(){
  const payload={version:'NEXA_V30',exportedAt:new Date().toISOString(),nexa:JSON.parse(localStorage.getItem('nexa')||'{}'),nexaStore:JSON.parse(localStorage.getItem('nexaStore')||'{}'),nexaGoals:JSON.parse(localStorage.getItem('nexaGoals')||'{}'),nexaAccount:nexaAccount,nexaPurchases:JSON.parse(localStorage.getItem('nexaPurchases')||'[]'),nexaDocuments:JSON.parse(localStorage.getItem('nexaDocuments')||'[]')};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='NEXA_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url);
  const el=document.getElementById('backupStatus');if(el)el.textContent='Sauvegarde créée ✓';
}
function importNexaBackup(event){
  const file=event.target.files?.[0]; if(!file)return; const reader=new FileReader();
  reader.onload=()=>{try{const p=JSON.parse(reader.result); if(!p.nexa)throw new Error('Format invalide'); localStorage.setItem('nexa',JSON.stringify(p.nexa)); if(p.nexaStore)localStorage.setItem('nexaStore',JSON.stringify(p.nexaStore)); if(p.nexaGoals)localStorage.setItem('nexaGoals',JSON.stringify(p.nexaGoals)); if(p.nexaAccount){nexaAccount=p.nexaAccount;localStorage.setItem('nexaAccount',JSON.stringify(nexaAccount)); scheduleWorkspaceSync();} if(p.nexaPurchases)localStorage.setItem('nexaPurchases',JSON.stringify(p.nexaPurchases)); if(p.nexaDocuments)localStorage.setItem('nexaDocuments',JSON.stringify(p.nexaDocuments)); location.reload();}catch(e){alert('Cette sauvegarde NEXA est invalide.');}}; reader.readAsText(file);
}

setTimeout(()=>{
  renderAccount();
  const saveBtn=document.getElementById('saveAccountBtn');
  if(saveBtn) saveBtn.addEventListener('click',saveAccountProfile);
  nav('home');
}, 0);


// NEXA V33 — Notifications Center
let nexaNotifPrefs=JSON.parse(localStorage.getItem('nexaNotifPrefs')||'null')||{stock:true,payment:true,goal:true,activity:true};
let nexaNotifications=JSON.parse(localStorage.getItem('nexaNotifications')||'[]');
function saveNotifPrefs(){
  nexaNotifPrefs={stock:!!document.getElementById('notifStockPref')?.checked,payment:!!document.getElementById('notifPaymentPref')?.checked,goal:!!document.getElementById('notifGoalPref')?.checked,activity:!!document.getElementById('notifActivityPref')?.checked};
  localStorage.setItem('nexaNotifPrefs',JSON.stringify(nexaNotifPrefs)); renderNotifications();
}
function buildNotifications(){
  const out=[]; const now=Date.now();
  if(nexaNotifPrefs.stock){(d.products||[]).forEach(p=>{let stock=Number(p.stock||0),threshold=Number(p.lowStock==null?5:p.lowStock); if(stock<=threshold) out.push({key:'stock:'+p.name,type:'stock',icon:stock<=0?'🚨':'📦',title:stock<=0?'Rupture de stock':'Stock faible',text:stock<=0?`${p.name} est en rupture de stock.`:`${p.name} : ${stock} unité${stock>1?'s':''} restante${stock>1?'s':''}.`,priority:stock<=0?'high':'medium'});});}
  if(nexaNotifPrefs.payment){let unpaid=(d.orders||[]).filter(o=>(o.paymentStatus||'Payée')==='À encaisser'); if(unpaid.length){let total=unpaid.reduce((a,o)=>a+Number(o.amount||0),0);out.push({key:'payment:all',type:'payment',icon:'💳',title:'Paiements à encaisser',text:`${unpaid.length} commande${unpaid.length>1?'s':''} pour ${money(total)} restent à encaisser.`,priority:'high'});}}
  if(nexaNotifPrefs.goal){let goal=JSON.parse(localStorage.getItem('nexaGoals')||'null')||{revenue:500000};let start=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();let rev=(d.orders||[]).filter(o=>Number(o.createdAt||0)>=start).reduce((a,o)=>a+Number(o.amount||0),0);let pct=goal.revenue?Math.round(rev/Number(goal.revenue)*100):0;if(pct>=100)out.push({key:'goal:done',type:'goal',icon:'🏆',title:'Objectif CA atteint',text:`Tu as atteint ${money(rev)} ce mois-ci.`,priority:'low'});else if(pct>=75)out.push({key:'goal:close',type:'goal',icon:'🎯',title:'Objectif presque atteint',text:`Tu es à ${pct}% de ton objectif de chiffre d’affaires.`,priority:'medium'});}
  if(nexaNotifPrefs.activity && (d.orders||[]).length){let latest=d.orders.slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))[0];if(latest){out.push({key:'activity:latest',type:'activity',icon:'✨',title:'Dernière commande',text:`${latest.client||'Client'} · ${latest.product||'Produit'} · ${money(latest.amount||0)}.`,priority:'low'});}}
  return out.slice(0,12);
}
function renderNotifications(){
  const prefs=nexaNotifPrefs||{};['stock','payment','goal','activity'].forEach(k=>{let el=document.getElementById('notif'+k.charAt(0).toUpperCase()+k.slice(1)+'Pref');if(el)el.checked=!!prefs[k]});
  const list=buildNotifications(); let readKeys=JSON.parse(localStorage.getItem('nexaNotifRead')||'[]');
  const unread=list.filter(n=>!readKeys.includes(n.key)).length; let set=(id,v)=>{let e=document.getElementById(id);if(e)e.textContent=v};
  set('notifUnread',unread);set('notifStock',list.filter(n=>n.type==='stock').length);set('notifPayment',list.filter(n=>n.type==='payment').length);
  let goal=JSON.parse(localStorage.getItem('nexaGoals')||'null')||{revenue:500000};let start=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();let rev=(d.orders||[]).filter(o=>Number(o.createdAt||0)>=start).reduce((a,o)=>a+Number(o.amount||0),0);set('notifGoal',(goal.revenue?Math.min(100,Math.round(rev/Number(goal.revenue)*100)):0)+'%');
  let box=document.getElementById('notificationList');if(!box)return;box.innerHTML=list.map(n=>{let unread=!readKeys.includes(n.key);return `<div class="notification-item ${unread?'unread':''}"><div class="notification-icon">${n.icon}</div><div class="notification-main"><b>${unread?'<span class="notif-dot">●</span>':''}${esc(n.title)}</b><small>${esc(n.text)}</small></div>${unread?`<button class="secondary" onclick="markNotificationRead('${n.key.replace(/'/g,"\'")}')">Marquer lu</button>`:''}</div>`}).join('')||'<div class="empty-state">Aucune alerte pour le moment. NEXA garde un œil sur ton activité. ✨</div>';
}
function markNotificationRead(key){let keys=JSON.parse(localStorage.getItem('nexaNotifRead')||'[]');if(!keys.includes(key))keys.push(key);localStorage.setItem('nexaNotifRead',JSON.stringify(keys));renderNotifications()}
function markNotificationsRead(){let keys=JSON.parse(localStorage.getItem('nexaNotifRead')||'[]');buildNotifications().forEach(n=>{if(!keys.includes(n.key))keys.push(n.key)});localStorage.setItem('nexaNotifRead',JSON.stringify(keys));renderNotifications()}


// NEXA V34 — Recherche globale
let globalSearchType='all';
function setSearchType(type){
  globalSearchType=type;
  document.querySelectorAll('.search-filter').forEach(b=>b.classList.toggle('active',b.dataset.searchType===type));
  renderGlobalSearch();
}
function renderGlobalSearch(){
  const input=document.getElementById('globalSearch'); if(!input)return;
  const q=input.value.toLowerCase().trim();
  const results=[];
  const add=(type,icon,title,meta,action)=>{if(globalSearchType==='all'||globalSearchType===type)results.push({type,icon,title,meta,action});};
  if(q){
    (d.products||[]).forEach((p,i)=>{if([p.name,p.icon,p.photo].join(' ').toLowerCase().includes(q))add('products','📦',p.name,`${money(p.price)} · Stock ${Number(p.stock||0)}`,()=>nav('products'))});
    (d.orders||[]).forEach((o,i)=>{let text=[o.client,o.product,o.phone,o.status,o.payment,o.paymentStatus,o.channel].join(' ').toLowerCase();if(text.includes(q))add('orders','🧾',`${o.client||'Client'} — ${o.product||'Produit'}`,`${Number(o.quantity||1)} unité · ${money(o.amount||0)} · ${o.status||'En attente'}`,()=>viewOrder(i))});
    (d.clients||[]).forEach((c,i)=>{let text=[c.name,c.phone,c.notes].join(' ').toLowerCase();if(text.includes(q))add('clients','👤',c.name,`${c.phone||'Sans téléphone'} · ${d.orders.filter(o=>o.client===c.name).length} commande(s)`,()=>clientProfile(c))});
    (purchases||[]).forEach((x,i)=>{let text=[x.supplier,x.product,x.note].join(' ').toLowerCase();if(text.includes(q))add('purchases','🏭',x.product||'Achat',`${x.supplier||'Fournisseur'} · ${Number(x.quantity||0)} unité(s) · ${money(x.amount||0)}`,()=>nav('purchases'))});
  }
  const count=document.getElementById('globalSearchCount');if(count)count.textContent=`${results.length} résultat${results.length>1?'s':''}`;
  const box=document.getElementById('globalSearchResults');if(!box)return;
  if(!q){box.innerHTML='<div class="empty-state">Tape un mot pour rechercher dans ton activité.</div>';return;}
  box.innerHTML=results.slice(0,30).map((r,i)=>`<button class="global-result" onclick="globalSearchOpen(${i})"><span class="global-result-icon">${r.icon}</span><span class="global-result-main"><b>${esc(r.title)}</b><small>${esc(r.meta)}</small></span><span class="global-result-type">${r.type==='products'?'Produit':r.type==='orders'?'Commande':r.type==='clients'?'Client':'Achat'} ›</span></button>`).join('')||'<div class="empty-state">Aucun résultat. Essaie un autre mot.</div>';
  window.__nexaSearchResults=results.slice(0,30);
}
function globalSearchOpen(i){const r=window.__nexaSearchResults?.[i];if(r?.action)r.action();}

// NEXA V43 — platform readiness metadata
window.NEXA_PLATFORM_VERSION = 'V53';
window.NEXA_PLATFORM_MODE = 'prototype-local';
// NEXA V53 — backend readiness bridge. The existing localStorage prototype remains the source of truth.
window.NEXA_BACKEND_URL = '/api';
window.nexaBackendHealth = async function(){
  try{const r=await fetch(window.NEXA_BACKEND_URL+'/health',{cache:'no-store'});if(!r.ok)throw new Error('offline');return await r.json()}catch(e){return {ok:false}};
};


window.addEventListener("load",()=>setTimeout(()=>{renderCommercialCenter();renderDocuments();renderPayments()},0));

// NEXA V59 — Payment readiness (local prototype only)
let nexaPaymentIntents=JSON.parse(localStorage.getItem('nexaPaymentIntents')||'[]');
function savePaymentIntents(){localStorage.setItem('nexaPaymentIntents',JSON.stringify(nexaPaymentIntents));scheduleWorkspaceSync()}
function renderPayments(){
  const orders=(d.orders||[]).filter(o=>(o.paymentStatus||'Payée')==='À encaisser');
  const total=orders.reduce((a,o)=>a+Number(o.amount||0),0);
  const unpaid=document.getElementById('paymentReadyUnpaid'); if(unpaid)unpaid.textContent=money(total);
  const count=document.getElementById('paymentIntentCount'); if(count)count.textContent=nexaPaymentIntents.length;
  const paid=document.getElementById('paymentPaidCount'); if(paid)paid.textContent=nexaPaymentIntents.filter(x=>x.status==='paid_simulated').length;
  const select=document.getElementById('paymentOrderSelect');
  if(select){select.innerHTML=orders.map((o,i)=>`<option value="${(d.orders||[]).indexOf(o)}">${esc(o.client||'Client')} — ${esc(o.product||'Produit')} — ${money(o.amount||0)}</option>`).join('') || '<option value="">Aucune commande à encaisser</option>';}
  const box=document.getElementById('paymentIntentList'); if(!box)return;
  box.innerHTML=nexaPaymentIntents.slice().reverse().map((x,ri)=>{const status=x.status==='paid_simulated'?'Payée (simulation)':'En attente';const originalIndex=nexaPaymentIntents.length-1-ri;return `<div class="notification-item"><div class="notification-icon">${x.status==='paid_simulated'?'✓':'💳'}</div><div class="notification-main"><b>${esc(x.client||'Client')} · ${esc(x.product||'Produit')}</b><small>${money(x.amount||0)} · ${esc(x.provider||'Prestataire')} · ${status} · ${new Date(x.createdAt).toLocaleString('fr-FR')}</small></div>${x.status!=='paid_simulated'?`<button class="secondary" onclick="simulatePaymentPaid(${originalIndex})">✓ Marquer payée (simulation)</button>`:''}</div>`}).join('') || '<div class="empty-state">Aucune demande de paiement préparée.</div>';
}
function createPaymentIntent(){
  const select=document.getElementById('paymentOrderSelect'); const idx=Number(select?.value); const o=d.orders?.[idx];
  if(!o){alert('Aucune commande à encaisser.');return;}
  const provider=document.getElementById('paymentProvider')?.value||'Prestataire — préparation';
  nexaPaymentIntents.push({id:'pi_'+Date.now(),orderIndex:idx,client:o.client,product:o.product,amount:Number(o.amount||0),provider,status:'pending',createdAt:Date.now()});
  savePaymentIntents(); renderPayments();
}
function simulatePaymentPaid(i){
  const x=nexaPaymentIntents[i]; if(!x)return;
  x.status='paid_simulated'; x.paidAt=Date.now();
  const o=d.orders?.[x.orderIndex]; if(o){o.paymentStatus='Payée';o.payment=x.provider;}
  savePaymentIntents(); save(); render(); renderPayments();
}


// NEXA V63 — Validation Center (founder workspace, local prototype)
const NEXA_VALIDATION_KEY='nexaValidationCenter';
function validationData(){try{return JSON.parse(localStorage.getItem(NEXA_VALIDATION_KEY)||'{"testers":[],"feedbacks":[],"bugs":[],"pro":[],"decisions":[]}')}catch{return {testers:[],feedbacks:[],bugs:[],pro:[],decisions:[]}}}
function saveValidation(v){localStorage.setItem(NEXA_VALIDATION_KEY,JSON.stringify(v));renderValidation()}
function addValidationTester(){const name=document.getElementById('valTesterName')?.value.trim();const type=document.getElementById('valTesterType')?.value||'Autre profil';if(!name){alert('Ajoute un identifiant de testeur.');return}const v=validationData();v.testers.push({id:'t_'+Date.now(),name,type,createdAt:Date.now()});saveValidation(v);document.getElementById('valTesterName').value=''}
function addValidationFeedback(){const tester=document.getElementById('valFeedbackTester')?.value;if(!tester){alert('Ajoute d’abord un testeur.');return}const text=document.getElementById('valFeedbackText')?.value.trim();if(!text){alert('Ajoute le contenu du feedback.');return}const v=validationData();v.feedbacks.push({tester,type:document.getElementById('valFeedbackType')?.value||'Utile',text,createdAt:Date.now()});saveValidation(v);document.getElementById('valFeedbackText').value=''}
function addValidationBug(){const title=document.getElementById('valBugTitle')?.value.trim();if(!title){alert('Décris le problème.');return}const v=validationData();v.bugs.push({title,priority:document.getElementById('valBugPriority')?.value||'Moyenne',status:'Ouvert',createdAt:Date.now()});saveValidation(v);document.getElementById('valBugTitle').value=''}
function toggleValidationBug(i){const v=validationData();if(v.bugs[i])v.bugs[i].status=v.bugs[i].status==='Ouvert'?'Résolu':'Ouvert';saveValidation(v)}
function addValidationPro(){const tester=document.getElementById('valProTester')?.value;if(!tester){alert('Ajoute d’abord un testeur.');return}const v=validationData();v.pro.push({tester,interest:document.getElementById('valProInterest')?.value||'maybe',createdAt:Date.now()});saveValidation(v)}
function addValidationDecision(){const title=document.getElementById('valDecisionTitle')?.value.trim(),reason=document.getElementById('valDecisionReason')?.value.trim();if(!title||!reason){alert('Ajoute une décision et son observation.');return}const v=validationData();v.decisions.push({title,reason,createdAt:Date.now()});saveValidation(v);document.getElementById('valDecisionTitle').value='';document.getElementById('valDecisionReason').value=''}
function resetValidationDemo(){if(!confirm('Effacer uniquement les données du Centre de validation ?'))return;localStorage.removeItem(NEXA_VALIDATION_KEY);renderValidation()}
function renderValidation(){const v=validationData();const set=(id,x)=>{const e=document.getElementById(id);if(e)e.textContent=x};set('valTesters',v.testers.length);set('valFeedbacks',v.feedbacks.length);set('valBugs',v.bugs.filter(b=>b.status==='Ouvert').length);const positive=v.pro.length?v.pro.filter(x=>x.interest==='yes').length/v.pro.length*100:0;set('valPro',Math.round(positive)+'%');
 const opts=v.testers.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} · ${esc(t.type)}</option>`).join('')||'<option value="">Aucun testeur</option>';['valFeedbackTester','valProTester'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=opts});
 const tl=document.getElementById('valTesterList');if(tl)tl.innerHTML=v.testers.slice().reverse().map(t=>`<div class="validation-row"><div><b>${esc(t.name)}</b><small>${esc(t.type)}</small></div><span class="tag">Testeur</span></div>`).join('')||'<div class="empty-state">Aucun testeur enregistré.</div>';
 const fl=document.getElementById('valFeedbackList');if(fl)fl.innerHTML=v.feedbacks.slice().reverse().slice(0,8).map(f=>`<div class="validation-row"><div><b>${esc(f.type)}</b><small>${esc(f.text)}</small></div><span class="tag">${esc(v.testers.find(t=>t.id===f.tester)?.name||'Testeur')}</span></div>`).join('')||'<div class="empty-state">Aucun feedback.</div>';
 const bl=document.getElementById('valBugList');if(bl)bl.innerHTML=v.bugs.slice().reverse().map((b,ri)=>{const i=v.bugs.length-1-ri;return `<div class="validation-row"><div><b>${esc(b.title)}</b><small>Priorité ${esc(b.priority)} · ${esc(b.status)}</small></div><button class="secondary" onclick="toggleValidationBug(${i})">${b.status==='Ouvert'?'✓ Résoudre':'↺ Rouvrir'}</button></div>`}).join('')||'<div class="empty-state">Aucun problème enregistré.</div>';
 const pl=document.getElementById('valProList');if(pl)pl.innerHTML=v.pro.slice().reverse().map(x=>`<div class="validation-row"><div><b>${x.interest==='yes'?'Oui':x.interest==='maybe'?'Peut-être':'Non'}</b><small>${esc(v.testers.find(t=>t.id===x.tester)?.name||'Testeur')}</small></div><span class="tag">Signal Pro</span></div>`).join('')||'<div class="empty-state">Aucun signal Pro.</div>';
 const dl=document.getElementById('valDecisionList');if(dl)dl.innerHTML=v.decisions.slice().reverse().map(d=>`<div class="validation-row"><div><b>${esc(d.title)}</b><small>${esc(d.reason)}</small></div><span class="tag">Décision</span></div>`).join('')||'<div class="empty-state">Aucune décision enregistrée.</div>';
}
window.addEventListener('load',()=>setTimeout(renderValidation,120));

// NEXA V64 — Growth & CEO Dashboard
function renderGrowth(){
 const v=validationData();
 const set=(id,x)=>{const e=document.getElementById(id);if(e)e.textContent=x};
 set('growthTesters',v.testers.length); set('growthFeedbacks',v.feedbacks.length);
 const positive=v.pro.length?Math.round(v.pro.filter(x=>x.interest==='yes').length/v.pro.length*100):0;
 set('growthPro',positive+'%'); set('growthBugs',v.bugs.filter(b=>b.status==='Ouvert').length);
 const priorities=[];
 if(!v.testers.length) priorities.push('👥 Recruter les premiers testeurs et observer leurs usages réels.');
 else if(v.feedbacks.length<v.testers.length) priorities.push('💬 Compléter les sessions : chaque testeur doit produire un retour exploitable.');
 if(v.bugs.some(b=>b.status==='Ouvert'&&b.priority==='Haute')) priorities.push('🐞 Résoudre en priorité les bugs critiques avant d’ajouter de nouvelles fonctions.');
 if(v.pro.length && positive<50) priorities.push('💎 Comprendre pourquoi la proposition Pro ne convainc pas encore.');
 if(!priorities.length) priorities.push('🚀 Consolider les signaux positifs avant d’accélérer la croissance.');
 const pe=document.getElementById('growthPriorities'); if(pe)pe.innerHTML=priorities.map(x=>`<div>${esc(x)}</div>`).join('');
 const steps=[['1','Validation','Obtenir des retours réels'],['2','Produit','Corriger les blocages récurrents'],['3','Valeur','Identifier la fonction qui crée le plus de valeur'],['4','Croissance','Seulement ensuite chercher davantage de clients']];
 const ne=document.getElementById('growthNext'); if(ne)ne.innerHTML=steps.map(x=>`<div><b>${x[0]}</b><span><strong>${esc(x[1])}</strong>${esc(x[2])}</span></div>`).join('');
 const summary=[];
 summary.push(`<div><strong>🧪 Validation</strong>${v.testers.length?`NEXA dispose de ${v.testers.length} testeur(s) enregistré(s), avec ${v.feedbacks.length} feedback(s).`:'Aucune donnée de validation réelle n’est encore enregistrée.'}</div>`);
 summary.push(`<div><strong>💎 Monétisation</strong>${v.pro.length?`Le signal Pro actuel est de ${positive}%. Ce chiffre est un signal de recherche, pas une vente.`:'Aucun signal Pro n’a encore été collecté.'}</div>`);
 summary.push(`<div><strong>🛡️ Discipline CEO</strong>La croissance ne doit pas être mesurée uniquement par le nombre d’utilisateurs : on cherche d’abord usage, valeur, rétention et volonté de payer.</div>`);
 const se=document.getElementById('growthSummary'); if(se)se.innerHTML=summary.join('');
}
window.addEventListener('load',()=>setTimeout(renderGrowth,180));


// NEXA V66 — Customer Success & Retention
const NEXA_RETENTION_KEY='nexaRetentionCenter';
function retentionData(){try{return JSON.parse(localStorage.getItem(NEXA_RETENTION_KEY)||'{"users":[],"reasons":[],"blockers":[],"success":[]}')}catch{return {users:[],reasons:[],blockers:[],success:[]}}}
function saveRetention(v){localStorage.setItem(NEXA_RETENTION_KEY,JSON.stringify(v));renderRetention()}
function addRetentionUser(){const name=document.getElementById('retUserName')?.value.trim();if(!name){alert('Ajoute un identifiant de testeur.');return}const v=retentionData();v.users.push({id:'r_'+Date.now(),name,usage:document.getElementById('retUsage')?.value||'Essaie encore',createdAt:Date.now()});saveRetention(v);document.getElementById('retUserName').value=''}
function addRetentionReason(){const user=document.getElementById('retReasonUser')?.value;if(!user){alert('Ajoute d’abord un utilisateur.');return}const v=retentionData();v.reasons.push({user,reason:document.getElementById('retReason')?.value||'Autre',createdAt:Date.now()});saveRetention(v)}
function addRetentionBlocker(){const user=document.getElementById('retBlockerUser')?.value,text=document.getElementById('retBlockerText')?.value.trim();if(!user||!text){alert('Choisis un utilisateur et décris le blocage.');return}const v=retentionData();v.blockers.push({user,text,createdAt:Date.now()});saveRetention(v);document.getElementById('retBlockerText').value=''}
function addRetentionSuccess(){const user=document.getElementById('retSuccessUser')?.value;if(!user){alert('Ajoute d’abord un utilisateur.');return}const v=retentionData();v.success.push({user,kind:document.getElementById('retSuccess')?.value||'success',createdAt:Date.now()});saveRetention(v)}
function renderRetention(){const v=retentionData(),set=(id,x)=>{const e=document.getElementById(id);if(e)e.textContent=x};set('retUsers',v.users.length);set('retValue',v.success.filter(x=>x.kind==='success'||x.kind==='both').length);set('retBlockers',v.blockers.length);set('retReferrals',v.success.filter(x=>x.kind==='recommend'||x.kind==='both').length);const opts=v.users.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${esc(u.usage)}</option>`).join('')||'<option value="">Aucun utilisateur</option>';['retReasonUser','retBlockerUser','retSuccessUser'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=opts});
 const ul=document.getElementById('retUserList');if(ul)ul.innerHTML=v.users.slice().reverse().map(u=>`<div class="validation-row"><div><b>${esc(u.name)}</b><small>${esc(u.usage)}</small></div><span class="tag">Suivi</span></div>`).join('')||'<div class="empty-state">Aucun utilisateur suivi.</div>';
 const rl=document.getElementById('retReasonList');if(rl)rl.innerHTML=v.reasons.slice().reverse().map(x=>`<div class="validation-row"><div><b>${esc(x.reason)}</b><small>${esc(v.users.find(u=>u.id===x.user)?.name||'Utilisateur')}</small></div><span class="tag">Valeur</span></div>`).join('')||'<div class="empty-state">Aucun motif enregistré.</div>';
 const bl=document.getElementById('retBlockerList');if(bl)bl.innerHTML=v.blockers.slice().reverse().map(x=>`<div class="validation-row"><div><b>${esc(x.text)}</b><small>${esc(v.users.find(u=>u.id===x.user)?.name||'Utilisateur')}</small></div><span class="tag">Blocage</span></div>`).join('')||'<div class="empty-state">Aucun blocage enregistré.</div>';
 const sl=document.getElementById('retSuccessList');if(sl)sl.innerHTML=v.success.slice().reverse().map(x=>`<div class="validation-row"><div><b>${x.kind==='both'?'Résultat + recommandation':x.kind==='recommend'?'Recommandation':'Résultat concret'}</b><small>${esc(v.users.find(u=>u.id===x.user)?.name||'Utilisateur')}</small></div><span class="tag">Signal</span></div>`).join('')||'<div class="empty-state">Aucun signal de réussite.</div>';
}
window.addEventListener('load',()=>setTimeout(renderRetention,220));
