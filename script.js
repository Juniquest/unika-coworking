const PRICE_TABLE={
"Estação Individual":{"120":99.9,"180":49.9,"240":59.9,"diaria":89.9},
"Sala de Reunião":{"120":79.9,"180":99.9,"240":119.9,"diaria":199.9},
"Banheiro Masc":{"60":1},
"Banheiro Fem":{"60":1}
};

const fmt=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const get=id=>document.getElementById(id)?.value;

function updateDurationPrices(){
document.querySelectorAll("[data-duracao]").forEach(el=>{
const s=get("servico");
const d=el.dataset.duracao;
if(!PRICE_TABLE[s])return;
el.querySelector(".time-price").textContent=
PRICE_TABLE[s]?.[d]?fmt(PRICE_TABLE[s][d]):"—";
});
}

function ajustarFluxoBanheiro(){

const servico=get("servico");

const tempo=document.querySelector("#tempo-estimado")?.parentElement;
const agenda=document.querySelector("#agenda-slots")?.parentElement;
const inicio=document.querySelector("#data")?.parentElement;

if(servico==="Banheiro Masc"||servico==="Banheiro Fem"){

if(tempo)tempo.style.display="none";
if(agenda)agenda.style.display="none";
if(inicio)inicio.style.display="none";

}else{

if(tempo)tempo.style.display="block";
if(agenda)agenda.style.display="block";
if(inicio)inicio.style.display="block";

}

}

function sel(id,val,el){

document.querySelectorAll("."+id+"-selected").forEach(e=>e.classList.remove("selected"));
el.classList.add("selected",id+"-selected");
document.getElementById(id).value=val;

if(id==="servico"){
updateDurationPrices();
ajustarFluxoBanheiro();
}

}

async function loadAvailableTimes(){

const cont=document.getElementById("agenda-slots");
if(!cont)return;

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

const servico=get("servico");

if(servico==="Banheiro Masc"||servico==="Banheiro Fem"){

if(!get("nome")||!get("doc")||!get("email")){
return alert("Preencha tudo!");
}

}else{

["servico","duracao","data","hora"].forEach(f=>{
if(!get(f))return alert("Preencha tudo!");
});

}

document.getElementById("r-servico").textContent=get("servico");

document.getElementById("r-duracao").textContent=get("duracao")||"Uso imediato";

document.getElementById("r-inicio").textContent=
(get("data")||"Agora")+" • "+(get("hora")||"Imediato");

const preco=PRICE_TABLE[get("servico")]?.[get("duracao")]||1;

document.getElementById("r-total").textContent=fmt(preco);

const box=document.getElementById("resumo-box");

box.classList.remove("hidden");

requestAnimationFrame(()=>box.classList.add("show"));

}

function editarResumo(){

const b=document.getElementById("resumo-box");

b.classList.remove("show");

setTimeout(()=>b.classList.add("hidden"),280);

}

async function confirmarEGerarPix(){

const payload={
nome:get("nome"),
doc:get("doc"),
email:get("email"),
servico:get("servico"),
duracao:get("duracao")||"60",
data:get("data")||"",
hora:get("hora")||""
};

const res=await fetch("/api/checkout",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(payload)
});

const data=await res.json();

window.location.href=data.invoiceUrl;

}


// ================================
// STATUS BANHEIROS EM TEMPO REAL
// ================================

async function atualizarStatusBanheiros(){

try{

const r=await fetch("/api/status-banheiros");
const s=await r.json();

document.querySelectorAll(".item").forEach(el=>{

const txt=el.textContent;

if(txt.includes("BANHEIRO MASCULINO")){

if(s.masculino==="ocupado"){

el.innerHTML="BANHEIRO MASCULINO<br><small style='color:red'>OCUPADO</small>";
el.style.opacity="0.5";
el.style.pointerEvents="none";

}else{

el.innerHTML="BANHEIRO MASCULINO<br><small style='color:#00ff88'>LIVRE</small>";
el.style.opacity="1";
el.style.pointerEvents="auto";

}

}

if(txt.includes("BANHEIRO FEMININO")){

if(s.feminino==="ocupado"){

el.innerHTML="BANHEIRO FEMININO<br><small style='color:red'>OCUPADO</small>";
el.style.opacity="0.5";
el.style.pointerEvents="none";

}else{

el.innerHTML="BANHEIRO FEMININO<br><small style='color:#00ff88'>LIVRE</small>";
el.style.opacity="1";
el.style.pointerEvents="auto";

}

}

});

}catch(e){}

}

setInterval(atualizarStatusBanheiros,5000);

document.addEventListener("DOMContentLoaded",atualizarStatusBanheiros);
