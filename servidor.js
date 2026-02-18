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
    auth: { 
        user: 'riostoragecube@gmail.com', 
        pass: 'imzsysjsuihjdyay' 
    }
});

// 2. MONITORAMENTO DE TEMPO (CRON JOB)
cron.schedule('* * * * *', async () => {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const reservas = await Reserva.find({ data: hoje, status: 'pago' });

    // Correção do loop: o async deve estar aqui para o await funcionar internamente
    for (const res of reservas) {
        const [h, m] = res.hora.split(':');
        const dataInicio = new Date(`${res.data}T${h}:${m}:00`);
        const dataFim = new Date(dataInicio.getTime() + (parseInt(res.duracao) * 60000));
        const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

        if (tempoRestanteMin === 10) {
            enviarEmail(res.email, res.nome, "Informamos que sua sessão na ŪNIKA encerra em 10 minutos. Sinta-se à vontade para organizar seus pertences.");
        }

        if (tempoRestanteMin <= 0 && tempoRestanteMin > -2) {
            console.log(`[SHUTDOWN] ${res.servico}`);
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

// 3. ESTILOS E PÁGINAS (CORREÇÃO DO "CANNOT GET")
const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.5rem; text-transform: uppercase; margin: 0; }
    .btn-gold { width: 100%; max-width: 300px; padding: 20px; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; text-decoration: none; display: block; margin: 10px auto; }
    input { width: 100%; max-width: 300px; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px 0; margin-bottom: 30px; font-size: 1.2rem; text-align: center; outline: none; }
`;

app.get('/', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><a href="/reservar" class="btn-gold">Reservar</a><a href="/login" class="btn-gold">Login</a></body></html>`);
});

app.get('/login', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>BEM-VINDO</h1><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ENTRAR</button></form></body></html>`);
});

// PAINEL COM CRONÔMETRO E POPUP
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: { $in: ['pago', 'finalizado'] } });

    if (!reserva) return res.send(`<html><head><style>${style}</style></head><body><h1>ACESSO NEGADO</h1><a href="/login" class="btn-outline">Voltar</a></body></html>`);

    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}#timer{font-size:3rem;color:var(--gold);letter-spacing:5px;}</style></head><body><h1>ŪNIKA</h1><div id="timer">--:--</div>
    <script>
        let avisou10 = false;
        function startTimer(duration, start){ 
            const display=document.querySelector('#timer'); 
            const end=new Date(start).getTime()+(duration*60000); 
            setInterval(()=>{ 
                const dist=end-new Date().getTime(); 
                if(dist < 0){ 
                    display.innerHTML="FIM"; 
                    if(dist > -5000) alert("SUA SESSÃO NA ŪNIKA ENCERROU.");
                    return; 
                }
                const m = Math.floor((dist % 3600000) / 60000);
                if(m === 10 && !avisou10) { alert("ATENÇÃO: Faltam 10 minutos."); avisou10 = true; }
                const h=Math.floor(dist/3600000);
                const s=Math.floor((dist%60000)/1000);
                display.innerHTML=(h>0?h+":":"")+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s); 
            },1000); 
        }
        startTimer(parseInt("${reserva.duracao}"), new Date("${reserva.data}T${reserva.hora}:00"));
    </script></body></html>`);
});

// ROTA DE TESTE RÁPIDO
app.get('/testar-email', (req, res) => {
    enviarEmail("riostoragecube@gmail.com", "Admin ŪNIKA", "Teste de e-mail funcionando!");
    res.send("<h1>Comando enviado!</h1>");
});

app.listen(process.env.PORT || 3000);
