# Gracia Spa - app móvil (Flutter)

App de Android e iOS con los mismos módulos que el panel web (`web-admin/`). Usa el mismo backend NestJS (`backend/`), el mismo login y los mismos permisos por rol.

## Módulos

| Menú | Qué incluye |
| --- | --- |
| Dashboard | Indicadores del día y del mes, citas de hoy, cumpleaños con saludo por WhatsApp |
| Calendario | Citas por mes/semana, nueva cita con varios servicios, confirmación por WhatsApp, eventos corporativos |
| Atenciones | Registro con varios servicios y terapeutas, adelantos de la cita, filtros |
| Clientes / Fidelidad | Ficha con historial, puntos, canje y sincronización |
| Servicios | Servicios y categorías |
| Corporativo | Cotizaciones (estados, duplicar, PDF), eventos (jornadas, terapeutas, cobros, gastos) y empresas |
| Gastos / Cierre diario | Gastos con filtros, cierre del día y pago a terapeutas (Yape) |
| Reportes | Resumen mensual con gráficos y análisis anual |
| Configuración | Personal, roles, horarios y bloqueos, tipos de gasto, marketing, personalización, backup y auditoría |

Cada usuario solo ve los módulos que su rol permite. La sesión se cierra tras 15 minutos sin actividad, igual que en la web.

## Requisitos

- Flutter 3.47 o superior (Dart 3.13+), la versión con la que se desarrolló
- Android: Android Studio con el SDK de Android
- iOS: macOS con Xcode y CocoaPods

## Ejecutar

```bash
cd mobile
flutter pub get
flutter run                      # usa https://graciaspa.duckdns.org/api
```

Para usar otro backend:

```bash
flutter run --dart-define=API_URL=http://192.168.1.10:3001
```

También se puede cambiar desde la app con el botón **Servidor** de la pantalla de inicio de sesión. El valor queda guardado en el teléfono.

## Compilar

```bash
flutter build apk --release      # Android (APK)
flutter build appbundle          # Android (Play Store)
flutter build ipa                # iOS (requiere cuenta de Apple Developer)
```

Antes de publicar, configure la firma de Android (`android/app/build.gradle.kts`, hoy usa la llave de depuración) y el equipo de firma de iOS en Xcode.

## Pruebas

```bash
flutter analyze
flutter test
```

## Estructura

- `lib/core/`: cliente de la API, sesión, formato de montos y fechas (hora de Lima), colores de la marca.
- `lib/widgets/`: componentes comunes (campos, tarjetas, carga y errores).
- `lib/screens/`: una carpeta por módulo.
- `assets/fonts/`: fuentes Inter y Lora (licencia OFL) para el PDF de cotizaciones.
