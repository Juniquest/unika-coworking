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

// CONFIGURAÇÃO DE E-MAIL (Preencha com seu Gmail e Senha de App de 16 dígitos)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'riostoragecube@gmail.com', 
        pass: 'imzsysjsuihjdyay' 
    }
});

// 2. MONITORAMENTO DE TEMPO (CRON JOB) - Roda a cada 1 minuto
cron.schedule('* * * * *', async () => {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const reservas = await Reserva.find({ data: hoje, status: 'pago' });

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
        from: 'ŪNIKA | Experiência Digital <seu-email@gmail.com>',
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
    input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px 0; margin-bottom: 30px; font-size: 1.2rem; text-align: center; outline: none; }
    .btn-gold { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); text-transform: uppercase; font-weight: 600; letter-spacing: 3px; cursor: pointer; text-decoration: none; display: block; margin-bottom: 10px; }
    .btn-outline { color: #666; text-decoration: none; font-size: 0.8rem; letter-spacing: 1px; margin-top: 20px; display: inline-block; }
`;

// 4. ROTAS
app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="slogan">Onde o luxo encontra a produtividade</div><div class="container" style="background:transparent;border:none;"><a href="/reservar" class="btn-gold">Reservar Espaço</a><a href="/login" class="btn-gold" style="margin-top:20px;">Acessar Meu Painel</a></div></body></html>`);
});

app.get('/login', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}</style></head><body><h1>BEM-VINDO</h1><div class="slogan">Identifique-se para acessar o espaço</div><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ENTRAR</button></form><a href="/" class="btn-outline">Voltar ao início</a></div></body></html>`);
});

app.get('/reservar', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}.container{max-width:500px;text-align:left;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}.item{border:1px solid #333;padding:15px;text-align:center;cursor:pointer;font-size:0.8rem;font-weight:600;}.selected{border-color:var(--gold);background:rgba(212,175,55,0.2);}h2{color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:2px;margin:25px 0 10px;border-left:2px solid var(--gold);padding-left:10px;}.agenda{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#000;padding:10px;}</style></head><body><h1>ŪNIKA</h1><div class="container"><form action="/api/checkout" method="POST"><h2>01. Serviço</h2><div class="grid"><div class="item" onclick="selecionarServico('Estação Individual', this)">ESTAÇÃO</div><div class="item" onclick="selecionarServico('Sala de Reunião', this)">SALA</div><div class="item" onclick="selecionarServico('Banheiro Masc', this)">BANHEIRO (M)</div><div class="item" onclick="selecionarServico('Banheiro Fem', this)">BANHEIRO (F)</div></div><input type="hidden" name="servico" id="servico" required><h2>02. Dados</h2><input type="text" name="nome" placeholder="NOME" required style="text-align:left;font-size:1rem;"><input type="text" name="doc" placeholder="CPF" required style="text-align:left;font-size:1rem;"><input type="email" name="email" placeholder="E-MAIL" required style="text-align:left;font-size:1rem;"><div id="secao-agenda"><h2>03. Início</h2><input type="date" id="data" name="data" onchange="loadHr()" style="color-scheme:dark;"><div class="agenda" id="agenda"></div><input type="hidden" name="hora" id="hora"></div><input type="hidden" name="duracao" id="duracao" value="120"><button type="submit" class="btn-gold" style="margin-top:20px;">Pagar e Reservar</button></form></div>
    <script>
        function selecionarServico(val, el){ document.querySelectorAll('.item').forEach(e=>e.classList.remove('selected')); el.classList.add('selected'); document.getElementById('servico').value=val; document.getElementById('secao-agenda').style.display=val.includes('Banheiro')?'none':'block'; if(val.includes('Banheiro')){ document.getElementById('data').value=new Date().toISOString().split('T')[0]; document.getElementById('hora').value=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); document.getElementById('duracao').value='60'; } }
        async function loadHr(){ const d=document.getElementById('data').value; const res=await fetch('/api/horarios-ocupados?data='+d); const ocup=await res.json(); const cont=document.getElementById('agenda'); cont.innerHTML=''; for(let i=8;i<22;i++){ [":00",":30"].forEach(m=>{ const h=(i<10?'0'+i:i)+m; const dv=document.createElement('div'); dv.className='item'+(ocup.includes(h)?' ocupado':''); dv.innerText=h; if(!ocup.includes(h)) dv.onclick=()=>{ document.querySelectorAll('.agenda .item').forEach(x=>x.classList.remove('selected')); dv.classList.add('selected'); document.getElementById('hora').value=h; }; cont.appendChild(dv); }); } }
    </script></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: { $in: ['pago', 'finalizado'] } });

    if (!reserva) return res.send(`<html><head><style>${style}</style></head><body><h1>ACESSO NEGADO</h1><a href="/login" class="btn-outline">Voltar</a></body></html>`);

    const ePremium = reserva.servico.includes('Estação') || reserva.servico.includes('Sala');
    const eMasc = reserva.servico.includes('Masc');
    const eFem = reserva.servico.includes('Fem');

    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}body{justify-content:flex-start;padding-top:30px;}.container{background:#111;padding:25px;}.timer-box{border:1px solid var(--gold);padding:20px;margin-bottom:20px;}#timer{font-size:3rem;color:var(--gold);letter-spacing:5px;}h2{font-weight:400;font-size:0.8rem;border-left:3px solid var(--gold);padding-left:15px;margin:25px 0 15px;text-align:left;color:var(--gold);}.control-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;}.btn-iot{background:transparent;border:1px solid #333;color:#fff;padding:18px;cursor:pointer;text-transform:uppercase;font-size:0.7rem;font-weight:600;}.btn-iot.active{border-color:var(--gold);color:var(--gold);background:rgba(212, 175, 55, 0.1);}.full-width{grid-column:1/-1;}</style></head><body><h1>ŪNIKA</h1><div class="slogan">Sessão Ativa</div><div class="container"><div class="timer-box"><div style="font-size:0.6rem;color:#666;letter-spacing:2px;">TEMPO RESTANTE</div><div id="timer">--:--</div><div style="color:var(--gold);font-size:0.7rem;">${reserva.servico.toUpperCase()}</div></div>
    ${ePremium ? `<h2>Automação</h2><div class="control-grid"><button class="btn-iot" onclick="this.classList.toggle('active')">💡 Luzes</button><button class="btn-iot" onclick="this.classList.toggle('active')">❄️ Ar</button><button class="btn-iot" onclick="this.classList.toggle('active')">📺 TV</button><button class="btn-iot" onclick="this.classList.toggle('active')">🔌 Tomadas</button></div>` : ''}
    <h2>Acessos</h2><div class="control-grid">
    ${(ePremium || eMasc) ? `<button class="btn-iot ${!ePremium?'full-width':''}" onclick="alert('Porta Masc Liberada!')">🚹 Masculino</button>` : ''}
    ${(ePremium || eFem) ? `<button class="btn-iot ${!ePremium?'full-width':''}" onclick="alert('Porta Fem Liberada!')">🚺 Feminino</button>` : ''}
    </div></div>
    <script>
        let avisou10 = false;
        function startTimer(duration, start){ 
            const display=document.querySelector('#timer'); 
            const end=new Date(start).getTime()+(duration*60000); 
            setInterval(()=>{ 
                const dist=end-new Date().getTime(); 
                if(dist < 0){ 
                    display.innerHTML="FIM"; 
                    if(dist > -5000) alert("SUA SESSÃO NA ŪNIKA ENCERROU. TUDO SERÁ DESLIGADO.");
                    return; 
                }
                const m = Math.floor((dist % 3600000) / 60000);
                if(m === 10 && !avisou10) { alert("ATENÇÃO: Faltam 10 minutos para encerrar seu tempo."); avisou10 = true; }
                const h=Math.floor(dist/3600000);
                const s=Math.floor((dist%60000)/1000);
                display.innerHTML=(h>0?h+":":"")+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s); 
            },1000); 
        }
        startTimer(parseInt("${reserva.duracao}")||60, new Date("${reserva.data}T${reserva.hora}:00"));
    </script></body></html>`);
});

// APIs EXTRAS
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

app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        await Reserva.findOneAndUpdate({ doc: payment.externalReference, status: 'pendente' }, { status: 'pago' }, { sort: { _id: -1 } });
    }
    res.sendStatus(200);
});
// ROTA TEMPORÁRIA PARA TESTAR E-MAIL AGORA
app.get('/testar-email', (req, res) => {
    const seuEmail = "COLOQUE_AQUI_SEU_EMAIL_PESSOAL@gmail.com";
    enviarEmail(seuEmail, "Cliente de Teste", "Este é um teste de luxo da ŪNIKA. Se você recebeu isso, sua configuração está perfeita!");
    res.send("<h1>Comando enviado!</h1><p>Verifique sua caixa de entrada (e o Spam).</p>");
});
app.listen(process.env.PORT || 3000);
