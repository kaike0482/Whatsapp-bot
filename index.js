app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook acionado!');
    console.log('Corpo completo da requisição:', req.body);

    // Aceita múltiplos formatos de campo
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
      from: 'whatsapp:+551150432711',
      to: numero
    });

    return res.status(200).send('Mensagem enviada com sucesso');
  } catch (error) {
    console.error('Erro no webhook:', error.message);
    return res.status(200).send('Erro tratado, mas servidor respondeu');
  }
});
