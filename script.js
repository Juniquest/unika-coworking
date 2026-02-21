const PRICE_TABLE={
"Estação Individual":{"120":39.9,"180":49.9,"240":59.9,"diaria":89.9},
"Sala de Reunião":{"120":79.9,"180":99.9,"240":119.9,"diaria":199.9},
"Banheiro Masc":{"60":10},
"Banheiro Fem":{"60":10}
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
if(id==="servico")updateDurationPrices();
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
["servico","duracao","data","hora"].forEach(f=>{
if(!get(f))return alert("Preencha tudo!");
});
document.getElementById("r-servico").textContent=get("servico");
document.getElementById("r-duracao").textContent=get("duracao");
document.getElementById("r-inicio").textContent=get("data")+" • "+get("hora");
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

function confirmarEGerarPix(){
alert("PIX gerado (simulação)");
}
