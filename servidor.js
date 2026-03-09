const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI);

let estadoBanheiros = {
    masculino: "livre",
    feminino: "livre"
};
let comandoPorta = {
    masculino: false,
    feminino: false
};
const Reserva = mongoose.model('Reserva', {
    nome: String,
    email: String,
    doc: String,
    servico: String,
    data: String,
    hora: String,
    duracao: String,
    pagamentoId: String,
    status: { type: String, default: 'pendente' }
});

app.get('/api/status-banheiros', (req, res) => {

    res.json({
        masculino: estadoBanheiros.masculino,
        feminino: estadoBanheiros.feminino
    });

});

app.get('/painel', async (req, res) => {

    const { cpf } = req.query;
    const cpfLimpo = cpf.replace(/\D/g, '');

    const reserva = await Reserva.findOne({
        doc: cpfLimpo,
        status: 'pago'
    }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`<body style="background:#000;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;">
        <h1>ACESSO NEGADO</h1></body>`);
    }

    let statusBanheiro = "livre";

    if (reserva.servico === "Banheiro Masc") statusBanheiro = estadoBanheiros.masculino;
    if (reserva.servico === "Banheiro Fem") statusBanheiro = estadoBanheiros.feminino;

    res.send(`<!DOCTYPE html>
<html>
<body>
<h1>ŪNIKA</h1>
<div>BANHEIRO: ${statusBanheiro.toUpperCase()}</div>
</body>
</html>`);

});

app.post('/api/checkout', async (req, res) => {

    const servico = req.body.servico;

    // BLOQUEIO DE BANHEIRO OCUPADO
    if (servico === "Banheiro Masc" && estadoBanheiros.masculino === "ocupado") {
        return res.json({
            erro: "Banheiro masculino ocupado no momento."
        });
    }

    if (servico === "Banheiro Fem" && estadoBanheiros.feminino === "ocupado") {
        return res.json({
            erro: "Banheiro feminino ocupado no momento."
        });
    }

    const links = {
        "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z",
        "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd",
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };

    const linkFinal =
        (links[req.body.servico] || links[req.body.duracao] || links["120"])
        + "?externalReference=" + req.body.doc;

    try {

        const reserva = await new Reserva(req.body).save();

        res.json({
            invoiceUrl: linkFinal,
            reservaId: reserva._id
        });

    } catch (e) {

        res.status(500).json({ error: "Erro" });

    }

});

    const links = {
        "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z",
        "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd",
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };

    const linkFinal =
        (links[req.body.servico] || links[req.body.duracao] || links["120"])
        + "?externalReference=" + req.body.doc;

    try {

        const reserva = await new Reserva(req.body).save();

        res.json({
            invoiceUrl: linkFinal,
            reservaId: reserva._id
        });

    } catch (e) {

        res.status(500).json({ error: "Erro" });

    }

});

app.post('/webhook-asaas', async (req, res) => {

    try {

        const evento = req.body;

        if (evento.event === "PAYMENT_RECEIVED") {

            const doc = evento.payment.externalReference;
            const paymentId = evento.payment.id;

            const reserva = await Reserva.findOneAndUpdate(
                {
                    doc: doc,
                    status: "pendente"
                },
                {
                    status: "pago",
                    pagamentoId: paymentId
                },
                { new: true }
            );

            if (reserva) {

                if (reserva.servico === "Banheiro Masc") {
                    estadoBanheiros.masculino = "ocupado";
                }

                if (reserva.servico === "Banheiro Fem") {
                    estadoBanheiros.feminino = "ocupado";
                }

            }

        }

        res.sendStatus(200);

    } catch (err) {

        res.sendStatus(500);

    }

});

app.post('/api/banheiro-status', (req, res) => {

    const { tipo, status } = req.body;

    if (tipo === "masculino" || tipo === "feminino") {

        estadoBanheiros[tipo] = status;

    }

    res.sendStatus(200);

});

app.post('/api/abrir-porta', (req, res) => {

    const { tipo } = req.body;

    if (estadoBanheiros[tipo] === "ocupado") {

        return res.json({
            erro: "Banheiro ocupado. Aguarde liberar."
        });

    }

    estadoBanheiros[tipo] = "ocupado";

    res.json({
        ok: true
    });

});

app.post('/api/liberar-banheiro', (req, res) => {

    const { tipo } = req.body;

    if (tipo === "masculino" || tipo === "feminino") {

        estadoBanheiros[tipo] = "livre";

    }

    res.sendStatus(200);

});
app.get('/api/comando-porta', (req, res) => {

    const tipo = req.query.tipo;

    if (tipo === "masculino" || tipo === "feminino") {

        const abrir = comandoPorta[tipo];

        comandoPorta[tipo] = false;

        return res.json({ abrir });

    }

    res.json({ abrir:false });

});

app.listen(process.env.PORT || 3000);
