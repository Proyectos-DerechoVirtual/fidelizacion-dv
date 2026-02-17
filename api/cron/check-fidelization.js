import { getRecentPurchases } from '../../lib/stripe.js';
import { findUserByEmail, getUserDetails } from '../../lib/teachable.js';
import {
  findPurchaseByChargeId,
  insertPurchase,
  getPurchasesPendingMessages,
  recordSentMessage,
} from '../../lib/supabase.js';
import {
  sendEmail,
  buildFidelization7dEmail,
  buildActivation15dEmail,
  buildReactivation30dEmail,
  buildRecovery6mEmail,
} from '../../lib/email.js';
import { MESSAGE_TYPES } from '../../lib/constants.js';

export default async function handler(req, res) {
  // Verificar clave secreta
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = process.env.DRY_RUN === 'true';
  const maxEmails = parseInt(process.env.MAX_EMAILS_PER_RUN || '20');
  let emailsSent = 0;

  const log = {
    startedAt: new Date().toISOString(),
    dryRun,
    newPurchases: 0,
    messagesProcessed: [],
    errors: [],
  };

  try {
    // -------------------------------------------------------
    // FASE 1: Ingestar compras nuevas de Stripe
    // -------------------------------------------------------
    console.log('📦 Obteniendo compras de Stripe...');
    const stripePurchases = await getRecentPurchases(200); // Ultimos ~200 dias para cubrir msg 4 (6 meses)
    console.log(`📦 ${stripePurchases.length} compras encontradas en Stripe`);

    for (const sp of stripePurchases) {
      try {
        const existing = await findPurchaseByChargeId(sp.chargeId);
        if (existing) continue;

        // Buscar en Teachable
        const teachableUser = await findUserByEmail(sp.email);
        let courses = [];
        let teachableUserId = null;

        if (teachableUser) {
          teachableUserId = String(teachableUser.id);
          const details = await getUserDetails(teachableUser.id);
          if (details) {
            // Filtrar cursos enrollados cerca de la fecha de compra (±2 dias)
            const purchaseTime = new Date(sp.date).getTime();
            const twoDays = 2 * 24 * 60 * 60 * 1000;

            const recentCourses = details.courses.filter((c) => {
              if (!c.enrolledAt) return false;
              const enrollTime = new Date(c.enrolledAt).getTime();
              return Math.abs(enrollTime - purchaseTime) <= twoDays;
            });

            // Si encontramos cursos con fecha cercana, usar esos; si no, guardar todos los activos
            const selectedCourses = recentCourses.length > 0
              ? recentCourses
              : details.courses.filter((c) => c.isActive);

            courses = selectedCourses.map((c) => ({
              course_id: c.courseId,
              course_name: c.courseName,
            }));
          }
        }

        await insertPurchase({
          stripe_charge_id: sp.chargeId,
          customer_email: sp.email,
          customer_name: sp.name,
          amount: sp.amount,
          purchase_date: sp.date,
          teachable_user_id: teachableUserId,
          courses,
          created_at: new Date().toISOString(),
        });

        log.newPurchases++;
        console.log(`✅ Nueva compra registrada: ${sp.email} - ${sp.amount}€`);
      } catch (err) {
        log.errors.push(`Ingest ${sp.chargeId}: ${err.message}`);
        console.error(`❌ Error procesando charge ${sp.chargeId}:`, err.message);
      }
    }

    // -------------------------------------------------------
    // FASE 2: Verificar mensajes pendientes
    // -------------------------------------------------------
    console.log('📬 Verificando mensajes pendientes...');
    const allPurchases = await getPurchasesPendingMessages();
    const now = new Date();

    for (const purchase of allPurchases) {
      if (emailsSent >= maxEmails) {
        console.log(`⚠️ Limite de emails alcanzado (${maxEmails})`);
        break;
      }

      const sentTypes = (purchase.fidelization_sent_messages || []).map(
        (m) => m.message_type
      );
      const purchaseDate = new Date(purchase.purchase_date);
      const daysSincePurchase = (now - purchaseDate) / (1000 * 60 * 60 * 24);
      const courses = purchase.courses || [];
      const courseName =
        courses.length > 0 ? courses[0].course_name : 'tu curso';
      const rawName = purchase.customer_name || 'alumno/a';
      const firstName = rawName.split(' ')[0].toLowerCase().replace(/^./, c => c.toUpperCase());

      // --- Mensaje 1: Fidelizacion 7 dias ---
      if (
        daysSincePurchase >= 7 &&
        !sentTypes.includes(MESSAGE_TYPES.FIDELIZATION_7D)
      ) {
        const result = await trySendMessage({
          purchase,
          messageType: MESSAGE_TYPES.FIDELIZATION_7D,
          buildEmailFn: () => buildFidelization7dEmail(firstName, courseName),
          dryRun,
          log,
        });
        if (result) emailsSent++;
        if (emailsSent >= maxEmails) break;
      }

      // --- Mensaje 2: Activacion 15 dias (progreso = 0) ---
      if (
        daysSincePurchase >= 15 &&
        !sentTypes.includes(MESSAGE_TYPES.ACTIVATION_15D)
      ) {
        // Verificar progreso en Teachable
        const shouldSend = await checkShouldSendActivation(purchase);
        if (shouldSend) {
          const result = await trySendMessage({
            purchase,
            messageType: MESSAGE_TYPES.ACTIVATION_15D,
            buildEmailFn: () => buildActivation15dEmail(firstName, courseName),
            dryRun,
            log,
          });
          if (result) emailsSent++;
          if (emailsSent >= maxEmails) break;
        }
      }

      // --- Mensaje 3: Reactivacion 30 dias sin login ---
      if (
        daysSincePurchase >= 30 &&
        !sentTypes.includes(MESSAGE_TYPES.REACTIVATION_30D)
      ) {
        const shouldSend = await checkShouldSendReactivation(purchase);
        if (shouldSend) {
          const result = await trySendMessage({
            purchase,
            messageType: MESSAGE_TYPES.REACTIVATION_30D,
            buildEmailFn: () => buildReactivation30dEmail(firstName),
            dryRun,
            log,
          });
          if (result) emailsSent++;
          if (emailsSent >= maxEmails) break;
        }
      }

      // --- Mensaje 4: Recuperacion 6 meses sin login ---
      if (
        daysSincePurchase >= 180 &&
        !sentTypes.includes(MESSAGE_TYPES.RECOVERY_6M)
      ) {
        const shouldSend = await checkShouldSendRecovery(purchase);
        if (shouldSend) {
          const result = await trySendMessage({
            purchase,
            messageType: MESSAGE_TYPES.RECOVERY_6M,
            buildEmailFn: () => buildRecovery6mEmail(firstName),
            dryRun,
            log,
          });
          if (result) emailsSent++;
        }
      }
    }

    log.totalEmailsSent = emailsSent;
    log.finishedAt = new Date().toISOString();
    console.log('✅ Cron finalizado:', JSON.stringify(log, null, 2));
    return res.status(200).json(log);
  } catch (err) {
    console.error('❌ Error general en cron:', err);
    log.errors.push(`General: ${err.message}`);
    log.finishedAt = new Date().toISOString();
    return res.status(500).json(log);
  }
}

// --- Helpers ---

async function trySendMessage({ purchase, messageType, buildEmailFn, dryRun, log }) {
  try {
    const { subject, html } = buildEmailFn();

    if (dryRun) {
      console.log(`🔸 [DRY RUN] Enviaria ${messageType} a ${purchase.customer_email}`);
      log.messagesProcessed.push({
        email: purchase.customer_email,
        type: messageType,
        status: 'dry_run',
      });
      // Registrar igualmente para no reenviar en la siguiente ejecucion dry run
      return false;
    }

    await sendEmail(purchase.customer_email, subject, html);
    await recordSentMessage({
      purchaseId: purchase.id,
      messageType,
      status: 'sent',
    });

    console.log(`📧 Enviado ${messageType} a ${purchase.customer_email}`);
    log.messagesProcessed.push({
      email: purchase.customer_email,
      type: messageType,
      status: 'sent',
    });
    return true;
  } catch (err) {
    console.error(`❌ Error enviando ${messageType} a ${purchase.customer_email}:`, err.message);
    log.errors.push(`Send ${messageType} to ${purchase.customer_email}: ${err.message}`);

    try {
      await recordSentMessage({
        purchaseId: purchase.id,
        messageType,
        status: 'failed',
      });
    } catch (_) { /* ignore */ }

    return false;
  }
}

/**
 * Mensaje 2: solo enviar si el alumno no ha empezado (progreso = 0%)
 * Busca los cursos comprados en esta transaccion y verifica progreso 0.
 */
async function checkShouldSendActivation(purchase) {
  if (!purchase.teachable_user_id) return false;

  try {
    const details = await getUserDetails(parseInt(purchase.teachable_user_id));
    if (!details) return false;

    // Filtrar solo los cursos de esta compra
    const purchasedCourseIds = (purchase.courses || []).map((c) => c.course_id);
    const relevantCourses = details.courses.filter((c) =>
      purchasedCourseIds.includes(c.courseId)
    );

    if (relevantCourses.length === 0) return false;

    // Verificar que TODOS los cursos comprados tienen progreso 0
    return relevantCourses.every((c) => c.percentComplete === 0);
  } catch {
    return false;
  }
}

/**
 * Mensaje 3: 30+ dias desde compra y progreso bajo (< 10%).
 * NOTA: Teachable API no devuelve last_sign_in_at, usamos percent_complete como proxy.
 */
async function checkShouldSendReactivation(purchase) {
  if (!purchase.teachable_user_id) return false;

  try {
    const details = await getUserDetails(parseInt(purchase.teachable_user_id));
    if (!details) return false;

    const purchasedCourseIds = (purchase.courses || []).map((c) => c.course_id);
    const relevantCourses = details.courses.filter((c) =>
      purchasedCourseIds.includes(c.courseId)
    );

    if (relevantCourses.length === 0) return false;

    // Progreso bajo en todos los cursos comprados (< 10%)
    return relevantCourses.every((c) => c.percentComplete < 10);
  } catch {
    return false;
  }
}

/**
 * Mensaje 4: 6+ meses desde compra y progreso bajo (< 15%).
 * NOTA: Teachable API no devuelve last_sign_in_at, usamos percent_complete como proxy.
 */
async function checkShouldSendRecovery(purchase) {
  if (!purchase.teachable_user_id) return false;

  try {
    const details = await getUserDetails(parseInt(purchase.teachable_user_id));
    if (!details) return false;

    const purchasedCourseIds = (purchase.courses || []).map((c) => c.course_id);
    const relevantCourses = details.courses.filter((c) =>
      purchasedCourseIds.includes(c.courseId)
    );

    if (relevantCourses.length === 0) return false;

    // Progreso bajo en los cursos comprados (< 15%)
    return relevantCourses.every((c) => c.percentComplete < 15);
  } catch {
    return false;
  }
}
