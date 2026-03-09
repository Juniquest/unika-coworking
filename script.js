const PRICE_TABLE={
"Estação Individual":{"120":99.9,"180":49.9,"240":59.9,"diaria":89.9},
"Sala de Reunião":{"120":79.9,"180":99.9,"240":119.9,"diaria":199.9},
"Banheiro Masc":{"60":1,"120":1,"180":1,"240":1,"diaria":1},
"Banheiro Fem":{"60":1,"120":1,"180":1,"240":1,"diaria":1}
};

const fmt=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const get=id=>document.getElementById(id).value;

function updateDurationPrices(){
document.querySelectorAll("[data-duracao]").forEach(el=>{
const s=get("servico");
const d=el.dataset.duracao;
el.querySelector(".time-price").textContent=
PRICE_TABLE[s]?.[d]?fmt(PRICE_TABLE[s][d]):"—";
});
}

function sel(id,val,el){

document.querySelectorAll("."+id+"-selected").forEach(e=>e.classList.remove("selected"));
el.classList.add("selected",id+"-selected");
document.getElementById(id).value=val;

if(id==="servico"){

updateDurationPrices();

const agenda=document.getElementById("secao-agenda");

if(val==="Banheiro Masc" || val==="Banheiro Fem"){

agenda.style.display="none";
document.getElementById("duracao").value="60";

}else{

agenda.style.display="block";

}

}

}

async function loadAvailableTimes(){

const cont=document.getElementById("agenda-slots");
cont.innerHTML="";

for(let i=0;i<24;i++){

[":00",":30"].forEach(m=>{

const h=(i<10?"0"+i:i)+m;

const d=document.createElement("div");
d.className="item-hora";
d.textContent=h;

d.onclick=()=>sel("hora",h,d);

cont.appendChild(d);

});

}

}

function mostrarResumo(){

["servico","duracao"].forEach(f=>{
if(!get(f))return alert("Preencha tudo!");
});

document.getElementById("r-servico").textContent=get("servico");
document.getElementById("r-duracao").textContent=get("duracao");

if(get("servico")==="Banheiro Masc" || get("servico")==="Banheiro Fem"){

document.getElementById("r-inicio").textContent="USO IMEDIATO";

}else{

["data","hora"].forEach(f=>{
if(!get(f))return alert("Preencha tudo!");
});

document.getElementById("r-inicio").textContent=get("data")+" • "+get("hora");

}

document.getElementById("r-total").textContent=
fmt(PRICE_TABLE[get("servico")][get("duracao")]);

const box=document.getElementById("resumo-box");

box.classList.remove("hidden");

requestAnimationFrame(()=>box.classList.add("show"));

}

function editarResumo(){

const b=document.getElementById("resumo-box");

b.classList.remove("show");

setTimeout(()=>b.classList.add("hidden"),280);

}


// PAGAMENTO ASAAS

async function confirmarEGerarPix(){

const payload={

nome:get("nome"),
email:get("email"),
doc:get("doc"),
servico:get("servico"),
duracao:get("duracao"),
data:get("data"),
hora:get("hora")

};

const r=await fetch("/api/checkout",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(payload)

});

const j=await r.json();

if(j.invoiceUrl){

window.location.href=j.invoiceUrl;

}else{

alert("Erro ao iniciar pagamento");

}

}


// ================================
// HISTÓRICO
// ================================

const UNIKA_HISTORY_KEY = "unika_last_reserva_v1";

function saveLastReserva(payload) {

try {

const clean = {

nome: (payload.nome || "").trim(),
email: (payload.email || "").trim(),
doc: (payload.doc || "").replace(/\D/g, ""),
servico: (payload.servico || "").trim(),
ts: Date.now()

};

if (clean.nome || clean.email || clean.doc) {

localStorage.setItem(UNIKA_HISTORY_KEY, JSON.stringify(clean));

}

} catch (e) {}

}

function getLastReserva() {

try {

const raw = localStorage.getItem(UNIKA_HISTORY_KEY);

if (!raw) return null;

return JSON.parse(raw);

} catch (e) {

return null;

}

}

function clearLastReserva() {

try {

localStorage.removeItem(UNIKA_HISTORY_KEY);

} catch (e) {}

}

function injectHistoryBanner() {

const last = getLastReserva();

if (!last) return;

if (document.getElementById("unika-history")) return;

const style = document.createElement("style");

style.textContent = `
#unika-history{
margin:18px 0 0;
border:1px solid rgba(255,255,255,.14);
background:rgba(0,0,0,.28);
padding:14px 14px;
border-radius:4px;
display:flex;
align-items:center;
justify-content:space-between;
gap:12px;
backdrop-filter:blur(6px);
}
`;

document.head.appendChild(style);

const banner = document.createElement("div");

banner.id = "unika-history";

banner.innerHTML = `
<div class="txt">
<strong>Você já usou a ŪNIKA</strong>
</div>
<div class="actions">
<button id="unika-history-go">RESERVAR NOVAMENTE</button>
<button class="btn-clear" id="unika-history-clear">LIMPAR</button>
</div>
`;

const header = document.querySelector("header");

if (header && header.parentNode) {

header.parentNode.insertBefore(banner, header.nextSibling);

}

document.getElementById("unika-history-go").onclick = () => {

try { switchTab("reservar"); } catch(e) {}

const nomeEl = document.getElementById("nome");
const emailEl = document.getElementById("email");
const docEl = document.getElementById("doc");

if (nomeEl && last.nome) nomeEl.value = last.nome;
if (emailEl && last.email) emailEl.value = last.email;
if (docEl && last.doc) docEl.value = last.doc;

};

document.getElementById("unika-history-clear").onclick = () => {

clearLastReserva();
banner.remove();

};

}

document.addEventListener("DOMContentLoaded", () => {

injectHistoryBanner();

});


// ================================
// BEM VINDO DE VOLTA
// ================================

function showWelcomeBack() {

try {

const last = localStorage.getItem("unika_last_reserva_v1");

if (!last) return;

const data = JSON.parse(last);

if (!data.nome) return;

if (sessionStorage.getItem("unika_welcome_shown")) return;

sessionStorage.setItem("unika_welcome_shown", "1");

const box = document.createElement("div");

box.id = "unika-welcome";

const firstName = data.nome.split(" ")[0];

box.innerHTML = `
<strong>Bem-vinda de volta à ŪNIKA, ${firstName}</strong>
`;

const header = document.querySelector("header");

if (header && header.parentNode) {

header.parentNode.insertBefore(box, header.nextSibling);

}

} catch(e){}

}

document.addEventListener("DOMContentLoaded", showWelcomeBack);

// ================================
// STATUS BANHEIROS AUTOMÁTICO
// ================================

async function atualizarStatusBanheiros(){

try{

const r = await fetch("/api/status-banheiros");
const s = await r.json();

document.querySelectorAll(".item").forEach(el=>{

if(el.textContent.includes("BANHEIRO MASCULINO")){

if(s.masculino==="ocupado"){

el.innerHTML="BANHEIRO MASCULINO<br><small style='color:red'>OCUPADO</small>";
el.style.opacity="0.5";

}else{

el.innerHTML="BANHEIRO MASCULINO<br><small style='color:#00ff88'>LIVRE</small>";
el.style.opacity="1";

}

}

if(el.textContent.includes("BANHEIRO FEMININO")){

if(s.feminino==="ocupado"){

el.innerHTML="BANHEIRO FEMININO<br><small style='color:red'>OCUPADO</small>";
el.style.opacity="0.5";

}else{

el.innerHTML="BANHEIRO FEMININO<br><small style='color:#00ff88'>LIVRE</small>";
el.style.opacity="1";

}

}

});

}catch(e){}

}

setInterval(atualizarStatusBanheiros,5000);

document.addEventListener("DOMContentLoaded",atualizarStatusBanheiros);
