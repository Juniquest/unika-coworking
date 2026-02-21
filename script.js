function sel(id, val, el) {
    document.querySelectorAll('.' + id + '-selected').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    el.classList.add(id + '-selected');
    document.getElementById(id).value = val;

    if(id === 'servico') {
        const agenda = document.getElementById('secao-agenda');
        if(val.includes('Banheiro')) {
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
    if(!payload.nome || !payload.doc || !payload.hora) return alert("Preencha todos os campos!");

    const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.invoiceUrl) location.href = data.invoiceUrl;
}
✅ PRICE_TABLE
✅ funções fmtBRL, calcTotal
✅ updateDurationPrices
✅ nova função sel()
✅ mostrarResumo(), editarResumo(), confirmarEGerarPix()
