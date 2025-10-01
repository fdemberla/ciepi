# Sistema de Correo Electrónico - CIEPI

Este módulo proporciona funciones para enviar correos electrónicos usando SMTP.

## Archivos

- **`smtp.ts`**: Funciones principales para conectar y enviar correos
- **`emailTemplates.ts`**: Plantillas HTML predefinidas para correos
- **`emailHelpers.ts`**: Funciones helper que combinan SMTP con plantillas

## Configuración

Asegúrate de tener estas variables de entorno en tu archivo `.env`:

```env
NEXT_PUBLIC_SMTP_SERVER=smtp.office365.com
NEXT_PUBLIC_SMTP_PORT=587
NEXT_PUBLIC_SMTP_USER=noreply-notificaciones@inadeh.edu.pa
NEXT_PUBLIC_SMTP_PASS=tu_contraseña
```

## Instalación

Primero, instala las dependencias necesarias:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Uso Básico

### 1. Enviar correo simple

```typescript
import { sendEmail } from "@/lib/smtp";

await sendEmail({
  to: "usuario@example.com",
  subject: "Asunto del correo",
  text: "Contenido en texto plano",
  html: "<p>Contenido en <strong>HTML</strong></p>",
});
```

### 2. Usar plantillas predefinidas

```typescript
import { sendEnrollmentConfirmationEmail } from "@/lib/emailHelpers";

await sendEnrollmentConfirmationEmail(
  "estudiante@example.com",
  "Juan",
  "Pérez",
  "Programación Web",
  "15 de enero de 2025"
);
```

## Funciones Disponibles

### emailHelpers.ts

#### `sendWelcomeEmail(email, nombre, apellido)`

Envía correo de bienvenida a un nuevo estudiante.

```typescript
await sendWelcomeEmail("juan.perez@example.com", "Juan", "Pérez");
```

#### `sendEnrollmentConfirmationEmail(email, nombre, apellido, nombreCapacitacion, fechaInicio?)`

Envía confirmación de inscripción en una capacitación.

```typescript
await sendEnrollmentConfirmationEmail(
  "juan.perez@example.com",
  "Juan",
  "Pérez",
  "Programación Web",
  "15 de enero de 2025"
);
```

#### `sendTrainingReminderEmail(email, nombre, apellido, nombreCapacitacion, fechaHora, lugar)`

Envía recordatorio de capacitación próxima.

```typescript
await sendTrainingReminderEmail(
  "juan.perez@example.com",
  "Juan",
  "Pérez",
  "Programación Web",
  "15 de enero de 2025, 9:00 AM",
  "Sala de Capacitación A, INADEH"
);
```

#### `sendCertificateReadyEmail(email, nombre, apellido, nombreCapacitacion, urlCertificado?)`

Notifica que el certificado está disponible.

```typescript
await sendCertificateReadyEmail(
  "juan.perez@example.com",
  "Juan",
  "Pérez",
  "Programación Web",
  "https://ciepi.inadeh.edu.pa/certificados/123"
);
```

#### `sendGenericNotification(email, nombre, apellido, titulo, mensaje)`

Envía una notificación genérica.

```typescript
await sendGenericNotification(
  "juan.perez@example.com",
  "Juan",
  "Pérez",
  "Actualización Importante",
  "Te informamos que el horario de la capacitación ha cambiado."
);
```

#### `sendBulkEmail(emails, subject, text, html)`

Envía el mismo correo a múltiples destinatarios.

```typescript
await sendBulkEmail(
  ["email1@example.com", "email2@example.com"],
  "Notificación Masiva",
  "Texto del mensaje",
  "<p>HTML del mensaje</p>"
);
```

### smtp.ts

#### `sendEmail(options)`

Función principal para enviar correos con opciones completas.

```typescript
import { sendEmail, type SendEmailOptions } from "@/lib/smtp";

const options: SendEmailOptions = {
  to: "destinatario@example.com",
  subject: "Asunto",
  text: "Texto plano",
  html: "<p>HTML</p>",
  cc: ["copia@example.com"],
  bcc: ["copia_oculta@example.com"],
  attachments: [
    {
      filename: "documento.pdf",
      path: "/ruta/al/archivo.pdf",
    },
  ],
};

await sendEmail(options);
```

#### `verifySmtpConnection()`

Verifica que la conexión SMTP funcione correctamente.

```typescript
import { verifySmtpConnection } from "@/lib/smtp";

const isConnected = await verifySmtpConnection();
if (isConnected) {
  console.log("✓ Conexión SMTP exitosa");
}
```

#### `getSmtpTransporter()`

Obtiene el transporter SMTP (reutiliza la conexión existente).

```typescript
import { getSmtpTransporter } from "@/lib/smtp";

const transporter = getSmtpTransporter();
```

#### `closeSmtpConnection()`

Cierra la conexión SMTP.

```typescript
import { closeSmtpConnection } from "@/lib/smtp";

closeSmtpConnection();
```

## Ejemplo de Uso en API Route

```typescript
// app/api/send-confirmation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendEnrollmentConfirmationEmail } from "@/lib/emailHelpers";

export async function POST(request: NextRequest) {
  try {
    const { email, nombre, apellido, capacitacion } = await request.json();

    await sendEnrollmentConfirmationEmail(
      email,
      nombre,
      apellido,
      capacitacion.nombre,
      capacitacion.fecha_inicio
    );

    return NextResponse.json({
      success: true,
      message: "Correo enviado exitosamente",
    });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    return NextResponse.json(
      { error: "Error al enviar el correo" },
      { status: 500 }
    );
  }
}
```

## Plantillas HTML

Todas las plantillas incluyen:

- Diseño responsive
- Estilos inline para compatibilidad con clientes de correo
- Estructura profesional con header, contenido y footer
- Colores corporativos

Puedes personalizar las plantillas editando `emailTemplates.ts`.

## Manejo de Errores

```typescript
import { sendEmail } from "@/lib/smtp";

try {
  await sendEmail({
    to: "usuario@example.com",
    subject: "Test",
    text: "Mensaje de prueba",
  });
  console.log("✓ Correo enviado");
} catch (error) {
  console.error("✗ Error al enviar correo:", error);
  // Manejar el error apropiadamente
}
```

## Consideraciones de Seguridad

1. **No expongas credenciales**: Las variables de entorno con `NEXT_PUBLIC_` son accesibles en el cliente. Considera usar variables sin este prefijo para datos sensibles y solo accederlas desde el servidor.

2. **Valida las direcciones de correo**: Siempre valida las direcciones de correo antes de enviar.

3. **Rate limiting**: Implementa límites de velocidad para prevenir abuso.

4. **Sanitiza el contenido**: Si permites contenido HTML dinámico, sanitízalo para prevenir XSS.

## Testing

```typescript
// Verificar conexión SMTP
import { verifySmtpConnection } from "@/lib/smtp";

const testConnection = async () => {
  const isOk = await verifySmtpConnection();
  console.log("Conexión SMTP:", isOk ? "✓ OK" : "✗ Fallo");
};

testConnection();
```

## Soporte

Para problemas o preguntas, contacta al equipo de desarrollo de CIEPI.
