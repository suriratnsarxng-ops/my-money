// My Money Storage v3 - canonical + merge-safe backup/restore
const MM_STORAGE_KEY="my-money-data";
const MM_SCHEMA_VERSION=3;
const MM_INVOICE_HISTORY_KEY="my-money-invoice-history-v1";
const MM_PEOPLE_KEY="my-money-invoice-people-v1";
const MM_COUNTER_KEY="my-money-invoice-counter";

function mmDefaultData(){return{schemaVersion:MM_SCHEMA_VERSION,transactions:[],dueItems:[],installments:[]};}
function firstText(...v){for(const x of v)if(typeof x==="string"&&x.trim())return x.trim();return"";}
function mmTx(x){x=x||{};return{id:x.id||crypto.randomUUID(),date:x.date||"",type:x.type==="income"?"income":"expense",description:firstText(x.description,x.desc,x.name,x.title,x.item,x.detail,"ไม่ระบุรายการ"),amount:Number(x.amount??0),account:x.account==="cash"?"cash":"bank",note:firstText(x.note,""),installmentId:x.installmentId||null,installmentTermId:x.installmentTermId||null};}
function mmDue(x){x=x||{};return{id:x.id||crypto.randomUUID(),date:x.date||"",description:firstText(x.description,x.desc,x.name,x.title,x.item,x.detail,"ไม่ระบุรายการ"),amount:Number(x.amount??0),note:firstText(x.note,""),paid:Boolean(x.paid),paidDate:x.paidDate||null,account:x.account==="cash"?"cash":x.account==="bank"?"bank":null,sourceType:x.sourceType||"manual",installmentId:x.installmentId||null,installmentTermId:x.installmentTermId||null};}
function mmInst(x){x=x||{};const ts=Array.isArray(x.terms)?x.terms:[];return{id:x.id||crypto.randomUUID(),name:firstText(x.name,x.description,x.desc,x.title,"ไม่ระบุรายการ"),price:Number(x.price??x.totalPrice??0),totalTerms:Number(x.totalTerms??ts.length??0),payment:Number(x.payment??x.paymentAmount??0),dueDay:Number(x.dueDay??1),startMonth:x.startMonth||"",terms:ts.map((t,i)=>({id:t.id||crypto.randomUUID(),n:Number(t.n??t.term??i+1),due:t.due||t.dueDate||"",amount:Number(t.amount??0),paid:Boolean(t.paid),paidDate:t.paidDate||null,account:t.account==="cash"?"cash":t.account==="bank"?"bank":null}))};}
function mmReadArray(key){try{const x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function mmMergeUnique(target,incoming){const ids=new Set(target.map(x=>String(x.id)));for(const x of incoming){if(!ids.has(String(x.id))){target.push(x);ids.add(String(x.id))}}}
function mmLoad(){
  let d=mmDefaultData();
  try{const raw=JSON.parse(localStorage.getItem(MM_STORAGE_KEY)||"null");if(raw&&typeof raw==="object"){
    d.transactions=Array.isArray(raw.transactions)?raw.transactions.map(mmTx):[];
    d.dueItems=Array.isArray(raw.dueItems)?raw.dueItems.map(mmDue):[];
    d.installments=Array.isArray(raw.installments)?raw.installments.map(mmInst):[];
  }}catch(_){}
  mmMergeUnique(d.transactions,mmReadArray("my-money-transactions").map(mmTx));
  mmMergeUnique(d.dueItems,mmReadArray("my-money-due").map(mmDue));
  mmMergeUnique(d.installments,mmReadArray("my-money-installments").map(mmInst));
  d.schemaVersion=MM_SCHEMA_VERSION; localStorage.setItem(MM_STORAGE_KEY,JSON.stringify(d)); return d;
}
function mmWrite(d){d.schemaVersion=MM_SCHEMA_VERSION;localStorage.setItem(MM_STORAGE_KEY,JSON.stringify(d));}

function mmReadJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback}catch(_){return fallback}}
function mmBackup(){
  const data=mmLoad();
  const payload={
    backupVersion:3,
    app:"My Money",
    exportedAt:new Date().toISOString(),
    data,
    invoiceHistory:mmReadJson(MM_INVOICE_HISTORY_KEY,[]),
    people:mmReadJson(MM_PEOPLE_KEY,{receivers:[],payers:[]}),
    invoiceCounter:Number(localStorage.getItem(MM_COUNTER_KEY)||0)
  };
  const b=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="my-money-backup.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setTimeout(()=>alert("สำรองข้อมูลเรียบร้อยแล้วค่ะ\nไฟล์: my-money-backup.json"),100);
}

function mmNormalizeBackup(x){
  // Accept both new full backups and older V2 backups.
  if(x&&x.data&&typeof x.data==="object") return {
    data:x.data,
    invoiceHistory:Array.isArray(x.invoiceHistory)?x.invoiceHistory:[],
    people:x.people&&typeof x.people==="object"?x.people:{receivers:[],payers:[]},
    invoiceCounter:Number(x.invoiceCounter||0)
  };
  return {data:x||{},invoiceHistory:[],people:{receivers:[],payers:[]},invoiceCounter:0};
}

function mmRestore(file,done){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const parsed=JSON.parse(r.result);
      const incoming=mmNormalizeBackup(parsed);
      const current=mmLoad();

      const incomingTx=Array.isArray(incoming.data.transactions)?incoming.data.transactions.map(mmTx):[];
      const incomingDue=Array.isArray(incoming.data.dueItems)?incoming.data.dueItems.map(mmDue):[];
      const incomingInst=Array.isArray(incoming.data.installments)?incoming.data.installments.map(mmInst):[];

      // Merge by ID: existing local data is never replaced or erased.
      mmMergeUnique(current.transactions,incomingTx);
      mmMergeUnique(current.dueItems,incomingDue);
      mmMergeUnique(current.installments,incomingInst);
      mmWrite(current);

      const oldHist=mmReadJson(MM_INVOICE_HISTORY_KEY,[]);
      const hist=Array.isArray(oldHist)?oldHist.slice():[];
      mmMergeUnique(hist,Array.isArray(incoming.invoiceHistory)?incoming.invoiceHistory:[]);
      localStorage.setItem(MM_INVOICE_HISTORY_KEY,JSON.stringify(hist));

      const oldPeople=mmReadJson(MM_PEOPLE_KEY,{receivers:[],payers:[]});
      const people={
        receivers:Array.isArray(oldPeople.receivers)?oldPeople.receivers.slice():[],
        payers:Array.isArray(oldPeople.payers)?oldPeople.payers.slice():[]
      };
      for(const n of (incoming.people.receivers||[]))if(typeof n==="string"&&!people.receivers.includes(n))people.receivers.push(n);
      for(const n of (incoming.people.payers||[]))if(typeof n==="string"&&!people.payers.includes(n))people.payers.push(n);
      localStorage.setItem(MM_PEOPLE_KEY,JSON.stringify(people));
      const counter=Math.max(Number(localStorage.getItem(MM_COUNTER_KEY)||0),Number(incoming.invoiceCounter||0));
      localStorage.setItem(MM_COUNTER_KEY,String(counter));

      alert("นำเข้าข้อมูลเรียบร้อยแล้วค่ะ\nข้อมูลเดิมบนเครื่องจะไม่ถูกลบ");
      done&&done();
    }catch(_){alert("ไฟล์สำรองไม่ถูกต้อง หรือไฟล์เสียหายค่ะ");}
  };
  r.readAsText(file);
}
