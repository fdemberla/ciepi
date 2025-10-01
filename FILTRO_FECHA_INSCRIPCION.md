# 📅 Filtro de Capacitaciones por Fecha de Inscripción

## 🎯 Objetivo

Evitar que se muestren capacitaciones cuyo período de inscripción ya ha finalizado en el listado público de capacitaciones.

---

## ✅ Implementación

### Ubicación

**Archivo**: `app/api/capacitaciones/route.ts`  
**Endpoint**: `GET /api/capacitaciones`

---

## 🔍 Lógica del Filtro

### Condición por Defecto

El API ahora filtra automáticamente las capacitaciones para mostrar solo aquellas cuya inscripción sigue abierta:

```sql
WHERE (fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())
```

### Casos Cubiertos

#### ✅ Capacitación SIN fecha final de inscripción

```sql
fecha_final_inscripcion IS NULL
```

**Resultado**: ✅ Se muestra (inscripción abierta indefinidamente)

#### ✅ Capacitación CON fecha final FUTURA

```sql
fecha_final_inscripcion >= NOW()
```

**Ejemplo**:

- Fecha actual: `2025-10-01 10:00:00`
- Fecha final inscripción: `2025-10-15 23:59:59`
- **Resultado**: ✅ Se muestra (inscripción abierta hasta el 15 de octubre)

#### ❌ Capacitación CON fecha final PASADA

```sql
fecha_final_inscripcion < NOW()
```

**Ejemplo**:

- Fecha actual: `2025-10-01 10:00:00`
- Fecha final inscripción: `2025-09-30 23:59:59`
- **Resultado**: ❌ NO se muestra (inscripción cerrada)

---

## 🔧 Implementación Técnica

### Antes (Sin Filtro)

```typescript
let queryText = `
  SELECT * FROM ciepi.capacitaciones
`;

if (activo !== null) {
  queryText += ` WHERE activo = $1`;
}
```

**Problema**: Mostraba todas las capacitaciones, incluso las expiradas.

---

### Después (Con Filtro)

```typescript
let queryText = `
  SELECT * FROM ciepi.capacitaciones
`;

const params: unknown[] = [];
const conditions: string[] = [];

// Por defecto, solo mostrar capacitaciones con inscripción vigente
conditions.push(
  `(fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())`
);

// Filter by activo if parameter is provided
if (activo !== null) {
  const isActivo = activo === "true" || activo === "1";
  params.push(isActivo);
  conditions.push(`activo = $${params.length}`);
}

// Agregar condiciones al query
if (conditions.length > 0) {
  queryText += ` WHERE ${conditions.join(" AND ")}`;
}
```

**Solución**: Solo muestra capacitaciones con inscripción vigente + filtro de activo si se especifica.

---

## 📊 Ejemplos de Queries Generados

### Caso 1: Sin parámetros

**Request**: `GET /api/capacitaciones`

**Query SQL**:

```sql
SELECT * FROM ciepi.capacitaciones
WHERE (fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())
ORDER BY fecha_creacion DESC
```

**Resultado**: Todas las capacitaciones con inscripción vigente (activas o inactivas).

---

### Caso 2: Con filtro activo=true

**Request**: `GET /api/capacitaciones?activo=true`

**Query SQL**:

```sql
SELECT * FROM ciepi.capacitaciones
WHERE (fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())
  AND activo = true
ORDER BY fecha_creacion DESC
```

**Resultado**: Solo capacitaciones activas con inscripción vigente.

---

### Caso 3: Con filtro activo=false

**Request**: `GET /api/capacitaciones?activo=false`

**Query SQL**:

```sql
SELECT * FROM ciepi.capacitaciones
WHERE (fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())
  AND activo = false
ORDER BY fecha_creacion DESC
```

**Resultado**: Solo capacitaciones inactivas con inscripción vigente (caso raro, pero cubierto).

---

## 🎯 Casos de Uso

### Escenario 1: Usuario Público Busca Capacitaciones

**Situación**:

- Fecha actual: 1 de octubre de 2025
- Base de datos tiene 5 capacitaciones:

| ID  | Nombre       | Fecha Final Inscripción | Activo |
| --- | ------------ | ----------------------- | ------ |
| 1   | Excel Básico | 2025-09-25              | true   |
| 2   | PowerPoint   | 2025-10-15              | true   |
| 3   | Word         | NULL                    | true   |
| 4   | Access       | 2025-10-20              | false  |
| 5   | Outlook      | 2025-09-30              | true   |

**Request**: `GET /api/capacitaciones?activo=true`

**Capacitaciones Mostradas**:

- ✅ PowerPoint (fecha futura + activo)
- ✅ Word (NULL + activo)
- ❌ Excel Básico (fecha pasada)
- ❌ Access (inactivo)
- ❌ Outlook (fecha pasada)

**Total**: 2 capacitaciones

---

### Escenario 2: Administrador Quiere Ver Todas

**Nota**: Para el panel de administración, se debería crear un endpoint diferente sin este filtro, por ejemplo:

```
GET /api/admin/capacitaciones
```

Que NO aplique el filtro de fecha y muestre todas las capacitaciones.

---

## ⚠️ Consideraciones Importantes

### 1. Zona Horaria

La función `NOW()` de PostgreSQL usa la zona horaria del servidor. Asegurarse de que esté configurada correctamente:

```sql
-- Verificar zona horaria
SHOW timezone;

-- Configurar zona horaria de Panamá (si es necesario)
SET timezone = 'America/Panama';
```

### 2. Hora Límite del Día

Si `fecha_final_inscripcion` es `2025-10-15`, idealmente debería ser `2025-10-15 23:59:59` para permitir inscripciones todo el día 15.

**Recomendación**: Al crear/editar capacitaciones, establecer la hora a 23:59:59:

```sql
fecha_final_inscripcion = '2025-10-15 23:59:59'
```

### 3. Capacitaciones Sin Fecha Final

Las capacitaciones con `fecha_final_inscripcion = NULL` siempre se mostrarán. Esto es útil para:

- Capacitaciones permanentes
- Capacitaciones en desarrollo (antes de definir fechas)

### 4. Caché del Frontend

Si el frontend tiene caché de capacitaciones, puede mostrar capacitaciones expiradas hasta que se refresque. Considerar:

- Invalidar caché después de medianoche
- Usar `Cache-Control` headers apropiados

---

## 🧪 Pruebas

### Test 1: Capacitación Sin Fecha Final

```sql
-- Crear capacitación sin fecha final
INSERT INTO ciepi.capacitaciones (nombre, activo, fecha_final_inscripcion)
VALUES ('Test Sin Fecha', true, NULL);

-- Request
GET /api/capacitaciones?activo=true

-- Resultado Esperado
✅ Debe aparecer "Test Sin Fecha"
```

---

### Test 2: Capacitación Con Fecha Futura

```sql
-- Crear capacitación con fecha futura
INSERT INTO ciepi.capacitaciones (nombre, activo, fecha_final_inscripcion)
VALUES ('Test Futuro', true, NOW() + INTERVAL '7 days');

-- Request
GET /api/capacitaciones?activo=true

-- Resultado Esperado
✅ Debe aparecer "Test Futuro"
```

---

### Test 3: Capacitación Con Fecha Pasada

```sql
-- Crear capacitación con fecha pasada
INSERT INTO ciepi.capacitaciones (nombre, activo, fecha_final_inscripcion)
VALUES ('Test Pasado', true, NOW() - INTERVAL '1 day');

-- Request
GET /api/capacitaciones?activo=true

-- Resultado Esperado
❌ NO debe aparecer "Test Pasado"
```

---

### Test 4: Verificar Query Generado

```typescript
// En el código, agregar console.log
console.log("📊 [Query]:", queryText, params);

// Output esperado
📊 [Query]: SELECT ... WHERE (fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW()) AND activo = $1 []
```

---

## 📈 Impacto

### Antes

- ❌ Usuarios veían capacitaciones expiradas
- ❌ Confusión al intentar inscribirse
- ❌ Experiencia de usuario pobre

### Después

- ✅ Solo se muestran capacitaciones con inscripción abierta
- ✅ Mejor experiencia de usuario
- ✅ Menos confusión
- ✅ Más profesional

---

## 🔄 Futuras Mejoras

### 1. Endpoint para Administración

Crear endpoint separado para el panel de administración:

```typescript
// app/api/admin/capacitaciones/route.ts
export async function GET(request: NextRequest) {
  // Sin filtro de fecha - muestra todas
  let queryText = `SELECT * FROM ciepi.capacitaciones`;

  if (activo !== null) {
    queryText += ` WHERE activo = $1`;
  }

  // ...
}
```

### 2. Parámetro para Incluir Expiradas

Agregar parámetro opcional para incluir expiradas:

```typescript
const includeExpired = searchParams.get("include_expired");

if (includeExpired !== "true") {
  conditions.push(
    `(fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())`
  );
}
```

**Uso**:

```
GET /api/capacitaciones?include_expired=true
```

### 3. Filtro por Rango de Fechas

Permitir buscar capacitaciones en un rango específico:

```typescript
const startDate = searchParams.get("start_date");
const endDate = searchParams.get("end_date");

if (startDate && endDate) {
  conditions.push(
    `fecha_final_inscripcion BETWEEN $${params.length + 1} AND $${
      params.length + 2
    }`
  );
  params.push(startDate, endDate);
}
```

---

## 📝 Resumen

### ✅ Implementado

- Filtro automático por fecha de inscripción
- Solo muestra capacitaciones con inscripción vigente
- Compatible con filtro de `activo`
- Maneja NULL (inscripción abierta indefinidamente)

### 🎯 Resultado

**Los usuarios solo ven capacitaciones a las que realmente pueden inscribirse.**

---

**Fecha de Implementación**: 2025-10-01  
**Endpoint**: `GET /api/capacitaciones`  
**Estado**: ✅ Completado
