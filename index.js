require('dotenv').config();
const express = require('express');
const axios = require('axios');
const twilio = require('twilio');

const app = express();

app.use(express.json());

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const huggingFaceToken = process.env.HF_TOKEN;

if (!accountSid || !authToken || !huggingFaceToken) {
  throw new Error('Variáveis de ambiente não estão definidas corretamente.');
}

const client = twilio(accountSid, authToken);

// ✅ VERIFICAÇÃO DO WEBHOOK (GET)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'KaikeBot2810'; // mesmo token que você colocou no painel da Meta

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ Falha na verificação do webhook.');
    res.sendStatus(403);
  }
});

// ✅ RECEBIMENTO DE MENSAGENS (POST)
app.post('/webhook', async (req, res) => {
  try {
    console.log('📩 Webhook acionado!');
    console.log('Corpo completo da requisição:', req.body);

    const mensagem =
      req.body.Body ||
      req.body.body ||
      req.body.message ||
      req.body.text ||
      req.body.input ||
      '';

    const numero =
      req.body.From ||
      req.body.from ||
      req.body.phone ||
      req.body.sender ||
      '';

    console.log('Mensagem recebida:', mensagem);
    console.log('Número recebido:', numero);

    if (!mensagem || !numero) {
      return res.status(400).send('Dados inválidos');
    }

    const respostaIA = await gerarResposta(mensagem);

    await client.messages.create({
      body: respostaIA,
      from: 'whatsapp:+551150432711', // seu número Twilio ou alugado
      to: numero
    });

    return res.status(200).send('Mensagem enviada com sucesso');
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(200).send('Erro tratado, mas servidor respondeu');
  }
});

// ✅ ENDPOINT DE STATUS
app.get('/', (req, res) => {
  res.send('Bot está vivo!');
});

// ✅ FUNÇÃO DE GERAÇÃO DE RESPOSTA COM IA
async function gerarResposta(mensagemUsuario) {
  try {
    const resposta = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large',
      { inputs: mensagemUsuario },
      {
        headers: {
          Authorization: `Bearer ${huggingFaceToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const resultado = resposta.data;

    if (typeof resultado === 'string') {
      return resultado;
    }

    return 'Recebi uma resposta técnica da IA, mas não consegui convertê-la em texto direto.';
  } catch (error) {
    console.error('Erro ao gerar resposta da IA:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return 'Ocorreu um erro ao tentar gerar a resposta. Tente novamente mais tarde.';
  }
}

// ✅ INICIAR SERVIDOR
app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Bot rodando na porta ${process.env.PORT || 3000}`);
});
