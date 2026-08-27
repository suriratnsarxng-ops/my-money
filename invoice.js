const money=v=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(v);
const txList=document.getElementById("txList"),emptyTx=document.getElementById("emptyTx");
const receiverName=document.getElementById("receiverName"),payerName=document.getElementById("payerName");
const addReceiverBtn=document.getElementById("addReceiverBtn"),addPayerBtn=document.getElementById("addPayerBtn");
const receiverSelect=document.getElementById("receiverSelect"),payerSelect=document.getElementById("payerSelect");
const peopleList=document.getElementById("peopleList");
let selected=null,selectedInvoiceNo=null,selectedReceiver="",selectedPayer="";
const PEOPLE_KEY="my-money-invoice-people-v1",COUNTER_KEY="my-money-invoice-counter";
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function people(){
 try{const x=JSON.parse(localStorage.getItem(PEOPLE_KEY)||"{}");return{receivers:Array.isArray(x.receivers)?x.receivers:[],payers:Array.isArray(x.payers)?x.payers:[]}}
 catch(_){return{receivers:[],payers:[]}}
}
function savePeople(x){localStorage.setItem(PEOPLE_KEY,JSON.stringify(x));}
function renderPeople(){
 const x=people();
 receiverSelect.innerHTML='<option value="">-- เลือกผู้รับเงิน --</option>'+x.receivers.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
 payerSelect.innerHTML='<option value="">-- เลือกผู้จ่ายเงิน --</option>'+x.payers.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
 receiverSelect.value=selectedReceiver;payerSelect.value=selectedPayer;
 peopleList.innerHTML=(x.receivers.length?"ผู้รับเงิน: "+x.receivers.map(esc).join(" · "):"ผู้รับเงิน: ยังไม่มี")+"<br>"+(x.payers.length?"ผู้จ่ายเงิน: "+x.payers.map(esc).join(" · "):"ผู้จ่ายเงิน: ยังไม่มี");
}
function addPerson(kind){
 const input=kind==="receiver"?receiverName:payerName;
 const value=input.value.trim();
 if(!value){alert("กรุณาพิมพ์ชื่อก่อนค่ะ");input.focus();return}
 const x=people();
 const arr=kind==="receiver"?x.receivers:x.payers;
 if(!arr.includes(value))arr.push(value);
 savePeople(x);
 input.value="";
 renderPeople();
 alert("บันทึกชื่อเรียบร้อยแล้วค่ะ");
}
addReceiverBtn.addEventListener("click",()=>addPerson("receiver"));
addPayerBtn.addEventListener("click",()=>addPerson("payer"));
receiverSelect.addEventListener("change",()=>{selectedReceiver=receiverSelect.value;refreshPreview()});
payerSelect.addEventListener("change",()=>{selectedPayer=payerSelect.value;refreshPreview()});
function refreshPreview(){const d=mmLoad(),items=d.transactions.filter(x=>selectedItems.includes(x.id));if(items.length)showPreview(items)}
function nextInvoiceNo(){const n=Number(localStorage.getItem(COUNTER_KEY)||0)+1;localStorage.setItem(COUNTER_KEY,String(n));return"INV-"+String(n).padStart(6,"0")}
let selectedItems=[];
const HISTORY_KEY="my-money-invoice-history-v1";
function invoiceHistory(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function saveInvoiceHistory(x){localStorage.setItem(HISTORY_KEY,JSON.stringify(x))}
function renderHistory(){
 const h=invoiceHistory(),box=document.getElementById("invoiceHistory"),empty=document.getElementById("invoiceHistoryEmpty");
 empty.style.display=h.length?"none":"block";
 box.innerHTML=h.slice().reverse().map(x=>`<div class="invoice-history-card">
   <div class="history-main"><strong>${esc(x.invoiceNo)}</strong><div class="note">${esc(x.date)} · ${x.items.length} รายการ · ${x.receiver||"-"} → ${x.payer||"-"}</div><div class="history-items">${x.items.map(i=>`${esc(i.description)} (${money(i.amount)})`).join(" · ")}</div></div>
   <strong class="history-total">${money(x.total)}</strong>
   <div class="history-actions">
     <button type="button" class="status-btn" onclick="viewInvoice('${x.id}')">👁️ ดูบิล</button>
     <button type="button" class="primary-btn" onclick="editInvoice('${x.id}')">✏️ แก้ไขบิล</button>
     <button type="button" class="delete-btn" onclick="deleteInvoice('${x.id}')">🗑️ ลบบิล</button>
   </div>
 </div>`).join("");
}
function findInvoice(id){return invoiceHistory().find(x=>String(x.id)===String(id))}
function viewInvoice(id){
 const x=findInvoice(id);if(!x)return;
 selectedInvoiceNo=x.invoiceNo;selectedReceiver=x.receiver||"";selectedPayer=x.payer||"";
 previewPanel.style.display="block";renderPeople();showPreview(x.items.map(i=>({description:i.description,amount:i.amount,account:i.account,note:i.note,date:x.date})));
 previewPanel.scrollIntoView({behavior:"smooth"});
}
function editInvoice(id){
 const x=findInvoice(id);if(!x)return;
 const h=invoiceHistory(),i=h.findIndex(q=>String(q.id)===String(id));if(i<0)return;
 const itemText=h[i].items.map((z,n)=>`${n+1}. ${z.description} — ${money(z.amount)}`).join("\n");
 const receiver=prompt("แก้ไขชื่อผู้รับเงิน:",h[i].receiver||"");if(receiver===null)return;
 const payer=prompt("แก้ไขชื่อผู้จ่ายเงิน:",h[i].payer||"");if(payer===null)return;
 const date=prompt("แก้ไขวันที่ (YYYY-MM-DD):",h[i].date||"");if(date===null)return;
 const amountText=prompt("แก้ไขยอดรวมของบิล:",String(h[i].total));if(amountText===null)return;
 const total=Number(amountText);
 if(!Number.isFinite(total)||total<0){alert("จำนวนเงินไม่ถูกต้องค่ะ");return}
 h[i].receiver=receiver.trim();h[i].payer=payer.trim();h[i].date=date.trim()||h[i].date;
 // For a multi-item invoice, keep the individual items intact and change only the displayed total.
 h[i].total=total;
 saveInvoiceHistory(h);renderHistory();
 if(selectedInvoiceNo===h[i].invoiceNo){
   selectedReceiver=h[i].receiver;selectedPayer=h[i].payer;
   renderPeople();
   showPreview(h[i].items.map(z=>({description:z.description,amount:z.amount,account:z.account,note:z.note,date:h[i].date})),h[i].total);
 }
}
function deleteInvoice(id){
 const x=findInvoice(id);if(!x)return;
 if(!confirm(`ต้องการลบบิล ${x.invoiceNo} ใช่ไหม?`))return;
 saveInvoiceHistory(invoiceHistory().filter(q=>String(q.id)!==String(id)));
 if(selectedInvoiceNo===x.invoiceNo){previewPanel.style.display="none";selectedInvoiceNo=null}
 renderHistory();
}
function recordInvoice(items){
 const h=invoiceHistory();
 h.push({id:crypto.randomUUID(),invoiceNo:selectedInvoiceNo,date:items[0]?.date||new Date().toISOString().slice(0,10),receiver:selectedReceiver,payer:selectedPayer,total:items.reduce((s,x)=>s+Number(x.amount),0),items:items.map(x=>({id:x.id,description:x.description,amount:x.amount,account:x.account,note:x.note}))});
 saveInvoiceHistory(h);renderHistory();
}
function reprint(id){
 const h=invoiceHistory(),x=h.find(q=>q.id===id);if(!x)return;
 selectedInvoiceNo=x.invoiceNo;selectedReceiver=x.receiver||"";selectedPayer=x.payer||"";
 previewPanel.style.display="block";renderPeople();
 showPreview(x.items.map(i=>({description:i.description,amount:i.amount,account:i.account,note:i.note,date:x.date})));
 previewPanel.scrollIntoView({behavior:"smooth"});
}
function render(){
 const data=mmLoad(),items=data.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date));
 txList.innerHTML=items.map(x=>`<div class="invoice-row">
 <div style="display:flex;align-items:flex-start;gap:10px">
 <input class="tx-check" data-id="${x.id}" type="checkbox" style="width:auto;margin-top:5px;display:none">
 <div><strong>${esc(x.description)}</strong><div class="note">${esc(x.date)} · ${x.type==="income"?"รายรับ":"รายจ่าย"} · ${x.account==="bank"?"🏦 เงินในบัญชี":"💵 เงินสด"}</div></div>
 </div><strong>${money(x.amount)}</strong><span>${x.type==="income"?"📈 รายรับ":"📉 รายจ่าย"}</span>
 <button class="status-btn single-btn" onclick="choose('${x.id}')">ออกบิล</button>
 </div>`).join("");
 emptyTx.style.display=items.length?"none":"block";
 updateMultiUI();
}
function updateMultiUI(){
 const on=multiMode.checked;
 document.querySelectorAll(".tx-check").forEach(c=>c.style.display=on?"inline-block":"none");
 document.querySelectorAll(".single-btn").forEach(b=>b.style.display=on?"none":"inline-block");
 let bar=document.getElementById("multiBar");
 if(!bar){bar=document.createElement("div");bar.id="multiBar";bar.className="panel";bar.style.margin="14px 0";txList.before(bar)}
 bar.style.display=on?"block":"none";
 if(on)bar.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>เลือกแล้ว ${selectedItems.length} รายการ</strong><button class="primary-btn" onclick="makeMultiInvoice()">🧾 รวมรายการที่เลือกเป็นบิล</button></div>`;
 document.querySelectorAll(".tx-check").forEach(c=>c.checked=selectedItems.includes(c.dataset.id));
}
multiMode.addEventListener("change",()=>{selectedItems=[];updateMultiUI()});
txList.addEventListener("change",e=>{if(!e.target.classList.contains("tx-check"))return;const id=e.target.dataset.id;if(e.target.checked){if(!selectedItems.includes(id))selectedItems.push(id)}else selectedItems=selectedItems.filter(x=>x!==id);updateMultiUI()});
function choose(id){
 const data=mmLoad();selectedItems=[id];selected=data.transactions.find(x=>x.id===id);if(!selected)return;
 selectedInvoiceNo=nextInvoiceNo();selectedReceiver="";selectedPayer="";previewPanel.style.display="block";renderPeople();showPreview([selected]);recordInvoice([selected]);previewPanel.scrollIntoView({behavior:"smooth"});
}
function makeMultiInvoice(){
 const data=mmLoad();const items=data.transactions.filter(x=>selectedItems.includes(x.id));if(!items.length){alert("กรุณาเลือกรายการอย่างน้อย 1 รายการ");return}
 selected=null;selectedInvoiceNo=nextInvoiceNo();selectedReceiver="";selectedPayer="";previewPanel.style.display="block";renderPeople();showPreview(items);recordInvoice(items);previewPanel.scrollIntoView({behavior:"smooth"});
}
function showPreview(items,totalOverride=null){
 const method=items.every(x=>x.account==="bank")?"🏦 เงินในบัญชี":items.every(x=>x.account==="cash")?"💵 เงินสด":"หลายช่องทาง";
 const total=totalOverride===null?items.reduce((s,x)=>s+Number(x.amount),0):Number(totalOverride);
 preview.innerHTML=`<div class="bill-header"><div><h2>ใบรายการ / ใบรับเงิน</h2><p>My Money</p></div><div class="bill-number"><strong>เลขที่บิล</strong><br>${selectedInvoiceNo}<br><span>${esc(items[0].date)}</span></div></div><hr>
 <table class="bill-table"><thead><tr><th>รายการ</th><th>จำนวนเงิน</th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.description)}${x.note?`<div class="note">${esc(x.note)}</div>`:""}</td><td>${money(x.amount)}</td></tr>`).join("")}</tbody></table>
 <div class="bill-payment"><strong>ชำระโดย:</strong> ${method}</div><div class="bill-payment"><strong>ผู้รับเงิน:</strong> ${selectedReceiver?esc(selectedReceiver):"-"}</div><div class="bill-payment"><strong>ผู้จ่ายเงิน:</strong> ${selectedPayer?esc(selectedPayer):"-"}</div>
 <div class="invoice-total">รวมทั้งสิ้น ${money(total)}</div><div class="signatures"><div>ผู้รับเงิน<br><strong>${selectedReceiver?esc(selectedReceiver):"________________________"}</strong></div><div>ผู้จ่ายเงิน<br><strong>${selectedPayer?esc(selectedPayer):"________________________"}</strong></div></div>`;
}
function printInvoice(){if(selected)window.print()}
renderPeople();render();renderHistory();
