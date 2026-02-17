import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail(to, subject, html) {
  const mail = {
    from: `"Derecho Virtual" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };
  return getTransporter().sendMail(mail);
}

// --- Wrapper para layout comun ---

function wrapInLayout(content) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      ${content}
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        Derecho Virtual &middot; Formacion juridica online
      </p>
    </div>
  `;
}

// --- Templates ---

export function buildFidelization7dEmail(name, courseName) {
  const subject = `${name}, ¿qué tal con tu formación? 😊`;
  const html = wrapInLayout(`
    <p style="font-size: 16px; line-height: 1.6;">
      Hola, ${name} 😊 ¿qué tal todo?
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Desde el equipo de Derecho Virtual queríamos escribirte para saber si el curso de <strong>${courseName}</strong> te está siendo de utilidad y si te estás encontrando cómodo con la formación.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Recuerda que para cualquier duda que tengas —sobre el contenido, la plataforma o cómo aprovechar mejor el curso— puedes escribirnos sin problema y el equipo estará encantado de ayudarte.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      ¡Esperamos que le estés sacando mucho partido! 💪🙂
    </p>
  `);
  return { subject, html };
}

export function buildActivation15dEmail(name, courseName) {
  const subject = `${name}, ¿todo bien? Te echamos de menos 😊`;
  const html = wrapInLayout(`
    <p style="font-size: 16px; line-height: 1.6;">
      Hola, ${name} 😊 ¿qué tal?
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Desde el equipo de Derecho Virtual te escribimos porque queríamos saber si todo iba bien contigo.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Hemos visto que, de momento, aún no has podido empezar la formación y queríamos animarte 😊
      Recuerda que las clases son muy cortas (unos 8 minutos) y que no necesitas más de 15–20 minutos al día para avanzar.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Además, tienes disponible el asistente de IA para resolver dudas al instante y ayudarte a entender mejor cada tema.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Al final, ya sea para aprobar el examen o conseguir el apto, lo importante es la constancia, poquito a poco.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Cuando quieras, entra y empieza con la primera clase 💪🙂
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://derechovirtual.org" style="display: inline-block; background: #9B7653; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
        DERECHO VIRTUAL
      </a>
    </div>
  `);
  return { subject, html };
}

export function buildReactivation30dEmail(name) {
  const subject = `${name}, tu formación te espera 😊`;
  const html = wrapInLayout(`
    <p style="font-size: 16px; line-height: 1.6;">
      Hola, ${name} 😊 ¿qué tal?
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Desde el equipo de Derecho Virtual te escribimos porque llevamos un tiempo sin verte por la plataforma y queríamos recordarte que tienes ahí la formación esperándote 😊
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Sabemos que a veces cuesta retomar el ritmo, pero recuerda que el método está pensado para que avances sin agobios, con clases muy breves y directas al grano.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Con solo un ratito al día puedes volver a coger dinámica y avanzar muchísimo más de lo que parece.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Si necesitas ayuda para retomar o no sabes por dónde empezar, escríbenos y te orientamos encantados 💬🙂
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://derechovirtual.org" style="display: inline-block; background: #9B7653; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
        DERECHO VIRTUAL
      </a>
    </div>
  `);
  return { subject, html };
}

export function buildRecovery6mEmail(name) {
  const subject = `${name}, solo queríamos saludarte 😊`;
  const html = wrapInLayout(`
    <p style="font-size: 16px; line-height: 1.6;">
      Hola, ${name} 😊
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Desde el equipo de Derecho Virtual te escribimos simplemente para saludarte y saber qué tal todo.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Hace tiempo que no entras en la plataforma y queríamos recordarte que sigues teniendo acceso a tu curso y a todo el contenido.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Si en algún momento te apetece retomarlo, aunque sea poco a poco, estaremos aquí para ayudarte y ponértelo fácil.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Y si ahora mismo no es tu momento, no pasa nada. Solo queríamos que supieras que cuentas con nosotros 😊
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Un abrazo.
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://derechovirtual.org" style="display: inline-block; background: #9B7653; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
        DERECHO VIRTUAL
      </a>
    </div>
  `);
  return { subject, html };
}
