import dotenv from 'dotenv';
dotenv.config();

async function test() {
  // Obtener un usuario de Teachable y ver TODOS los campos
  const res = await fetch('https://developers.teachable.com/v1/users/123582572', {
    headers: {
      apiKey: process.env.TEACHABLE_API_KEY,
      Accept: 'application/json',
    },
  });
  const data = await res.json();

  // Mostrar campos del usuario (excluyendo cursos para legibilidad)
  const { courses, ...userFields } = data;
  console.log('=== Campos del usuario ===');
  console.log(JSON.stringify(userFields, null, 2));

  // Mostrar campos del primer curso
  if (courses && courses.length > 0) {
    console.log('\n=== Campos del primer curso ===');
    console.log(JSON.stringify(courses[0], null, 2));
  }
}

test().catch(console.error);
