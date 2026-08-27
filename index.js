const money=v=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(v);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
date.value=today();

function renderHomeDue(){
 const box=document.getElementById("homeDueList"),empty=document.getElementById("homeDueEmpty"),sub=document.getElementById("homeDueSubtitle");
 if(!box)return;
 const now=new Date(),m=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
 const data=mmLoad();
 const items=data.dueItems.filter(x=>x.date.startsWith(m)).sort((a,b)=>a.date.localeCompare(b.date));
 const unpaid=items.filter(x=>!x.paid), total=unpaid.reduce((s,x)=>s+x.amount,0);
 sub.textContent=`เหลือ ${unpaid.length} รายการ · ${money(total)}`;
 empty.style.display=items.length?"none":"block";
 box.innerHTML=items.slice(0,8).map(x=>`<div class="invoice-row home-due-row">
 <div><strong>${x.paid?"🟢":"🔴"} ${escHome(x.description)}</strong><div class="note">${escHome(x.date)}${x.paid&&x.paidDate?` · จ่ายแล้ว ${escHome(x.paidDate)}`:""}</div></div>
 <strong>${money(x.amount)}</strong><span>${x.paid?"จ่ายแล้ว":"ยังไม่จ่าย"}</span>
 </div>`).join("");
}
function escHome(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

function setupMonthlySummary(){
 const sel=document.getElementById("monthSummary"); if(!sel)return;
 const data=mmLoad(), months=new Set();
 data.transactions.forEach(x=>{if(x.date)months.add(x.date.slice(0,7))});
 data.dueItems.forEach(x=>{if(x.date)months.add(x.date.slice(0,7))});
 data.installments.forEach(x=>x.terms.forEach(t=>{if(t.due)months.add(t.due.slice(0,7))}));
 const now=new Date(), current=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"); months.add(current);
 const sorted=[...months].sort().reverse();
 sel.innerHTML=sorted.map(m=>`<option value="${m}">${m.slice(5,7)}/${Number(m.slice(0,4))+543}</option>`).join("");
 sel.value=sel.dataset.selected&&sorted.includes(sel.dataset.selected)?sel.dataset.selected:current;
 sel.onchange=()=>{sel.dataset.selected=sel.value;updateMonthlySummary()};
 updateMonthlySummary();
}
function updateMonthlySummary(){
 const m=document.getElementById("monthSummary")?.value;if(!m)return;
 const data=mmLoad();
 const tx=data.transactions.filter(x=>x.date.startsWith(m));
 const income=tx.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
 const expense=tx.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
 const due=data.dueItems.filter(x=>x.date.startsWith(m));
 const dueTotal=due.reduce((s,x)=>s+x.amount,0);
 const installmentTotal=data.installments.reduce((s,x)=>s+x.terms.filter(t=>t.due.startsWith(m)).reduce((a,t)=>a+t.amount,0),0);
 let invoiceCount=0;try{const h=JSON.parse(localStorage.getItem("my-money-invoice-history-v1")||"[]");invoiceCount=Array.isArray(h)?h.filter(x=>String(x.date||"").startsWith(m)).length:0}catch(_){}
 document.getElementById("monthIncome").textContent=money(income);
 document.getElementById("monthExpense").textContent=money(expense);
 document.getElementById("monthNet").textContent=money(income-expense);
 document.getElementById("monthDue").textContent=money(dueTotal);
 document.getElementById("monthInstallment").textContent=money(installmentTotal);
 document.getElementById("monthInvoices").textContent=invoiceCount+" ใบ";
}

function render(){
  const data=mmLoad(), a=data.transactions;
  const d=new Date();
  const month=a.filter(x=>{const q=new Date(x.date+"T00:00:00");return q.getMonth()===d.getMonth()&&q.getFullYear()===d.getFullYear()});
  const bank=a.filter(x=>x.account==="bank").reduce((s,x)=>s+(x.type==="income"?1:-1)*x.amount,0);
  const cash=a.filter(x=>x.account==="cash").reduce((s,x)=>s+(x.type==="income"?1:-1)*x.amount,0);
  const inc=month.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const exp=month.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  document.getElementById("bank").textContent=money(bank);
  document.getElementById("cash").textContent=money(cash);
  document.getElementById("bal").textContent=money(bank+cash);
  document.getElementById("inc").textContent=money(inc);
  document.getElementById("exp").textContent=money(exp);

  const ym=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  const dueItems=data.dueItems.filter(x=>x.date.startsWith(ym));
  const dueTotal=dueItems.reduce((s,x)=>s+x.amount,0);
  const duePaid=dueItems.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
  const unpaidTerms=data.installments.reduce((s,x)=>s+x.terms.filter(t=>!t.paid && t.due.startsWith(ym)).length,0);
  let invoiceCount=0;
  try {
    const hist=JSON.parse(localStorage.getItem("my-money-invoice-history-v1")||"[]");
    invoiceCount=Array.isArray(hist)?hist.filter(x=>String(x.date||"").startsWith(ym)).length:0;
  } catch(_){}
  document.getElementById("dueTotal").textContent=money(dueTotal);
  document.getElementById("dueRemaining").textContent=money(dueTotal-duePaid);
  document.getElementById("duePaid").textContent=money(duePaid);
  document.getElementById("installmentRemaining").textContent=unpaidTerms+" งวด";
  document.getElementById("invoiceCount").textContent=invoiceCount+" ใบ";

  const f=filter.value, v=f==="all"?a:a.filter(x=>x.type===f);
  rows.innerHTML=v.slice().sort((x,y)=>y.date.localeCompare(x.date)).map(x=>`
    <tr><td>${x.date}</td><td><strong>${escapeHtml(x.description)}</strong>${x.note?`<div class="note">${escapeHtml(x.note)}</div>`:""}</td>
    <td>${x.type==="income"?"รายรับ":"รายจ่าย"}</td><td>${x.account==="bank"?"🏦 บัญชี":"💵 เงินสด"}</td>
    <td class="${x.type==="income"?"amount-income":"amount-expense"}">${x.type==="income"?"+":"-"}${money(x.amount)}</td>
    <td><button type="button" class="delete-btn js-delete-tx" data-id="${escapeHtml(x.id)}">ลบ</button></td></tr>`).join("");
  empty.style.display=v.length?"none":"block";
  count.textContent=v.length+" รายการ";
}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function delTx(id){
  const sid=String(id);
  const d=mmLoad();
  const before=d.transactions.length;
  d.transactions=d.transactions.filter(x=>String(x.id)!==sid);
  if(d.transactions.length===before)return;

  // Remove the same ID from the legacy transaction store too.
  // mmLoad() intentionally merges legacy data, so leaving it there
  // would make a deleted item reappear on the next load.
  try{
    const legacyKey="my-money-transactions";
    const legacy=JSON.parse(localStorage.getItem(legacyKey)||"[]");
    if(Array.isArray(legacy)){
      const kept=legacy.filter(x=>String(x.id)!==sid);
      localStorage.setItem(legacyKey,JSON.stringify(kept));
    }
  }catch(_){}

  mmWrite(d);
  render();
  setupMonthlySummary();
  renderHomeDue();
}
document.getElementById("rows").addEventListener("click",e=>{
  const btn=e.target.closest(".js-delete-tx");
  if(!btn)return;
  const id=btn.dataset.id;
  if(!id)return;
  if(!confirm("ต้องการลบรายการนี้ใช่ไหม?"))return;
  delTx(id);
});
window.delTx=delTx;
f.onsubmit=e=>{
  e.preventDefault();
  const d=mmLoad();
  d.transactions.push({id:crypto.randomUUID(),date:date.value,type:type.value,description:desc.value.trim(),amount:Number(amt.value),account:account.value,note:note.value.trim()});
  mmWrite(d);e.target.reset();date.value=today();render();setupMonthlySummary();renderHomeDue();
};
filter.onchange=render;
render();setupMonthlySummary();renderHomeDue();

(function(){
 const el=document.getElementById("todayLabel");
 if(!el)return;
 const d=new Date();
 const months=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
 el.textContent=`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543} · จัดการเงินของเราให้เป็นระเบียบกันนะคะ`;
})();
