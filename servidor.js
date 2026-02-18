const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const path = require('path');
app.use(cors()); //
app.use(express.json());
app.use(express.static(__dirname));

// Tabela de preços conforme seu projeto
const PRECOS = {
    estacao: { '30': 10.00, '60': 18.00, '120': 30.00 },
    reuniao: { '30': 50.00, '60': 90.00, '120': 150.00 },
    banheiro: 5.00
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para o ESP32 consultar
let doorStatus = "FECHADO";
app.get('/api/door-status', (req, res) => {
    res.send(doorStatus);
    if (doorStatus === "ABRIR") doorStatus = "FECHADO"; 
});

app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, nome } = req.body;
    
    // Calcula o valor real
    let valorFinal = servico === 'banheiro' ? PRECOS.banheiro : PRECOS[servico][tempo];

    try {
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000005273735', // Seu ID de cliente
            billingType: 'PIX',
            value: valorFinal,
            dueDate: new Date().toISOString().split('T')[0],
            description: `UNIKA: ${servico} (${tempo}min) - Ref: ${nome}`
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        const qrCodeResponse = await axios.get(`https://www.asaas.com/api/v3/payments/${response.data.id}/pixQrCode`, {
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        
        res.json({ encodedImage: qrCodeResponse.data.encodedImage });
    } catch (error) {
        console.error('Erro Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao gerar reserva' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor UNIKA ativo na porta ${PORT}`));
