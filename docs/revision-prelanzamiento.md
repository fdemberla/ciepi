# Revisión previa al lanzamiento: hallazgos y plan

Revisión del 25 de noviembre de 2026.

**Cómo se hizo**
- **Revisores:** 7 agentes, uno por área (seguridad, inscripción, mentorías, contenido, capacitaciones, base de datos y frontend).
- **Verificación:** un verificador escéptico por área intentó refutar cada hallazgo leyendo el código. Se descartó un hallazgo y se ajustaron severidades.
- **Máquinas de estado:** un arquitecto las revisó por separado.
- **Segunda opinión:** Antigravity (`agy`), en modo de solo lectura, revisó las máquinas de estado de forma independiente.

Resultado: 79 hallazgos confirmados. Varios aparecieron en más de un área; abajo se listan sin repetir.

## 1. Bloqueantes de seguridad: flujo de inscripción

Juntos permiten suplantar a una persona y obtener sus datos personales.

| # | Problema | Dónde | Riesgo |
|---|---|---|---|
| S1 | `PUT /api/verificar/[cedula]` no exige Turnstile ni limita intentos. Se puede adivinar la fecha de nacimiento por fuerza bruta (~36 000 fechas) y obtener correo, teléfono, sexo y estado civil. Cada intento consume además la API del Tribunal Electoral. | `app/api/verificar/[cedula]/route.ts:169` | Fuga de datos personales |
| S2 | La inscripción devuelve al navegador el mismo token que valida el correo. Quien lo tiene confirma sin abrir el correo. | `app/api/capacitaciones/inscribirse/[capacitacion]/route.ts:386` | Verificación por correo inútil |
| S3 | El resultado biométrico lo envía el navegador y el servidor lo acepta sin comprobarlo. Basta con `{valido: true}` para entrar como «Nueva inscripción», sin pasar por la validación presencial. | `inscribirse/[capacitacion]/route.ts:40` | Suplantación de identidad |
| S4 | Con solo id de estudiante + cédula se sobrescriben el correo, el nombre y el teléfono de un estudiante existente. | `inscribirse/[capacitacion]/route.ts:98-156` | Robo de cuenta |
| S5 | `POST /api/verificacion/reenviar` es público y acepta id de estudiante y metadata arbitrarios: envía correos a cualquiera desde el SMTP del INADEH y puede fabricar inscripciones «biométricas». | `app/api/verificacion/reenviar/route.ts:113-180` | Spam / fraude |
| S6 | La inscripción pública no tiene Turnstile ni límite de intentos. | `inscribirse/[capacitacion]/route.ts:16` | Abuso automatizado |

## 2. Funcionalidad rota (alta)

| # | Problema | Dónde |
|---|---|---|
| F1 | Al volver de la validación biométrica se pierden la cédula y el estudiante, y **la inscripción biométrica no se puede completar**. | `lib/inscripcionFlow.ts:109`, `app/capacitaciones/inscribirse/[id]/page.tsx:111` |
| F2 | Página de espera: «Reenviar» navega a `/esperando/undefined`, y un token invalidado se muestra como «verificado» sin que exista la inscripción. | `app/verificacion/esperando/[token]/page.tsx:121`, `lib/verificationToken.ts:204` |
| F3 | La inscripción cierra a las 00:00 del último día: se compara una columna DATE con `NOW()`. | `app/api/capacitaciones/route.ts:59` |
| F4 | La búsqueda pública del blog siempre da error 500 (`unnest()` sobre JSONB). | `app/api/blog/route.ts:26` |
| F5 | Blog: los permisos de edición se saltan con valores vacíos, el autor edita un texto publicado sin nueva revisión y el rol CIEPI aprueba sus propios textos. | `app/api/admin/blog/[id]/route.ts:152`, `lib/permissions.ts:64` |
| F6 | `Form` reinicia lo escrito cuando el padre vuelve a renderizar: se pierde el formulario tras un error. | `components/Form.tsx:94` |
| F7 | reCAPTCHA y Turnstile se omiten si el cliente no envía el token (contacto y newsletter). | `app/api/newsletter/suscribir/route.ts:64` |

## 3. Máquinas de estado

Situación actual por máquina:

| Máquina | Estado actual | Principales problemas |
|---|---|---|
| Verificación de correo | `usado` mezcla «verificado» e «invalidado» | Falsos «verificado»; el canje sin transacción consume el token aunque falle la inscripción; doble clic da 500 |
| Asistente de inscripción | Reducer parcial | Acepta el retorno biométrico desde cualquier paso y pierde datos |
| Inscripciones (1–6) | Mapa puro y testeado | `UPDATE` sin condición de estado (carreras); id 6 calculado con `MAX+1`; sin historial; la UI ofrece estados inválidos |
| Blog (1–6) | Mapa por rol | Autoaprobación; edición de publicados; «Publicado» sin salida; tabla temporal de comentarios rota (función con INT y id UUID) |
| Consultas | **Sin reglas** (cualquier estado → cualquier otro) | Al responder queda «pendiente»; una cerrada vuelve a pendiente |
| Reservas de mentoría | La mejor resuelta | Falta historial; desactivar un mentor no toca sus reservas; el PATCH guarda cambios parciales |
| Newsletter | Bien orientada | Alta y confirmación sin atomicidad; la confirmación se hace con GET |
| Eventos / ventana de inscripción | Derivados en el cliente, duplicados | Sin validar fecha de fin; tres implementaciones distintas |

**Patrón común propuesto**, tomando como modelo las reservas de mentoría:
1. Un **módulo puro por máquina** (`lib/estados/<maquina>.ts`) con el mapa de transiciones, los roles, las guardas y los overrides declarados, y tests de matriz completa.
2. Una **única función de escritura** por máquina. Dentro de una transacción, hace `UPDATE … WHERE estado = $actual` (responde 409 si otra persona lo cambió) y un **INSERT en una tabla de historial** (quién, de qué estado a cuál, motivo, fecha).
3. La **API devuelve las transiciones permitidas** y la interfaz solo muestra esos botones, junto con el error real del servidor.
4. **Restricciones en la BD** como red de seguridad: ids de estado fijos, índices únicos parciales y CHECK de fechas.
5. **Ningún estado de seguridad viene del cliente**: la biometría y la metadata de los tokens se guardan en el servidor.

## 4. Plan propuesto

- **Fase 1 (antes de lanzar): seguridad del flujo de inscripción y su máquina de estados.**
  - S1–S6 y F1–F3.
  - Tokens de verificación con estados reales.
  - Biometría guardada en el servidor.
  - Asistente que conserva sus datos.
  - Canje transaccional e idempotente.
- **Fase 2: máquinas de estado unificadas.**
  - Inscripciones, blog (F5), consultas, reservas y newsletter con el patrón común.
  - Tablas de historial.
  - Interfaces que solo ofrecen transiciones válidas.
- **Fase 3: resto de correcciones.**
  - F4, F6 y F7.
  - Roles en la API admin, XSS en el JSON-LD del blog y transacciones al editar capacitaciones.
  - Fechas de eventos, accesibilidad y modo oscuro, entre otras.

Cada fase cierra con tests, build, prueba en el navegador y un script de base de datos idempotente para producción.

## Fase 1: implementada

S1–S6 y F1–F3 corregidos. Script para producción: `database/fase1_seguridad_inscripcion.sql`.

- **Sesión de inscripción en el servidor** (`ciepi.inscripcion_sesiones`, cookie httpOnly):
  - La consulta de cédula exige Turnstile y admite como máximo 15 sesiones por IP y hora.
  - La fecha de nacimiento admite 5 intentos por sesión y 10 por cédula en 24 h.
  - Los datos del Tribunal Electoral se guardan en la sesión y no se vuelven a consultar.
- **Biometría validada en el servidor:** el canje con el Hub exige que la sesión esté verificada y que la cédula coincida. El resultado se guarda en la sesión, y el servidor ignora cualquier biometría que envíe el navegador.
- **Datos del estudiante sin cambios hasta verificar el correo:** correo, teléfono y ubicación se aplican al verificar. Los estudiantes nuevos se crean en ese momento con los datos oficiales, nunca con los del formulario.
- **Enlace de verificación** (`lib/estados/verificacionCorreo.ts`):
  - Estados `pendiente`, `verificado`, `invalidado` y `expirado`. El navegador solo recibe un identificador de consulta, nunca el token del correo.
  - El canje es transaccional e idempotente.
  - El reenvío reutiliza la misma solicitud, con un máximo de 3 reenvíos y 60 s de espera entre ellos.
  - Una inscripción nueva solo invalida los enlaces del mismo curso.
  - Se eliminó el reenvío por `id_estudiante`.
- **Una sola inscripción** por estudiante y curso (índice único). «Pendiente de validación» tiene el id fijo 6.
- **Fechas de inscripción:** el último día cuenta completo en hora de Panamá (`lib/inscripcionVentana.ts`).
- **Asistente:** se restaura desde la sesión del servidor, así que la vuelta de la biometría funciona, y «Atrás» ya no salta la fecha de nacimiento.

El detalle completo de los 79 hallazgos, con escenario y corrección propuesta para cada uno, está en `revision-prelanzamiento-detalle.json`.
