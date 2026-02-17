const TEACHABLE_BASE = 'https://developers.teachable.com/v1';

function getHeaders() {
  return {
    apiKey: process.env.TEACHABLE_API_KEY,
    Accept: 'application/json',
  };
}

/**
 * Busca un usuario en Teachable por email.
 * Retorna el primer usuario encontrado o null.
 */
export async function findUserByEmail(email) {
  try {
    const url = `${TEACHABLE_BASE}/users?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { headers: getHeaders() });

    if (!res.ok) {
      console.error(`Teachable findUserByEmail error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const users = data.users || [];
    return users.length > 0 ? users[0] : null;
  } catch (err) {
    console.error('Error buscando usuario en Teachable:', err.message);
    return null;
  }
}

/**
 * Obtiene detalles de un usuario por ID, incluyendo cursos con progreso.
 * NOTA: La API de Teachable NO devuelve last_sign_in_at, solo last_sign_in_ip.
 * Usamos percent_complete como proxy de actividad.
 */
export async function getUserDetails(userId) {
  try {
    const url = `${TEACHABLE_BASE}/users/${userId}`;
    const res = await fetch(url, { headers: getHeaders() });

    if (!res.ok) {
      console.error(`Teachable getUserDetails error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    return {
      userId: data.id,
      name: data.name,
      email: data.email,
      courses: (data.courses || []).map((c) => ({
        courseId: c.course_id,
        courseName: c.course_name,
        percentComplete: c.percent_complete || 0,
        enrolledAt: c.enrolled_at,
        isActive: c.is_active_enrollment,
      })),
    };
  } catch (err) {
    console.error('Error obteniendo detalles de Teachable:', err.message);
    return null;
  }
}
