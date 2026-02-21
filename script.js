// ====== TABELA DE PREÇOS (tem que bater com os textos do seu HTML) ======
const PRICE_TABLE = {
  "Estação Individual": { "120": 39.90, "180": 49.90, "240": 59.90, "diaria": 89.90 },
  "Sala de Reunião":    { "120": 79.90, "180": 99.90, "240": 119.90, "diaria": 199.90 },
  "Banheiro Masc":      { "60": 10.00 },
  "Banheiro Fem":       { "60": 10.00 }
};

function fmtBRL(v) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getServico() {
  return (document.getElementById("servico")?.value || "").trim();
}

function getDuracao() {
  return (document.getElementById("duracao")?.value || "").trim();
}

function calcTotal() {
  const s = getServico();
  const d = getDuracao();
  const p = PRICE_TABLE?.[s]?.[d];
  return (typeof p === "number") ? p : 0;
}

// Atualiza os "—" para "R$ xx" nas caixinhas de tempo conforme o serviço escolhido
function updateDurationPrices() {
  const servico = getServico();

  document.querySelectorAll("#secao-agenda .grid .item[data-duracao]").forEach((el) => {
    const dur = el.getAttribute("data-duracao");
    const priceEl = el.querySelector(".time-price");
    if (!priceEl) return;

    const p = PRICE_TABLE?.[servico]?.[dur];
    priceEl.textContent = (typeof p === "number") ? fmtBRL(p) : "—";
  });
}

// Ao carregar, deixa os valores como "—" e pronto para atualizar
document.addEventListener("DOMContentLoaded", () => {
  updateDurationPrices();
});

function sel(id, val, el) {
  // remove selected apenas do grupo atual
  document.querySelectorAll('.' + id + '-selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  el.classList.add(id + '-selected');
  document.getElementById(id).value = val;

  if (id === 'servico') {
    const agenda = document.getElementById('secao-agenda');

    // ✅ atualiza os preços das durações quando escolhe o serviço
    updateDurationPrices();

    if (val.includes('Banheiro')) {
      agenda.style.display = 'none';
      document.getElementById('duracao').value = '60';
      document.getElementById('data').value = new Date().toISOString().split('T')[0];
      document.getElementById('hora').value = "00:00";
    } else {
      agenda.style.display = 'block';
    }
  }
}

async function loadAvailableTimes() {
  const data = document.getElementById('data').value;
  const res = await fetch('/api/horarios-ocupados?data=' + data);
  const ocupados = await res.json();
  const cont = document.getElementById('agenda-slots');
  cont.innerHTML = '';

  // GERANDO 24 HORAS
  for (let i = 0; i <= 23; i++) {
    [":00", ":30"].forEach(m => {
      const h = (i < 10 ? '0' + i : i) + m;
      const dv = document.createElement('div');
      dv.className = 'item-hora' + (ocupados.includes(h) ? ' ocupado' : '');
      dv.innerText = h;
      if (!ocupados.includes(h)) dv.onclick = () => sel('hora', h, dv);
      cont.appendChild(dv);
    });
  }
}

async function generatePix() {
  const payload = {
    nome: document.getElementById('nome').value,
    doc: document.getElementById('doc').value.replace(/\D/g, ''),
    email: document.getElementById('email').value,
    servico: document.getElementById('servico').value,
    duracao: document.getElementById('duracao').value,
    data: document.getElementById('data').value,
    hora: document.getElementById('hora').value
  };

  if (!payload.nome || !payload.doc || !payload.hora) return alert("Preencha todos os campos!");

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.invoiceUrl) location.href = data.invoiceUrl;
}
