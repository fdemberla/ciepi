# 🧪 Pruebas Manuales - Constraints de Unicidad

## Objetivo

Verificar que los constraints de unicidad funcionan correctamente en todos los escenarios.

---

## Pre-requisitos

1. ✅ Migración SQL aplicada
2. ✅ Servidor Next.js corriendo (`npm run dev`)
3. ✅ Base de datos PostgreSQL activa
4. ✅ Al menos un estudiante de prueba en la BD

---

## 🔍 Conjunto de Pruebas

### Test 1: Verificar Constraints en Base de Datos

**Objetivo**: Confirmar que los constraints fueron creados correctamente

**Pasos**:

```sql
-- Conectarse a la base de datos
psql -U postgres -d ciepi_db

-- Verificar constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'ciepi.estudiantes'::regclass
AND contype = 'u';
```

**Resultado Esperado**:

```
constraint_name            | constraint_type | definition
---------------------------+-----------------+------------------
estudiantes_cedula_unique  | u               | UNIQUE (cedula)
estudiantes_correo_unique  | u               | UNIQUE (correo)
```

✅ **Criterio de Éxito**: Ambos constraints aparecen en la lista

---

### Test 2: Validación en Tiempo Real - Correo Disponible

**Objetivo**: Verificar que la validación en tiempo real funciona con correos nuevos

**Pasos**:

1. Abrir navegador en `http://localhost:3000/capacitaciones`
2. Seleccionar cualquier capacitación
3. Click en "Inscribirse"
4. Ingresar una cédula que NO exista (ej: `8-999-9999`)
5. Esperar a que cargue el formulario
6. En el campo "Correo Electrónico", ingresar: `nuevo.correo.test@ejemplo.com`
7. Esperar 1 segundo

**Resultado Esperado**:

- ⏳ Aparece brevemente "Verificando disponibilidad del correo..."
- ✅ El mensaje desaparece (no hay error)
- ✅ No hay banner rojo de error

✅ **Criterio de Éxito**: No hay mensajes de error

---

### Test 3: Validación en Tiempo Real - Correo Duplicado

**Objetivo**: Verificar que la validación detecta correos duplicados

**Preparación**:

```sql
-- Insertar un estudiante de prueba
INSERT INTO ciepi.estudiantes (cedula, nombres, apellidos, nombre_cedula, correo)
VALUES ('8-TEST-001', 'Juan', 'Prueba', 'Juan Prueba', 'duplicado@ejemplo.com');
```

**Pasos**:

1. Abrir navegador en `http://localhost:3000/capacitaciones`
2. Seleccionar cualquier capacitación
3. Click en "Inscribirse"
4. Ingresar una cédula DIFERENTE (ej: `8-999-8888`)
5. Esperar a que cargue el formulario
6. En el campo "Correo Electrónico", ingresar: `duplicado@ejemplo.com`
7. Esperar 1 segundo

**Resultado Esperado**:

- ⏳ Aparece brevemente "Verificando disponibilidad del correo..."
- ❌ Aparece banner rojo con mensaje: "Este correo electrónico ya está registrado"

✅ **Criterio de Éxito**: Mensaje de error aparece claramente

---

### Test 4: Validación Backend - Correo Duplicado en Submit

**Objetivo**: Verificar que el backend rechaza correos duplicados

**Preparación**: Mismo estudiante de prueba del Test 3

**Pasos**:

1. Abrir navegador en `http://localhost:3000/capacitaciones`
2. Seleccionar capacitación activa
3. Click en "Inscribirse"
4. Ingresar cédula: `8-999-7777`
5. Completar todos los campos EXCEPTO correo
6. En campo correo, pegar rápidamente (bypass validación): `duplicado@ejemplo.com`
7. Click inmediato en "Completar Inscripción" (antes de 500ms)

**Resultado Esperado**:

- 🔄 Aparece spinner de carga
- ❌ Aparece toast de error rojo arriba-derecha: "Correo duplicado: El correo duplicado@ejemplo.com ya está registrado por Juan Prueba (Cédula: 8-TEST-001)"
- ⏹️ El formulario permanece abierto

✅ **Criterio de Éxito**: Toast con mensaje específico aparece

---

### Test 5: Constraint de Base de Datos - Correo Duplicado

**Objetivo**: Verificar que el constraint de BD rechaza duplicados

**Pasos**:

```sql
-- Conectarse a la base de datos
psql -U postgres -d ciepi_db

-- Intentar insertar correo duplicado directamente
INSERT INTO ciepi.estudiantes (cedula, nombres, apellidos, nombre_cedula, correo)
VALUES ('8-TEST-002', 'Maria', 'Prueba', 'Maria Prueba', 'duplicado@ejemplo.com');
```

**Resultado Esperado**:

```
ERROR:  duplicate key value violates unique constraint "estudiantes_correo_unique"
DETAIL:  Key (correo)=(duplicado@ejemplo.com) already exists.
```

✅ **Criterio de Éxito**: Error de constraint violation

---

### Test 6: Estudiante Existente Cambia Su Propio Correo

**Objetivo**: Verificar que un usuario puede mantener su correo actual

**Preparación**:

```sql
-- Crear estudiante con correo
INSERT INTO ciepi.estudiantes (cedula, nombres, apellidos, nombre_cedula, correo, correo_verificado, fecha_nacimiento)
VALUES ('8-TEST-003', 'Pedro', 'Lopez', 'Pedro Lopez', 'pedro@ejemplo.com', false, '1990-01-01');
```

**Pasos**:

1. Abrir `http://localhost:3000/capacitaciones`
2. Seleccionar capacitación
3. Click en "Inscribirse"
4. Ingresar cédula: `8-TEST-003`
5. Click "Verificar Cédula"
6. Ingresar fecha de nacimiento: `01/01/1990`
7. Click "Confirmar"
8. El campo correo muestra: `pedro@ejemplo.com`
9. Modificar teléfono u otro campo
10. NO modificar el correo
11. Click "Completar Inscripción"

**Resultado Esperado**:

- ✅ No hay error de correo duplicado
- ✅ El formulario se envía correctamente
- ✅ Aparece correo de verificación

✅ **Criterio de Éxito**: Actualización exitosa sin error

---

### Test 7: Estudiante Existente Cambia a Correo de Otro Usuario

**Objetivo**: Verificar que no se puede cambiar a correo duplicado

**Preparación**: Usar estudiantes del Test 3 y Test 6

**Pasos**:

1. Abrir `http://localhost:3000/capacitaciones`
2. Seleccionar capacitación
3. Click en "Inscribirse"
4. Ingresar cédula: `8-TEST-003` (Pedro)
5. Confirmar fecha de nacimiento
6. El campo correo muestra: `pedro@ejemplo.com`
7. Cambiar correo a: `duplicado@ejemplo.com` (de Juan)
8. Esperar 1 segundo

**Resultado Esperado**:

- ❌ Aparece banner rojo: "Este correo electrónico ya está registrado"
- ❌ Si intenta enviar: Toast de error específico

✅ **Criterio de Éxito**: Validación detecta el conflicto

---

### Test 8: Constraint de Base de Datos - Cédula Duplicada

**Objetivo**: Verificar que el constraint de cédula funciona

**Pasos**:

```sql
-- Conectarse a la base de datos
psql -U postgres -d ciepi_db

-- Intentar insertar cédula duplicada
INSERT INTO ciepi.estudiantes (cedula, nombres, apellidos, nombre_cedula, correo)
VALUES ('8-TEST-001', 'Maria', 'Diferente', 'Maria Diferente', 'maria@ejemplo.com');
```

**Resultado Esperado**:

```
ERROR:  duplicate key value violates unique constraint "estudiantes_cedula_unique"
DETAIL:  Key (cedula)=(8-TEST-001) already exists.
```

✅ **Criterio de Éxito**: Error de constraint violation

---

### Test 9: API Endpoint - Verificar Correo Disponible

**Objetivo**: Probar endpoint POST directamente

**Pasos**:

```powershell
# Verificar correo que NO existe
curl -X POST http://localhost:3000/api/verificar/8-999-9999 `
  -H "Content-Type: application/json" `
  -d '{"correo": "nuevo@ejemplo.com"}'
```

**Resultado Esperado**:

```json
{
  "available": true,
  "message": "Correo disponible"
}
```

✅ **Criterio de Éxito**: Response indica disponible

---

### Test 10: API Endpoint - Verificar Correo Duplicado

**Objetivo**: Probar endpoint POST con correo existente

**Pasos**:

```powershell
# Verificar correo que SÍ existe
curl -X POST http://localhost:3000/api/verificar/8-999-9999 `
  -H "Content-Type: application/json" `
  -d '{"correo": "duplicado@ejemplo.com"}'
```

**Resultado Esperado**:

```json
{
  "available": false,
  "message": "Este correo electrónico ya está registrado",
  "existing_user": {
    "nombres": "Juan",
    "apellidos": "Prueba"
  }
}
```

✅ **Criterio de Éxito**: Response indica no disponible con info de usuario

---

### Test 11: Race Condition Simulado

**Objetivo**: Verificar protección contra race conditions

**Preparación**: Abrir 2 ventanas del navegador

**Pasos**:

1. **Ventana 1**: Abrir formulario de inscripción con cédula `8-RACE-001`
2. **Ventana 2**: Abrir formulario de inscripción con cédula `8-RACE-002`
3. **Ambas**: Completar formulario con correo `race@ejemplo.com`
4. **Ambas**: Click "Completar Inscripción" AL MISMO TIEMPO

**Resultado Esperado**:

- ✅ Una ventana: Éxito
- ❌ Otra ventana: Error de correo duplicado

✅ **Criterio de Éxito**: Solo UNA inscripción exitosa, constraint protege

---

### Test 12: Validación Excluye Cédula Actual

**Objetivo**: Verificar que la validación excluye correctamente al usuario actual

**Pasos**:

```powershell
# Verificar correo del propio usuario
curl -X POST http://localhost:3000/api/verificar/8-TEST-003 `
  -H "Content-Type: application/json" `
  -d '{"correo": "pedro@ejemplo.com", "cedula_actual": "8-TEST-003"}'
```

**Resultado Esperado**:

```json
{
  "available": true,
  "message": "Correo disponible"
}
```

✅ **Criterio de Éxito**: El correo es considerado disponible (es del mismo usuario)

---

## 📊 Matriz de Resultados

| #   | Test                       | Estado | Notas |
| --- | -------------------------- | ------ | ----- |
| 1   | Constraints en BD          | ⬜     |       |
| 2   | Validación RT - Disponible | ⬜     |       |
| 3   | Validación RT - Duplicado  | ⬜     |       |
| 4   | Backend - Duplicado Submit | ⬜     |       |
| 5   | Constraint BD - Correo     | ⬜     |       |
| 6   | Usuario - Mismo Correo     | ⬜     |       |
| 7   | Usuario - Correo Otro      | ⬜     |       |
| 8   | Constraint BD - Cédula     | ⬜     |       |
| 9   | API - Correo Disponible    | ⬜     |       |
| 10  | API - Correo Duplicado     | ⬜     |       |
| 11  | Race Condition             | ⬜     |       |
| 12  | Excluir Cédula Actual      | ⬜     |       |

**Leyenda**: ⬜ No probado | ✅ Pasó | ❌ Falló

---

## 🧹 Limpieza Después de Pruebas

```sql
-- Eliminar datos de prueba
DELETE FROM ciepi.estudiantes WHERE cedula LIKE '8-TEST-%';
DELETE FROM ciepi.estudiantes WHERE cedula LIKE '8-RACE-%';
DELETE FROM ciepi.estudiantes WHERE cedula = '8-999-9999';
DELETE FROM ciepi.estudiantes WHERE cedula = '8-999-8888';
DELETE FROM ciepi.estudiantes WHERE cedula = '8-999-7777';
```

---

## 📝 Reporte de Bugs

Si encuentra un bug durante las pruebas:

**Template de Reporte**:

```
Test #: [número]
Descripción: [qué salió mal]
Pasos para Reproducir:
1. [paso 1]
2. [paso 2]
3. [paso 3]

Resultado Esperado: [qué debería pasar]
Resultado Actual: [qué pasó]
Logs de Consola: [si aplica]
Error de Backend: [si aplica]
```

---

## ✅ Checklist Final

Antes de considerar la implementación completa:

- [ ] Todos los tests pasaron
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs del servidor
- [ ] Constraints verificados en base de datos
- [ ] Documentación revisada
- [ ] Datos de prueba eliminados

---

**Fecha de Pruebas**: ******\_\_\_******  
**Probado por**: ******\_\_\_******  
**Resultado General**: ⬜ Aprobado | ⬜ Con observaciones | ⬜ Rechazado
