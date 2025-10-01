# Sistema de Inscripciones CIEPI

## Descripción General

Sistema completo de inscripción de estudiantes a capacitaciones con validación de cédula, registro de datos personales y ubicación geográfica.

## Flujo de Inscripción

### 1. Usuario hace clic en "Inscribirse"

- Desde `/capacitaciones` el usuario hace clic en el botón "Inscribirse"
- Se redirige a `/capacitaciones/inscribirse/[id]`

### 2. Verificación de Cédula

- El usuario ingresa su número de cédula
- Se llama a `/api/verificar/[cedula]`
- **Si existe en la BD**: Se cargan sus datos automáticamente
- **Si NO existe**: Se llama al API externo para verificar la cédula (por implementar)

### 3. Formulario de Inscripción

- **Estudiantes Existentes**: Ven sus datos pre-llenados (solo lectura)
- **Estudiantes Nuevos**: Completan formulario completo con:
  - Datos personales (nombres, apellidos, estado civil, fecha de nacimiento)
  - Información de contacto (correo, teléfono)
  - Ubicación (provincia, distrito, corregimiento, calle)

### 4. Envío de Inscripción

- Se envía POST a `/api/capacitaciones/inscribirse/[capacitacion]`
- El sistema:
  - Verifica que la capacitación existe y está activa
  - Valida fechas de inscripción
  - Crea estudiante nuevo SI NO existe
  - Guarda ubicación del estudiante
  - Verifica que no esté ya inscrito
  - Crea inscripción con estado 1 (Nueva inscripción)

### 5. Confirmación

- Se muestra toast de éxito
- Se redirige de vuelta a `/capacitaciones`

## Estructura de Base de Datos

### Tabla: `ciepi.estudiantes`

Almacena información básica de los estudiantes.

```sql
- id (SERIAL PRIMARY KEY)
- cedula (VARCHAR UNIQUE) - Cédula del estudiante
- nombres (VARCHAR) - Nombres
- apellidos (VARCHAR) - Apellidos
- nombre_cedula (VARCHAR) - Nombre completo según cédula
- estado_civil (VARCHAR) - Estado civil
- fecha_nacimiento (DATE) - Fecha de nacimiento
- correo (VARCHAR) - Email
- telefono (VARCHAR) - Teléfono
- fecha_creacion (TIMESTAMP)
- fecha_actualizacion (TIMESTAMP)
```

### Tabla: `ciepi.estudiantes_ubicacion`

Información de ubicación geográfica de los estudiantes.

```sql
- id (SERIAL PRIMARY KEY)
- id_usuario (INTEGER FK -> estudiantes.id)
- provincia_id (INTEGER) - ID de provincia
- distrito_id (INTEGER) - ID de distrito
- corregimiento_id (INTEGER) - ID de corregimiento
- calle (TEXT) - Dirección específica
```

### Tabla: `ciepi.inscripciones`

Registro de inscripciones a capacitaciones.

```sql
- id (SERIAL PRIMARY KEY)
- id_usuario (INTEGER FK -> estudiantes.id)
- id_capacitacion (INTEGER FK -> capacitaciones.id)
- estado_inscripcion (INTEGER FK -> inscripciones_estados.id) - DEFAULT 1
- actualizado_por (INTEGER) - ID del admin que actualizó
- fecha_inscripcion (TIMESTAMP)
- fecha_ultima_actualizacion (TIMESTAMP)
```

### Tabla: `ciepi.inscripciones_estados`

Catálogo de estados de inscripción.

```sql
1 - Nueva inscripción (Sin revisar)
2 - Rechazado
3 - Matriculado
4 - Retirado
5 - Terminó curso
```

## APIs Implementadas

### Verificación de Cédula

**GET** `/api/verificar/[cedula]`

Verifica si un estudiante existe en la base de datos. Si no existe, consulta el API externa del Tribunal Electoral.

**Flujo:**

1. Busca en `ciepi.estudiantes` por cédula
2. Si existe → Retorna datos del estudiante
3. Si NO existe → Llama al API externa con las credenciales configuradas
4. Formatea y retorna los datos para el formulario

**Configuración requerida en `.env`:**

```env
NEXT_PUBLIC_CEDULA_API_URL=https://api-url.com/endpoint
NEXT_PUBLIC_CEDULA_API_TOOL=nombre_de_la_herramienta
NEXT_PUBLIC_CEDULA_API_KEY=tu_api_key_aqui
```

**Request al API externa:**

```json
POST ${CEDULA_API_URL}
Headers:
  Content-Type: application/json
  x-tool-name: ${CEDULA_API_TOOL}
  x-api-key: ${CEDULA_API_KEY}

Body:
{
  "cedulas": ["8-123-456"]
}
```

**Respuesta si existe:**

```json
{
  "exists": true,
  "estudiante": {
    "id": 1,
    "cedula": "8-123-456",
    "nombres": "Juan",
    "apellidos": "Pérez"
    // ... más datos
  }
}
```

**Respuesta si NO existe:**

```json
{
  "exists": false,
  "external_data": {
    "cedula": "8-123-456",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "nombre_cedula": "JUAN PEREZ"
  },
  "message": "Estudiante no encontrado..."
}
```

### APIs de Ubicación

**GET** `/api/ubicacion/provincias`

- Retorna todas las provincias

**GET** `/api/ubicacion/distritos/[provincia]`

- Retorna todos los distritos de una provincia

**GET** `/api/ubicacion/corregimientos/[distrito]`

- Retorna todos los corregimientos de un distrito

**Respuesta:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "nombre": "Panamá" },
    { "id": 2, "nombre": "Colón" }
  ]
}
```

### Inscripción

**POST** `/api/capacitaciones/inscribirse/[capacitacion]`

Crea una nueva inscripción.

**Body:**

```json
{
  "estudiante": {
    "id": 1, // Opcional si ya existe
    "cedula": "8-123-456",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "nombre_cedula": "JUAN PEREZ",
    "estado_civil": "Soltero/a",
    "fecha_nacimiento": "1990-01-01",
    "correo": "juan@email.com",
    "telefono": "6000-0000"
  },
  "ubicacion": {
    "provincia_id": 1,
    "distrito_id": 1,
    "corregimiento_id": 1,
    "calle": "Calle 50, Ciudad de Panamá"
  },
  "capacitacion_id": 5
}
```

**Validaciones:**

- ✅ Capacitación existe y está activa
- ✅ Fechas de inscripción vigentes
- ✅ No está ya inscrito en esa capacitación
- ✅ Si estudiante existe, usa su ID
- ✅ Si estudiante NO existe, lo crea primero

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Inscripción completada exitosamente",
  "data": {
    "inscripcion": {
      "id": 123,
      "id_usuario": 1,
      "id_capacitacion": 5,
      "estado_inscripcion": 1,
      "fecha_inscripcion": "2025-09-30T..."
    },
    "estudiante_id": 1
  }
}
```

## Componentes Frontend

### `/capacitaciones/inscribirse/[id]/page.tsx`

Página principal de inscripción con 3 estados:

1. **Step "cedula"**: Formulario simple para ingresar cédula
2. **Step "loading"**: Spinner mientras se verifica
3. **Step "form"**: Formulario completo con:
   - Datos personales (disabled si estudiante existe)
   - Contacto (disabled si estudiante existe)
   - Ubicación (con selects en cascada)

**Características:**

- ✅ Selects dinámicos (provincia → distrito → corregimiento)
- ✅ Pre-llenado de datos si estudiante existe
- ✅ Campos deshabilitados para estudiantes existentes
- ✅ Validación en tiempo real
- ✅ Toast notifications
- ✅ Redirección automática después del éxito

### Componente Form Actualizado

Se agregaron las siguientes características:

**`disabled` prop**: Deshabilita campos (útil para datos pre-cargados)

```typescript
{
  name: "nombres",
  label: "Nombres",
  type: "text",
  disabled: true  // Campo de solo lectura
}
```

**`onFieldChange` callback**: Se ejecuta cuando cambia cualquier campo

```typescript
<Form
  onFieldChange={(fieldName, value) => {
    if (fieldName === "provincia_id") {
      fetchDistritos(value);
    }
  }}
/>
```

**Opciones flexibles**: Acepta strings o objetos

```typescript
// Forma 1: Array de strings
options: ["Soltero/a", "Casado/a", "Divorciado/a"];

// Forma 2: Array de objetos
options: [
  { label: "Soltero/a", value: 1 },
  { label: "Casado/a", value: 2 },
];
```

## Setup Inicial

### 1. Ejecutar el SQL

```bash
psql -U usuario -d database -f db/inscripciones.sql
```

### 2. Asegurarse de tener tablas de ubicación

```sql
-- Las APIs esperan estas tablas en el schema public:
ciepi.provincias (id, nombre)
ciepi.distritos (id, nombre, provincia_id)
ciepi.corregimientos (id, nombre, distrito_id)
```

### 3. Variables de Entorno

Agregar al archivo `.env` o `.env.local`:

```env
# Database
DATABASE_URL=postgresql://usuario:password@localhost:5432/tu_base_datos

# NextAuth
NEXTAUTH_URL=http://localhost:3000/ciepi
NEXTAUTH_SECRET=tu_secret_aqui

# Azure AD
AZURE_AD_CLIENT_ID=tu_client_id
AZURE_AD_CLIENT_SECRET=tu_client_secret
AZURE_AD_TENANT_ID=tu_tenant_id

# API Externa de Cédulas (REQUERIDO para inscripciones)
NEXT_PUBLIC_CEDULA_API_URL=https://tu-api-url.com/endpoint
NEXT_PUBLIC_CEDULA_API_TOOL=nombre_herramienta
NEXT_PUBLIC_CEDULA_API_KEY=tu_api_key

# Base Path
NEXT_PUBLIC_BASE_PATH=/ciepi
```

**⚠️ IMPORTANTE:** Sin las variables `NEXT_PUBLIC_CEDULA_API_*`, la verificación de cédulas fallará para usuarios nuevos.

### 4. Probar el Flujo

1. Reiniciar el servidor de desarrollo: `npm run dev`
2. Ir a `/capacitaciones`
3. Click en "Inscribirse" en cualquier capacitación
4. Ingresar una cédula válida (ej: "8-123-456")
5. El sistema consultará el API externa si la cédula no existe en la BD
6. Completar el formulario con los datos retornados
7. Enviar y verificar en la base de datos

## Próximos Pasos (TODO)

### Panel de Administración de Inscripciones

Crear `/admin/inscripciones` para que los administradores puedan:

- Ver todas las inscripciones
- Filtrar por capacitación, estado, fecha
- Cambiar estado de inscripción (Matricular, Rechazar, etc.)
- Exportar lista de inscritos
- Ver detalles del estudiante

### Notificaciones por Email

Cuando se crea una inscripción:

- Enviar email de confirmación al estudiante
- Notificar a los administradores

### Validaciones Adicionales

- Límite de cupos por capacitación
- Verificar edad mínima según capacitación
- Requisitos previos (otras capacitaciones completadas)

## Consultas Útiles

### Ver todas las inscripciones

```sql
SELECT
  i.id,
  e.cedula,
  e.nombres || ' ' || e.apellidos AS estudiante,
  c.nombre AS capacitacion,
  ie.nombre AS estado,
  i.fecha_inscripcion
FROM ciepi.inscripciones i
JOIN ciepi.estudiantes e ON i.id_usuario = e.id
JOIN ciepi.capacitaciones c ON i.id_capacitacion = c.id
JOIN ciepi.inscripciones_estados ie ON i.estado_inscripcion = ie.id
ORDER BY i.fecha_inscripcion DESC;
```

### Inscritos por capacitación

```sql
SELECT
  c.nombre,
  COUNT(i.id) AS total_inscritos,
  COUNT(CASE WHEN i.estado_inscripcion = 1 THEN 1 END) AS nuevas,
  COUNT(CASE WHEN i.estado_inscripcion = 3 THEN 1 END) AS matriculados
FROM ciepi.capacitaciones c
LEFT JOIN ciepi.inscripciones i ON c.id = i.id_capacitacion
GROUP BY c.id, c.nombre
ORDER BY total_inscritos DESC;
```

### Buscar estudiante por cédula

```sql
SELECT
  e.*,
  u.provincia_id,
  u.distrito_id,
  u.corregimiento_id,
  u.calle
FROM ciepi.estudiantes e
LEFT JOIN ciepi.estudiantes_ubicacion u ON e.id = u.id_usuario
WHERE e.cedula = '8-123-456';
```

## Arquitectura del Sistema

```
Usuario → Click "Inscribirse"
    ↓
/capacitaciones/inscribirse/[id]
    ↓
Ingresa Cédula
    ↓
GET /api/verificar/[cedula]
    ↓
¿Existe? → SÍ → Cargar datos (disabled)
         → NO → Formulario completo
    ↓
Selecciona Provincia → GET /api/ubicacion/distritos/[provincia]
Selecciona Distrito → GET /api/ubicacion/corregimientos/[distrito]
    ↓
Submit Formulario
    ↓
POST /api/capacitaciones/inscribirse/[capacitacion]
    ↓
Validaciones
    ↓
¿Estudiante existe? → NO → INSERT ciepi.estudiantes
                           → INSERT ciepi.estudiantes_ubicacion
                    → SÍ → Usar ID existente
    ↓
INSERT ciepi.inscripciones (estado = 1)
    ↓
Toast Success + Redirect /capacitaciones
```

## Troubleshooting

### Error: "Tabla no encontrada"

Ejecutar el SQL: `psql -f db/inscripciones.sql`

### Error: "provincia_id es null"

Verificar que existan registros en `ciepi.provincias`

### Los selects de ubicación no cargan

Verificar las rutas de API en el navegador:

- `/ciepi/api/ubicacion/provincias`
- `/ciepi/api/ubicacion/distritos/1`
- `/ciepi/api/ubicacion/corregimientos/1`

### Error: "Ya está inscrito"

Es correcto - el sistema previene inscripciones duplicadas
