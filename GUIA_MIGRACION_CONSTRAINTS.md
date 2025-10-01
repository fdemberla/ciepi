# Guía Rápida: Aplicar Constraints de Unicidad

## 🚀 Pasos para Aplicar la Migración

### 1. Verificar Pre-requisitos

Antes de aplicar los constraints, asegúrese de que no existan registros duplicados:

```powershell
# Conectarse a la base de datos
psql -U postgres -d ciepi_db

# Ejecutar consultas de verificación
```

```sql
-- Verificar duplicados de cédula
SELECT cedula, COUNT(*) as cantidad
FROM ciepi.estudiantes
GROUP BY cedula
HAVING COUNT(*) > 1;

-- Verificar duplicados de correo
SELECT correo, COUNT(*) as cantidad
FROM ciepi.estudiantes
WHERE correo IS NOT NULL
GROUP BY correo
HAVING COUNT(*) > 1;
```

**Si hay duplicados**: Deben resolverse manualmente antes de continuar.

---

### 2. Aplicar la Migración

```powershell
# Conectarse a PostgreSQL
psql -U postgres -d ciepi_db

# Ejecutar el script de migración
\i db/migrations/add_unique_constraints.sql
```

O ejecutar directamente los comandos SQL:

```sql
-- Agregar constraint UNIQUE a cedula
ALTER TABLE ciepi.estudiantes
ADD CONSTRAINT estudiantes_cedula_unique UNIQUE (cedula);

-- Agregar constraint UNIQUE a correo
ALTER TABLE ciepi.estudiantes
ADD CONSTRAINT estudiantes_correo_unique UNIQUE (correo);
```

---

### 3. Verificar la Migración

```sql
-- Verificar que los constraints fueron creados
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'ciepi.estudiantes'::regclass
AND contype = 'u';
```

**Resultado esperado**:

```
constraint_name            | constraint_type | definition
---------------------------+-----------------+---------------------------
estudiantes_cedula_unique  | u               | UNIQUE (cedula)
estudiantes_correo_unique  | u               | UNIQUE (correo)
```

---

### 4. Reiniciar la Aplicación

Después de aplicar los constraints, reinicie el servidor Next.js:

```powershell
# Si está corriendo, detener el servidor (Ctrl+C)
# Luego reiniciar
npm run dev
```

---

## ✅ Verificación de Funcionamiento

### Probar en el Frontend

1. **Abrir formulario de inscripción**:

   - Ir a `/capacitaciones`
   - Seleccionar una capacitación
   - Hacer clic en "Inscribirse"

2. **Probar validación de correo**:

   - Ingresar una cédula
   - En el campo de correo, ingresar un email que ya existe
   - Debe aparecer un mensaje de error en rojo

3. **Probar envío con correo duplicado**:
   - Intentar enviar el formulario con un correo duplicado
   - Debe aparecer un toast de error con mensaje específico

### Probar en el Backend

```powershell
# Probar endpoint de verificación de correo
curl -X POST http://localhost:3000/api/verificar/8-123-456 `
  -H "Content-Type: application/json" `
  -d '{"correo": "test@ejemplo.com"}'
```

---

## 🛠️ Troubleshooting

### Error: Relation "ciepi.estudiantes" does not exist

- **Causa**: La tabla no existe o el schema es incorrecto
- **Solución**: Verificar que la base de datos y el schema estén creados correctamente

### Error: Could not create unique index

- **Causa**: Existen registros duplicados
- **Solución**: Ejecutar las consultas de verificación y resolver duplicados manualmente

### Error: Constraint already exists

- **Causa**: Los constraints ya fueron aplicados anteriormente
- **Solución**: Verificar constraints existentes con la consulta de verificación

---

## 📚 Documentación Completa

Para más detalles sobre la implementación, consultar:

- **`CONSTRAINTS_UNICIDAD.md`** - Documentación completa
- **`db/migrations/add_unique_constraints.sql`** - Script de migración

---

## 🔄 Rollback (Si es Necesario)

Si necesita revertir los constraints:

```sql
-- Eliminar constraint de cédula
ALTER TABLE ciepi.estudiantes
DROP CONSTRAINT estudiantes_cedula_unique;

-- Eliminar constraint de correo
ALTER TABLE ciepi.estudiantes
DROP CONSTRAINT estudiantes_correo_unique;
```

---

## 📞 Soporte

Si encuentra problemas durante la migración:

1. Revisar los logs de PostgreSQL
2. Verificar que no existan duplicados
3. Consultar la documentación completa en `CONSTRAINTS_UNICIDAD.md`

---

**¡Listo!** Los constraints de unicidad están aplicados y funcionando. 🎉
