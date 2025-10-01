# Diagrama de Flujo - Sistema de Verificación de Correo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INICIO: Usuario en /capacitaciones                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│          Click en "Inscribirse" en una capacitación                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         Página: /capacitaciones/inscribirse/[id]/page.tsx                │
│         Estado: "cedula" - Ingresa número de cédula                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ handleVerificarCedula()
┌─────────────────────────────────────────────────────────────────────────┐
│                 API: GET /api/verificar/[cedula]                         │
│         (API externa Tribunal Electoral + BD interna)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌──────────────────┐          ┌──────────────────────┐
         │ Estudiante NUEVO │          │ Estudiante EXISTENTE │
         │   data.exists    │          │    data.exists       │
         │   = false        │          │    = true            │
         └──────────────────┘          └──────────────────────┘
                    │                               │
                    │                               ▼
                    │              ┌──────────────────────────────────┐
                    │              │ Mostrar confirmación de fecha de │
                    │              │ nacimiento (seguridad)           │
                    │              └──────────────────────────────────┘
                    │                               │
                    │                               ▼ handleBirthDateConfirmation()
                    │              ┌──────────────────────────────────┐
                    │              │ Valida fecha de nacimiento       │
                    │              │ Si coincide: canEditFields=true  │
                    │              └──────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         Estado: "form" - Formulario completo de inscripción              │
│         - Datos personales (nombres, apellidos pueden editarse)          │
│         - Contacto (correo, teléfono - editables)                        │
│         - Ubicación (provincia, distrito, corregimiento)                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ handleSubmit()
┌─────────────────────────────────────────────────────────────────────────┐
│     API: POST /api/capacitaciones/inscribirse/[capacitacion]            │
│                                                                           │
│     Payload: { estudiante, ubicacion, capacitacion_id }                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────────┐
    │ Estudiante NUEVO          │   │ Estudiante EXISTENTE          │
    │ - Crear en BD             │   │ - Actualizar datos            │
    │ - Crear ubicación         │   │ - Actualizar ubicación        │
    │ correo_verificado = false │   │ - Obtener correo_verificado   │
    └───────────────────────────┘   └───────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              ¿correo_verificado = TRUE en BD?                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼ SÍ                          NO ▼
    ┌───────────────────────────┐   ┌───────────────────────────────┐
    │ FLUJO DIRECTO             │   │ FLUJO DE VERIFICACIÓN         │
    │                           │   │                               │
    │ 1. Crear inscripción      │   │ 1. Invalidar tokens previos   │
    │    en BD inmediatamente   │   │ 2. Crear token (15 min)       │
    │                           │   │ 3. Enviar correo verificación │
    │ 2. Return:                │   │                               │
    │    verification_required  │   │ 4. Return:                    │
    │    = false                │   │    verification_required      │
    │                           │   │    = true                     │
    │ 3. Toast: "¡Inscripción   │   │    token = "abc123..."        │
    │    exitosa!"              │   │                               │
    │                           │   │ 5. Toast: "Correo enviado"    │
    │ 4. Redirigir a:           │   │                               │
    │    /capacitaciones        │   │ 6. Redirigir a:               │
    │    (1.5 segundos)         │   │    /verificacion/esperando/   │
    │                           │   │    {token}                    │
    └───────────────────────────┘   └───────────────────────────────┘
                    │                               │
                    │                               ▼
                    │               ┌───────────────────────────────────┐
                    │               │ Página: /verificacion/esperando/  │
                    │               │         [token]/page.tsx          │
                    │               │                                   │
                    │               │ - Instrucciones paso a paso       │
                    │               │ - Contador de tiempo              │
                    │               │ - Barra de progreso              │
                    │               │ - Botón reenviar (después 60s)   │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               ▼ Inicia polling
                    │               ┌───────────────────────────────────┐
                    │               │ Cada 3 segundos:                 │
                    │               │ GET /api/verificacion/estado/    │
                    │               │     {token}                      │
                    │               │                                   │
                    │               │ Retorna:                         │
                    │               │ - existe: true/false              │
                    │               │ - usado: true/false               │
                    │               │ - expirado: true/false            │
                    │               │ - estado: pendiente|verificado|   │
                    │               │           expirado                │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               │ Mientras tanto...
                    │                               │
                    │                               ▼
                    │               ┌───────────────────────────────────┐
                    │               │ Usuario abre su correo            │
                    │               │ (en otro dispositivo/pestaña)     │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               ▼ Click en link
                    │               ┌───────────────────────────────────┐
                    │               │ Nueva pestaña/ventana se abre:    │
                    │               │ /verificacion/{token}             │
                    │               │                                   │
                    │               │ Página: /verificacion/[token]/    │
                    │               │         page.tsx                  │
                    │               │                                   │
                    │               │ Estado inicial: "loading"         │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               ▼ useEffect automático
                    │               ┌───────────────────────────────────┐
                    │               │ POST /api/verificacion/validar/   │
                    │               │      {token}                      │
                    │               │                                   │
                    │               │ 1. Validar token                  │
                    │               │ 2. Marcar token usado=true        │
                    │               │ 3. UPDATE correo_verificado=true  │
                    │               │ 4. INSERT inscripcion en BD       │
                    │               │                                   │
                    │               │ Return: success + inscripcion_id  │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               ▼
                    │               ┌───────────────────────────────────┐
                    │               │ Estado: "success"                 │
                    │               │ - Icono check verde ✓             │
                    │               │ - "¡Verificación Exitosa!"        │
                    │               │ - Muestra datos del estudiante    │
                    │               │ - Toast: "Correo verificado"      │
                    │               │                                   │
                    │               │ Redirige a: /capacitaciones       │
                    │               │ (después de 3 segundos)           │
                    │               └───────────────────────────────────┘
                    │                               │
                    │                               │ Simultáneamente...
                    │                               │
                    │                               ▼
                    │               ┌───────────────────────────────────┐
                    │               │ Polling en página de espera       │
                    │               │ detecta: estado = "verificado"    │
                    │               │                                   │
                    │               │ - Detiene polling                 │
                    │               │ - Estado: "verificado"            │
                    │               │ - Icono check verde con bounce    │
                    │               │ - Toast: "¡Correo verificado!"    │
                    │               │                                   │
                    │               │ Redirige a: /capacitaciones       │
                    │               │ (después de 2 segundos)           │
                    │               └───────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FIN: Usuario en /capacitaciones                      │
│                     Inscripción completada exitosamente                  │
│                     correo_verificado = true                             │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

                         CASOS ESPECIALES

═══════════════════════════════════════════════════════════════════════════

CASO A: Token Expira (15 minutos)
──────────────────────────────────

En página de espera → Pasan 15 minutos
    │
    ▼ Polling detecta
┌─────────────────────────────┐
│ estado = "expirado"         │
│ - Detiene polling           │
│ - Muestra icono reloj ⏰    │
│ - Botón "Reenviar Correo"   │
└─────────────────────────────┘
    │
    ▼ Usuario hace clic
┌─────────────────────────────┐
│ POST /api/verificacion/     │
│      reenviar               │
│                             │
│ - Invalida token anterior   │
│ - Crea nuevo token          │
│ - Envía nuevo correo        │
│ - Return: nuevo token       │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ router.replace con nuevo    │
│ token                       │
│ - Reinicia polling          │
│ - Reinicia contador         │
└─────────────────────────────┘


CASO B: Usuario No Recibe Correo
─────────────────────────────────

En página de espera → Espera 60 segundos
    │
    ▼
┌─────────────────────────────┐
│ Botón "Reenviar" se habilita│
│ (antes estaba disabled)     │
└─────────────────────────────┘
    │
    ▼ Usuario hace clic
┌─────────────────────────────┐
│ Mismo flujo que CASO A      │
│ - Nuevo token               │
│ - Nuevo correo              │
│ - URL actualizada           │
└─────────────────────────────┘


CASO C: Usuario Hace Click Múltiples Veces
───────────────────────────────────────────

Primera pestaña → Click en link del correo
    │
    ▼
┌─────────────────────────────┐
│ Token validado              │
│ usado = true                │
│ Inscripción creada          │
└─────────────────────────────┘

Segunda pestaña → Click en mismo link
    │
    ▼
┌─────────────────────────────┐
│ Error: TOKEN_ALREADY_USED   │
│ Estado: "used"              │
│ - Icono info ℹ️             │
│ - "Enlace Ya Utilizado"     │
│ - Botón: Ir a Capacitaciones│
└─────────────────────────────┘


CASO D: Token No Encontrado o Inválido
───────────────────────────────────────

Usuario entra con token incorrecto
    │
    ▼
┌─────────────────────────────┐
│ Error: TOKEN_NOT_FOUND      │
│ Estado: "error"             │
│ - Icono X rojo ❌          │
│ - Botones de recuperación   │
└─────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

                         BASES DE DATOS

═══════════════════════════════════════════════════════════════════════════

TABLA: ciepi.estudiantes
────────────────────────

ANTES de verificación:
┌────┬─────────┬──────────────────────┬────────────────────┐
│ id │ nombres │ correo               │ correo_verificado  │
├────┼─────────┼──────────────────────┼────────────────────┤
│ 1  │ Juan    │ juan@example.com     │ FALSE              │
└────┴─────────┴──────────────────────┴────────────────────┘

DESPUÉS de verificación:
┌────┬─────────┬──────────────────────┬────────────────────┐
│ id │ nombres │ correo               │ correo_verificado  │
├────┼─────────┼──────────────────────┼────────────────────┤
│ 1  │ Juan    │ juan@example.com     │ TRUE ✓             │
└────┴─────────┴──────────────────────┴────────────────────┘


TABLA: ciepi.verificacion_correo
─────────────────────────────────

DESPUÉS de generar token:
┌────┬───────────────┬─────────┬─────────────┬──────────┬──────────────────────┬─────────────────────┐
│ id │ id_estudiante │ token   │ tipo        │ metadata │ usado │ fecha_expiracion   │
├────┼───────────────┼─────────┼─────────────┼──────────┼───────┼────────────────────┤
│ 1  │ 1             │ abc123..│ inscripcion │ {cap:1}  │ FALSE │ 2025-10-01 10:15:00│
└────┴───────────────┴─────────┴─────────────┴──────────┴───────┴────────────────────┘

DESPUÉS de validar token:
┌────┬───────────────┬─────────┬─────────────┬──────────┬──────┬────────────────────┬──────────────────────┐
│ id │ id_estudiante │ token   │ tipo        │ metadata │ usado│ fecha_expiracion   │ fecha_uso            │
├────┼───────────────┼─────────┼─────────────┼──────────┼──────┼────────────────────┼──────────────────────┤
│ 1  │ 1             │ abc123..│ inscripcion │ {cap:1}  │ TRUE │ 2025-10-01 10:15:00│ 2025-10-01 10:05:32  │
└────┴───────────────┴─────────┴─────────────┴──────────┴──────┴────────────────────┴──────────────────────┘


TABLA: ciepi.inscripciones
──────────────────────────

DESPUÉS de validar token (inscripción creada automáticamente):
┌────┬────────────┬─────────────────┬────────────────────┬───────────────────────┐
│ id │ id_usuario │ id_capacitacion │ estado_inscripcion │ fecha_inscripcion     │
├────┼────────────┼─────────────────┼────────────────────┼───────────────────────┤
│ 1  │ 1          │ 1               │ 1 (Nueva)          │ 2025-10-01 10:05:32   │
└────┴────────────┴─────────────────┴────────────────────┴───────────────────────┘
```
