// Localize a parte do res.send dentro da app.get('/painel'...) e substitua por esta:

    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Painel</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #ffffff; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 30px 0; text-align: center; }
        h1 { letter-spacing: 10px; font-weight: 300; font-size: 2rem; margin: 0; text-transform: uppercase; color: #fff; }
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 25px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; position: relative; }
        .timer-box { text-align: center; margin-bottom: 30px; border: 1px solid var(--gold); padding: 20px; border-radius: 2px; }
        #timer { font-size: 3.5rem; font-weight: 300; color: var(--gold); letter-spacing: 5px; }
        h2 { font-weight: 400; font-size: 0.9rem; border-left: 3px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 20px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 2px; transition: 0.3s; font-weight: 600; }
        .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212, 175, 55, 0.15); }
        
        /* Estilo do Botão Banheiro */
        .btn-bathroom { grid-column: 1 / -1; margin-top: 10px; border-color: #444; color: #666; transition: 0.5s; }
        .btn-bathroom.available { border-color: #28a745; color: #fff; background: rgba(40, 167, 69, 0.2); box-shadow: 0 0 15px rgba(40, 167, 69, 0.2); }

        /* Estilo do Pop-up de Aviso */
        #popup-banheiro { 
            position: fixed; top: -100px; left: 50%; transform: translateX(-50%);
            background: var(--gold); color: #000; padding: 15px 30px; border-radius: 50px;
            font-weight: 600; font-size: 0.9rem; letter-spacing: 1px; z-index: 999;
            transition: 0.5s ease-in-out; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        #popup-banheiro.show { top: 30px; }
    </style>
</head>
<body>
    <div id="popup-banheiro">🚽 BANHEIRO DISPONÍVEL AGORA</div>

    <header><h1>ŪNIKA</h1><div style="color:var(--gold);font-size:0.6rem;letter-spacing:3px;">SESSÃO EXCLUSIVA</div></header>
    
    <div class="container">
        <div class="timer-box">
            <div style="font-size: 0.7rem; letter-spacing: 3px; color: #666;">TEMPO RESTANTE</div>
            <div id="timer">--:--</div>
        </div>

        <h2>Automação</h2>
        <div class="control-grid">
            <button class="btn-iot" onclick="toggle(this, 'LUZ')">💡 Lâmpadas</button>
            <button class="btn-iot" onclick="toggle(this, 'AR')">❄️ Ar</button>
        </div>

        <h2>Acessos</h2>
        <div class="control-grid">
            <button id="btn_banheiro" class="btn-iot btn-bathroom" onclick="abrirBanheiro()">Banheiro Ocupado</button>
        </div>
    </div>

    <script>
        let banheiroLivreAnteriormente = false;

        // Função que simula checar o sensor do banheiro
        // No futuro, isso fará um fetch no banco de dados ou no ESP32
        function checarBanheiro() {
            // Simulando que o banheiro ficou livre (True ou False)
            // Aqui integraremos com o sensor físico depois
            let estaLivre = Math.random() > 0.5; 

            const btn = document.getElementById('btn_banheiro');
            const popup = document.getElementById('popup-banheiro');

            if (estaLivre) {
                btn.innerHTML = "🔓 ABRIR BANHEIRO (LIVRE)";
                btn.classList.add('available');
                
                // Se acabou de ficar livre, mostra o pop-up
                if (!banheiroLivreAnteriormente) {
                    popup.classList.add('show');
                    setTimeout(() => popup.classList.remove('show'), 5000); // Some após 5s
                }
                banheiroLivreAnteriormente = true;
            } else {
                btn.innerHTML = "🔒 BANHEIRO EM USO";
                btn.classList.remove('available');
                banheiroLivreAnteriormente = false;
            }
        }

        // Checa o status a cada 5 segundos
        setInterval(checarBanheiro, 5000);

        function abrirBanheiro() {
            if (document.getElementById('btn_banheiro').classList.contains('available')) {
                alert("Porta destrancada!");
            } else {
                alert("Aguarde, o banheiro está ocupado.");
            }
        }

        // Lógica do Timer (mesma que já funciona)
        function startTimer(durationInMinutes, startTime) {
            const display = document.querySelector('#timer');
            const end = new Date(startTime).getTime() + (durationInMinutes * 60000);
            setInterval(() => {
                const now = new Date().getTime();
                const dist = end - now;
                if (dist < 0) { display.innerHTML = "EXPIRADO"; return; }
                const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((dist % (1000 * 60)) / 1000);
                display.innerHTML = (h > 0 ? h + ":" : "") + (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s);
            }, 1000);
        }

        const duracao = parseInt("${reserva.duracao}") || 120;
        const [h, m] = "${reserva.hora}".split(':');
        const inicio = new Date("${reserva.data}T" + h + ":" + m + ":00");
        startTimer(duracao, inicio);
    </script>
</body>
</html>`);
