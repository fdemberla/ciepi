# Páginas de Verificación de Correo

Documentación de las páginas de usuario para el sistema de verificación de correo electrónico.

## Páginas Creadas

### 1. `/app/verificacion/[token]/page.tsx`

Página donde llega el usuario al hacer clic en el enlace del correo de verificación.

### 2. `/app/verificacion/esperando/[token]/page.tsx`

Página de espera con polling automático que verifica el estado del token cada 3 segundos.

---

## Página de Verificación (`/verificacion/[token]`)

### Descripción

Esta página se carga cuando el usuario hace clic en el enlace de verificación que recibió por correo.

### Estados de la Página

#### 1. **Loading** (Cargando)

- Muestra un spinner animado
- Realiza la validación del token automáticamente
- Duración: 1-2 segundos

#### 2. **Success** (Éxito)

- ✅ Icono de check verde
- Muestra mensaje de éxito
- Muestra datos del estudiante (nombre, correo)
- Redirección automática a `/capacitaciones` después de 3 segundos
- Toast notification de éxito

#### 3. **Expired** (Expirado)

- ⏰ Icono de reloj naranja
- Mensaje: "Enlace Expirado"
- Botón para reenviar correo de verificación
- Al reenviar, redirige a página de espera con nuevo token

#### 4. **Already Used** (Ya Usado)

- ℹ️ Icono de información azul
- Mensaje: "Enlace Ya Utilizado"
- Indica que el correo ya está verificado
- Botón para ir a capacitaciones

#### 5. **Error** (Error)

- ❌ Icono de X rojo
- Mensaje de error genérico
- Botones: "Reenviar Correo" y "Volver al Inicio"

### Funcionalidades

- **Validación automática**: Se ejecuta al cargar la página
- **Manejo de errores**: Diferentes estados según el tipo de error
- **Reenvío de correo**: Botón para solicitar nuevo correo si expira
- **Redirección inteligente**: Redirige automáticamente después del éxito
- **Toast notifications**: Feedback visual al usuario
- **Responsive**: Diseño adaptable a móvil y desktop
- **Dark mode**: Soporte completo para modo oscuro

### Flujo de Usuario

```
Usuario recibe correo → Hace clic en link → Página carga
    ↓
Valida token automáticamente
    ↓
Si es válido → Muestra éxito → Redirige a capacitaciones (3s)
    ↓
Si expiró → Muestra mensaje → Botón para reenviar
    ↓
Si ya fue usado → Muestra mensaje → Botón para ir a inicio
    ↓
Si hay error → Muestra mensaje → Opciones de recuperación
```

---

## Página de Espera (`/verificacion/esperando/[token]`)

### Descripción

Página que muestra el usuario inmediatamente después de solicitar una inscripción, mientras espera verificar su correo electrónico.

### Estados de la Página

#### 1. **Pendiente** (Esperando verificación)

- 📧 Icono de correo con animación de spinner
- Instrucciones paso a paso
- Contador de tiempo transcurrido
- Barra de progreso visual
- Botón para reenviar correo (disponible después de 60s)
- Polling automático cada 3 segundos

#### 2. **Verificado** (Correo verificado)

- ✅ Icono de check verde con animación bounce
- Mensaje de éxito
- Redirección automática a `/capacitaciones` después de 2 segundos

#### 3. **Expirado** (Token expirado)

- ⏰ Icono de reloj naranja
- Mensaje: "Enlace Expirado"
- Botón para reenviar correo
- Al reenviar, actualiza la página con el nuevo token

### Funcionalidades

#### Polling Automático

```typescript
// Se ejecuta cada 3 segundos
useEffect(() => {
  if (estado === "pendiente") {
    const interval = setInterval(() => {
      verificarEstado(); // Llama a /api/verificacion/estado/[token]
    }, 3000);
    return () => clearInterval(interval);
  }
}, [estado]);
```

#### Contador de Tiempo

- **Tiempo transcurrido**: Muestra desde el inicio (MM:SS)
- **Tiempo restante**: Cuenta regresiva desde 15:00 minutos
- **Barra de progreso**: Indicador visual del tiempo

#### Reenvío Inteligente

- Deshabilitado durante los primeros 60 segundos
- Contador regresivo visible en el botón
- Al reenviar, actualiza la URL con el nuevo token
- Contador de intentos de reenvío

#### Instrucciones Paso a Paso

1. Abre tu correo electrónico
2. Busca el correo de CIEPI - INADEH (revisa también en Spam)
3. Haz clic en el botón "Verificar mi Correo"
4. Esta página se actualizará automáticamente cuando verifiques

### Características Visuales

#### Barra de Progreso

```typescript
<div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 transition-all"
    style={{ width: `${(tiempoTranscurrido / 900) * 100}%` }}
  />
</div>
```

#### Información de Tiempo

```
Tiempo transcurrido: 1:23
Expira en: 13:37
```

### Flujo de Usuario

```
Usuario completa formulario → API envía correo → Redirige a esta página
    ↓
Página hace polling cada 3 segundos
    ↓
Usuario abre correo en otro dispositivo/pestaña → Hace clic en link
    ↓
Polling detecta verificación → Muestra éxito → Redirige
```

### Casos de Uso

#### Caso 1: Verificación Exitosa Rápida

1. Usuario llega a página de espera
2. Abre correo inmediatamente (< 1 min)
3. Hace clic en link de verificación
4. Polling detecta cambio en ~3 segundos
5. Muestra mensaje de éxito
6. Redirige automáticamente

#### Caso 2: Usuario Demora en Verificar

1. Usuario llega a página de espera
2. Deja la página abierta
3. Después de varios minutos abre el correo
4. Hace clic en link
5. Polling detecta cambio
6. Completa proceso

#### Caso 3: Token Expira

1. Usuario llega a página de espera
2. Deja pasar más de 15 minutos
3. Polling detecta expiración
4. Muestra mensaje de expirado
5. Usuario hace clic en "Reenviar"
6. Genera nuevo token y reinicia proceso

#### Caso 4: Usuario No Recibe Correo

1. Usuario llega a página de espera
2. Espera 1 minuto (botón se habilita)
3. Hace clic en "Reenviar Correo"
4. Sistema genera nuevo token
5. Envía nuevo correo
6. Continúa polling con nuevo token

---

## Integración con el Sistema

### Redireccionamiento desde Inscripción

```typescript
// En page de inscripción
const handleSubmit = async (formData) => {
  const response = await fetch("/api/capacitaciones/inscribirse/123", {
    method: "POST",
    body: JSON.stringify(formData),
  });

  const data = await response.json();

  if (data.verification_required) {
    // Redirigir a página de espera
    router.push(`/verificacion/esperando/${data.token}`);
  }
};
```

### URLs Generadas

- **Link en correo**: `https://domain.com/ciepi/verificacion/{token}`
- **Página de espera**: `https://domain.com/ciepi/verificacion/esperando/{token}`

---

## Diseño y UX

### Colores por Estado

| Estado    | Color                  | Uso                    |
| --------- | ---------------------- | ---------------------- |
| Pendiente | Azul (`blue-600`)      | Esperando verificación |
| Éxito     | Verde (`green-600`)    | Verificación exitosa   |
| Expirado  | Naranja (`orange-600`) | Token expirado         |
| Error     | Rojo (`red-600`)       | Error en el proceso    |

### Animaciones

- **Spinner**: Rotación continua en estado loading
- **Barra de progreso**: Transición suave cada segundo
- **Bounce**: Animación en icono de éxito
- **Pulse**: En el botón de reenviar cuando está habilitado

### Responsive

- **Mobile**: Diseño en columna, botones full-width
- **Desktop**: Diseño centrado con max-width de 3xl
- **Tablet**: Adaptación automática

### Dark Mode

- Todos los elementos tienen variantes dark
- Colores ajustados para legibilidad
- Bordes y fondos adaptados

---

## Configuración

### Variables de Entorno Necesarias

```env
NEXT_PUBLIC_BASE_PATH=/ciepi
```

### Tiempos Configurables

```typescript
// Polling interval
const POLLING_INTERVAL = 3000; // 3 segundos

// Tiempo mínimo para reenviar
const MIN_RESEND_TIME = 60; // 60 segundos

// Tiempo de expiración del token
const TOKEN_EXPIRATION = 900; // 15 minutos (900 segundos)

// Redirección después de éxito
const SUCCESS_REDIRECT_DELAY = 2000; // 2 segundos (espera)
const SUCCESS_REDIRECT_DELAY = 3000; // 3 segundos (verificación)
```

---

## Manejo de Errores

### Errores de Red

- Si falla el polling, no muestra error
- Continúa intentando cada 3 segundos
- Usuario puede recargar la página manualmente

### Token No Encontrado

- Detectado por API (404)
- Muestra estado "expirado"
- Ofrece opción de reenviar

### Múltiples Pestañas

- Si el usuario abre el link en múltiples pestañas, solo una valida
- Las demás reciben "TOKEN_ALREADY_USED"
- Ambas páginas detectan el cambio y muestran éxito

---

## Mejores Prácticas

### Para el Usuario

1. Mantener la página de espera abierta
2. Revisar carpeta de Spam si no llega el correo
3. Esperar al menos 1 minuto antes de reenviar
4. No hacer clic múltiples veces en el link del correo

### Para Desarrolladores

1. No reducir el intervalo de polling (carga del servidor)
2. Limpiar intervalos en useEffect cleanup
3. Validar token en el servidor, no en el cliente
4. Usar router.replace para actualizar token sin historial

---

## Testing

### Probar Flujo Completo

1. Llenar formulario de inscripción
2. Verificar redirección a página de espera
3. Abrir correo en otra pestaña
4. Hacer clic en link de verificación
5. Verificar que página de espera detecta cambio
6. Verificar redirección automática

### Probar Expiración

1. Generar token de prueba
2. Esperar 15 minutos (o cambiar en BD)
3. Intentar verificar
4. Debe mostrar mensaje de expirado
5. Probar botón de reenvío

### Probar Reenvío

1. Llegar a página de espera
2. Esperar 60 segundos
3. Hacer clic en "Reenviar"
4. Verificar nuevo correo
5. Verificar actualización de URL

---

## Troubleshooting

### El polling no detecta cambios

- Verificar que el intervalo esté activo
- Revisar console para errores de red
- Verificar que el endpoint /estado funcione
- Limpiar caché del navegador

### El correo no llega

- Revisar configuración SMTP
- Verificar carpeta de Spam
- Revisar logs del servidor
- Usar botón de reenvío

### Error de redirección

- Verificar NEXT_PUBLIC_BASE_PATH
- Revisar rutas en router.push
- Verificar que las rutas existan

---

## Métricas y Monitoreo

### KPIs a Monitorear

- Tiempo promedio de verificación
- Porcentaje de tokens expirados
- Número de reenvíos por usuario
- Tasa de abandono en página de espera

### Logs Importantes

- Validaciones exitosas
- Tokens expirados
- Reenvíos de correo
- Errores en polling

---

## Accesibilidad

- Uso de etiquetas semánticas
- Mensajes descriptivos
- Contraste suficiente en todos los estados
- Soporte para lectores de pantalla
- Navegación por teclado habilitada
