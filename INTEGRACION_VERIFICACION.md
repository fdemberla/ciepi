# 🎉 Sistema de Verificación de Correo - INTEGRACIÓN COMPLETA

## ✅ Flujo Completo Implementado

### 📋 Paso a Paso del Flujo

```
1. Usuario llena formulario de inscripción
   ↓ (Submit del formulario)

2. POST /api/capacitaciones/inscribirse/[id]
   - Crea/actualiza estudiante
   - Crea/actualiza ubicación
   - Verifica si correo está verificado

   SI correo_verificado = TRUE:
      → Completa inscripción inmediatamente
      → Retorna success con verification_required = false
      → Redirige a /capacitaciones

   SI correo_verificado = FALSE:
      → Genera token de verificación (15 min)
      → Envía correo con link
      → Retorna success con verification_required = true y token
      → Continúa al paso 3
   ↓

3. Usuario es redirigido a /verificacion/esperando/{token}
   - Muestra instrucciones
   - Inicia polling cada 3 segundos
   - Muestra contador de tiempo
   - Barra de progreso
   ↓

4. Página hace polling → GET /api/verificacion/estado/{token}
   - Verifica si token fue usado
   - Verifica si token expiró
   - Retorna estado: pendiente|verificado|expirado
   ↓

5. Usuario abre correo y hace clic en el link
   → https://domain.com/ciepi/verificacion/{token}
   ↓

6. Se abre página de verificación /verificacion/{token}
   - Muestra loading spinner
   - Valida token automáticamente
   ↓

7. POST /api/verificacion/validar/{token}
   - Valida que el token sea válido
   - Marca token como usado
   - Marca correo_verificado = true
   - Crea inscripción automáticamente
   - Retorna success con datos de inscripción
   ↓

8. Correo marcado como verificado en BD
   UPDATE ciepi.estudiantes SET correo_verificado = true
   ↓

9. Inscripción completada automáticamente
   INSERT INTO ciepi.inscripciones (estado = 1)
   ↓

10. Página de espera detecta verificación (polling)
    - Estado cambia de "pendiente" a "verificado"
    - Muestra mensaje de éxito
    - Animación de check verde
    ↓

11. Ambas páginas redirigen a /capacitaciones
    - Página de verificación: después de 3 segundos
    - Página de espera: después de 2 segundos
```

---

## 🔄 Casos de Uso

### Caso 1: Usuario con Correo Ya Verificado

```
Usuario llena formulario → API verifica correo_verificado = true
    ↓
Inscripción se completa inmediatamente
    ↓
Toast: "¡Inscripción exitosa!"
    ↓
Redirige a /capacitaciones (1.5s)
```

**No requiere verificación de correo**

---

### Caso 2: Usuario Nuevo (Primer Inscripción)

```
Usuario llena formulario → API crea estudiante (correo_verificado = false)
    ↓
API genera token y envía correo
    ↓
Redirige a /verificacion/esperando/{token}
    ↓
Usuario abre correo y hace clic
    ↓
Valida token, marca correo como verificado, crea inscripción
    ↓
Polling detecta cambio → Redirige a /capacitaciones
```

**Requiere verificación de correo la primera vez**

---

### Caso 3: Usuario Existente con Correo No Verificado

```
Usuario llena formulario → API actualiza datos
    ↓
API verifica correo_verificado = false
    ↓
API genera token y envía correo
    ↓
Flujo de verificación normal...
```

**Requiere verificación si nunca verificó su correo**

---

### Caso 4: Token Expira (15 minutos)

```
Usuario en página de espera → Pasan 15 minutos
    ↓
Polling detecta token expirado
    ↓
Muestra mensaje: "Enlace Expirado"
    ↓
Usuario hace clic en "Reenviar"
    ↓
POST /api/verificacion/reenviar
    ↓
Genera nuevo token, envía nuevo correo
    ↓
Actualiza URL con nuevo token
    ↓
Reinicia polling con nuevo token
```

---

### Caso 5: Usuario No Recibe Correo

```
Usuario en página de espera → Espera 60 segundos
    ↓
Botón "Reenviar" se habilita
    ↓
Usuario hace clic en "Reenviar"
    ↓
POST /api/verificacion/reenviar
    ↓
Genera nuevo token, envía nuevo correo
    ↓
Contador de tiempo se reinicia
```

---

## 📁 Archivos Modificados e Integrados

### 1. `/app/api/capacitaciones/inscribirse/[capacitacion]/route.ts`

**Cambios Principales:**

- ✅ Importa funciones de verificación
- ✅ Verifica `correo_verificado` antes de completar inscripción
- ✅ Genera token si correo no está verificado
- ✅ Envía correo de verificación
- ✅ Retorna `verification_required` y `token` en response
- ✅ Actualiza datos de estudiante existente
- ✅ Actualiza ubicación de estudiante existente

**Lógica:**

```typescript
if (correoVerificado) {
  // Completar inscripción inmediatamente
  return { verification_required: false, inscripcion_id: ... };
} else {
  // Enviar correo de verificación
  return { verification_required: true, token: ... };
}
```

---

### 2. `/app/capacitaciones/inscribirse/[id]/page.tsx`

**Cambios Principales:**

- ✅ Detecta `verification_required` en response del API
- ✅ Redirige a página de espera si requiere verificación
- ✅ Redirige directamente a capacitaciones si no requiere

**Lógica:**

```typescript
if (result.verification_required) {
  toast.success("Correo de verificación enviado...");
  router.push(`/verificacion/esperando/${result.token}`);
} else {
  toast.success("¡Inscripción exitosa!");
  router.push("/capacitaciones");
}
```

---

### 3. `/app/api/verificacion/validar/[token]/route.ts`

**Funcionalidad de Inscripción Automática:**

- ✅ Cuando valida token tipo "inscripcion"
- ✅ Crea automáticamente la inscripción en BD
- ✅ Retorna datos de la inscripción creada

**Código Clave:**

```typescript
if (tokenInfo.tipo === "inscripcion") {
  const metadata = tokenInfo.metadata as { capacitacion_id?: number };

  if (metadata.capacitacion_id) {
    // Crear la inscripción
    const inscripcionResult = await query(
      `INSERT INTO ciepi.inscripciones (...) VALUES (...)`
    );
  }
}
```

---

## 🗄️ Cambios en Base de Datos

### Tabla: `ciepi.estudiantes`

```sql
-- Columna agregada
ALTER TABLE ciepi.estudiantes
ADD COLUMN correo_verificado BOOLEAN DEFAULT FALSE;
```

**Campo clave para determinar si se requiere verificación**

---

### Tabla: `ciepi.verificacion_correo`

```sql
CREATE TABLE ciepi.verificacion_correo (
    id SERIAL PRIMARY KEY,
    id_estudiante INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    correo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'inscripcion'
    metadata JSONB, -- { capacitacion_id: 123 }
    usado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    fecha_uso TIMESTAMP,
    ip_creacion VARCHAR(50),
    ip_uso VARCHAR(50)
);
```

**Almacena los tokens de verificación**

---

## 🔐 Seguridad Implementada

### Validación de Identidad

1. **Fecha de Nacimiento** (para estudiantes existentes)

   - Confirma identidad antes de editar datos
   - Compara con fecha almacenada en BD

2. **Tokens de Verificación**

   - 64 caracteres hexadecimales únicos
   - Expiran después de 15 minutos
   - Solo pueden usarse una vez
   - Se invalidan tokens anteriores al generar nuevo

3. **Registro de IP**
   - Se guarda IP de creación del token
   - Se guarda IP de uso del token
   - Rastro de auditoría

### Prevención de Duplicados

- ✅ Verifica si estudiante ya existe antes de crear
- ✅ Verifica si ya está inscrito en la capacitación
- ✅ Actualiza datos en lugar de duplicar

---

## 📧 Sistema de Correos

### Template de Verificación

**Asunto:** "Verifica tu correo electrónico - CIEPI"

**Contenido:**

- Saludo personalizado con nombre
- Nombre de la capacitación
- Botón destacado "Verificar mi Correo"
- Link alternativo (texto)
- Advertencia de expiración (15 minutos)
- Footer con información de CIEPI

### Configuración SMTP

```env
NEXT_PUBLIC_SMTP_SERVER=smtp.office365.com
NEXT_PUBLIC_SMTP_PORT=587
NEXT_PUBLIC_SMTP_USER=noreply-notificaciones@inadeh.edu.pa
NEXT_PUBLIC_SMTP_PASS=!Passw0rdPanama2025*
```

---

## 🎨 UX/UI Implementado

### Página de Espera (`/verificacion/esperando/[token]`)

**Elementos Visuales:**

- 📧 Icono de correo con spinner animado
- 📝 Instrucciones paso a paso (4 pasos)
- ⏱️ Contador de tiempo transcurrido
- ⏳ Contador de tiempo restante (15:00)
- 📊 Barra de progreso visual
- 🔄 Botón de reenviar (habilitado después de 60s)
- ❌ Botón de cancelar

**Estados:**

1. **Pendiente** - Esperando verificación
2. **Verificado** - Check verde + animación bounce
3. **Expirado** - Reloj naranja + botón reenviar

---

### Página de Verificación (`/verificacion/[token]`)

**Estados:**

1. **Loading** - Spinner + "Verificando tu correo..."
2. **Success** - Check verde + datos del estudiante + redirección
3. **Expired** - Reloj naranja + botón reenviar
4. **Already Used** - Info azul + botón ir a capacitaciones
5. **Error** - X roja + botones de recuperación

---

## 🧪 Testing del Flujo

### Test 1: Flujo Completo Exitoso

```bash
1. Ir a /capacitaciones/inscribirse/1
2. Ingresar cédula
3. Completar formulario
4. Click "Completar Inscripción"
5. Verificar redirección a /verificacion/esperando/{token}
6. Abrir correo (revisar Spam si necesario)
7. Click en "Verificar mi Correo"
8. Verificar redirección a /verificacion/{token}
9. Ver mensaje de éxito
10. Verificar que página de espera detecta el cambio
11. Verificar redirección a /capacitaciones
12. Verificar inscripción en BD
```

**Verificaciones en BD:**

```sql
-- Verificar correo marcado como verificado
SELECT correo_verificado FROM ciepi.estudiantes WHERE id = ?;
-- Debe ser TRUE

-- Verificar token marcado como usado
SELECT usado, fecha_uso FROM ciepi.verificacion_correo WHERE token = ?;
-- usado = TRUE, fecha_uso = timestamp

-- Verificar inscripción creada
SELECT * FROM ciepi.inscripciones WHERE id_usuario = ? AND id_capacitacion = ?;
-- Debe existir registro con estado_inscripcion = 1
```

---

### Test 2: Usuario con Correo Ya Verificado

```bash
1. Usuario que ya verificó su correo anteriormente
2. Llenar formulario de nueva inscripción
3. Click "Completar Inscripción"
4. Verificar que NO redirige a página de espera
5. Verificar toast: "¡Inscripción exitosa!"
6. Verificar redirección directa a /capacitaciones
```

---

### Test 3: Token Expira

```bash
1. Llegar a página de espera
2. Esperar 15 minutos (o modificar en BD)
3. Verificar que polling detecta expiración
4. Verificar mensaje "Enlace Expirado"
5. Click en "Reenviar"
6. Verificar nuevo correo enviado
7. Verificar URL actualizada con nuevo token
```

---

### Test 4: Reenvío de Correo

```bash
1. Llegar a página de espera
2. Esperar 60 segundos
3. Verificar que botón "Reenviar" se habilita
4. Click en "Reenviar"
5. Verificar toast de éxito
6. Verificar nuevo correo recibido
7. Verificar contador de reenvíos incrementado
```

---

## 📊 Métricas a Monitorear

### Performance

- Tiempo promedio de verificación
- Tasa de verificación exitosa
- Porcentaje de tokens expirados
- Número promedio de reenvíos por usuario

### Errores Comunes

- Correos no entregados (revisar logs SMTP)
- Tokens no encontrados
- Errores de conexión en polling
- Timeouts en validación

### Queries Útiles

```sql
-- Tasa de verificación
SELECT
  COUNT(*) FILTER (WHERE correo_verificado = TRUE) * 100.0 / COUNT(*) as tasa_verificacion
FROM ciepi.estudiantes
WHERE correo IS NOT NULL;

-- Tokens expirados no usados
SELECT COUNT(*)
FROM ciepi.verificacion_correo
WHERE usado = FALSE AND fecha_expiracion < NOW();

-- Tiempo promedio de verificación
SELECT AVG(EXTRACT(EPOCH FROM (fecha_uso - fecha_creacion))) / 60 as minutos_promedio
FROM ciepi.verificacion_correo
WHERE usado = TRUE;

-- Inscripciones completadas vía verificación (hoy)
SELECT COUNT(*)
FROM ciepi.inscripciones i
JOIN ciepi.verificacion_correo v ON v.metadata->>'capacitacion_id' = i.id_capacitacion::text
WHERE v.usado = TRUE AND DATE(v.fecha_uso) = CURRENT_DATE;
```

---

## 🐛 Troubleshooting

### Problema: Correo no llega

**Soluciones:**

1. Verificar configuración SMTP en `.env`
2. Revisar logs del servidor
3. Verificar carpeta de Spam
4. Usar función de reenvío
5. Verificar que el correo del estudiante es válido

---

### Problema: Polling no detecta cambios

**Soluciones:**

1. Verificar que el intervalo esté activo (console.log)
2. Revisar errores de red en DevTools
3. Verificar endpoint `/api/verificacion/estado/[token]`
4. Limpiar caché del navegador

---

### Problema: Token inválido al hacer clic

**Soluciones:**

1. Verificar que el token no haya expirado (15 min)
2. Verificar que el token existe en BD
3. Verificar que no fue usado anteriormente
4. Usar función de reenvío para nuevo token

---

## ✅ Checklist de Implementación Completa

- [x] Tabla `verificacion_correo` creada
- [x] Columna `correo_verificado` agregada
- [x] Funciones de tokens en `/lib/verificationToken.ts`
- [x] Funciones de utilidades en `/lib/verificationUtils.ts`
- [x] Template de verificación en `/lib/emailTemplates.ts`
- [x] Helper de correo en `/lib/emailHelpers.ts`
- [x] API `/api/verificacion/generar`
- [x] API `/api/verificacion/validar/[token]`
- [x] API `/api/verificacion/estado/[token]`
- [x] API `/api/verificacion/reenviar`
- [x] Página `/verificacion/[token]`
- [x] Página `/verificacion/esperando/[token]`
- [x] Integración en `/api/capacitaciones/inscribirse/[capacitacion]`
- [x] Integración en `/app/capacitaciones/inscribirse/[id]/page.tsx`
- [x] Configuración SMTP
- [x] Documentación completa

---

## 🚀 Sistema Listo para Producción

El sistema de verificación de correo está **100% integrado** y listo para usar. Todos los componentes están conectados y funcionando según el flujo especificado.

**Próximos pasos opcionales:**

1. Agregar logs de auditoría más detallados
2. Implementar dashboard de métricas
3. Agregar notificaciones push además del correo
4. Implementar verificación por SMS como alternativa
5. Agregar recordatorios automáticos si no verifica en X minutos

---

## 📞 Contacto y Soporte

Para dudas o problemas con el sistema de verificación:

- Revisar documentación en `/lib/VERIFICATION_README.md`
- Revisar API docs en `/app/api/verificacion/API_README.md`
- Revisar páginas docs en `/app/verificacion/PAGES_README.md`
