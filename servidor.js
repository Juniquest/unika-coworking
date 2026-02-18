const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO AO BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. PAINEL DO CLIENTE (COM TRAVA DE GÊNERO)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' });

    if (!reserva) {
        return res.send(`<body style="background:#050505;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>ACESSO NEGADO</h1><p>Reserva não encontrada ou pendente.</p><a href="/" style="color:#fff;">Voltar</a></body>`);
    }

    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Painel</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #ffffff; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 30px 0; text-align: center; }
        h1 { letter-spacing: 10px; font-weight: 300; font-size: 2rem; margin: 0; text-transform: uppercase; }
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 25px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; }
        .timer-box { text-align: center; margin-bottom: 30px; border: 1px solid var(--gold); padding: 20px; }
        #timer { font-size: 3.5rem; font-weight: 300; color: var(--gold); letter-spacing: 5px; }
        h2 { font-weight: 400; font-size: 0.9rem; border-left: 3px solid var(--gold); padding-left: 15px; margin: 25px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 18px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px; font-weight: 600; }
        .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212, 175, 55, 0.1); }
        .btn-available { border-color: #28a745 !important; color: #28a745 !important; }
        #popup-banheiro { position: fixed; top: -100px; left: 50%; transform: translateX(-50%); background: var(--gold); color: #000; padding: 15px 30px; border-radius: 50px; font-weight: 600; transition: 0.5s; z-index: 99; }
        #popup-banheiro.show { top: 20px; }
    </style>
</head>
<body>
    <div id="popup-banheiro">🚽 BANHEIRO LIBERADO AGORA</div>
    <header><h1>ŪNIKA</h1></header>
    <div class="container">
        <div class="timer-box">
            <div style="font-size: 0.7rem; color: #666; letter-spacing: 2px;">TEMPO RESTANTE</div>
            <div id="timer">--:--</div>
            <div style="color:var(--gold); font-size:0.8rem; margin-top:5px;">${reserva.servico.toUpperCase()}</div>
        </div>

        <h2>Controle da Sala</h2>
        <div class="control-grid">
            <button class="btn-iot" onclick="this.classList.toggle('active')">💡 Luzes</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">❄️ Ar</button>
        </div>

        <h2>Acessos Banheiro</h2>
        <div class="control-grid">
            <button id="btn_Masc" class="btn-iot" onclick="abrir('Masc')">🚹 Masculino</button>
            <button id="btn_Fem" class="btn-iot" onclick="abrir('Fem')">🚺 Feminino</button>
        </div>
        <div style="font-size: 0.6rem; color:#444; text-align:center; margin-top:20px;">SESSÃO: ${reserva.nome.toUpperCase()}</div>
    </div>

    <script>
        const servico = "${reserva.servico}";
        
        function abrir(tipo) {
            const temDireito = (servico === 'Sala' || servico === 'Estação' || servico === 'Banheiro Masc' && tipo === 'Masc' || servico === 'Banheiro Fem' && tipo === 'Fem');
            
            if (!temDireito) {
                alert("Acesso Negado. Seu plano não inclui o Banheiro " + tipo);
                return;
            }
            alert("Porta do Banheiro " + tipo + " destrancada!");
        }

        // Simulação de Pop-up Inteligente
        setInterval(() => {
            if(Math.random() > 0.8) {
                const pop = document.getElementById('popup-banheiro');
                pop.classList.add('show');
                setTimeout(() => pop.classList.remove('show'), 4000);
            }
        }, 10000);

        // Timer
        function startTimer(duration, start) {
            const display = document.querySelector('#timer');
            const end = new Date(start).getTime() + (duration * 60000);
            setInterval(() => {
                const dist = end - new Date().getTime();
                if (dist < 0) { display.innerHTML = "FIM"; return; }
                const m = Math.floor((dist % 3600000) / 60000);
                const s = Math.floor((dist % 60000) / 1000);
                display.innerHTML = (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s);
            }, 1000);
        }
        startTimer(parseInt("${reserva.duracao}") || 60, new Date("${reserva.data}T${reserva.hora}:00"));
    </script>
</body>
</html>`);
});

// 3. WEBHOOK (ASAAS)
app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        await Reserva.findOneAndUpdate({ doc: payment.externalReference, status: 'pendente' }, { status: 'pago' }, { sort: { _id: -1 } });
    }
    res.sendStatus(200);
});

// 4. API HORÁRIOS
app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 5. PÁGINA INICIAL
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Reserva</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter'; display: flex; flex-direction: column; align-items: center; }
        header { padding: 40px 0; }
        h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.5rem; text-transform: uppercase; }
        .container { width: 92%; max-width: 500px; background: var(--card); padding: 30px; border-radius: 4px; border: 1px solid #222; }
        h2 { color: var(--gold); font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; border-left: 3px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; }
        input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 12px 0; margin-bottom: 20px; font-size: 1rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .item { border: 1px solid #333; padding: 15px; text-align: center; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
        .selected { border-color: var(--gold); background: rgba(212, 175, 55, 0.2); }
        .btn-pay { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; margin-top: 20px; }
        .agenda { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 200px; overflow-y: auto; padding: 10px; background: #000; }
    </style>
</head>
<body>
    <header><h1>ŪNIKA</h1></header>
    <div class="container">
        <form action="/api/checkout" method="POST">
            <h2>01. Serviço</h2>
            <div class="grid">
                <div class="item" onclick="sel('servico','Estação',this)">ESTAÇÃO</div>
                <div class="item" onclick="sel('servico','Sala',this)">SALA</div>
                <div class="item" onclick="sel('servico','Banheiro Masc',this)">BANHEIRO (M)</div>
                <div class="item" onclick="sel('servico','Banheiro Fem',this)">BANHEIRO (F)</div>
            </div>
            <input type="hidden" name="servico" id="servico" required>

            <h2>02. Identificação</h2>
            <input type="text" name="nome" placeholder="NOME" required>
            <input type="text" name="doc" placeholder="CPF" required>
            <input type="email" name="email" placeholder="E-MAIL" required>

            <h2>03. Tempo</h2>
            <div class="grid">
                <div class="item" onclick="sel('duracao','120',this)">120 MIN</div>
                <div class="item" onclick="sel('duracao','diaria',this)">DIÁRIA</div>
            </div>
            <input type="hidden" name="duracao" id="duracao" required>

            <h2>04. Início</h2>
            <input type="date" id="data" name="data" onchange="loadHr()" style="color-scheme: dark;">
            <div class="agenda" id="agenda"></div>
            <input type="hidden" name="hora" id="hora" required>

            <button type="submit" class="btn-pay">Pagar e Reservar</button>
        </form>
    </div>
    <script>
        function sel(id, val, el) { 
            document.querySelectorAll('.'+id+'-selected').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected'); el.classList.add(id+'-selected');
            document.getElementById(id).value = val;
        }
        async function loadHr() {
            const d = document.getElementById('data').value;
            const res = await fetch('/api/horarios-ocupados?data='+d);
            const ocup = await res.json();
            const cont = document.getElementById('agenda');
            cont.innerHTML = '';
            for(let i=8; i<20; i++) {
                [":00", ":30"].forEach(m => {
                    const h = (i<10?'0'+i:i)+m;
                    const dv = document.createElement('div');
                    dv.className = 'item' + (ocup.includes(h)?' ocupado':'');
                    dv.innerText = h;
                    if(!ocup.includes(h)) dv.onclick = () => sel('hora', h, dv);
                    cont.appendChild(dv);
                });
            }
        }
    </script>
</body>
</html>`);
});

// 6. CHECKOUT REDIRECT
app.post('/api/checkout', async (req, res) => {
    const { doc, servico, duracao } = req.body;
    const links = {
        "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z",
        "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd",
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = (links[servico] || links[duracao] || links["120"]) + "?externalReference=" + doc;
    try {
        await new Reserva(req.body).save();
        res.send(`<body style="background:#000;color:#fff;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>ŪNIKA</h1><p>Redirecionando para checkout...</p><script>setTimeout(()=>location.href='${linkFinal}', 1500);</script></body>`);
    } catch (e) { res.send("Erro ao salvar."); }
});

app.listen(process.env.PORT || 3000);
