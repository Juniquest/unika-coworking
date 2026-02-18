const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO AO BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pago' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// CONFIGURAÇÃO DE E-MAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'riostoragecube@gmail.com', pass: 'imzsysjsuihjdyay' }
});

// 2. MONITORAMENTO DE TEMPO (CRON JOB)
cron.schedule('* * * * *', async () => {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const reservas = await Reserva.find({ data: hoje, status: 'pago' });

    for (const res of reservas) {
        const [h, m] = res.hora.split(':');
        const dataInicio = new Date(`${res.data}T${h}:${m}:00`);
        const dataFim = new Date(dataInicio.getTime() + (parseInt(res.duracao) * 60000));
        const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

        if (tempoRestanteMin === 10) {
            enviarEmail(res.email, res.nome, "Informamos que sua sessão na ŪNIKA encerra em 10 minutos. Sinta-se à vontade para organizar seus pertences.");
        }
        if (tempoRestanteMin <= 0 && tempoRestanteMin > -2) {
            enviarEmail(res.email, res.nome, "Sua sessão foi encerrada e os equipamentos foram desligados. Agradecemos por escolher a ŪNIKA.");
            await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
        }
    }
});

function enviarEmail(email, nome, mensagem) {
    const mailOptions = {
        from: 'ŪNIKA | Experiência Digital <riostoragecube@gmail.com>',
        to: email,
        subject: 'ŪNIKA | Informação importante sobre sua sessão',
        text: `Olá, ${nome}.\n\n${mensagem}\n\nAtenciosamente,\nEquipe ŪNIKA`
    };
    transporter.sendMail(mailOptions).catch(err => console.log("Erro e-mail:", err));
}

// 3. ESTILOS (LAYOUT ORIGINAL RECUPERADO)
const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.5rem; text-transform: uppercase; margin: 0; }
    .slogan { color: var(--gold); font-size: 0.7rem; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; opacity: 0.8; }
    .container { width: 90%; max-width: 500px; background: var(--card); padding: 40px; border: 1px solid #222; border-radius: 4px; margin-top: 30px; text-align: left; }
    input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px 0; margin-bottom: 20px; font-size: 1rem; outline: none; }
    .btn-gold { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; text-decoration: none; display: block; text-align: center; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .item { border: 1px solid #333; padding: 15px; text-align: center; cursor: pointer; font-size: 0.8rem; }
    .selected { border-color: var(--gold); background: rgba(212,175,55,0.1); }
    .agenda { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
    .timer-box { border: 1px solid var(--gold); padding: 20px; margin-bottom: 20px; text-align: center; }
    #timer { font-size: 3rem; color: var(--gold); letter-spacing: 5px; }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 15px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; }
`;

// 4. ROTAS
app.get('/', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="slogan">Onde o luxo encontra a produtividade</div><div style="margin-top:30px;"><a href="/reservar" class="btn-gold">Reservar Espaço</a><a href="/login" class="btn-gold" style="margin-top:10px;">Acessar Meu Painel</a></div></body></html>`);
});

app.get('/login', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>LOGIN</h1><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ENTRAR</button></form></div></body></html>`);
});

app.get('/reservar', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="container"><form action="/api/checkout" method="POST">
    <div class="grid"><div class="item" onclick="sel('Estação Individual', this)">ESTAÇÃO</div><div class="item" onclick="sel('Sala de Reunião', this)">SALA</div><div class="item" onclick="sel('Banheiro Masc', this)">BANHEIRO (M)</div><div class="item" onclick="sel('Banheiro Fem', this)">BANHEIRO (F)</div></div>
    <input type="hidden" name="servico" id="servico" required>
    <input type="text" name="nome" placeholder="NOME" required>
    <input type="text" name="doc" placeholder="CPF" required>
    <input type="email" name="email" placeholder="E-MAIL" required>
    <input type="date" id="data" name="data" onchange="loadHr()" style="color-scheme:dark;">
    <div class="agenda" id="agenda"></div>
    <input type="hidden" name="hora" id="hora">
    <input type="hidden" name="duracao" value="120">
    <button type="submit" class="btn-gold">Pagar e Reservar</button></form></div>
    <script>
        function sel(v, e){ document.querySelectorAll('.item').forEach(x=>x.classList.remove('selected')); e.classList.add('selected'); document.getElementById('servico').value=v; }
        async function loadHr(){ const d=document.getElementById('data').value; const res=await fetch('/api/horarios-ocupados?data='+d); const ocup=await res.json(); const cont=document.getElementById('agenda'); cont.innerHTML=''; for(let i=8;i<22;i++){ [":00",":30"].forEach(m=>{ const h=(i<10?'0'+i:i)+m; const dv=document.createElement('div'); dv.className='item'; dv.innerText=h; dv.onclick=()=>{ document.querySelectorAll('.agenda .item').forEach(x=>x.classList.remove('selected')); dv.classList.add('selected'); document.getElementById('hora').value=h; }; cont.appendChild(dv); }); } }
    </script></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje });
    if (!reserva) return res.send("Acesso Negado");
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="container"><div class="timer-box"><div id="timer">--:--</div></div>
    <div class="control-grid"><button class="btn-iot">💡 Luzes</button><button class="btn-iot">❄️ Ar</button><button class="btn-iot">📺 TV</button><button class="btn-iot">🔌 Tomadas</button></div></div>
    <script>
        function start(){ 
            const end = new Date("${reserva.data}T${reserva.hora}:00").getTime() + (${reserva.duracao} * 60000);
            setInterval(() => {
                const dist = end - new Date().getTime();
                if(dist<0){ document.getElementById('timer').innerHTML="FIM"; return; }
                const m = Math.floor((dist % 3600000) / 60000);
                const s = Math.floor((dist % 60000) / 1000);
                document.getElementById('timer').innerHTML = m + ":" + (s < 10 ? "0" + s : s);
            }, 1000);
        } start();
    </script></body></html>`);
});

app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.post('/api/checkout', async (req, res) => {
    try { await new Reserva(req.body).save(); res.send("Redirecionando para pagamento..."); } catch (e) { res.send("Erro."); }
});

app.listen(process.env.PORT || 3000);
