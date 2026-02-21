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
// ================================
//  HISTÓRICO: "Reservar novamente"
//  (sem mexer no layout / sem tirar nada)
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
    // salva só se tiver o mínimo
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

  // Evita duplicar
  if (document.getElementById("unika-history")) return;

  // CSS inline (pra não te fazer mexer no styles.css)
  const style = document.createElement("style");
  style.textContent = `
    #unika-history{
      margin: 18px 0 0;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.28);
      padding: 14px 14px;
      border-radius: 4px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
      backdrop-filter: blur(6px);
    }
    #unika-history .txt{
      line-height: 1.25;
    }
    #unika-history .txt strong{
      display:block;
      color: #d4af37;
      letter-spacing: 1px;
      font-size: 12px;
      text-transform: uppercase;
    }
    #unika-history .txt span{
      display:block;
      opacity: .85;
      font-size: 12px;
      letter-spacing: .5px;
      margin-top: 4px;
    }
    #unika-history .actions{
      display:flex;
      gap: 10px;
      flex-shrink: 0;
    }
    #unika-history button{
      padding: 10px 12px;
      background: transparent;
      border: 1px solid rgba(212,175,55,.55);
      color: #d4af37;
      letter-spacing: 1.5px;
      font-size: 11px;
      cursor: pointer;
      transition: .2s ease;
      border-radius: 3px;
      white-space: nowrap;
    }
    #unika-history button:hover{
      background: rgba(212,175,55,.12);
      border-color: rgba(212,175,55,.9);
    }
    #unika-history .btn-clear{
      border-color: rgba(255,255,255,.20);
      color: rgba(255,255,255,.85);
    }
    #unika-history .btn-clear:hover{
      border-color: rgba(255,255,255,.35);
      background: rgba(255,255,255,.06);
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement("div");
  banner.id = "unika-history";

  const docMask = last.doc ? last.doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : "";
  const subtitle = [
    last.nome ? last.nome : null,
    docMask ? `CPF: ${docMask}` : null
  ].filter(Boolean).join(" • ");

  banner.innerHTML = `
    <div class="txt">
      <strong>Você já usou a ŪNIKA</strong>
      <span>${subtitle || "Quer reservar novamente em 1 clique?"}</span>
    </div>
    <div class="actions">
      <button id="unika-history-go">RESERVAR NOVAMENTE</button>
      <button class="btn-clear" id="unika-history-clear">LIMPAR</button>
    </div>
  `;

  // Onde inserir? Sem mexer layout: coloca logo abaixo do HEADER
  const header = document.querySelector("header");
  if (header && header.parentNode) {
    header.parentNode.insertBefore(banner, header.nextSibling);
  } else {
    // fallback
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // Ação: preencher e descer pro início do formulário
  document.getElementById("unika-history-go").onclick = () => {
    // Garante que está na aba "reservar"
    try { switchTab("reservar"); } catch(e) {}

    const nomeEl = document.getElementById("nome");
    const emailEl = document.getElementById("email");
    const docEl = document.getElementById("doc");

    if (nomeEl && last.nome) nomeEl.value = last.nome;
    if (emailEl && last.email) emailEl.value = last.email;
    if (docEl && last.doc) docEl.value = last.doc;

    // Rola até o começo do formulário (ou seção 01)
    const formBox = document.querySelector("#tab-reservar .form-box");
    if (formBox) formBox.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  document.getElementById("unika-history-clear").onclick = () => {
    clearLastReserva();
    banner.remove();
  };
}

// Mostra banner ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  injectHistoryBanner();
});


// ✅ IMPORTANTE: salvar histórico quando o usuário clica para pagar
// Se você já tem generatePix(), basta adicionar saveLastReserva(payload) antes do fetch.
// Aqui vai uma versão “segura” que tenta interceptar a função atual sem quebrar nada:
(function hookGeneratePix(){
  if (typeof generatePix !== "function") return;

  const old = generatePix;
  window.generatePix = async function() {
    // tenta montar payload do jeito que você já usa
    const payload = {
      nome: document.getElementById('nome')?.value || "",
      doc: (document.getElementById('doc')?.value || "").replace(/\D/g, ''),
      email: document.getElementById('email')?.value || "",
      servico: document.getElementById('servico')?.value || "",
      duracao: document.getElementById('duracao')?.value || "",
      data: document.getElementById('data')?.value || "",
      hora: document.getElementById('hora')?.value || ""
    };

    // salva antes de redirecionar para o pagamento
    saveLastReserva(payload);

    // chama a função original
    return old.apply(this, arguments);
  };
})();
