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

// CONFIGURAÇÃO DE E-MAIL (Dados inseridos conforme solicitado)
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

    // Correção: 'async' inserido antes de (res) para evitar o erro de SyntaxError
    reservas.forEach(async (res) => { 
        const [h, m] = res.hora.split(':');
        const dataInicio = new Date(`${res.data}T${h}:${m}:00`);
        const dataFim = new Date(dataInicio.getTime() + (parseInt(res.duracao) * 60000));
        const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

        // AVISO DE 10 MINUTOS
        if (tempoRestanteMin === 10) {
            enviarEmail(res.email, res.nome, "Informamos que sua sessão na ŪNIKA encerra em 10 minutos. Sinta-se à vontade para organizar seus pertences e finalizar suas atividades com tranquilidade. Esperamos que seu tempo conosco tenha sido memorável.");
        }

        // ENCERRAMENTO TOTAL
        if (tempoRestanteMin <= 0 && tempoRestanteMin > -2) {
            console.log(`[SHUTDOWN] ${res.servico} - ${res.nome}`);
            enviarEmail(res.email, res.nome, "Sua sessão foi encerrada e os equipamentos foram desligados. Agradecemos por escolher a ŪNIKA para sua produtividade hoje. Esperamos recebê-lo(a) novamente em breve.");
            await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
        }
    });
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

// 3. ESTILOS (LAYOUT PRESERVADO)
const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.5rem; text-transform: uppercase; margin: 0; }
    .slogan { color: var(--gold); font-size: 0.7rem; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; opacity: 0.8; }
    .container { width: 90%; max-width: 400px; background: var(--card); padding: 40px; border: 1px solid #222; border-radius: 4px; margin-top: 30px; }
    .btn-gold { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; text-decoration: none; display: block; margin-bottom: 10px; }
`;

// 4. ROTAS DO SITE
app.get('/', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="slogan">Onde o luxo encontra a produtividade</div><div class="container" style="background:transparent;border:none;"><a href="/reservar" class="btn-gold">Reservar Espaço</a><a href="/login" class="btn-gold">Acessar Meu Painel</a></div></body></html>`);
});

app.get('/testar-email', (req, res) => {
    enviarEmail("riostoragecube@gmail.com", "Admin ŪNIKA", "Se você recebeu isso, a configuração de e-mail está perfeita e funcionando!");
    res.send("<h1>Comando de teste enviado!</h1><p>Verifique sua caixa de entrada e o spam.</p>");
});

// APIs EXTRAS (Horários e Checkout Asaas)
app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.post('/api/checkout', async (req, res) => {
    const { doc, servico, duracao } = req.body;
    const links = { "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z", "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd", "120": "https://www.asaas.com/c/astpmmsj1m8b7wct", "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33" };
    const linkFinal = (links[servico] || links[duracao] || links["120"]) + "?externalReference=" + doc;
    try { await new Reserva(req.body).save(); res.send(`<script>location.href='${linkFinal}';</script>`); } catch (e) { res.send("Erro."); }
});

app.listen(process.env.PORT || 3000);
