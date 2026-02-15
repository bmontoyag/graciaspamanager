# Configuración de Notificaciones Push (Android)

Para que las notificaciones funcionen en la App Móvil, necesitas conectar tu proyecto con Firebase.

## Paso 1: Crear Proyecto en Firebase
1.  Ve a [Firebase Console](https://console.firebase.google.com/).
2.  Crea un nuevo proyecto (ej: `graciaspa-mobile`).
3.  Desactiva Google Analytics si no lo necesitas.

## Paso 2: Registrar la App Android
1.  En la visión general del proyecto, haz clic en el icono de **Android**.
2.  **Nombre del paquete:** `com.graciaspa.manager` (Debe coincidir con lo que pusimos en capacitor).
3.  **Nombre de la app:** Gracias Spa Manager.
4.  Clic en **Registrar app**.

## Paso 3: Descargar Configuración
1.  Descarga el archivo **`google-services.json`**.
2.  Mueve este archivo a la carpeta:
    `web-admin/android/app/google-services.json`

## Paso 4: Modificar Código Frontend (React)
Tienes que pedir permiso al usuario para recibir notificaciones.
Añade este código en tu `layout.tsx` o `page.tsx` principal:

```typescript
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// ... dentro del componente principal
useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', (token) => {
      // ENVIAR ESTE TOKEN AL BACKEND PARA GUARDARLO EN EL USUARIO
      console.log('Push Token:', token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notificación recibida:', notification);
    });
  }
}, []);
```

## Paso 5: Compilar App
1.  Sincronizar cambios:
    ```bash
    npx cap sync
    ```
2.  Abrir en Android Studio:
    ```bash
    npx cap open android
    ```
3.  Desde Android Studio, ir a `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
