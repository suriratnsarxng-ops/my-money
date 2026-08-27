// My Money Storage v2 - safe, merge-only migration
const MM_STORAGE_KEY="my-money-data";
const MM_SCHEMA_VERSION=2;

function mmDefaultData(){return{schemaVersion:MM_SCHEMA_VERSION,transactions:[],dueItems:[],installments:[]};}
function firstText(...v){for(const x of v)if(typeof x==="string"&&x.trim())return x.trim();return"";}
function mmTx(x){x=x||{};return{id:x.id||crypto.randomUUID(),date:x.date||"",type:x.type==="income"?"income":"expense",description:firstText(x.description,x.desc,x.name,x.title,x.item,x.detail,"ไม่ระบุรายการ"),amount:Number(x.amount??0),account:x.account==="cash"?"cash":"bank",note:firstText(x.note,""),installmentId:x.installmentId||null,installmentTermId:x.installmentTermId||null};}
function mmDue(x){x=x||{};return{id:x.id||crypto.randomUUID(),date:x.date||"",description:firstText(x.description,x.desc,x.name,x.title,x.item,x.detail,"ไม่ระบุรายการ"),amount:Number(x.amount??0),note:firstText(x.note,""),paid:Boolean(x.paid),paidDate:x.paidDate||null,account:x.account==="cash"?"cash":x.account==="bank"?"bank":null,sourceType:x.sourceType||"manual",installmentId:x.installmentId||null,installmentTermId:x.installmentTermId||null};}
function mmInst(x){x=x||{};const ts=Array.isArray(x.terms)?x.terms:[];return{id:x.id||crypto.randomUUID(),name:firstText(x.name,x.description,x.desc,x.title,"ไม่ระบุรายการ"),price:Number(x.price??x.totalPrice??0),totalTerms:Number(x.totalTerms??ts.length??0),payment:Number(x.payment??x.paymentAmount??0),dueDay:Number(x.dueDay??1),startMonth:x.startMonth||"",terms:ts.map((t,i)=>({id:t.id||crypto.randomUUID(),n:Number(t.n??t.term??i+1),due:t.due||t.dueDate||"",amount:Number(t.amount??0),paid:Boolean(t.paid),paidDate:t.paidDate||null,account:t.account==="cash"?"cash":t.account==="bank"?"bank":null}))};}

function mmReadArray(key){try{const x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function mmMergeUnique(target, incoming){
  const ids=new Set(target.map(x=>x.id));
  for(const x of incoming){if(!ids.has(x.id)){target.push(x);ids.add(x.id)}}
}
function mmLoad(){
  let d=mmDefaultData();
  try{const raw=JSON.parse(localStorage.getItem(MM_STORAGE_KEY)||"null");if(raw&&typeof raw==="object"){
    d.transactions=Array.isArray(raw.transactions)?raw.transactions.map(mmTx):[];
    d.dueItems=Array.isArray(raw.dueItems)?raw.dueItems.map(mmDue):[];
    d.installments=Array.isArray(raw.installments)?raw.installments.map(mmInst):[];
  }}catch(_){}
  // Merge legacy stores WITHOUT replacing canonical data.
  mmMergeUnique(d.transactions,mmReadArray("my-money-transactions").map(mmTx));
  mmMergeUnique(d.dueItems,mmReadArray("my-money-due").map(mmDue));
  mmMergeUnique(d.installments,mmReadArray("my-money-installments").map(mmInst));
  d.schemaVersion=MM_SCHEMA_VERSION;
  localStorage.setItem(MM_STORAGE_KEY,JSON.stringify(d));
  return d;
}
function mmWrite(d){d.schemaVersion=MM_SCHEMA_VERSION;localStorage.setItem(MM_STORAGE_KEY,JSON.stringify(d));}
function mmBackup(){const b=new Blob([JSON.stringify(mmLoad(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="my-money-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function mmRestore(file,done){const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x||typeof x!=="object")throw Error();mmWrite(x);done&&done()}catch(_){alert("ไฟล์สำรองไม่ถูกต้อง")}};r.readAsText(file);}
