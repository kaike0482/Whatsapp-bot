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

async function gerarResposta(mensagemUsuario) {
  try {
    const resposta = await axios.post(
      'https://api-inference.huggingface.co/models/google/flan-t5-large',
      { inputs: mensagemUsuario },
      {
        headers: {
          Authorization: `Bearer ${huggingFaceToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000 // tempo aumentado para evitar timeout
      }
    );

    const resultado = resposta.data;

    if (Array.isArray(resultado)) {
      const texto = resultado[0]?.generated_text || resultado[0]?.answer;
      if (texto) return texto;
    }

    if (typeof resultado === 'object') {
      const texto = resultado.generated_text || resultado.answer;
      if (texto) return texto;
    }

    return 'Desculpe, não consegui entender a resposta da IA.';
  } catch (error) {
    console.error('Erro ao gerar resposta da IA:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return 'Ocorreu um erro ao tentar gerar a resposta. Tente novamente mais tarde.';
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const mensagem = req.body.Body || req.body.body;
    const numero = req.body.From || req.body.from;

    console.log('Webhook acionado!');
    console.log('Mensagem recebida:', mensagem);
    console.log('Número recebido:', numero);

    if (!mensagem || !numero) {
      return res.status(400).send('Dados inválidos');
    }

    const respostaIA = await gerarResposta(mensagem);

    await client.messages.create({
      body: respostaIA,
      from: 'whatsapp:+551150432711',
      to: numero
    });

    return res.status(200).send('Mensagem enviada com sucesso');
  } catch (error) {
    console.error('Erro no webhook:', error.message);
    return res.status(200).send('Erro tratado, mas servidor respondeu');
  }
});

app.get('/', (req, res) => {
  res.send('Bot está vivo!');
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Bot rodando na porta ${process.env.PORT || 3000}`);
});
