const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO BCO DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. ROTA DE WEBHOOK (O CÉREBRO DA AUTOMAÇÃO)
// Esta rota o Asaas vai chamar automaticamente quando o Pix for pago
app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    
    console.log(`🔔 Evento recebido do Asaas: ${event}`);

    // Se o pagamento foi confirmado ou recebido
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const cpfCliente = payment.externalReference; // O CPF que enviamos no checkout
        
        try {
            // Busca a reserva mais recente desse CPF que esteja pendente e atualiza para pago
            const reserva = await Reserva.findOneAndUpdate(
                { doc: cpfCliente, status: 'pendente' },
                { status: 'pago' },
                { sort: { _id: -1 } } 
            );

            if (reserva) {
                console.log(`✅ Reserva de ${reserva.nome} aprovada automaticamente!`);
                // Aqui no futuro dispararemos o e-mail automático
            }
        } catch (err) {
            console.error("❌ Erro ao processar webhook:", err);
        }
    }
    res.sendStatus(200); // Responde ao Asaas que recebeu o aviso
});

// --- AS OUTRAS ROTAS (FRONTEND E API) CONTINUAM IGUAIS ---
app.get('/api/horarios-ocupados', async (req, res) => {
    const { data } = req.query;
    const ocupados = await Reserva.find({ data: data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.get('/', (req, res) => {
    // ... (Mantém o mesmo HTML elegante que você já aprovou)
    res.send(`<!DOCTYPE html>...`); // O HTML aqui é o mesmo da última versão que você gostou
});

app.post('/api/checkout', async (req, res) => {
    const { nome, doc, email, servico, data, hora, duracao } = req.body;
    const linksAsaas = {
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = linksAsaas[duracao] || linksAsaas["120"];
    
    // Adicionamos o CPF como ExternalReference para o Asaas nos devolver no Webhook
    const linkComCpf = linkFinal + "?externalReference=" + doc;

    try {
        const novaReserva = new Reserva(req.body);
        await novaReserva.save();
        res.send(`
            <body style="background:#050505; color:#fff; text-align:center; padding-top:150px; font-family:sans-serif;">
                <h1 style="color:#d4af37; letter-spacing:10px; font-weight:100; font-size:3.5rem;">ŪNIKA</h1>
                <p style="font-size:1.4rem;">Gerando seu acesso seguro...</p>
                <script>setTimeout(() => { window.location.href='${linkComCpf}'; }, 2000);</script>
            </body>`);
    } catch (err) { res.status(500).send("Erro."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UNIKA Online"));
