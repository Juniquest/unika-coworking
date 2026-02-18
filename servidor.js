const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

app.use(express.json());

// CORREÇÃO 1: Faz o servidor entender que os arquivos estão na pasta principal
app.use(express.static(__dirname));

// CORREÇÃO 2: Rota principal que abre o seu site (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para o ESP32 checar se a porta deve abrir
let doorStatus = "FECHADO";

app.get('/api/door-status', (req, res) => {
    res.send(doorStatus);
    if (doorStatus === "ABRIR") doorStatus = "FECHADO"; 
});

app.post('/api/checkout', async (req, res) => {
    try {
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000005121703', // IMPORTANTE: Substitua pelo ID de um cliente real do seu Asaas
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Erro no Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
