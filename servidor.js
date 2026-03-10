const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(express.static(__dirname));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB conectado"))
.catch(err=>console.log("Erro MongoDB",err));


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
app.get("/api/status-banheiros",(req,res)=>{
  res.json(estadoBanheiros);
});


// PAINEL
app.get("/painel", async (req,res)=>{

const cpf = req.query.cpf;

if(!cpf){
  return res.send("CPF não informado");
}

const reserva = await Reserva.findOne({cpf}).sort({data:-1});

if(!reserva){

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
app.post("/api/checkout", async (req,res)=>{

const {cpf,banheiro} = req.body;

if(!cpf || !banheiro){
return res.status(400).json({erro:"dados inválidos"});
}

if(estadoBanheiros[banheiro]==="ocupado"){
return res.status(400).json({erro:"banheiro ocupado"});
}

const links={
masculino:"https://www.asaas.com/c/xx8y9j7aelqt1u1z",
feminino:"https://www.asaas.com/c/hy4cb2sz0ya4mmrd"
};

const link = links[banheiro] + "?externalReference=" + encodeURIComponent(cpf);

const reserva = new Reserva({
cpf,
banheiro,
data:new Date()
});

await reserva.save();

res.json({url:link});

});


// WEBHOOK ASAAS
app.post("/webhook-asaas", async (req,res)=>{

const evento = req.body;

console.log("WEBHOOK RECEBIDO:", evento);

if(evento.event==="PAYMENT_RECEIVED"){

const paymentLink = evento?.payment?.paymentLink;

let tipo = null;

if(paymentLink==="xx8y9j7aelqt1u1z"){
  tipo = "masculino";
}

if(paymentLink==="hy4cb2sz0ya4mmrd"){
  tipo = "feminino";
}

if(!tipo){
  console.log("paymentLink não identificado:", paymentLink);
  return res.sendStatus(200);
}

if(estadoBanheiros[tipo]==="ocupado"){
  return res.sendStatus(200);
}

estadoBanheiros[tipo]="ocupado";
bloqueioBanheiro[tipo]=true;
comandoPorta[tipo]=true;

console.log("PORTA LIBERADA:", tipo);

}

res.sendStatus(200);

});


// BOTÃO ABRIR PORTA
app.post("/api/abrir-porta-painel",(req,res)=>{

const {tipo}=req.body;

if(!bloqueioBanheiro[tipo]){
return res.json({erro:"Sem permissão"});
}

comandoPorta[tipo]=true;

res.json({ok:true});

});


// ESP32 CONSULTA
app.get("/api/comando-porta",(req,res)=>{

const tipo=req.query.tipo;

const abrir=comandoPorta[tipo]||false;

if(abrir){
comandoPorta[tipo]=false;
}

res.json({abrir});

});


// LIBERAR BANHEIRO
app.post("/api/liberar-banheiro",(req,res)=>{

const {tipo}=req.body;

estadoBanheiros[tipo]="livre";
bloqueioBanheiro[tipo]=false;

res.json({ok:true});

});


app.listen(process.env.PORT||3000,()=>{
console.log("Servidor rodando");
});
