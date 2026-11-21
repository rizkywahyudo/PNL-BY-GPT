const $ = id => document.getElementById(id);
const STORAGE_KEY = 'lavender-pl-transactions-v1';
const RATE_KEY = 'lavender-pl-rate-v1';
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currency = 'USD';
let activeFilter = 'all';
let rate = Number(localStorage.getItem(RATE_KEY) || 16000);
$('exchangeRate').value = rate;
$('date').value = new Date().toISOString().slice(0,10);

function toUsd(amount, curr){ return curr === 'USD' ? amount : amount / rate; }
function moneyUSD(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }
function moneyIDR(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n); }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function render(){
  const total = transactions.reduce((s,t)=>s+(t.type==='profit'?1:-1)*toUsd(t.amount,t.currency),0);
  $('totalPnl').textContent = (total >= 0 ? '+' : '−') + moneyUSD(Math.abs(total));
  $('totalPnl').style.color = total < 0 ? '#ffd4df' : '#fff';
  $('totalIdr').textContent = (total < 0 ? '−' : '') + moneyIDR(Math.abs(total*rate));
  $('transactionCount').textContent = transactions.length;
  const shown = transactions.filter(t=>activeFilter==='all'||t.type===activeFilter).sort((a,b)=>b.created-a.created);
  const list = $('transactionList');
  if(!shown.length){list.innerHTML='<div class="empty-state"><span>✧</span><strong>Belum ada transaksi</strong><p>Transaksi yang kamu tambahkan akan muncul di sini.</p></div>';return;}
  list.innerHTML = shown.map(t=>{
    const usd=toUsd(t.amount,t.currency), sign=t.type==='profit'?'+':'−';
    const value=t.currency==='USD'?moneyUSD(t.amount):moneyIDR(t.amount);
    const converted=t.currency==='USD'?moneyIDR(t.amount*rate):moneyUSD(usd);
    return `<article class="transaction-item">
      <div class="transaction-icon ${t.type}">${t.type==='profit'?'↗':'↘'}</div>
      <div class="transaction-info"><strong>${escapeHtml(t.note|| (t.type==='profit'?'Profit':'Loss'))}</strong><small>${t.date} · ${t.currency}</small></div>
      <div class="transaction-value"><strong class="${t.type==='profit'?'profit-text':'loss-text'}">${sign}${value}</strong><small>${converted}</small></div>
      <button class="delete-button" data-delete="${t.id}" aria-label="Hapus transaksi">×</button>
    </article>`;
  }).join('');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
document.querySelectorAll('.currency-option').forEach(btn=>btn.addEventListener('click',()=>{
  currency=btn.dataset.currency;
  document.querySelectorAll('.currency-option').forEach(b=>b.classList.toggle('active',b===btn));
  $('currencySymbol').textContent=currency==='USD'?'$':'Rp';
  $('amount').placeholder=currency==='USD'?'0.00':'0';
  $('amount').step=currency==='USD'?'0.01':'1';
}));
$('saveRate').addEventListener('click',()=>{
  const next=Number($('exchangeRate').value);
  if(!Number.isFinite(next)||next<=0){alert('Masukkan kurs yang valid.');return;}
  rate=next;localStorage.setItem(RATE_KEY,String(rate));render();
});
$('transactionForm').addEventListener('submit',e=>{
  e.preventDefault();
  const amount=Number($('amount').value);
  if(!Number.isFinite(amount)||amount<=0){alert('Nominal harus lebih besar dari 0.');return;}
  transactions.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:$('date').value,type:$('type').value,amount,currency,note:$('note').value.trim(),created:Date.now()});
  save();render();$('amount').value='';$('note').value='';
});
$('transactionList').addEventListener('click',e=>{
  const btn=e.target.closest('[data-delete]');if(!btn)return;
  if(confirm('Hapus transaksi ini?')){transactions=transactions.filter(t=>t.id!==btn.dataset.delete);save();render();}
});
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{
  activeFilter=btn.dataset.filter;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===btn));render();
}));
$('exportCsv').addEventListener('click',()=>{
  const rows=[['Tanggal','Jenis','Nominal','Mata uang','Nilai USD','Nilai IDR','Catatan'],...transactions.map(t=>[t.date,t.type,t.amount,t.currency,toUsd(t.amount,t.currency).toFixed(2),Math.round(toUsd(t.amount,t.currency)*rate),t.note])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='lavender-pl-report.csv';a.click();URL.revokeObjectURL(url);
});
if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
