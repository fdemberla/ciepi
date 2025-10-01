# Sistema de Verificación de Correo Electrónico

Este módulo implementa un sistema seguro de verificación de correo electrónico para CIEPI.

## Archivos Creados

- **`verificationToken.ts`**: Funciones para crear, validar y gestionar tokens de verificación
- **`verificationUtils.ts`**: Utilidades para generar URLs y obtener IP del cliente
- **`emailTemplates.ts`**: Plantilla HTML para correo de verificación (agregada)
- **`emailHelpers.ts`**: Función helper para enviar correo de verificación (agregada)

## Base de Datos

### Tabla: `ciepi.verificacion_correo`

```sql
CREATE TABLE ciepi.verificacion_correo (
    id SERIAL PRIMARY KEY,
    id_estudiante INTEGER NOT NULL REFERENCES ciepi.estudiantes(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    correo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    metadata JSONB,
    usado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    fecha_uso TIMESTAMP,
    ip_creacion VARCHAR(50),
    ip_uso VARCHAR(50)
);
```

### Columna agregada: `ciepi.estudiantes.correo_verificado`

```sql
ALTER TABLE ciepi.estudiantes
ADD COLUMN correo_verificado BOOLEAN DEFAULT FALSE;
```

## Funciones Principales

### verificationToken.ts

#### `generateSecureToken()`

Genera un token aleatorio de 64 caracteres hexadecimales.

```typescript
import { generateSecureToken } from "@/lib/verificationToken";

const token = generateSecureToken();
// Resultado: "a1b2c3d4e5f6..."
```

#### `createVerificationToken(params)`

Crea un token de verificación en la base de datos.

```typescript
import { createVerificationToken } from "@/lib/verificationToken";

const result = await createVerificationToken({
  id_estudiante: 123,
  correo: "estudiante@example.com",
  tipo: "inscripcion",
  metadata: { capacitacion_id: 456 },
  duracion_minutos: 15,
  ip: "192.168.1.1",
});

// result = {
//   token: "a1b2c3d4...",
//   id: 789,
//   fecha_expiracion: Date
// }
```

#### `validateVerificationToken(token)`

Valida si un token es válido (no usado, no expirado).

```typescript
import { validateVerificationToken } from "@/lib/verificationToken";

const result = await validateVerificationToken(token);

if (result.valid) {
  console.log("Token válido:", result.data);
} else {
  if (result.expired) console.log("Token expirado");
  if (result.used) console.log("Token ya usado");
  if (result.not_found) console.log("Token no encontrado");
}
```

#### `markTokenAsUsed(token, ip?)`

Marca un token como usado.

```typescript
import { markTokenAsUsed } from "@/lib/verificationToken";

const success = await markTokenAsUsed(token, "192.168.1.1");
```

#### `checkTokenStatus(token)`

Verifica el estado de un token (útil para polling).

```typescript
import { checkTokenStatus } from "@/lib/verificationToken";

const status = await checkTokenStatus(token);
// status = {
//   exists: true,
//   usado: false,
//   expirado: false
// }
```

#### `invalidatePreviousTokens(id_estudiante, tipo)`

Invalida todos los tokens anteriores de un estudiante para un tipo específico.

```typescript
import { invalidatePreviousTokens } from "@/lib/verificationToken";

await invalidatePreviousTokens(123, "inscripcion");
```

#### `getTokenInfo(token)`

Obtiene información completa de un token incluyendo datos del estudiante.

```typescript
import { getTokenInfo } from "@/lib/verificationToken";

const info = await getTokenInfo(token);
// info = {
//   id, id_estudiante, correo, tipo, metadata,
//   usado, fecha_creacion, fecha_expiracion,
//   nombres, apellidos, cedula
// }
```

#### `cleanupExpiredTokens(dias_antiguedad?)`

Limpia tokens expirados (tarea de mantenimiento).

```typescript
import { cleanupExpiredTokens } from "@/lib/verificationToken";

const eliminados = await cleanupExpiredTokens(7);
console.log(`${eliminados} tokens eliminados`);
```

### verificationUtils.ts

#### `getVerificationUrl(token)`

Genera la URL completa de verificación.

```typescript
import { getVerificationUrl } from "@/lib/verificationUtils";

const url = getVerificationUrl(token);
// url = "http://localhost:3000/ciepi/verificacion/a1b2c3d4..."
```

#### `getWaitingUrl(token)`

Genera la URL de la página de espera.

```typescript
import { getWaitingUrl } from "@/lib/verificationUtils";

const url = getWaitingUrl(token);
// url = "http://localhost:3000/ciepi/verificacion/esperando/a1b2c3d4..."
```

#### `getClientIp(request)`

Obtiene la IP del cliente desde la request.

```typescript
import { getClientIp } from "@/lib/verificationUtils";

const ip = getClientIp(request);
```

### emailHelpers.ts

#### `sendEmailVerification()`

Envía correo de verificación con link.

```typescript
import { sendEmailVerification } from "@/lib/emailHelpers";

await sendEmailVerification(
  "estudiante@example.com",
  "Juan",
  "Pérez",
  "http://localhost:3000/ciepi/verificacion/token123",
  "Programación Web",
  15 // minutos
);
```

## Flujo Completo de Verificación

### 1. Usuario llena formulario de inscripción

```typescript
// En el componente de inscripción
const handleSubmit = async (formData) => {
  // Enviar datos al API
  const response = await fetch("/api/capacitaciones/inscribirse/123", {
    method: "POST",
    body: JSON.stringify(formData),
  });

  const result = await response.json();

  if (result.verification_required) {
    // Redirigir a página de espera
    router.push(`/verificacion/esperando/${result.token}`);
  }
};
```

### 2. API genera token y envía correo

```typescript
// En route.ts
import {
  createVerificationToken,
  invalidatePreviousTokens,
} from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl, getClientIp } from "@/lib/verificationUtils";

// Invalidar tokens anteriores
await invalidatePreviousTokens(estudianteId, "inscripcion");

// Crear nuevo token
const { token } = await createVerificationToken({
  id_estudiante: estudianteId,
  correo: estudiante.correo,
  tipo: "inscripcion",
  metadata: { capacitacion_id: capacitacionId },
  duracion_minutos: 15,
  ip: getClientIp(request),
});

// Enviar correo
const verificationUrl = getVerificationUrl(token);
await sendEmailVerification(
  estudiante.correo,
  estudiante.nombres,
  estudiante.apellidos,
  verificationUrl,
  capacitacion.nombre,
  15
);

return NextResponse.json({
  verification_required: true,
  token,
  message: "Correo de verificación enviado",
});
```

### 3. Página de espera con polling

```typescript
// En page.tsx de esperando
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/verificacion/estado/${token}`);
    const data = await response.json();

    if (data.usado) {
      // Token verificado, completar inscripción
      clearInterval(interval);
      await completarInscripcion();
    }

    if (data.expirado) {
      // Token expirado
      clearInterval(interval);
      setError("El token ha expirado");
    }
  }, 3000); // Cada 3 segundos

  return () => clearInterval(interval);
}, [token]);
```

### 4. Usuario hace clic en el link del correo

```typescript
// En /verificacion/[token]/page.tsx
useEffect(() => {
  const verificar = async () => {
    const response = await fetch(`/api/verificacion/validar/${token}`, {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      // Mostrar mensaje de éxito
      setVerified(true);
    }
  };

  verificar();
}, [token]);
```

### 5. API valida token y marca correo como verificado

```typescript
// En /api/verificacion/validar/[token]/route.ts
import {
  validateVerificationToken,
  markTokenAsUsed,
} from "@/lib/verificationToken";

const validation = await validateVerificationToken(token);

if (!validation.valid) {
  return NextResponse.json({ error: "Token inválido" }, { status: 400 });
}

// Marcar token como usado
await markTokenAsUsed(token, getClientIp(request));

// Marcar correo como verificado
await query(
  `UPDATE ciepi.estudiantes 
   SET correo_verificado = true 
   WHERE id = $1`,
  [validation.data.id_estudiante]
);

return NextResponse.json({
  success: true,
  message: "Correo verificado exitosamente",
});
```

## Seguridad

✅ **Tokens únicos**: Cada token es generado con 32 bytes aleatorios
✅ **Expiración**: Los tokens expiran después de 15 minutos (configurable)
✅ **Un solo uso**: Los tokens solo pueden usarse una vez
✅ **Registro de IP**: Se registra la IP de creación y uso
✅ **Invalidación**: Se pueden invalidar tokens anteriores
✅ **Limpieza**: Función de mantenimiento para eliminar tokens antiguos

## Variables de Entorno

Agregar al archivo `.env`:

```env
# URL de la aplicación (para generar links en correos)
NEXT_PUBLIC_APP_URL=http://localhost:3000/ciepi
```

## Tareas de Mantenimiento

Ejecutar periódicamente (cron job o tarea programada):

```typescript
import { cleanupExpiredTokens } from "@/lib/verificationToken";

// Eliminar tokens con más de 7 días de antigüedad
await cleanupExpiredTokens(7);
```

## Próximos Pasos

Para completar la implementación, necesitas crear:

1. **API Routes**:

   - `/api/verificacion/generar/route.ts` - Genera token y envía correo
   - `/api/verificacion/validar/[token]/route.ts` - Valida token
   - `/api/verificacion/estado/[token]/route.ts` - Polling del estado

2. **Páginas**:

   - `/app/verificacion/[token]/page.tsx` - Página de validación
   - `/app/verificacion/esperando/[token]/page.tsx` - Página de espera con polling

3. **Integración**:
   - Modificar `/app/api/capacitaciones/inscribirse/[capacitacion]/route.ts`
   - Agregar verificación de correo al flujo de inscripción
