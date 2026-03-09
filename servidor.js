const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// arquivos estáticos
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CONEXÃO MONGO
mongoose.connect(process.env.MONGO_URI);

// ESTADO DOS BANHEIROS
let estadoBanheiros = {
    masculino: "livre",
    feminino: "livre"
};

// MODELO RESERVA
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


// ==========================
// PAINEL CLIENTE
// ==========================

app.get('/painel', async (req, res) => {

    const { cpf } = req.query;
    const cpfLimpo = cpf.replace(/\D/g, '');

    const reserva = await Reserva.findOne({
        doc: cpfLimpo,
        status: 'pago'
    }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`
            <body style="background:#000;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;">
                <h1 style="letter-spacing:5px;">ACESSO NEGADO</h1>
                <p style="color:#fff;">Nenhuma reserva paga encontrada para o CPF: ${cpfLimpo}</p>
                <a href="/" style="color:#d4af37; text-decoration:none; border:1px solid #d4af37; padding:10px 20px; display:inline-block; margin-top:20px;">VOLTAR</a>
            </body>
        `);
    }

    // VERIFICA OCUPAÇÃO BANHEIRO
    let statusBanheiro = "livre";

    if (reserva.servico === "Banheiro Masc") {
        statusBanheiro = estadoBanheiros.masculino;
    }

    if (reserva.servico === "Banheiro Fem") {
        statusBanheiro = estadoBanheiros.feminino;
    }

    res.send(`

<!DOCTYPE html>
<html lang="pt-br">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>ŪNIKA | Painel</title>

<style>

body{
background:#050505;
color:#fff;
font-family:sans-serif;
display:flex;
flex-direction:column;
align-items:center;
padding:20px;
}

h1{
letter-spacing:12px;
font-weight:300;
margin-top:40px;
text-transform:uppercase;
}

.timer-box{
border:1px solid #d4af37;
padding:30px;
text-align:center;
width:100%;
max-width:380px;
margin:30px 0;
}

#timer{
font-size:4rem;
color:#d4af37;
font-weight:bold;
letter-spacing:5px;
}

h2{
color:#d4af37;
font-size:1rem;
text-transform:uppercase;
border-left:4px solid #d4af37;
padding-left:15px;
align-self:flex-start;
max-width:380px;
margin:30px auto 15px;
width:100%;
letter-spacing:2px;
}

.grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:12px;
width:100%;
max-width:380px;
}

.btn-iot{
background:transparent;
border:1px solid #333;
color:#fff;
padding:20px;
font-size:0.8rem;
font-weight:bold;
cursor:pointer;
text-transform:uppercase;
transition:0.3s;
}

.btn-iot.active{
border-color:#d4af37;
color:#d4af37;
background:rgba(212,175,55,0.1);
}

.info{
font-size:0.7rem;
color:#444;
margin-top:40px;
text-transform:uppercase;
letter-spacing:2px;
}

.status-banheiro{
margin-top:10px;
font-size:0.9rem;
color:${statusBanheiro === "livre" ? "#00ff88" : "#ff4444"};
}

</style>

</head>

<body>

<h1>ŪNIKA</h1>

<div class="timer-box">

<div style="font-size:0.7rem;color:#666;margin-bottom:10px;letter-spacing:2px;">
TEMPO RESTANTE
</div>

<div id="timer">--:--</div>

<div style="color:#d4af37;font-size:0.9rem;margin-top:10px;font-weight:bold;">
${reserva.servico.toUpperCase()}
</div>

<div class="status-banheiro">
BANHEIRO: ${statusBanheiro.toUpperCase()}
</div>

</div>

<h2>AUTOMAÇÃO</h2>

<div class="grid">

<button class="btn-iot" onclick="this.classList.toggle('active')">💡 LUZES</button>
<button class="btn-iot" onclick="this.classList.toggle('active')">❄️ AR CONDICIONADO</button>
<button class="btn-iot" onclick="this.classList.toggle('active')">📺 TELEVISÃO</button>
<button class="btn-iot" onclick="this.classList.toggle('active')">🔌 TOMADAS</button>

</div>


<h2>ACESSOS</h2>

<div class="grid">

<button class="btn-iot" onclick="abrirPorta('masculino')">🚹 MASCULINO</button>
<button class="btn-iot" onclick="abrirPorta('feminino')">🚺 FEMININO</button>

</div>

<div class="info">
CLIENTE: ${reserva.nome}
</div>

<script>

function abrirPorta(tipo){

fetch('/api/abrir-porta',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({tipo})
})
.then(r=>r.json())
.then(r=>{

if(r.erro){
alert(r.erro);
}else{
alert("Porta liberada");
}

});

}

function startTimer(duration, dateStr, timeStr){

const display=document.querySelector('#timer');

const target=new Date(dateStr+'T'+timeStr+':00').getTime()+(parseInt(duration)*60000);

setInterval(()=>{

const now=new Date().getTime();

const dist=target-now;

if(dist<0){
display.innerHTML="00:00";
return;
}

const h=Math.floor(dist/3600000);
const m=Math.floor((dist%3600000)/60000);
const s=Math.floor((dist%60000)/1000);

display.innerHTML=(h>0?h+":":"")+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s);

},1000);

}

startTimer("${reserva.duracao}","${reserva.data}","${reserva.hora}");

</script>

</body>
</html>

`);

});


// ==========================
// HORÁRIOS OCUPADOS
// ==========================

app.get('/api/horarios-ocupados', async (req, res) => {

    const ocupados = await Reserva.find({
        data: req.query.data,
        status: 'pago'
    }).select('hora -_id');

    res.json(ocupados.map(r => r.hora));

});


// ==========================
// CHECKOUT
// ==========================

app.post('/api/checkout', async (req, res) => {

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


// ==========================
// WEBHOOK ASAAS
// ==========================

app.post('/webhook-asaas', async (req, res) => {

    try {

        const evento = req.body;

        if (evento.event === "PAYMENT_RECEIVED") {

            const doc = evento.payment.externalReference;

            await Reserva.updateOne(
                { doc: doc, status: "pendente" },
                { status: "pago" }
            );

        }

        res.sendStatus(200);

    } catch (err) {

        console.error("Erro webhook:", err);
        res.sendStatus(500);

    }

});


// ==========================
// STATUS BANHEIRO (ESP32)
// ==========================

app.post('/api/banheiro-status', (req, res) => {

    const { tipo, status } = req.body;

    if (tipo === "masculino" || tipo === "feminino") {

        estadoBanheiros[tipo] = status;

    }

    res.sendStatus(200);

});


// ==========================
// ABRIR PORTA
// ==========================

app.post('/api/abrir-porta', (req, res) => {

    const { tipo } = req.body;

    if (estadoBanheiros[tipo] === "ocupado") {

        return res.json({
            erro: "Banheiro ocupado. Aguarde liberar."
        });

    }

    res.json({
        ok: true
    });

});

app.listen(process.env.PORT || 3000);
