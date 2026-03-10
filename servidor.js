const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(express.static(__dirname));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI);


// ESTADO DOS BANHEIROS
let estadoBanheiros = {
  masculino: "livre",
  feminino: "livre"
};


// BLOQUEIO PARA ABRIR
let bloqueioBanheiro = {
  masculino: false,
  feminino: false
};


// COMANDO PARA ESP32
let comandoPorta = {
  masculino: false,
  feminino: false
};



// MODELO RESERVA
const Reserva = mongoose.model("Reserva", {
  cpf: String,
  banheiro: String,
  data: Date
});



// STATUS BANHEIROS
app.get("/api/status-banheiros", (req, res) => {
  res.json(estadoBanheiros);
});




// PAINEL
app.get("/painel", async (req, res) => {

  const cpf = req.query.cpf;

  if (!cpf) {
    return res.send("CPF não informado");
  }

  const reserva = await Reserva.findOne({ cpf });

  if (!reserva) {

    return res.send(`
    <body style="background:#000;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;">
    <h1>ACESSO NEGADO</h1>
    </body>
    `);

  }

  res.send(`
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>UNIKA</title>

<style>

body{
background:#000;
color:#d4af37;
font-family:sans-serif;
text-align:center;
padding-top:100px;
}

button{
background:#d4af37;
border:none;
padding:20px;
font-size:20px;
cursor:pointer;
}

</style>

</head>

<body>

<h1>UNIKA</h1>

<h2>BANHEIRO: ${estadoBanheiros[reserva.banheiro]}</h2>

<button onclick="abrir()">ABRIR PORTA</button>

<script>

function abrir(){

fetch("/api/abrir-porta-painel",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
tipo:"${reserva.banheiro}"
})
})

}

</script>

</body>
</html>
`);

});




// CHECKOUT
app.post("/api/checkout", async (req, res) => {

  const { cpf, banheiro } = req.body;

  const reserva = new Reserva({
    cpf,
    banheiro,
    data: new Date()
  });

  await reserva.save();

  res.json({ ok: true });

});




// WEBHOOK ASAAS
app.post("/webhook-asaas", async (req, res) => {

  const evento = req.body;

  console.log("WEBHOOK RECEBIDO:", evento);

  if (evento.event === "PAYMENT_RECEIVED") {

    const cpf = evento.payment.externalReference;

    const reserva = await Reserva.findOne({ cpf });

    if (!reserva) return res.sendStatus(200);

    const tipo = reserva.banheiro;

    estadoBanheiros[tipo] = "ocupado";

    bloqueioBanheiro[tipo] = true;

    comandoPorta[tipo] = true;

    console.log("PORTA LIBERADA:", tipo);

  }

  res.sendStatus(200);

});




// BOTÃO ABRIR PORTA
app.post("/api/abrir-porta-painel", (req, res) => {

  const { tipo } = req.body;

  if (!bloqueioBanheiro[tipo]) {

    return res.json({ erro: "Sem permissão" });

  }

  comandoPorta[tipo] = true;

  res.json({ ok: true });

});




// ESP32 CONSULTA
app.get("/api/comando-porta", (req, res) => {

  const tipo = req.query.tipo;

  const abrir = comandoPorta[tipo] || false;

  if (abrir) {

    comandoPorta[tipo] = false;

  }

  res.json({ abrir });

});




// LIBERAR BANHEIRO
app.post("/api/liberar-banheiro", (req, res) => {

  const { tipo } = req.body;

  estadoBanheiros[tipo] = "livre";

  bloqueioBanheiro[tipo] = false;

  res.json({ ok: true });

});



app.listen(process.env.PORT || 3000, () => {

  console.log("Servidor rodando");

});
