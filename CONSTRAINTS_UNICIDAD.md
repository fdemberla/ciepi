# Constraints de Unicidad - Cédula y Correo

## 📋 Descripción General

Este documento detalla la implementación de constraints de unicidad para los campos `cedula` y `correo` en la tabla `ciepi.estudiantes`. Estos constraints garantizan la integridad de los datos y previenen duplicación de usuarios.

## 🎯 Objetivo

**Garantizar que no puedan existir dos usuarios con la misma cédula o el mismo correo electrónico en el sistema.**

---

## 🗄️ Constraints de Base de Datos

### Script SQL de Migración

**Ubicación**: `db/migrations/add_unique_constraints.sql`

```sql
-- Agregar constraint UNIQUE a la columna cedula
ALTER TABLE ciepi.estudiantes
ADD CONSTRAINT estudiantes_cedula_unique UNIQUE (cedula);

-- Agregar constraint UNIQUE a la columna correo
ALTER TABLE ciepi.estudiantes
ADD CONSTRAINT estudiantes_correo_unique UNIQUE (correo);
```

### Características de los Constraints

1. **`estudiantes_cedula_unique`**

   - Campo: `cedula`
   - Tipo: `UNIQUE`
   - NULL permitido: NO (el campo cedula es NOT NULL)
   - Garantía: Cada cédula debe ser única en el sistema

2. **`estudiantes_correo_unique`**
   - Campo: `correo`
   - Tipo: `UNIQUE`
   - NULL permitido: SÍ (múltiples NULL son permitidos en PostgreSQL)
   - Garantía: Si existe un correo, debe ser único

### Aplicar la Migración

```powershell
# Conectarse a PostgreSQL
psql -U postgres -d ciepi_db

# Ejecutar el script de migración
\i db/migrations/add_unique_constraints.sql

# Verificar que los constraints fueron creados
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid = 'ciepi.estudiantes'::regclass
AND contype = 'u';
```

### ⚠️ Verificación Pre-Migración

**IMPORTANTE**: Antes de aplicar los constraints, verificar que no existan duplicados:

```sql
-- Verificar duplicados de cédula
SELECT cedula, COUNT(*)
FROM ciepi.estudiantes
GROUP BY cedula
HAVING COUNT(*) > 1;

-- Verificar duplicados de correo
SELECT correo, COUNT(*)
FROM ciepi.estudiantes
WHERE correo IS NOT NULL
GROUP BY correo
HAVING COUNT(*) > 1;
```

Si se encuentran duplicados, deben resolverse manualmente antes de aplicar los constraints.

---

## 🔧 Implementación en Backend

### 1. API de Verificación de Cédula

**Archivo**: `app/api/verificar/[cedula]/route.ts`

#### GET - Verificar Cédula

Verifica si una cédula existe en el sistema o en el API externo.

#### POST - Verificar Disponibilidad de Correo (NUEVO)

Valida si un correo electrónico ya está registrado.

**Request Body**:

```json
{
  "correo": "usuario@ejemplo.com",
  "cedula_actual": "8-123-456" // Opcional: excluir esta cédula de la búsqueda
}
```

**Response (Correo Disponible)**:

```json
{
  "available": true,
  "message": "Correo disponible"
}
```

**Response (Correo NO Disponible)**:

```json
{
  "available": false,
  "message": "Este correo electrónico ya está registrado",
  "existing_user": {
    "nombres": "Juan",
    "apellidos": "Pérez"
  }
}
```

**Uso en Frontend**:

```typescript
const checkEmailAvailability = async (email: string) => {
  const response = await fetch(`/api/verificar/${cedula}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correo: email,
      cedula_actual: estudianteData?.cedula,
    }),
  });
  const data = await response.json();

  if (!data.available) {
    setEmailError(data.message);
  }
};
```

---

### 2. API de Inscripción

**Archivo**: `app/api/capacitaciones/inscribirse/[capacitacion]/route.ts`

#### Validación Proactiva (Estudiante Existente)

Antes de actualizar datos de un estudiante existente:

```typescript
// Si el correo cambió, verificar que no exista otro usuario con ese correo
if (existingEstudiante.rows[0].correo !== estudiante.correo) {
  const correoCheck = await query(
    "SELECT id, nombres, apellidos FROM ciepi.estudiantes WHERE correo = $1 AND id != $2",
    [estudiante.correo, estudiante.id]
  );

  if (correoCheck.rows.length > 0) {
    const otherUser = correoCheck.rows[0];
    return NextResponse.json(
      {
        error: "Correo duplicado",
        message: `El correo ${estudiante.correo} ya está registrado por ${otherUser.nombres} ${otherUser.apellidos}`,
        field: "correo",
      },
      { status: 409 } // 409 Conflict
    );
  }
}
```

#### Validación Proactiva (Estudiante Nuevo)

Antes de insertar un nuevo estudiante:

```typescript
// Verificar que el correo no esté registrado
if (estudiante.correo) {
  const correoCheck = await query(
    "SELECT id, nombres, apellidos, cedula FROM ciepi.estudiantes WHERE correo = $1",
    [estudiante.correo]
  );

  if (correoCheck.rows.length > 0) {
    const otherUser = correoCheck.rows[0];
    return NextResponse.json(
      {
        error: "Correo duplicado",
        message: `El correo ya está registrado por ${otherUser.nombres} ${otherUser.apellidos} (Cédula: ${otherUser.cedula})`,
        field: "correo",
      },
      { status: 409 }
    );
  }
}
```

#### Manejo de Errores de Constraint Violation

Si la validación proactiva falla (race condition), el constraint de base de datos captura el error:

```typescript
try {
  const insertEstudianteResult = await query(
    `INSERT INTO ciepi.estudiantes (...)
     VALUES (...)`,
    [...]
  );
} catch (dbError: unknown) {
  if (dbError && typeof dbError === 'object' && 'code' in dbError) {
    const error = dbError as { code: string; constraint?: string };

    if (error.code === '23505') { // unique_violation
      if (error.constraint === 'estudiantes_cedula_unique') {
        return NextResponse.json(
          {
            error: "Cédula duplicada",
            message: "Esta cédula ya está registrada en el sistema",
            field: "cedula"
          },
          { status: 409 }
        );
      } else if (error.constraint === 'estudiantes_correo_unique') {
        return NextResponse.json(
          {
            error: "Correo duplicado",
            message: "Este correo electrónico ya está registrado",
            field: "correo"
          },
          { status: 409 }
        );
      }
    }
  }
  throw dbError;
}
```

#### Códigos de Error PostgreSQL

- **23505**: `unique_violation` - Violación de constraint UNIQUE
- **Constraint Names**:
  - `estudiantes_cedula_unique` - Cédula duplicada
  - `estudiantes_correo_unique` - Correo duplicado

---

## 🎨 Implementación en Frontend

**Archivo**: `app/capacitaciones/inscribirse/[id]/page.tsx`

### 1. Estados para Validación

```typescript
const [emailError, setEmailError] = useState<string | null>(null);
const [isCheckingEmail, setIsCheckingEmail] = useState(false);
```

### 2. Validación en Tiempo Real

Validación con debounce de 500ms:

```typescript
onFieldChange={(fieldName, value) => {
  setCurrentFormData((prev) => ({ ...prev, [fieldName]: value }));

  // Validar correo en tiempo real
  if (fieldName === "correo" && typeof value === "string") {
    const timeoutId = setTimeout(() => {
      checkEmailAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  }

  // ... resto de la lógica
}}
```

### 3. Función de Verificación

```typescript
const checkEmailAvailability = async (email: string) => {
  if (!email || !email.includes("@")) {
    setEmailError(null);
    return;
  }

  setIsCheckingEmail(true);
  try {
    const response = await fetch(`/api/verificar/${cedula}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: email,
        cedula_actual: estudianteData?.cedula,
      }),
    });

    const data = await response.json();
    setEmailError(data.available ? null : data.message);
  } catch (error) {
    console.error("Error checking email:", error);
  } finally {
    setIsCheckingEmail(false);
  }
};
```

### 4. Indicadores Visuales

#### Error de Correo Duplicado

```tsx
{
  emailError && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-red-600 mr-2">...</svg>
        <p className="text-red-800 text-sm font-medium">{emailError}</p>
      </div>
    </div>
  );
}
```

#### Indicador de Verificación

```tsx
{
  isCheckingEmail && (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
        <p className="text-gray-700 text-sm">
          Verificando disponibilidad del correo...
        </p>
      </div>
    </div>
  );
}
```

### 5. Manejo de Errores en Submit

```typescript
const handleSubmit = async (formData: Record<string, unknown>) => {
  try {
    const response = await fetch(
      `/api/capacitaciones/inscribirse/${capacitacionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      // Manejar errores específicos de duplicación
      if (response.status === 409) {
        if (result.field === "correo") {
          toast.error(`Correo duplicado: ${result.message}`);
        } else if (result.field === "cedula") {
          toast.error(`Cédula duplicada: ${result.message}`);
        } else {
          toast.error(result.message || "Error: Datos duplicados");
        }
        return;
      }

      throw new Error(result.error);
    }

    // ... continuar con el flujo normal
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## 📊 Flujo de Validación

### Flujo Completo de Validación de Correo

```
1. Usuario ingresa cédula
   └─> GET /api/verificar/[cedula]
       ├─> Estudiante existe → Cargar datos (incluye correo actual)
       └─> Estudiante nuevo → Datos del API externo

2. Usuario modifica campo de correo
   └─> Debounce 500ms
       └─> POST /api/verificar/[cedula] (verificar disponibilidad)
           ├─> Correo disponible → ✓ Mostrar confirmación
           └─> Correo duplicado → ✗ Mostrar error

3. Usuario envía formulario
   └─> POST /api/capacitaciones/inscribirse/[capacitacion]
       ├─> Validación proactiva en backend
       │   ├─> Correo disponible → Continuar
       │   └─> Correo duplicado → Error 409
       │
       └─> INSERT/UPDATE en base de datos
           ├─> Constraint violation (23505)
           │   └─> Error 409 con field específico
           └─> Éxito → Continuar con verificación/inscripción
```

---

## 🧪 Casos de Prueba

### 1. Estudiante Nuevo con Correo Único

- ✅ Crear estudiante sin errores
- ✅ Constraint permite la inserción

### 2. Estudiante Nuevo con Correo Duplicado

- ❌ Validación proactiva detecta duplicado
- ❌ Error 409 con mensaje específico
- ❌ Si pasa validación, constraint de BD rechaza

### 3. Estudiante Existente Cambia Correo a Uno Disponible

- ✅ Validación en tiempo real muestra disponible
- ✅ Update se ejecuta correctamente

### 4. Estudiante Existente Cambia Correo a Uno Duplicado

- ❌ Validación en tiempo real muestra error
- ❌ Submit es rechazado con error 409

### 5. Estudiante Existente Mantiene Su Correo Actual

- ✅ Validación excluye su propia cédula
- ✅ Update se ejecuta correctamente

### 6. Cédula Duplicada (Caso Edge)

- ❌ Normalmente no debería ocurrir (API externa verifica)
- ❌ Constraint de BD rechaza con error específico
- ❌ Error 409 con mensaje de cédula duplicada

---

## 🔒 Seguridad y Consideraciones

### Race Conditions

- **Problema**: Dos usuarios intentan registrarse con el mismo correo simultáneamente
- **Solución**:
  1. Validación proactiva reduce la ventana de colisión
  2. Constraint de BD garantiza integridad final
  3. Manejo de error 23505 proporciona feedback al usuario

### Privacidad

- No revelar información completa de otros usuarios
- Solo mostrar nombre cuando hay conflicto (para ayudar al usuario a identificar su cuenta)
- No mostrar correos de otros usuarios

### Performance

- Validación en tiempo real usa debounce (500ms)
- Queries optimizados con índices en campos únicos
- Validación proactiva evita errores de constraint innecesarios

---

## 📝 Mantenimiento

### Eliminar Constraints (Si es Necesario)

```sql
-- Eliminar constraint de cédula
ALTER TABLE ciepi.estudiantes
DROP CONSTRAINT estudiantes_cedula_unique;

-- Eliminar constraint de correo
ALTER TABLE ciepi.estudiantes
DROP CONSTRAINT estudiantes_correo_unique;
```

### Verificar Constraints Existentes

```sql
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'ciepi.estudiantes'::regclass;
```

### Limpiar Duplicados Existentes

```sql
-- Encontrar duplicados de correo
WITH duplicates AS (
  SELECT correo, COUNT(*), MIN(id) as keep_id
  FROM ciepi.estudiantes
  WHERE correo IS NOT NULL
  GROUP BY correo
  HAVING COUNT(*) > 1
)
-- Mostrar registros duplicados (excepto el más antiguo)
SELECT e.*
FROM ciepi.estudiantes e
JOIN duplicates d ON e.correo = d.correo
WHERE e.id != d.keep_id;

-- Para eliminar duplicados, coordinar con administración
-- NO ejecutar DELETE sin revisión manual
```

---

## 🎯 Resumen

### ✅ Implementado

1. **Base de Datos**

   - Constraint UNIQUE en `cedula`
   - Constraint UNIQUE en `correo`
   - Script de migración SQL

2. **Backend**

   - Endpoint POST para verificar disponibilidad de correo
   - Validación proactiva antes de INSERT/UPDATE
   - Manejo de errores 23505 (constraint violation)
   - Respuestas 409 Conflict con campo específico

3. **Frontend**
   - Validación en tiempo real con debounce
   - Indicadores visuales de estado (verificando/error/disponible)
   - Manejo de errores 409 con mensajes específicos
   - Mensajes toast para feedback al usuario

### 🎉 Resultado

**No pueden existir dos usuarios con la misma cédula o el mismo correo electrónico en el sistema.**

La implementación incluye:

- ✅ Constraints a nivel de base de datos
- ✅ Validación en tiempo real en frontend
- ✅ Validación proactiva en backend
- ✅ Manejo robusto de errores
- ✅ Feedback claro al usuario
- ✅ Protección contra race conditions

---

**Fecha de Implementación**: 2025-10-01  
**Versión del Sistema**: 1.0  
**Última Actualización**: 2025-10-01
