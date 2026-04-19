// =============================================
//  SubTrack — App Logic (No Login)
//  Payment Cards + Subscription Card Linking
// =============================================

// ── CURRENCY ─────────────────────────────────
const CURRENCIES = {
  PKR:{ sym:'₨',  rate:278  },
  USD:{ sym:'$',  rate:1    },
  EUR:{ sym:'€',  rate:0.92 },
  GBP:{ sym:'£',  rate:0.79 },
  AED:{ sym:'AED ',rate:3.67},
  SAR:{ sym:'SAR ',rate:3.75},
  INR:{ sym:'₹',  rate:83.5 },
  CAD:{ sym:'CA$',rate:1.36 },
  AUD:{ sym:'A$', rate:1.53 },
  JPY:{ sym:'¥',  rate:150  },
};

// ── CARD THEMES ───────────────────────────────
const CARD_THEMES = [
  { id:0, label:'Midnight Blue',  dotClass:'dot-0' },
  { id:1, label:'Slate',          dotClass:'dot-1' },
  { id:2, label:'Ocean Blue',     dotClass:'dot-2' },
  { id:3, label:'Purple Haze',    dotClass:'dot-3' },
  { id:4, label:'Emerald',        dotClass:'dot-4' },
  { id:5, label:'Crimson',        dotClass:'dot-5' },
  { id:6, label:'Graphite',       dotClass:'dot-6' },
  { id:7, label:'Deep Violet',    dotClass:'dot-7' },
];

const CARD_NETWORKS = ['Visa','Mastercard','AMEX','Debit','Other'];

// ── SERVICES ──────────────────────────────────
const SERVICES = [
  { name:'Netflix',    emoji:'🎬', bg:'#fef2f2', accent:'#ef4444' },
  { name:'Spotify',    emoji:'🎵', bg:'#f0fdf4', accent:'#22c55e' },
  { name:'YouTube',    emoji:'▶️', bg:'#fef2f2', accent:'#ef4444' },
  { name:'Amazon',     emoji:'📦', bg:'#fffbeb', accent:'#f59e0b' },
  { name:'Apple',      emoji:'🍎', bg:'#f1f5f9', accent:'#64748b' },
  { name:'Disney+',    emoji:'✨', bg:'#eff6ff', accent:'#3b82f6' },
  { name:'HBO Max',    emoji:'🎭', bg:'#faf5ff', accent:'#a855f7' },
  { name:'Hulu',       emoji:'📺', bg:'#f0fdf4', accent:'#22c55e' },
  { name:'Adobe CC',   emoji:'🖌️', bg:'#fff7ed', accent:'#f97316' },
  { name:'Microsoft',  emoji:'💼', bg:'#eff6ff', accent:'#2563eb' },
  { name:'Google One', emoji:'☁️', bg:'#eff6ff', accent:'#3b82f6' },
  { name:'Dropbox',    emoji:'📂', bg:'#eff6ff', accent:'#0ea5e9' },
  { name:'Slack',      emoji:'💬', bg:'#fdf4ff', accent:'#a21caf' },
  { name:'Zoom',       emoji:'📹', bg:'#eff6ff', accent:'#2563eb' },
  { name:'ChatGPT',    emoji:'🤖', bg:'#f0fdf4', accent:'#10b981' },
  { name:'Canva',      emoji:'🎨', bg:'#fff7ed', accent:'#fb923c' },
  { name:'LinkedIn',   emoji:'💼', bg:'#eff6ff', accent:'#0284c7' },
  { name:'iCloud',     emoji:'☁️', bg:'#f1f5f9', accent:'#64748b' },
  { name:'Other',      emoji:'⚡', bg:'#f1f5f9', accent:'#64748b' },
];

// ── STATE ─────────────────────────────────────
let currentCurrency = 'PKR';
let currentFilter   = 'all';
let editingSubId    = null;
let editingCardId   = null;

// ── STORAGE ───────────────────────────────────
function getSubs()  { return JSON.parse(localStorage.getItem('st_subs')  || '[]'); }
function getCards() { return JSON.parse(localStorage.getItem('st_cards') || '[]'); }
function saveSubs(s)  { localStorage.setItem('st_subs',  JSON.stringify(s)); }
function saveCards(c) { localStorage.setItem('st_cards', JSON.stringify(c)); }
function getCurrency(){ return localStorage.getItem('st_currency') || 'PKR'; }
function saveCurrency(c){ localStorage.setItem('st_currency', c); }

// ── HELPERS ───────────────────────────────────
function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function daysUntil(ds){ const n=new Date();n.setHours(0,0,0,0);const d=new Date(ds);d.setHours(0,0,0,0);return Math.ceil((d-n)/86400000); }
function getService(name){ return SERVICES.find(s=>s.name===name)||SERVICES[SERVICES.length-1]; }
function getBadge(days){ if(days<=3)return{cls:'badge-red',label:'Due soon'};if(days<=10)return{cls:'badge-amber',label:'Upcoming'};return{cls:'badge-green',label:'Active'}; }
function fmt(amount, fromCur){
  const usd = amount / CURRENCIES[fromCur].rate;
  const val = usd * CURRENCIES[currentCurrency].rate;
  const sym = CURRENCIES[currentCurrency].sym;
  return sym + (val>=100 ? Math.round(val).toLocaleString() : val.toFixed(0));
}
function monthlyUSD(sub){ const u=sub.price/CURRENCIES[sub.priceCurrency].rate; return sub.cycle==='yearly'?u/12:u; }
function getCard(cardId){ return getCards().find(c=>c.id===cardId)||null; }

// ── CURRENCY ──────────────────────────────────
function changeCurrency(c){ currentCurrency=c; saveCurrency(c); renderAll(); }

// ── SECTION ROUTING ───────────────────────────
function showSection(name, el){
  ['Dashboard','Subscriptions','Cards','Upcoming'].forEach(s=>{
    document.getElementById('section'+s).classList.toggle('hidden', s.toLowerCase()!==name);
  });
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles = {
    dashboard:    ['Dashboard',         'Overview of your subscriptions'],
    subscriptions:['All Subscriptions', 'Manage your plans'],
    cards:        ['My Cards',          'Manage your payment cards'],
    upcoming:     ['Upcoming Renewals', 'Stay ahead of billing dates'],
  };
  document.getElementById('pageTitle').textContent    = titles[name][0];
  document.getElementById('pageSubtitle').textContent = titles[name][1];
  renderAll();
  if(window.innerWidth<768) toggleSidebar(false);
}

// ── RENDER ALL ────────────────────────────────
function renderAll(){
  renderStats();
  renderAlert();
  renderSubCards();
  renderListView();
  renderCardsSection();
  renderTimeline();
  triggerReveal();
}

// ── STATS ─────────────────────────────────────
function renderStats(){
  const subs  = getSubs();
  const cards = getCards();
  const totalM = subs.reduce((a,s)=>a+monthlyUSD(s),0) * CURRENCIES[currentCurrency].rate;
  document.getElementById('statMonthly').textContent = CURRENCIES[currentCurrency].sym + Math.round(totalM).toLocaleString();
  document.getElementById('statYearly').textContent  = CURRENCIES[currentCurrency].sym + Math.round(totalM*12).toLocaleString();
  document.getElementById('statDue').textContent     = subs.filter(s=>daysUntil(s.deadline)<=30).length;
  document.getElementById('statCards').textContent   = cards.length;
}

// ── ALERT ─────────────────────────────────────
function renderAlert(){
  const subs = getSubs();
  const banner = document.getElementById('alertBanner');
  if(!subs.length){ banner.classList.add('hidden'); return; }
  const next = [...subs].sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline))[0];
  const days = daysUntil(next.deadline);
  if(days<=7){
    document.getElementById('alertText').innerHTML = `<strong>Payment due:</strong> ${next.name} renews in <strong>${days} day${days!==1?'s':''}</strong> — ${fmt(next.price,next.priceCurrency)}`;
    banner.classList.remove('hidden');
  } else banner.classList.add('hidden');
}

// ── SUBSCRIPTION CARDS ────────────────────────
function renderSubCards(){
  const grid = document.getElementById('cardsGrid');
  if(!grid) return;
  let subs = getSubs();
  if(currentFilter==='monthly') subs=subs.filter(s=>s.cycle==='monthly');
  else if(currentFilter==='yearly') subs=subs.filter(s=>s.cycle==='yearly');
  else if(currentFilter==='due-soon') subs=subs.filter(s=>daysUntil(s.deadline)<=10);
  subs.sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline));

  const empty = document.getElementById('emptyState');
  if(!subs.length){ grid.innerHTML=''; grid.appendChild(empty); empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = subs.map((sub,i)=>buildSubCard(sub,i)).join('');
  grid.querySelectorAll('.sub-card').forEach((el,i)=>{ el.style.animationDelay=`${i*55}ms`; el.classList.add('card-appear'); });
}

function buildSubCard(sub, i){
  const svc   = getService(sub.name);
  const days  = daysUntil(sub.deadline);
  const badge = getBadge(days);
  const price = fmt(sub.price, sub.priceCurrency);
  const dayColor = days<=3?'var(--red)':days<=10?'var(--amber)':'var(--g700)';
  const chipHtml = buildCardChip(sub.cardId);

  return `<div class="sub-card" style="--card-accent:${svc.accent}" onclick="openDetail('${sub.id}')">
    <div class="card-top">
      <div class="card-icon" style="background:${svc.bg}">${svc.emoji}</div>
      <span class="status-badge ${badge.cls}">${badge.label}</span>
    </div>
    <div class="card-name">${sub.name}${sub.customName?` <span style="font-weight:400;color:var(--g400);font-size:12px">· ${sub.customName}</span>`:''}
    </div>
    <div class="card-plan">${sub.plan} · ${sub.cycle}</div>
    <div class="card-chip-row">${chipHtml}</div>
    <hr class="card-divider"/>
    <div class="card-footer">
      <div>
        <div class="card-price">${price}</div>
        <div class="card-price-cycle">per ${sub.cycle==='yearly'?'year':'month'}</div>
      </div>
      <div class="card-days">
        <div class="card-days-num" style="color:${dayColor}">${days>0?days:'Today'}</div>
        <div class="card-days-label">${days>0?'days left':'due'}</div>
      </div>
    </div>
  </div>`;
}

// builds the chip showing which payment card is linked
function buildCardChip(cardId){
  if(!cardId){
    return `<span class="no-card-chip">
      <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
      No card linked
    </span>`;
  }
  const card = getCard(cardId);
  if(!card){
    return `<span class="no-card-chip" style="color:var(--red)">Card removed</span>`;
  }
  return `<span class="card-chip">
    <span class="card-chip-dot ${CARD_THEMES[card.theme]?.dotClass||'dot-0'}"></span>
    <span class="card-chip-text">${card.nickname} ···· ${card.last4}</span>
  </span>`;
}

// ── LIST VIEW ─────────────────────────────────
function renderListView(){
  const el = document.getElementById('listView');
  if(!el) return;
  const subs = [...getSubs()].sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline));
  if(!subs.length){ el.innerHTML='<p style="padding:1rem 0;color:var(--g400);font-size:13px">No subscriptions yet.</p>'; return; }
  el.innerHTML = subs.map(sub=>{
    const svc   = getService(sub.name);
    const badge = getBadge(daysUntil(sub.deadline));
    const card  = sub.cardId ? getCard(sub.cardId) : null;
    const cardHtml = card
      ? `<span class="list-card-chip"><span class="list-card-dot ${CARD_THEMES[card.theme]?.dotClass||'dot-0'}"></span>${card.nickname}</span>`
      : `<span style="font-size:11px;color:var(--g400)">No card</span>`;
    return `<div class="list-item reveal" onclick="openDetail('${sub.id}')">
      <div class="list-icon" style="background:${svc.bg}">${svc.emoji}</div>
      <div>
        <div class="list-name">${sub.name}${sub.customName?` <span style="font-weight:400;color:var(--g400)">(${sub.customName})</span>`:''}</div>
        <div class="list-sub">${sub.plan} · ${sub.cycle}</div>
      </div>
      <div class="list-right">
        ${cardHtml}
        <span class="status-badge ${badge.cls}">${badge.label}</span>
        <div class="list-price">${fmt(sub.price,sub.priceCurrency)}</div>
        <div class="list-date">${sub.deadline}</div>
      </div>
    </div>`;
  }).join('');
}

// ── CARDS SECTION ─────────────────────────────
function renderCardsSection(){
  const el = document.getElementById('cardsSection');
  if(!el) return;
  const cards = getCards();
  const subs  = getSubs();

  if(!cards.length){
    el.innerHTML = `<div class="payment-cards-grid">
      <button class="add-card-btn-big" onclick="openAddCardModal()">
        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M12 14h.01"/></svg>
        <span style="font-weight:600;font-size:14px;color:var(--g700)">Add your first card</span>
        <span>Track which card pays for each subscription</span>
      </button>
    </div>`;
    return;
  }

  const cardItems = cards.map(card=>{
    const linkedSubs = subs.filter(s=>s.cardId===card.id);
    const totalM = linkedSubs.reduce((a,s)=>a+monthlyUSD(s),0) * CURRENCIES[currentCurrency].rate;
    return `<div>
      <div class="pcard pcard-theme-${card.theme}" onclick="openCardDetail('${card.id}')">
        <div class="pcard-top">
          <div class="pcard-chip"></div>
          <div class="pcard-type">${card.network}</div>
        </div>
        <div class="pcard-mid">
          <div class="pcard-number">···· ···· ···· ${card.last4}</div>
          <div class="pcard-nickname">${card.nickname}</div>
          ${linkedSubs.length ? `<div class="pcard-sub-count">${linkedSubs.length} subscription${linkedSubs.length!==1?'s':''} · ${CURRENCIES[currentCurrency].sym}${Math.round(totalM).toLocaleString()}/mo</div>` : '<div class="pcard-sub-count" style="opacity:.6">No subscriptions linked</div>'}
        </div>
        <div class="pcard-bottom">
          <div>
            <div class="pcard-label">Cardholder</div>
            <div class="pcard-val">${card.holder||'—'}</div>
          </div>
          <div class="pcard-network">${networkEmoji(card.network)}</div>
        </div>
      </div>
      <div class="pcard-actions">
        <button class="pcard-edit-btn" onclick="event.stopPropagation();openEditCardModal('${card.id}')">Edit card</button>
        <button class="pcard-del-btn" onclick="event.stopPropagation();deleteCard('${card.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="payment-cards-grid">
    ${cardItems}
    <button class="add-card-btn-big" onclick="openAddCardModal()">
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      Add another card
    </button>
  </div>`;
}

function networkEmoji(n){
  const m={Visa:'💳',Mastercard:'🔴',AMEX:'🟦',Debit:'💰',Other:'💳'};
  return m[n]||'💳';
}

// ── TIMELINE ──────────────────────────────────
function renderTimeline(){
  const el = document.getElementById('timelineView');
  if(!el) return;
  const subs = [...getSubs()].sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline));
  if(!subs.length){ el.innerHTML='<p style="padding:1rem 0;color:var(--g400);font-size:13px">No upcoming renewals.</p>'; return; }
  el.innerHTML = subs.map(sub=>{
    const svc  = getService(sub.name);
    const days = daysUntil(sub.deadline);
    const dot  = days<=3?'border-color:#ef4444':days<=10?'border-color:#f59e0b':'';
    const card = sub.cardId ? getCard(sub.cardId) : null;
    return `<div class="timeline-item reveal">
      <div class="timeline-dot" style="${dot}">${svc.emoji}</div>
      <div class="timeline-content">
        <div>
          <div class="timeline-name">${sub.name}</div>
          <div class="timeline-meta">
            Due ${sub.deadline} · ${days>0?days+' days':'today'}
            ${card ? ` · <span style="color:var(--g500)">${card.nickname}</span>` : ''}
          </div>
        </div>
        <div class="timeline-price">${fmt(sub.price,sub.priceCurrency)}</div>
      </div>
    </div>`;
  }).join('');
}

// ── FILTER ────────────────────────────────────
function filterSubs(f, btn){
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderSubCards();
}

// ── DETAIL MODAL ──────────────────────────────
function openDetail(id){
  const sub = getSubs().find(s=>s.id===id);
  if(!sub) return;
  const svc   = getService(sub.name);
  const days  = daysUntil(sub.deadline);
  const badge = getBadge(days);
  const price = fmt(sub.price, sub.priceCurrency);
  const orig  = CURRENCIES[sub.priceCurrency].sym + sub.price.toLocaleString() + ' ' + sub.priceCurrency;
  const pct   = Math.min(97, Math.max(3, 100 - Math.round((days/30)*100)));
  const card  = sub.cardId ? getCard(sub.cardId) : null;
  const history = genHistory(sub);

  let cardBox = `<p class="detail-no-card">No payment card linked — <a href="#" onclick="event.preventDefault();closeModal();showSection('cards',document.querySelectorAll('.nav-item')[2])" style="color:var(--blue)">add a card</a></p>`;
  if(card){
    cardBox = `<div class="detail-card-box">
      <div class="detail-card-swatch pcard-theme-${card.theme}" style="width:32px;height:22px;border-radius:5px"></div>
      <div class="detail-card-info">
        <div class="detail-card-name">${card.nickname} <span style="font-weight:400;color:var(--g400)">···· ${card.last4}</span></div>
        <div class="detail-card-sub">${card.network} · ${card.holder||''}</div>
      </div>
    </div>`;
  }

  document.getElementById('modalTitle').textContent = 'Subscription details';
  document.getElementById('modalBody').innerHTML = `
    <div class="detail-header">
      <div class="detail-icon" style="background:${svc.bg}">${svc.emoji}</div>
      <div style="flex:1">
        <div class="detail-name">${sub.name}${sub.customName?` <span style="font-size:13px;color:var(--g400);font-weight:400">(${sub.customName})</span>`:''}</div>
        <div class="detail-plan">${sub.plan} plan · ${sub.cycle}</div>
      </div>
      <span class="status-badge ${badge.cls}">${badge.label}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="di-label">Price (${currentCurrency})</div><div class="di-value">${price}</div></div>
      <div class="detail-item"><div class="di-label">Original</div><div class="di-value" style="font-size:12.5px">${orig}</div></div>
      <div class="detail-item"><div class="di-label">Next billing</div><div class="di-value" style="font-size:12.5px">${sub.deadline}</div></div>
      <div class="detail-item"><div class="di-label">Days left</div><div class="di-value" style="color:${days<=3?'var(--red)':days<=10?'var(--amber)':'inherit'}">${days>0?days+'d':'Today'}</div></div>
    </div>
    ${cardBox}
    <div style="font-size:11.5px;color:var(--g400);margin-bottom:5px">Billing cycle progress</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    ${sub.notes?`<div style="background:var(--g50);border:1px solid var(--g100);border-radius:8px;padding:.7rem .9rem;font-size:13px;color:var(--g600);margin-bottom:1rem">${sub.notes}</div>`:''}
    <div class="history-hdr">Payment history</div>
    ${history.map(h=>`<div class="history-item"><span class="history-date">${h.date}</span><span class="history-amt">${fmt(sub.price,sub.priceCurrency)}</span><span class="history-paid">✓ paid</span></div>`).join('')}
    <div class="detail-actions">
      <button class="btn-secondary" onclick="openEditModal('${id}')">Edit</button>
      <button class="btn-danger" onclick="confirmDeleteSub('${id}')">Delete</button>
      <button class="btn-primary" style="margin-left:auto" onclick="closeModal()">Done</button>
    </div>
  `;
  openModal();
}

function genHistory(sub){
  const h=[]; const base=new Date(sub.deadline);
  for(let i=1;i<=4;i++){
    const d=new Date(base);
    if(sub.cycle==='yearly') d.setFullYear(d.getFullYear()-i);
    else d.setMonth(d.getMonth()-i);
    h.push({date:d.toISOString().split('T')[0]});
  }
  return h;
}

// ── CARD DETAIL MODAL ─────────────────────────
function openCardDetail(cardId){
  const card = getCard(cardId);
  if(!card) return;
  const subs = getSubs().filter(s=>s.cardId===cardId);
  const totalM = subs.reduce((a,s)=>a+monthlyUSD(s),0)*CURRENCIES[currentCurrency].rate;

  document.getElementById('modalTitle').textContent = card.nickname;
  document.getElementById('modalBody').innerHTML = `
    <div class="pcard pcard-theme-${card.theme}" style="margin-bottom:1.25rem;cursor:default">
      <div class="pcard-top">
        <div class="pcard-chip"></div>
        <div class="pcard-type">${card.network}</div>
      </div>
      <div class="pcard-mid">
        <div class="pcard-number">···· ···· ···· ${card.last4}</div>
        <div class="pcard-nickname">${card.nickname}</div>
      </div>
      <div class="pcard-bottom">
        <div><div class="pcard-label">Cardholder</div><div class="pcard-val">${card.holder||'—'}</div></div>
        <div class="pcard-network">${networkEmoji(card.network)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:1.25rem">
      <div class="detail-item"><div class="di-label">Subscriptions</div><div class="di-value">${subs.length}</div></div>
      <div class="detail-item"><div class="di-label">Monthly total</div><div class="di-value">${CURRENCIES[currentCurrency].sym}${Math.round(totalM).toLocaleString()}</div></div>
    </div>
    ${subs.length ? `
    <div class="history-hdr">Linked subscriptions</div>
    ${subs.map(sub=>{
      const svc=getService(sub.name);
      return `<div class="history-item" style="cursor:pointer" onclick="closeModal();setTimeout(()=>openDetail('${sub.id}'),100)">
        <span style="display:flex;align-items:center;gap:7px">
          <span style="font-size:14px">${svc.emoji}</span>
          <span>${sub.name}${sub.customName?' ('+sub.customName+')':''}</span>
        </span>
        <span class="history-amt">${fmt(sub.price,sub.priceCurrency)}</span>
      </div>`;
    }).join('')}` : '<p style="font-size:13px;color:var(--g400);margin-bottom:1rem">No subscriptions linked to this card yet.</p>'}
    <div class="detail-actions">
      <button class="btn-secondary" onclick="openEditCardModal('${cardId}')">Edit card</button>
      <button class="btn-danger" onclick="deleteCard('${cardId}')">Delete card</button>
      <button class="btn-primary" style="margin-left:auto" onclick="closeModal()">Done</button>
    </div>
  `;
  openModal();
}

// ── ADD / EDIT SUBSCRIPTION ───────────────────
function openAddModal(){
  editingSubId = null;
  document.getElementById('modalTitle').textContent = 'Add subscription';
  document.getElementById('modalBody').innerHTML = buildSubForm(null);
  openModal();
}

function openEditModal(id){
  editingSubId = id;
  const sub = getSubs().find(s=>s.id===id);
  document.getElementById('modalTitle').textContent = 'Edit subscription';
  document.getElementById('modalBody').innerHTML = buildSubForm(sub);
  openModal();
}

function buildSubForm(sub){
  const today   = new Date().toISOString().split('T')[0];
  const plans   = ['Basic','Standard','Premium','Family','Student','Business'];
  const cards   = getCards();

  const svcOpts = SERVICES.map(s=>`<option value="${s.name}" ${sub&&sub.name===s.name?'selected':''}>${s.emoji} ${s.name}</option>`).join('');
  const planOpts = plans.map(p=>`<option value="${p}" ${sub&&sub.plan===p?'selected':''}>${p}</option>`).join('');
  const curOpts  = Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}" ${(sub?sub.priceCurrency:currentCurrency)===k?'selected':''}>${v.sym} ${k}</option>`).join('');

  let cardOpts = `<option value="">No card / Pay manually</option>`;
  if(cards.length){
    cardOpts += cards.map(c=>`<option value="${c.id}" ${sub&&sub.cardId===c.id?'selected':''}>${c.nickname} ···· ${c.last4} (${c.network})</option>`).join('');
  }

  return `
    <div class="form-group">
      <label>Service</label>
      <select id="f_name">${svcOpts}</select>
    </div>
    <div class="form-group">
      <label>Custom label <span style="color:var(--g400);font-weight:400">(optional)</span></label>
      <input type="text" id="f_custom" placeholder="e.g. Family plan, Work account" value="${sub&&sub.customName||''}"/>
    </div>
    <div class="form-2col">
      <div class="form-group">
        <label>Plan type</label>
        <select id="f_plan">${planOpts}</select>
      </div>
      <div class="form-group">
        <label>Billing cycle</label>
        <select id="f_cycle">
          <option value="monthly" ${!sub||sub.cycle==='monthly'?'selected':''}>Monthly</option>
          <option value="yearly" ${sub&&sub.cycle==='yearly'?'selected':''}>Yearly</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Price</label>
      <div class="price-row">
        <select id="f_priceCur">${curOpts}</select>
        <input type="number" id="f_price" placeholder="0.00" min="0" step="0.01" value="${sub?sub.price:''}"/>
      </div>
      <p class="hint">Enter price in the local currency of your region</p>
    </div>
    <div class="form-group">
      <label>Payment card</label>
      <select id="f_card">${cardOpts}</select>
      ${!cards.length?`<p class="hint">No cards added yet — <a href="#" onclick="event.preventDefault();closeModal();showSection('cards',document.querySelectorAll('.nav-item')[2])" style="color:var(--blue)">add a card first</a></p>`:''}
    </div>
    <div class="form-group">
      <label>Next billing date</label>
      <input type="date" id="f_deadline" value="${sub?sub.deadline:today}" min="${today}"/>
    </div>
    <div class="form-group">
      <label>Notes <span style="color:var(--g400);font-weight:400">(optional)</span></label>
      <input type="text" id="f_notes" placeholder="e.g. Shared with family" value="${sub&&sub.notes||''}"/>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      ${editingSubId?`<button class="btn-danger" onclick="confirmDeleteSub('${editingSubId}')">Delete</button>`:''}
      <button class="btn-primary" onclick="submitSubForm()">${sub?'Save changes':'Add subscription'}</button>
    </div>
  `;
}

function submitSubForm(){
  const name     = document.getElementById('f_name').value;
  const custom   = document.getElementById('f_custom').value.trim();
  const plan     = document.getElementById('f_plan').value;
  const cycle    = document.getElementById('f_cycle').value;
  const price    = parseFloat(document.getElementById('f_price').value);
  const priceCur = document.getElementById('f_priceCur').value;
  const cardId   = document.getElementById('f_card').value || null;
  const deadline = document.getElementById('f_deadline').value;
  const notes    = document.getElementById('f_notes').value.trim();

  if(!deadline || isNaN(price) || price<=0){ alert('Please fill in a valid price and billing date.'); return; }

  const subs = getSubs();
  if(editingSubId){
    const idx = subs.findIndex(s=>s.id===editingSubId);
    if(idx!==-1) subs[idx]={...subs[idx],name,customName:custom,plan,cycle,price,priceCurrency:priceCur,cardId,deadline,notes};
  } else {
    subs.push({id:genId(),name,customName:custom,plan,cycle,price,priceCurrency:priceCur,cardId,deadline,notes});
  }
  saveSubs(subs);
  closeModal();
  renderAll();
}

function confirmDeleteSub(id){
  if(!confirm('Delete this subscription?')) return;
  saveSubs(getSubs().filter(s=>s.id!==id));
  closeModal();
  renderAll();
}

// ── ADD / EDIT PAYMENT CARD ───────────────────
function openAddCardModal(){
  editingCardId = null;
  document.getElementById('modalTitle').textContent = 'Add payment card';
  document.getElementById('modalBody').innerHTML = buildCardForm(null);
  openModal();
  initColorPicker(null);
}

function openEditCardModal(id){
  editingCardId = id;
  const card = getCard(id);
  document.getElementById('modalTitle').textContent = 'Edit card';
  document.getElementById('modalBody').innerHTML = buildCardForm(card);
  openModal();
  initColorPicker(card);
}

function buildCardForm(card){
  const networkOpts = CARD_NETWORKS.map(n=>`<option value="${n}" ${card&&card.network===n?'selected':''}>${n}</option>`).join('');
  return `
    <div class="form-group">
      <label>Card nickname</label>
      <input type="text" id="fc_nick" placeholder="e.g. My Meezan Card, Work Visa" value="${card&&card.nickname||''}"/>
      <p class="hint">A friendly name to identify this card</p>
    </div>
    <div class="form-2col">
      <div class="form-group">
        <label>Last 4 digits</label>
        <input type="text" id="fc_last4" maxlength="4" placeholder="1234" value="${card&&card.last4||''}" style="font-family:'DM Mono',monospace;letter-spacing:2px"/>
      </div>
      <div class="form-group">
        <label>Card network</label>
        <select id="fc_network">${networkOpts}</select>
      </div>
    </div>
    <div class="form-group">
      <label>Cardholder name <span style="color:var(--g400);font-weight:400">(optional)</span></label>
      <input type="text" id="fc_holder" placeholder="Name on card" value="${card&&card.holder||''}"/>
    </div>
    <div class="form-group">
      <label>Card color</label>
      <div class="color-picker-row" id="colorPicker"></div>
    </div>
    <div id="cardPreview" style="margin-top:1rem;margin-bottom:.25rem"></div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      ${editingCardId?`<button class="btn-danger" onclick="deleteCard('${editingCardId}')">Delete</button>`:''}
      <button class="btn-primary" onclick="submitCardForm()">${card?'Save changes':'Add card'}</button>
    </div>
  `;
}

let selectedTheme = 0;

function initColorPicker(card){
  selectedTheme = card ? card.theme : 0;
  renderColorPicker();
  renderCardPreview();
  // live preview on input
  ['fc_nick','fc_last4','fc_holder','fc_network'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', renderCardPreview);
  });
}

function renderColorPicker(){
  const row = document.getElementById('colorPicker');
  if(!row) return;
  row.innerHTML = CARD_THEMES.map(t=>`
    <div class="color-swatch pcard-theme-${t.id} ${selectedTheme===t.id?'selected':''}"
      onclick="selectTheme(${t.id})" title="${t.label}"></div>
  `).join('');
}

function selectTheme(id){
  selectedTheme = id;
  renderColorPicker();
  renderCardPreview();
}

function renderCardPreview(){
  const nick    = document.getElementById('fc_nick')?.value || 'My Card';
  const last4   = document.getElementById('fc_last4')?.value || '····';
  const holder  = document.getElementById('fc_holder')?.value || '';
  const network = document.getElementById('fc_network')?.value || 'Visa';
  const prev = document.getElementById('cardPreview');
  if(!prev) return;
  prev.innerHTML = `
    <div class="pcard pcard-theme-${selectedTheme}" style="cursor:default;pointer-events:none">
      <div class="pcard-top">
        <div class="pcard-chip"></div>
        <div class="pcard-type">${network}</div>
      </div>
      <div class="pcard-mid">
        <div class="pcard-number">···· ···· ···· ${last4||'····'}</div>
        <div class="pcard-nickname">${nick||'Card name'}</div>
      </div>
      <div class="pcard-bottom">
        <div><div class="pcard-label">Cardholder</div><div class="pcard-val">${holder||'—'}</div></div>
        <div class="pcard-network">${networkEmoji(network)}</div>
      </div>
    </div>
  `;
}

function submitCardForm(){
  const nick    = document.getElementById('fc_nick').value.trim();
  const last4   = document.getElementById('fc_last4').value.trim();
  const network = document.getElementById('fc_network').value;
  const holder  = document.getElementById('fc_holder').value.trim();

  if(!nick){ alert('Please enter a card nickname.'); return; }
  if(!last4 || last4.length!==4 || !/^\d{4}$/.test(last4)){ alert('Please enter the last 4 digits.'); return; }

  const cards = getCards();
  if(editingCardId){
    const idx = cards.findIndex(c=>c.id===editingCardId);
    if(idx!==-1) cards[idx]={...cards[idx],nickname:nick,last4,network,holder,theme:selectedTheme};
  } else {
    cards.push({id:genId(),nickname:nick,last4,network,holder,theme:selectedTheme});
  }
  saveCards(cards);
  closeModal();
  renderAll();
}

function deleteCard(id){
  if(!confirm('Delete this card? Subscriptions linked to it will show "No card linked".')) return;
  saveCards(getCards().filter(c=>c.id!==id));
  // unlink subs
  const subs = getSubs().map(s=>s.cardId===id?{...s,cardId:null}:s);
  saveSubs(subs);
  closeModal();
  renderAll();
}

// ── MODAL ─────────────────────────────────────
function openModal(){
  document.getElementById('overlay').classList.add('show');
  document.getElementById('modalWrap').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeModal(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('modalWrap').classList.remove('show');
  document.body.style.overflow='';
  editingSubId=null; editingCardId=null;
}
function closeOverlay(e){ if(e.target===e.currentTarget) closeModal(); }

// ── SIDEBAR ───────────────────────────────────
function toggleSidebar(forceClose){
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  const open = sb.classList.contains('open');
  const close = forceClose===false ? true : forceClose===true ? false : open;
  sb.classList.toggle('open',!close);
  bd.classList.toggle('hidden',close);
}

// ── SCROLL REVEAL ─────────────────────────────
function triggerReveal(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('.reveal:not(.visible)').forEach((el,i)=>{
      el.style.transitionDelay=`${i*50}ms`;
      revealObserver.observe(el);
    });
  });
}

const revealObserver = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
},{threshold:0.08,rootMargin:'0px 0px -20px 0px'});

// ── SEED DEMO DATA ────────────────────────────
function seedDemoData(){
  const d = days => { const n=new Date(); n.setDate(n.getDate()+days); return n.toISOString().split('T')[0]; };
  const demoCards = [
    { id:genId(), nickname:'Meezan Debit',  last4:'4521', network:'Debit',      holder:'Ahmed Khan',   theme:0 },
    { id:genId(), nickname:'HBL Visa',      last4:'7834', network:'Visa',       holder:'Ahmed Khan',   theme:2 },
  ];
  saveCards(demoCards);
  const demoSubs = [
    { id:genId(), name:'Netflix',  customName:'', plan:'Standard', price:1800, priceCurrency:'PKR', cycle:'monthly', cardId:demoCards[0].id, deadline:d(5),  notes:'' },
    { id:genId(), name:'Spotify',  customName:'', plan:'Premium',  price:390,  priceCurrency:'PKR', cycle:'monthly', cardId:demoCards[0].id, deadline:d(18), notes:'' },
    { id:genId(), name:'YouTube',  customName:'', plan:'Premium',  price:500,  priceCurrency:'PKR', cycle:'monthly', cardId:demoCards[1].id, deadline:d(3),  notes:'' },
    { id:genId(), name:'Adobe CC', customName:'', plan:'Standard', price:2200, priceCurrency:'PKR', cycle:'monthly', cardId:demoCards[1].id, deadline:d(26), notes:'' },
  ];
  saveSubs(demoSubs);
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  // Seed once for new users
  if(!localStorage.getItem('st_seeded')){
    seedDemoData();
    localStorage.setItem('st_seeded','1');
  }
  currentCurrency = getCurrency();
  document.getElementById('currencySelect').value = currentCurrency;
  renderAll();
  triggerReveal();
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
