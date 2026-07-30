// Função serverless (Vercel) que envia a foto por e-mail usando a API da Resend.
// A chave da API (RESEND_API_KEY) fica somente no servidor, nunca é exposta ao navegador.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método não permitido' });
    return;
  }

  try {
    const { recipientEmail, imageBase64, frameStyle } = req.body || {};

    if (!recipientEmail || !imageBase64) {
      res.status(400).json({ success: false, error: 'recipientEmail e imageBase64 são obrigatórios' });
      return;
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'Senac CE <onboarding@resend.dev>';

    if (!RESEND_API_KEY) {
      res.status(500).json({ success: false, error: 'RESEND_API_KEY não configurada no servidor' });
      return;
    }

    // Remove o prefixo "data:image/png;base64," se presente
    const base64Data = String(imageBase64).split(',').pop();

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        reply_to: 'pauloreboucas@ce.senac.br',
        subject: 'Sua foto - Cabine de Fotos Senac CE',
        html: `
          <div style="font-family: Arial, sans-serif; color: #1f2933;">
            <h2 style="color:#004A8D;">Cabine de Fotos Digital - Senac Ceará</h2>
            <p>Olá!</p>
            <p>Segue em anexo a sua foto tirada na cabine digital do Senac Ceará${frameStyle ? ` (moldura: ${frameStyle})` : ''}.</p>
            <p>Obrigado por participar!</p>
            <p style="color:#6b7280; font-size:12px;">Enviado automaticamente pelo sistema de fotos do Senac Ceará.</p>
          </div>
        `,
        attachments: [
          {
            filename: 'foto_senac_ce.png',
            content: base64Data
          }
        ]
      })
    });

    const data = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Erro da API Resend:', data);
      res.status(resendResponse.status).json({ success: false, error: data.message || 'Falha ao enviar e-mail' });
      return;
    }

    res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Erro inesperado ao enviar e-mail:', err);
    res.status(500).json({ success: false, error: err.message || 'Erro inesperado' });
  }
};
