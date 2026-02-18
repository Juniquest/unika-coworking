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
        if (!res.hora || res.servico.includes('Banheiro')) continue;
        const [h, m] = res.hora.split(':');
        const dataFim = new Date(`${res.data}T${h}:${m}:00`);
        dataFim.setMinutes(dataFim.getMinutes() + parseInt(res.duracao));
        const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

        if (tempoRestanteMin === 10) {
            enviarEmail(res.email, res.nome, "Sua sessão na ŪNIKA encerra em 10 minutos.");
        }
        if (tempoRestanteMin <= 0 && tempoRestanteMin > -2) {
            await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
            enviarEmail(res.email, res.nome, "Sua sessão encerrou.");
        }
    }
});

function enviarEmail(email, nome, mensagem) {
    const mailOptions = {
        from: 'ŪNIKA | Experiência Digital <riostoragecube@gmail.com>',
        to: email,
        subject: 'Aviso ŪNIKA',
        text: `Olá, ${nome}.\n\n${mensagem}`
    };
    transporter.sendMail(mailOptions).catch(err => console.log("Erro e-mail:", err));
}

// 3. ESTILOS
const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.5rem; text-transform: uppercase; margin: 0; }
    .container { width: 90%; max-width: 500px; background: var(--card); padding: 40px; border: 1px solid #222; border-radius: 4px; margin-top: 30px; text-align: left; }
    input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px 0; margin-bottom: 20px; font-size: 1rem; outline: none; }
    .btn-gold { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; text-decoration: none; display: block; text-align: center; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .item { border: 1px solid #333; padding: 15px; text-align: center; cursor: pointer; font-size: 0.8rem; }
    .selected { border-color: var(--gold); background: rgba(212,175,55,0.1); }
    .agenda { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
    .timer-box { border: 1px solid var(--gold); padding: 20px; margin-bottom: 20px; text-align: center; }
    #timer { font-size: 3.5rem; color: var(--gold); letter-spacing: 5px; }
    .btn-iot { width: 100%; background: transparent; border: 1px solid #333; color: #fff; padding: 20px; cursor: pointer; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 2px; margin-top: 10px; }
`;

// 4. ROTAS
app.get('/', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><a href="/reservar" class="btn-gold">Reservar Espaço</a><a href="/login" class="btn-gold">Acessar Meu Painel</a></body></html>`);
});

app.get('/login', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>LOGIN</h1><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ENTRAR</button></form></div></body></html>`);
});

app.get('/reservar', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>RESERVAR</h1><div class="container"><form action="/api/checkout" method="POST">
    <div class="grid"><div class="item" onclick="sel('Estação Individual', this)">ESTAÇÃO</div><div class="item" onclick="sel('Sala de Reunião', this)">SALA</div><div class="item" onclick="sel('Banheiro Masc', this)">BANHEIRO (M)</div><div class="item" onclick="sel('Banheiro Fem', this)">BANHEIRO (F)</div></div>
    <input type="hidden" name="servico" id="servico" required>
    <input type="text" name="nome" placeholder="NOME COMPLETO" required>
    <input type="text" name="doc" placeholder="CPF" required>
    <input type="email" name="email" placeholder="E-MAIL" required>
    <div id="box-agenda">
        <input type="date" id="data" name="data" onchange="loadHr()" style="color-scheme:dark;">
        <div class="agenda" id="agenda"></div>
        <input type="hidden" name="hora" id="hora">
    </div>
    <input type="hidden" name="duracao" id="duracao" value="120">
    <button type="submit" class="btn-gold">Ir para Pagamento</button></form></div>
    <script>
        function sel(v,e){
            document.querySelectorAll('.item').forEach(x=>x.classList.remove('selected'));
            e.classList.add('selected');
            document.getElementById('servico').value=v;
            const isBanheiro = v.includes('Banheiro');
            document.getElementById('box-agenda').style.display = isBanheiro ? 'none' : 'block';
            if(isBanheiro) { 
                document.getElementById('hora').value = "00:00"; 
                document.getElementById('data').value = new Date().toISOString().split('T')[0];
                document.getElementById('duracao').value = "60";
            }
        }
        async function loadHr(){
            const d=document.getElementById('data').value;
            const r=await fetch('/api/horarios-ocupados?data='+d);
            const ocup=await r.json();
            const c=document.getElementById('agenda'); c.innerHTML='';
            for(let i=8;i<22;i++){ [":00",":30"].forEach(m=>{
                const h=(i<10?'0'+i:i)+m; const dv=document.createElement('div');
                dv.className='item'; dv.innerText=h; dv.onclick=()=>{
                    document.querySelectorAll('.agenda .item').forEach(x=>x.classList.remove('selected'));
                    dv.classList.add('selected'); document.getElementById('hora').value=h;
                }; c.appendChild(dv);
            });}
        }
    </script></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje }).sort({ _id: -1 });

    if (!reserva) return res.send(`<html><head><style>${style}</style></head><body><h1>ACESSO NEGADO</h1><a href="/login" class="btn-gold">Voltar</a></body></html>`);

    const isPremium = reserva.servico.includes('Estação') || reserva.servico.includes('Sala');
    const isMasc = reserva.servico.includes('Masc');
    const isFem = reserva.servico.includes('Fem');

    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="container">
    <div class="timer-box"><div id="timer">${isPremium ? '--:--' : 'ACESSO LIBERADO'}</div></div>
    <div style="display:flex; flex-direction:column; gap:10px;">
        ${isPremium ? '<button class="btn-iot" onclick="alert(\'Acesso Masc Liberado\')">🚹 Abrir Banheiro Masc</button><button class="btn-iot" onclick="alert(\'Acesso Fem Liberado\')">🚺 Abrir Banheiro Fem</button>' : ''}
        ${isMasc ? '<button class="btn-iot" onclick="alert(\'Acesso Masculino Liberado\')">🚹 Abrir Banheiro Masculino</button>' : ''}
        ${isFem ? '<button class="btn-iot" onclick="alert(\'Acesso Feminino Liberado\')">🚺 Abrir Banheiro Feminino</button>' : ''}
    </div></div>
    <script>
        if(${isPremium}){
            function start(){
                const [h, m] = "${reserva.hora}".split(':');
                const fim = new Date("${reserva.data}T" + h + ":" + m + ":00").getTime() + (${reserva.duracao} * 60000);
                setInterval(() => {
                    const dist = fim - new Date().getTime();
                    if(dist < 0) { document.getElementById('timer').innerHTML = "FIM"; return; }
                    const mm = Math.floor((dist % 3600000) / 60000);
                    const ss = Math.floor((dist % 60000) / 1000);
                    document.getElementById('timer').innerHTML = mm + ":" + (ss < 10 ? "0" + ss : ss);
                }, 1000);
            } start();
        }
    </script></body></html>`);
});

app.post('/api/checkout', async (req, res) => {
    const { servico, doc } = req.body;
    let linkAsaas = "https://www.asaas.com/c/astpmmsj1m8b7wct"; // Link padrão Sala/Estação
    
    if(servico === 'Banheiro Masc') linkAsaas = "https://www.asaas.com/c/xx8y9j7aelqt1u1z";
    if(servico === 'Banheiro Fem') linkAsaas = "https://www.asaas.com/c/hy4cb2sz0ya4mmrd";

    try { 
        await new Reserva(req.body).save(); 
        res.send(`<script>location.href="${linkAsaas}?externalReference=${doc}";</script>`); 
    } catch (e) { res.send("Erro."); }
});

app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.listen(process.env.PORT || 3000);
