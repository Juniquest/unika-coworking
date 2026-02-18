const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configurações de segurança e leitura de dados
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// URL de Produção do Asaas (O seu token é PROD)
const ASAAS_URL = 'https://www.asaas.com/api/v3';

// ROTA PRINCIPAL DE CHECKOUT
app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, nome, email, documento } = req.body;
    
    // Tabela de preços para segurança no servidor
    const precos = {
        estacao: { '30': 10.00, '60': 18.00, '120': 30.00 },
        reuniao: { '30': 50.00, '60': 90.00, '120': 150.00 },
        banheiro: 5.00
    };

    const valorFinal = servico === 'banheiro' ? precos.banheiro : precos[servico][tempo];

    try {
        const headers = { 
            'access_token': process.env.ASAAS_API_KEY,
            'Content-Type': 'application/json'
        };

        console.log(`Iniciando checkout para: ${nome} - Documento: ${documento}`);

        // PASSO 1: Criar o Cliente no Asaas com os dados do pré-cadastro
        const clienteResponse = await axios.post(`${ASAAS_URL}/customers`, {
            name: nome,
            email: email,
            cpfCnpj: documento,
            notificationDisabled: true
        }, { headers });

        const customerId = clienteResponse.data.id;

        // PASSO 2: Criar a Cobrança PIX
        const cobrancaResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: 'PIX',
            value: valorFinal,
            dueDate: new Date().toISOString().split('T')[0],
            description: `Acesso Unika: ${servico}`,
            postalService: false 
        }, { headers });

        const paymentId = cobrancaResponse.data.id;

        // PASSO 3: Gerar a imagem do QR Code
        const qrCodeResponse = await axios.get(`${ASAAS_URL}/payments/${paymentId}/pixQrCode`, { headers });

        // Retorna os dados para o seu script.js exibir na tela
        res.json({ 
            encodedImage: qrCodeResponse.data.encodedImage,
            payload: qrCodeResponse.data.payload 
        });

    } catch (error) {
        // Log detalhado para depuração no painel do Render
        console.error('Erro no Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Falha ao gerar PIX', 
            details: error.response ? error.response.data : error.message 
        });
    }
});

// Porta padrão para o Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor Unika rodando na porta ${PORT}`);
});
