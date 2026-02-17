import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ error: 'Falta parametro ?to=email@ejemplo.com' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <p style="font-size: 16px; line-height: 1.6;">
          Hola, Test 😊 ¿qué tal todo?
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Desde el equipo de Derecho Virtual queríamos escribirte para saber si el curso de <strong>Derecho Penal I</strong> te está siendo de utilidad y si te estás encontrando cómodo con la formación.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Recuerda que para cualquier duda que tengas —sobre el contenido, la plataforma o cómo aprovechar mejor el curso— puedes escribirnos sin problema y el equipo estará encantado de ayudarte.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          ¡Esperamos que le estés sacando mucho partido! 💪🙂
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Derecho Virtual &middot; Formación jurídica online<br>
          <em>(Este es un email de prueba del sistema de fidelización)</em>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Derecho Virtual" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Test, ¿qué tal con tu formación? 😊',
      html,
    });

    return res.status(200).json({ success: true, sentTo: to });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
