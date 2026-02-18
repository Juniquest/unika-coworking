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
    try {
        const agora = new Date();
        const hoje = agora.toISOString().split('T')[0];
        const reservas = await Reserva.find({ data: hoje, status: 'pago' });

        for (const res of reservas) {
            const [h, m] = res.hora.split(':');
            const dataInicio = new Date(`${res.data}T${h}:${m}:00`);
            const dataFim = new Date(dataInicio.getTime() + (parseInt(res.duracao) * 60000));
            const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

            if (tempoRestanteMin === 10) {
                enviarEmail(res.email, res.nome, "Sua sessão encerra em 10 minutos.");
            }
            if (tempoRestanteMin <= 0) {
                await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
                enviarEmail(res.email, res.nome, "Sua sessão foi encerrada.");
            }
        }
    } catch (e) { console.log("Erro no Cron:", e); }
});

function enviarEmail(email, nome, mensagem) {
    const mailOptions = {
        from: 'ŪNIKA <riostoragecube@gmail.com>',
        to: email,
        subject: 'Aviso ŪNIKA',
        text: `Olá ${nome}, ${mensagem}`
    };
    transporter.sendMail(mailOptions).catch(err => console.log("Erro e-mail:", err));
}

// 3. ESTILOS CSS
const style = `
    :root { --gold: #d4af37; --bg: #000; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    h1 { letter-spacing: 10px; font-weight: 300; margin-bottom: 20px; }
    #timer { font-size: 4rem; color: var(--gold); font-weight: bold; margin: 20px 0; }
    .btn { padding: 15px 30px; border: 1px solid var(--gold); color: var(--gold); text-decoration: none; text-transform: uppercase; letter-spacing: 2px; transition: 0.3s; }
    .btn:hover { background: var(--gold); color: #000; }
    input { background: transparent; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 20px; text-align: center; width: 250px; }
`;

// 4. ROTAS (CORREÇÃO DO "CANNOT GET")
app.get('/', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>ŪNIKA</h1><a href="/login" class="btn">Acessar Painel</a></body></html>`);
});

app.get('/login', (req, res) => {
    res.send(`<html><head><style>${style}</style></head><body><h1>LOGIN</h1><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="SEU CPF" required><br><button type="submit" class="btn">ENTRAR</button></form></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje });

    if (!reserva) return res.send("<h1>Reserva não encontrada para hoje</h1><a href='/login'>Voltar</a>");

    res.send(`<html><head><style>${style}</style></head><body>
        <h1>ŪNIKA</h1>
        <div id="timer">Calculando...</div>
        <script>
            function atualizar() {
                const agora = new Date();
                const dataFim = new Date("${reserva.data}T${reserva.hora}:00").getTime() + (${reserva.duracao} * 60000);
                const dist = dataFim - agora.getTime();
                
                if (dist < 0) {
                    document.getElementById('timer').innerHTML = "ENCERRADO";
                    return;
                }

                const h = Math.floor(dist / 3600000);
                const m = Math.floor((dist % 3600000) / 60000);
                const s = Math.floor((dist % 60000) / 1000);
                document.getElementById('timer').innerHTML = (h > 0 ? h + ":" : "") + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
            }
            setInterval(atualizar, 1000);
            atualizar();
        </script>
    </body></html>`);
});

app.listen(process.env.PORT || 3000);
