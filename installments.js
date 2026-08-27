const money=v=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(v);
const pad=n=>String(n).padStart(2,"0"),today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"});
function add(m,n){let[y,o]=m.split("-").map(Number),d=new Date(y,o-1+n,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function due(m,day){let[y,o]=m.split("-").map(Number),last=new Date(y,o,0).getDate();return y+"-"+pad(o)+"-"+pad(Math.min(day,last))}
start.value=today().slice(0,7);

function render(){
 const data=mmLoad();
 data.installments.forEach(x=>x.terms.forEach(t=>{
   if(!data.dueItems.some(q=>q.installmentId===x.id&&q.installmentTermId===t.id))
     data.dueItems.push({id:crypto.randomUUID(),date:t.due,description:`ผ่อน ${x.name} งวดที่ ${t.n}/${x.totalTerms}`,amount:t.amount,note:"สร้างอัตโนมัติจากระบบรายการผ่อน",paid:t.paid,paidDate:t.paidDate||null,account:t.account||null,sourceType:"installment",installmentId:x.id,installmentTermId:t.id});
 }));
 mmWrite(data);
 const a=data.installments;list.innerHTML="";empty.style.display=a.length?"none":"block";
 a.forEach(x=>{let p=x.terms.filter(t=>t.paid).length,r=x.terms.filter(t=>!t.paid).reduce((s,t)=>s+t.amount,0),n=x.terms.find(t=>!t.paid),c=document.createElement("section");c.className="panel installment-card";
 c.innerHTML=`<div class="installment-head"><div><h2>💳 ${escapeHtml(x.name)}</h2><p>ราคา ${money(x.price)} · ${x.totalTerms} งวด · งวดละ ${money(x.payment)}</p></div><button class="delete-btn" onclick="delItem('${x.id}')">ลบรายการนี้</button></div>
 <div class="installment-summary"><div><span>ชำระแล้ว</span><strong>${p}/${x.totalTerms} งวด</strong></div><div><span>เหลือ</span><strong>${x.totalTerms-p} งวด</strong></div><div><span>ยอดคงเหลือ</span><strong>${money(r)}</strong></div><div><span>งวดถัดไป</span><strong>${n?fmt(n.due):"ครบแล้ว"}</strong></div></div>
 <div class="table-wrap"><table><thead><tr><th>งวด</th><th>กำหนดจ่าย</th><th>จำนวน</th><th>สถานะ</th><th>วันที่จ่าย</th><th>จ่ายจาก</th><th></th></tr></thead><tbody>${x.terms.map(t=>`<tr><td>${t.n}/${x.totalTerms}</td><td>${fmt(t.due)}</td><td>${money(t.amount)}</td><td>${t.paid?"<span class='status paid-status'>🟢 จ่ายแล้ว</span>":"<span class='status unpaid-status'>🔴 ยังไม่จ่าย</span>"}</td><td>${t.paidDate?fmt(t.paidDate):"-"}</td><td>${t.account==="bank"?"🏦 บัญชี":t.account==="cash"?"💵 เงินสด":"-"}</td><td>${t.paid?`<button class="undo-btn" onclick="undo('${x.id}','${t.id}')">ยกเลิกจ่าย</button>`:`<button class="status-btn" onclick="pay('${x.id}','${t.id}')">จ่ายแล้ว</button>`}</td></tr>`).join("")}</tbody></table></div>`;list.appendChild(c)})
}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function pay(aid,tid){const d=mmLoad(),x=d.installments.find(q=>q.id===aid),t=x?.terms.find(q=>q.id===tid);if(!t)return;let s=prompt("จ่ายจากอะไร? พิมพ์ bank = เงินในบัญชี หรือ cash = เงินสด","bank");if(s===null)return;s=s.trim().toLowerCase();if(!["bank","cash"].includes(s)){alert("กรุณาพิมพ์ bank หรือ cash");return}t.paid=true;t.paidDate=today();t.account=s;let dueItem=d.dueItems.find(q=>q.installmentId===aid&&q.installmentTermId===tid);if(!dueItem){dueItem={id:crypto.randomUUID(),date:t.due,description:`ผ่อน ${x.name} งวดที่ ${t.n}/${x.totalTerms}`,amount:t.amount,note:"สร้างอัตโนมัติจากระบบรายการผ่อน",paid:true,paidDate:t.paidDate,account:s,sourceType:"installment",installmentId:aid,installmentTermId:tid};d.dueItems.push(dueItem)}else{dueItem.paid=true;dueItem.paidDate=t.paidDate;dueItem.account=s}d.transactions.push({id:crypto.randomUUID(),date:t.paidDate,type:"expense",description:`ผ่อน ${x.name} งวดที่ ${t.n}/${x.totalTerms}`,amount:t.amount,account:s,note:"สร้างอัตโนมัติจากระบบรายการผ่อน",installmentId:aid,installmentTermId:tid});mmWrite(d);render()}
function undo(aid,tid){const d=mmLoad(),x=d.installments.find(q=>q.id===aid),t=x?.terms.find(q=>q.id===tid);if(!t||!confirm("ยกเลิกการจ่ายงวดนี้หรือไม่? รายจ่ายอัตโนมัติจะถูกลบด้วย"))return;d.transactions=d.transactions.filter(q=>!(q.installmentId===aid&&q.installmentTermId===tid));const dueItem=d.dueItems.find(q=>q.installmentId===aid&&q.installmentTermId===tid);if(dueItem){dueItem.paid=false;dueItem.paidDate=null;dueItem.account=null}t.paid=false;t.paidDate=null;t.account=null;mmWrite(d);render()}
function delItem(id){
 if(!confirm("ต้องการลบรายการผ่อนนี้หรือไม่?"))return;
 const sid=String(id),d=mmLoad(),before=d.installments.length;
 d.installments=d.installments.filter(x=>String(x.id)!==sid);
 if(d.installments.length===before)return;
 // Remove linked due items so deleted installment does not recreate them.
 d.dueItems=d.dueItems.filter(x=>String(x.installmentId)!==sid);
 // Also remove the same installment from the legacy store that mmLoad merges.
 try{
   const key="my-money-installments";
   const legacy=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(legacy))localStorage.setItem(key,JSON.stringify(legacy.filter(x=>String(x.id)!==sid)));
 }catch(_){}
 mmWrite(d);
 render();
}
window.delItem=delItem;
const installmentForm=document.getElementById("f");
const nameInput=document.getElementById("name");
const priceInput=document.getElementById("price");
const termsInput=document.getElementById("terms");
const paymentInput=document.getElementById("payment");
const dayInput=document.getElementById("day");
const startInput=document.getElementById("start");

installmentForm.addEventListener("submit",function(e){
  e.preventDefault();
  const itemName=nameInput.value.trim();
  const totalPrice=Number(priceInput.value);
  const totalTerms=Number(termsInput.value);
  const paymentAmount=Number(paymentInput.value);
  const dueDay=Number(dayInput.value);
  const startMonth=startInput.value;

  if(!itemName || !Number.isFinite(totalPrice) || totalPrice<0 ||
     !Number.isInteger(totalTerms) || totalTerms<1 ||
     !Number.isFinite(paymentAmount) || paymentAmount<=0 ||
     !Number.isInteger(dueDay) || dueDay<1 || dueDay>31 ||
     !startMonth){
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  const data=mmLoad();
  const item={
    id:crypto.randomUUID(),
    name:itemName,
    price:totalPrice,
    totalTerms:totalTerms,
    payment:paymentAmount,
    dueDay:dueDay,
    startMonth:startMonth,
    terms:[]
  };

  for(let i=0;i<totalTerms;i++){
    item.terms.push({
      id:crypto.randomUUID(),
      n:i+1,
      due:due(add(startMonth,i),dueDay),
      amount:paymentAmount,
      paid:false,
      paidDate:null,
      account:null
    });
  }

  data.installments.push(item);
  mmWrite(data);
  installmentForm.reset();
  startInput.value=today().slice(0,7);
  render();
});

render();
