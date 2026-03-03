# Automatizacion de Fidelizacion - Derecho Virtual

Sistema automatizado que envia emails de seguimiento a los alumnos de Derecho Virtual despues de su compra, con el objetivo de fidelizarlos y ayudarles a completar su formacion.

## Como funciona

Un **cron job** se ejecuta periodicamente (cada 30 minutos) y realiza dos fases:

### Fase 1: Ingesta de compras nuevas

1. Consulta las compras recientes en **Stripe** (ultimos 8 dias)
2. Filtra solo pagos exitosos en EUR de al menos 100 EUR y que no sean suscripciones recurrentes
3. Para cada compra nueva, busca al alumno en **Teachable** y obtiene sus cursos
4. Registra la compra en **Supabase** junto con los datos del curso

### Fase 2: Envio de mensajes de seguimiento

Revisa todas las compras registradas y envia emails personalizados segun el tiempo transcurrido desde la compra:

| Mensaje | Cuando | Condicion | Objetivo |
|---------|--------|-----------|----------|
| **Fidelizacion** | 7 dias | Siempre | Saber si el curso le esta siendo util |
| **Activacion** | 15 dias | Progreso = 0% | Animar a empezar la formacion |
| **Reactivacion** | 30 dias | Progreso < 10% | Recordar que la formacion le espera |
| **Recuperacion** | 6 meses | Progreso < 15% | Ultimo intento de reenganche |

Cada mensaje se envia **una sola vez** por compra. El sistema registra en Supabase que mensajes ya se han enviado para evitar duplicados.

## Arquitectura

```
cron-job.org (trigger cada 30 min)
       |
       v
Vercel Serverless Function (/api/cron/check-fidelization)
       |
       +---> Stripe API (compras recientes)
       +---> Teachable API (datos del alumno y progreso)
       +---> Supabase (BD: compras y mensajes enviados)
       +---> Gmail SMTP (envio de emails)
```

## Estructura del proyecto

```
api/
  cron/
    check-fidelization.js   # Funcion principal del cron
  health.js                  # Endpoint de salud
  test-email.js              # Utilidad para probar emails
lib/
  constants.js               # Tipos de mensaje y configuracion
  email.js                   # Templates de email y envio SMTP
  stripe.js                  # Integracion con Stripe
  supabase.js                # Queries a la base de datos
  teachable.js               # Integracion con Teachable API
setup/
  migration.sql              # Schema de la base de datos
vercel.json                  # Configuracion de Vercel
```

## Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `TEACHABLE_API_KEY` | API key de Teachable |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service key de Supabase |
| `SMTP_HOST` | Host SMTP (default: smtp.gmail.com) |
| `SMTP_PORT` | Puerto SMTP (default: 587) |
| `SMTP_USER` | Email del remitente |
| `SMTP_PASS` | Contrasena de aplicacion del email |
| `CRON_SECRET` | Clave secreta para autenticar el cron |
| `CUTOFF_DATE` | Fecha desde la que se procesan compras |
| `DRY_RUN` | Si es `true`, no envia emails reales |
| `MAX_EMAILS_PER_RUN` | Limite de emails por ejecucion (default: 20) |

## Base de datos (Supabase)

Dos tablas principales:

- **fidelization_purchases**: Compras registradas desde Stripe con datos del alumno y cursos
- **fidelization_sent_messages**: Registro de cada mensaje enviado (tipo, fecha, estado)

## Despliegue

El proyecto se despliega automaticamente en **Vercel** al hacer push a `main`. El cron se configura externamente en [cron-job.org](https://cron-job.org) apuntando a:

```
https://fidelizacion-dv.vercel.app/api/cron/check-fidelization?key=<CRON_SECRET>
```
