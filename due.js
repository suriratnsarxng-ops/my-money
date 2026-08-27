const money=v=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(v);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
month.value=today().slice(0,7);dte.value=today();
function render(){
 const data=mmLoad(),a=data.dueItems.filter(x=>x.date.startsWith(month.value)).sort((x,y)=>x.date.localeCompare(y.date));
 const total=a.reduce((s,x)=>s+x.amount,0),paidSum=a.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
 all.textContent=money(total);paid.textContent=money(paidSum);rem.textContent=money(total-paidSum);dc.textContent=a.length+" รายการ";
 dr.innerHTML=a.map(x=>`<tr><td><strong>${x.description}</strong>${x.note?`<div class="note">${x.note}</div>`:""}</td><td>${x.date}</td><td>${money(x.amount)}</td><td>${x.paid?"<span class='status paid-status'>🟢 จ่ายแล้ว</span>":"<span class='status unpaid-status'>🔴 ยังไม่จ่าย</span>"}</td><td><button class="${x.paid?"undo-btn":"status-btn"}" onclick="toggleDue('${x.id}')">${x.paid?"ยกเลิกจ่าย":"จ่ายแล้ว"}</button> <button type="button" class="delete-btn js-delete-due" data-id="${x.id}">ลบ</button></td></tr>`).join("");
 de.style.display=a.length?"none":"block";
}
function toggleDue(id){const d=mmLoad(),x=d.dueItems.find(q=>q.id===id);if(!x)return;if(x.sourceType==="installment"){alert("รายการนี้มาจากระบบผ่อน กรุณากดจ่ายจากหน้า 💳 รายการผ่อน");return}x.paid=!x.paid;mmWrite(d);render()}
function delDue(id){
 const sid=String(id),d=mmLoad(),before=d.dueItems.length;
 d.dueItems=d.dueItems.filter(x=>String(x.id)!==sid);
 if(d.dueItems.length===before)return;
 try{
   const key="my-money-due";
   const legacy=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(legacy))localStorage.setItem(key,JSON.stringify(legacy.filter(x=>String(x.id)!==sid)));
 }catch(_){}
 mmWrite(d);render();
}
window.delDue=delDue;
dr.addEventListener("click",e=>{
 const b=e.target.closest(".js-delete-due"); if(!b)return;
 const id=b.dataset.id;
 if(!id)return;
 if(!confirm("ต้องการลบรายการนี้ใช่ไหม?"))return;
 delDue(id);
});
df.onsubmit=e=>{e.preventDefault();if(!dte.value.startsWith(month.value)){alert("วันที่ต้องจ่ายต้องอยู่ในเดือนที่เลือก");return}const d=mmLoad();d.dueItems.push({id:crypto.randomUUID(),date:dte.value,description:dd.value.trim(),amount:Number(damt.value),note:dn.value.trim(),paid:false});mmWrite(d);e.target.reset();dte.value=month.value+"-01";render()};
month.onchange=()=>{dte.value=month.value+"-01";render()};render();
