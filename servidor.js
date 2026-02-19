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

// 2. MONITORAMENTO DE TEMPO (CRON JOB) - CORREÇÃO DEFINITIVA DO SYNTAXERROR
cron.schedule('* * * * *', async () => {
    try {
        const agora = new Date();
        const hoje = agora.toISOString().split('T')[0];
        const reservas = await Reserva.find({ data: hoje, status: 'pago' });

        // Usando for...of para permitir o uso de await corretamente
        for (const res of reservas) {
            if (!res.hora || res.servico.includes('Banheiro')) continue;
            
            const [h, m] = res.hora.split(':');
            const dataFim = new Date(`${res.data}T${h}:${m}:00`);
            dataFim.setMinutes(dataFim.getMinutes() + parseInt(res.duracao));
            const diff = dataFim - agora;
            const tempoRestanteMin = Math.ceil(diff / 60000);

            if (tempoRestanteMin === 10) {
                enviarEmail(res.email, res.nome, "Sua sessão encerra em 10 minutos.");
            }
            if (diff <= 0) {
                await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
                enviarEmail(res.email, res.nome, "Sua sessão encerrou.");
            }
        }
    } catch (e) { console.error("Erro Cron:", e); }
});

function enviarEmail(email, nome, mensagem) {
    const mailOptions = { from: 'ŪNIKA <riostoragecube@gmail.com>', to: email, subject: 'Aviso ŪNIKA', text: `Olá ${nome}, ${mensagem}` };
    transporter.sendMail(mailOptions).catch(err => console.log("Erro e-mail:", err));
}

// 3. ESTILOS DO PAINEL (INCLUINDO TODOS OS CONTROLES SOLICITADOS)
const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
    .container { width: 95%; max-width: 500px; background: var(--card); padding: 30px; border: 1px solid #222; border-radius: 8px; margin-top: 20px; }
    .status-bar { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.7rem; background: #000; padding: 12px; border: 1px solid #222; border-radius: 4px; letter-spacing: 1px; }
    .timer-box { border: 1px solid var(--gold); padding: 25px; margin-bottom: 25px; border-radius: 4px; text-align: center; }
    #timer { font-size: 3.5rem; color: var(--gold); letter-spacing: 5px; font-weight: bold; }
    .iot-group { margin-bottom: 20px; text-align: left; }
    .label-iot { font-size: 0.6rem; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; display: block; margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px; }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn-iot { background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 15px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; border-radius: 4px; }
    .btn-gold { width: 100%; padding: 20px; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; text-decoration: none; display: block; margin-top: 20px; font-weight: 600; letter-spacing: 2px; cursor: pointer; background: transparent; text-align: center; }
`;

// 4. ROTAS DO SISTEMA
app.get('/', (req, res) => { 
    res.send(`<html><head><style>${style}</style></head><body style="justify-content:center;"><h1>ŪNIKA</h1><a href="/login" class="btn-gold">Acessar Painel</a></body></html>`); 
});

app.get('/login', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body style="justify-content:center;"><h1>LOGIN</h1><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="SEU CPF" style="width:100%;background:transparent;border:none;border-bottom:2px solid #333;color:#fff;padding:15px;margin-bottom:20px;text-align:center;" required><button type="submit" class="btn-gold">ENTRAR</button></form></div></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje }).sort({ _id: -1 });

    if (!reserva) return res.send(`<html><head><style>${style}</style></head><body style="justify-content:center;"><h1>ACESSO NEGADO</h1><p>Reserva não encontrada para hoje.</p><a href="/login" class="btn-gold">Voltar</a></body></html>`);

    const isPremium = reserva.servico.includes('Estação') || reserva.servico.includes('Sala');
    const isMasc = reserva.servico.includes('Masc');
    const isFem = reserva.servico.includes('Fem');

    res.send(`<html><head><style>${style}</style></head><body>
    <h1 style="text-align:center;">ŪNIKA</h1>
    <div class="container">
        <div class="status-bar">
            <span>🚹 MASC: <b style="color:#00ff00">LIVRE</b></span>
            <span>🚺 FEM: <b style="color:#00ff00">LIVRE</b></span>
        </div>

        <div class="timer-box">
            <div id="timer">${isPremium ? '--:--' : 'LIBERADO'}</div>
            <div style="font-size:0.6rem; color:var(--gold); margin-top:10px;">${reserva.servico.toUpperCase()}</div>
        </div>

        ${isPremium ? `
        <div class="iot-group"><span class="label-iot">Ar Condicionado</span><div class="control-grid">
            <button class="btn-iot" onclick="alert('Ar Condicionado: Ligado/Desligado')">Power</button>
            <button class="btn-iot" onclick="alert('Temperatura ajustada para 22°C')">Temp 22°C</button>
        </div></div>
        <div class="iot-group"><span class="label-iot">Smart TV</span><div class="control-grid">
            <button class="btn-iot" onclick="alert('Smart TV: Ligada/Desligada')">Power</button>
            <button class="btn-iot" onclick="alert('Volume +/-')">Volume</button>
        </div></div>
        <div class="iot-group"><span class="label-iot">Ambiente</span><div class="control-grid">
            <button class="btn-iot" onclick="alert('Luzes da Sala: Ligadas/Desligadas')">Luzes</button>
            <button class="btn-iot" onclick="alert('Tomada da Sala: Ativada/Desativada')">Tomada</button>
        </div></div>
        <div class="iot-group"><span class="label-iot">Banheiros (Cortesias)</span><div class="control-grid">
            <button class="btn-iot" onclick="alert('Banheiro Masculino Aberto')">Porta Masc</button>
            <button class="btn-iot" onclick="alert('Banheiro Feminino Aberto')">Porta Fem</button>
        </div></div>
        ` : ''}

        ${isMasc ? `<button class="btn-gold" onclick="alert('Porta Masc Aberta')">ABRIR BANHEIRO MASC</button>` : ''}
        ${isFem ? `<button class="btn-gold" onclick="alert('Porta Fem Aberta')">ABRIR BANHEIRO FEM</button>` : ''}
    </div>
    <script>
        if(${isPremium}){
            function updateTimer(){
                const [h, m] = "${reserva.hora}".split(':');
                const fim = new Date("${reserva.data}T" + h + ":" + m + ":00").getTime() + (${reserva.duracao} * 60000);
                const agora = new Date().getTime();
                const dist = fim - agora;
                if(dist < 0) { document.getElementById('timer').innerHTML = "FIM"; return; }
                const mm = Math.floor((dist % 3600000) / 60000);
                const ss = Math.floor((dist % 60000) / 1000);
                document.getElementById('timer').innerHTML = mm + ":" + (ss < 10 ? "0" + ss : ss);
            }
            setInterval(updateTimer, 1000); updateTimer();
        }
    </script></body></html>`);
});

app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor UNIKA Ativo"));
