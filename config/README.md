# Configuración de Navegación

Este directorio contiene la configuración centralizada del sistema de navegación del sitio.

## 📁 Archivos

- `navigation.ts` - Configuración de todos los enlaces de navegación del sitio

## 🚀 Cómo agregar una nueva página

### 1. Página pública (visible para todos)

Agrega un nuevo objeto en la primera sección de `navigation.ts`:

```typescript
{
  name: "Mi Nueva Página",
  href: "/mi-pagina",
  icon: "solar:document-linear", // Busca íconos en https://icon-sets.iconify.design/solar/
  visible: {
    public: true,        // ✅ Visible sin iniciar sesión
    authenticated: true, // ✅ Visible con sesión iniciada
    admin: true,        // ✅ Visible para administradores
    mobile: true,       // ✅ Visible en móvil
    desktop: true,      // ✅ Visible en desktop
  },
}
```

### 2. Página de administración

Agrega un nuevo objeto en la sección "Administración":

```typescript
{
  name: "Gestión de Usuarios",
  href: "/admin/usuarios",
  icon: "solar:users-group-rounded-linear",
  visible: {
    admin: true,   // ✅ Solo administradores
    mobile: true,  // ✅ Visible en móvil
    desktop: true, // ✅ Visible en desktop
  },
}
```

### 3. Página solo para usuarios autenticados (no admin)

```typescript
{
  name: "Mi Perfil",
  href: "/perfil",
  icon: "solar:user-circle-linear",
  visible: {
    authenticated: true, // ✅ Solo usuarios con sesión
    mobile: true,
    desktop: true,
  },
}
```

### 4. Página solo visible en móvil

```typescript
{
  name: "App Móvil",
  href: "/app-movil",
  icon: "solar:smartphone-linear",
  visible: {
    public: true,
    authenticated: true,
    admin: true,
    mobile: true,   // ✅ Solo móvil
    desktop: false, // ❌ Oculto en desktop
  },
}
```

## 🎨 Encontrar íconos

Todos los íconos provienen de la colección **Solar** de Iconify:

1. Visita: https://icon-sets.iconify.design/solar/
2. Busca el ícono que necesitas
3. Copia el nombre (ej: `solar:home-2-linear`)
4. Úsalo en el campo `icon`

### Íconos comunes:

| Uso            | Ícono                      |
| -------------- | -------------------------- |
| Inicio         | `solar:home-2-linear`      |
| Usuario        | `solar:user-circle-linear` |
| Configuración  | `solar:settings-linear`    |
| Documentos     | `solar:document-linear`    |
| Calendario     | `solar:calendar-linear`    |
| Chat           | `solar:chat-round-linear`  |
| Notificaciones | `solar:bell-linear`        |
| Búsqueda       | `solar:magnifer-linear`    |
| Estadísticas   | `solar:chart-linear`       |
| Base de datos  | `solar:database-linear`    |

## 🔒 Permisos de visibilidad

### `public`

- `true`: Visible para usuarios SIN iniciar sesión
- `false` o no definido: Oculto para usuarios sin sesión

### `authenticated`

- `true`: Visible para usuarios CON sesión (no admin)
- `false` o no definido: Oculto para usuarios regulares

### `admin`

- `true`: Visible para administradores
- `false` o no definido: Oculto para administradores

### `mobile`

- `true`: Visible en dispositivos móviles (< 1024px)
- `false`: Oculto en móvil

### `desktop`

- `true`: Visible en desktop (>= 1024px)
- `false`: Oculto en desktop

## 📱 Secciones

Puedes agrupar enlaces en secciones. Las secciones se muestran con un título en el menú móvil:

```typescript
{
  title: "Mi Sección", // Título visible en móvil
  requiresAdmin: true, // Toda la sección requiere admin
  links: [
    // ... tus enlaces aquí
  ],
}
```

## 🔄 Renderizado automático

El componente `Navbar` automáticamente:

1. ✅ Filtra los enlaces según permisos del usuario
2. ✅ Filtra según el dispositivo (móvil/desktop)
3. ✅ Agrupa enlaces de admin en un dropdown
4. ✅ Muestra títulos de sección en móvil
5. ✅ Cierra menús al navegar

**No necesitas modificar `Navbar.tsx` para agregar nuevos enlaces**, solo edita `navigation.ts`.

## 💡 Ejemplos completos

### Ejemplo: Página de "Acerca de" pública

```typescript
// En la primera sección de navigationConfig
{
  name: "Acerca de",
  href: "/acerca",
  icon: "solar:info-circle-linear",
  visible: {
    public: true,
    authenticated: true,
    admin: true,
    mobile: true,
    desktop: true,
  },
}
```

### Ejemplo: Dashboard de admin

```typescript
// En la sección "Administración"
{
  name: "Dashboard",
  href: "/admin/dashboard",
  icon: "solar:chart-linear",
  visible: {
    admin: true,
    mobile: true,
    desktop: true,
  },
}
```

### Ejemplo: Nueva sección completa

```typescript
{
  title: "Recursos",
  links: [
    {
      name: "Biblioteca",
      href: "/recursos/biblioteca",
      icon: "solar:book-linear",
      visible: {
        authenticated: true,
        mobile: true,
        desktop: true,
      },
    },
    {
      name: "Videos",
      href: "/recursos/videos",
      icon: "solar:videocamera-record-linear",
      visible: {
        authenticated: true,
        mobile: true,
        desktop: true,
      },
    },
  ],
}
```

## 🎯 Mejores prácticas

1. **Orden lógico**: Organiza los enlaces del más general al más específico
2. **Íconos consistentes**: Usa íconos de la misma familia (Solar)
3. **Nombres claros**: Usa nombres descriptivos y concisos
4. **Permisos mínimos**: Solo otorga los permisos necesarios
5. **Prueba en móvil**: Verifica que los enlaces se vean bien en ambas vistas

## 🐛 Solución de problemas

**Problema**: El enlace no aparece

- ✅ Verifica los permisos de visibilidad
- ✅ Verifica que el usuario tenga el rol correcto
- ✅ Revisa que `mobile`/`desktop` estén configurados correctamente

**Problema**: El ícono no se muestra

- ✅ Verifica que el nombre del ícono sea correcto (incluye `solar:`)
- ✅ Busca el ícono en https://icon-sets.iconify.design/solar/

**Problema**: El enlace aparece en el lugar incorrecto

- ✅ Revisa en qué sección lo agregaste
- ✅ Las secciones con `requiresAdmin: true` se agrupan en un dropdown
