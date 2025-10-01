# API Endpoints de Verificación de Correo

Documentación de los endpoints para el sistema de verificación de correo electrónico.

## Base Path

```
/api/verificacion
```

## Endpoints

### 1. Generar Token de Verificación

**POST** `/api/verificacion/generar`

Genera un token de verificación y envía un correo al estudiante con el link de verificación.

#### Request Body

```json
{
  "id_estudiante": 123,
  "tipo": "inscripcion",
  "metadata": {
    "capacitacion_id": 456
  }
}
```

#### Parámetros

- `id_estudiante` (number, requerido): ID del estudiante
- `tipo` (string, requerido): Tipo de verificación. Valores válidos:
  - `"inscripcion"` - Para inscripciones en capacitaciones
  - `"recuperacion"` - Para recuperación de contraseña
  - `"cambio_correo"` - Para cambio de correo electrónico
- `metadata` (object, opcional): Datos adicionales según el tipo

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Correo de verificación enviado exitosamente",
  "data": {
    "token": "a1b2c3d4e5f6...",
    "correo": "estudiante@example.com",
    "fecha_expiracion": "2025-10-01T10:30:00Z",
    "duracion_minutos": 15
  }
}
```

#### Response - Correo ya verificado (200 OK)

```json
{
  "success": true,
  "already_verified": true,
  "message": "El correo ya está verificado"
}
```

#### Errores Posibles

- `400 Bad Request`: Datos incompletos o tipo inválido
- `404 Not Found`: Estudiante no encontrado
- `500 Internal Server Error`: Error en el servidor

---

### 2. Validar Token

**POST** `/api/verificacion/validar/[token]`

Valida un token cuando el usuario hace clic en el link del correo. Marca el token como usado y el correo como verificado.

#### URL Parameters

- `token` (string): Token de verificación enviado por correo

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Correo verificado exitosamente",
  "data": {
    "estudiante": {
      "id": 123,
      "nombres": "Juan",
      "apellidos": "Pérez",
      "correo": "juan.perez@example.com"
    },
    "tipo": "inscripcion",
    "inscripcion_id": 789,
    "estado_inscripcion": 1,
    "fecha_inscripcion": "2025-10-01T10:15:00Z",
    "message": "Inscripción creada exitosamente"
  }
}
```

#### Errores Posibles

**400 Bad Request - Token Expirado**

```json
{
  "error": "El enlace de verificación ha expirado",
  "code": "TOKEN_EXPIRED"
}
```

**400 Bad Request - Token Ya Usado**

```json
{
  "error": "Este enlace ya fue usado",
  "code": "TOKEN_ALREADY_USED"
}
```

**400 Bad Request - Token No Encontrado**

```json
{
  "error": "El enlace de verificación no existe",
  "code": "TOKEN_NOT_FOUND"
}
```

---

**GET** `/api/verificacion/validar/[token]`

Obtiene información del token sin validarlo (útil para mostrar información antes de validar).

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "estudiante": {
      "nombres": "Juan",
      "apellidos": "Pérez",
      "correo": "juan.perez@example.com"
    },
    "tipo": "inscripcion",
    "usado": false,
    "expirado": false,
    "fecha_expiracion": "2025-10-01T10:30:00Z",
    "metadata": {
      "capacitacion_id": 456
    }
  }
}
```

---

### 3. Verificar Estado del Token (Polling)

**GET** `/api/verificacion/estado/[token]`

Verifica el estado actual de un token. Este endpoint es llamado repetidamente (polling) desde la página de espera para detectar cuando el usuario hizo clic en el link.

#### URL Parameters

- `token` (string): Token de verificación

#### Response - Token Pendiente (200 OK)

```json
{
  "success": true,
  "message": "Esperando verificación",
  "data": {
    "existe": true,
    "usado": false,
    "expirado": false,
    "estado": "pendiente"
  }
}
```

#### Response - Token Verificado (200 OK)

```json
{
  "success": true,
  "message": "Token verificado exitosamente",
  "data": {
    "existe": true,
    "usado": true,
    "expirado": false,
    "estado": "verificado"
  }
}
```

#### Response - Token Expirado (200 OK)

```json
{
  "success": true,
  "message": "El token ha expirado",
  "data": {
    "existe": true,
    "usado": false,
    "expirado": true,
    "estado": "expirado"
  }
}
```

#### Estados Posibles

- `"pendiente"`: Token válido, esperando verificación
- `"verificado"`: Token usado exitosamente
- `"expirado"`: Token expirado

---

### 4. Reenviar Correo de Verificación

**POST** `/api/verificacion/reenviar`

Reenvía un correo de verificación. Útil cuando el correo no llega o el token expira.

#### Request Body - Opción 1 (con token anterior)

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

#### Request Body - Opción 2 (con datos del estudiante)

```json
{
  "id_estudiante": 123,
  "tipo": "inscripcion",
  "metadata": {
    "capacitacion_id": 456
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Correo de verificación reenviado exitosamente",
  "data": {
    "token": "x1y2z3w4v5u6...",
    "correo": "estudiante@example.com",
    "fecha_expiracion": "2025-10-01T10:45:00Z",
    "duracion_minutos": 15
  }
}
```

#### Errores Posibles

- `400 Bad Request`: Datos incompletos
- `404 Not Found`: Estudiante o token no encontrado
- `500 Internal Server Error`: Error en el servidor

---

## Flujo de Uso Completo

### 1. Usuario llena formulario de inscripción

```javascript
// En el frontend
const response = await fetch("/api/capacitaciones/inscribirse/123", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    estudiante: {
      /* datos */
    },
    ubicacion: {
      /* datos */
    },
    capacitacion_id: 123,
  }),
});

const data = await response.json();

if (data.verification_required) {
  // Redirigir a página de espera
  router.push(`/verificacion/esperando/${data.token}`);
}
```

### 2. Página de espera hace polling

```javascript
// En página de espera
useEffect(() => {
  const checkStatus = async () => {
    const response = await fetch(`/api/verificacion/estado/${token}`);
    const data = await response.json();

    if (data.data.estado === "verificado") {
      // Mostrar éxito y redirigir
      router.push("/inscripcion-exitosa");
    }

    if (data.data.estado === "expirado") {
      // Mostrar opción para reenviar
      setExpired(true);
    }
  };

  // Polling cada 3 segundos
  const interval = setInterval(checkStatus, 3000);

  return () => clearInterval(interval);
}, [token]);
```

### 3. Usuario hace clic en el correo

```javascript
// En página de verificación
useEffect(() => {
  const validar = async () => {
    const response = await fetch(`/api/verificacion/validar/${token}`, {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      // Mostrar mensaje de éxito
      setVerified(true);
    }
  };

  validar();
}, [token]);
```

### 4. Reenviar correo si expira

```javascript
// Botón de reenviar
const handleReenviar = async () => {
  const response = await fetch("/api/verificacion/reenviar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: oldToken }),
  });

  const data = await response.json();

  if (data.success) {
    // Actualizar con el nuevo token
    setToken(data.data.token);
  }
};
```

## Códigos de Error

| Código               | Descripción                            |
| -------------------- | -------------------------------------- |
| `INVALID_TOKEN`      | Token inválido o malformado            |
| `TOKEN_EXPIRED`      | El token ha expirado                   |
| `TOKEN_ALREADY_USED` | El token ya fue usado anteriormente    |
| `TOKEN_NOT_FOUND`    | El token no existe en la base de datos |

## Configuración

Los tokens tienen una duración de **15 minutos** por defecto. Esto puede configurarse en cada llamada al crear el token.

## Seguridad

- Los tokens son únicos y generados aleatoriamente con 32 bytes
- Los tokens expiran después de 15 minutos
- Los tokens solo pueden usarse una vez
- Se registra la IP de creación y uso del token
- Se invalidan tokens anteriores del mismo tipo al generar uno nuevo

## Notas Importantes

1. **Polling**: Se recomienda hacer polling cada 3 segundos para no sobrecargar el servidor
2. **Timeout**: Si después de 15 minutos el token no se usa, ofrecer opción de reenviar
3. **Múltiples pestañas**: Si el usuario abre el link en múltiples pestañas, solo la primera validación será exitosa
4. **Correo ya verificado**: Si el correo ya está verificado, no es necesario generar un nuevo token

## Testing

```bash
# Generar token
curl -X POST http://localhost:3000/ciepi/api/verificacion/generar \
  -H "Content-Type: application/json" \
  -d '{"id_estudiante":1,"tipo":"inscripcion","metadata":{"capacitacion_id":1}}'

# Verificar estado
curl http://localhost:3000/ciepi/api/verificacion/estado/[token]

# Validar token
curl -X POST http://localhost:3000/ciepi/api/verificacion/validar/[token]

# Reenviar
curl -X POST http://localhost:3000/ciepi/api/verificacion/reenviar \
  -H "Content-Type: application/json" \
  -d '{"token":"[token]"}'
```
