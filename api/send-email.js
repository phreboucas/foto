// Função serverless (Vercel) que envia a foto por e-mail via SMTP do Gmail (Nodemailer).
// As credenciais (GMAIL_USER / GMAIL_APP_PASSWORD) ficam somente no servidor,
// nunca são expostas ao navegador. GMAIL_APP_PASSWORD deve ser uma "senha de app"
// gerada em myaccount.google.com/apppasswords (não a senha normal da conta).
const nodemailer = require('nodemailer');

let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD.replace(/\s+/g, '')
    }
  });

  return cachedTransporter;
}

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

    const GMAIL_USER = process.env.GMAIL_USER;
    const transporter = getTransporter();

    if (!transporter) {
      res.status(500).json({ success: false, error: 'GMAIL_USER/GMAIL_APP_PASSWORD não configurados no servidor' });
      return;
    }

    // Remove o prefixo "data:image/png;base64," se presente
    const base64Data = String(imageBase64).split(',').pop();

    await transporter.sendMail({
      from: `"Cabine de Fotos - Senac CE" <${GMAIL_USER}>`,
      to: recipientEmail,
      replyTo: 'pauloreboucas@ce.senac.br',
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
          content: base64Data,
          encoding: 'base64'
        }
      ]
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro inesperado ao enviar e-mail:', err);
    res.status(500).json({ success: false, error: err.message || 'Erro inesperado' });
  }
};
