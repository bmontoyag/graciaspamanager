import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase_options.dart';
import 'api_client.dart';

/// Notificaciones push (Firebase Cloud Messaging).
///
/// Registra el dispositivo en el backend al iniciar sesión; el backend avisa a los
/// administradores cuando el personal registra atenciones, citas, gastos o pagos.
class PushNotifications {
  PushNotifications(this.api);

  final ApiClient api;

  /// Navigator de la app con sesión iniciada, para abrir la pantalla de la notificación.
  final navigatorKey = GlobalKey<NavigatorState>();

  static const _channel = AndroidNotificationChannel(
    'activity', // Debe coincidir con channelId en el backend.
    'Actividad del equipo',
    description: 'Atenciones, citas, gastos y pagos registrados por el personal.',
    importance: Importance.high,
  );

  final _local = FlutterLocalNotificationsPlugin();
  bool _ready = false;
  String? _token;
  String? _pendingRoute;
  StreamSubscription<String>? _tokenRefresh;

  Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    } catch (e) {
      debugPrint('Notificaciones push desactivadas: $e');
      return;
    }
    _ready = true;
    final messaging = FirebaseMessaging.instance;
    // iOS muestra la notificación aunque la app esté abierta.
    await messaging.setForegroundNotificationPresentationOptions(alert: true, badge: true, sound: true);
    if (Platform.isAndroid) {
      // Android no muestra las notificaciones con la app abierta: se muestran localmente.
      await _local.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
        onDidReceiveNotificationResponse: (response) => _open(response.payload),
      );
      await _local
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
      FirebaseMessaging.onMessage.listen(_showForeground);
    }
    FirebaseMessaging.onMessageOpenedApp.listen((message) => _open(message.data['route']));
    final initial = await messaging.getInitialMessage();
    if (initial != null) _open(initial.data['route']);
  }

  /// Pide permiso y registra el token del dispositivo para el usuario actual.
  Future<void> register() async {
    if (!_ready) return;
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      if (Platform.isIOS && !await _waitForApnsToken()) return;
      // Token clásico de FCM: firebase_messaging 17 lo marca obsoleto en favor de los FID
      // (register/onRegistered), igual que firebase-admin en el backend. Se migrará cuando
      // ambos lados lo estabilicen.
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      if (token == null) return;
      _token = token;
      await _send(token);
      // ignore: deprecated_member_use
      _tokenRefresh ??= messaging.onTokenRefresh.listen((token) {
        _token = token;
        _send(token).catchError((Object e) => debugPrint('No se pudo actualizar el token push: $e'));
      });
    } catch (e) {
      debugPrint('No se pudo registrar el dispositivo para notificaciones: $e');
    }
  }

  /// Quita el dispositivo del usuario (cierre de sesión manual).
  /// La petición sale con el token de sesión actual aunque luego se borre.
  Future<void> unregister() async {
    final token = _token;
    if (!_ready || token == null) return;
    _token = null;
    try {
      await api.post('/notifications/devices/remove', {'token': token});
    } catch (_) {}
  }

  /// Abre la pantalla pendiente de una notificación tocada antes de entrar a la app.
  void openPendingRoute() {
    final route = _pendingRoute;
    if (route == null) return;
    _pendingRoute = null;
    _open(route);
  }

  Future<void> _send(String token) =>
      api.post('/notifications/devices', {'token': token, 'platform': Platform.isIOS ? 'ios' : 'android'});

  /// En iOS el token de FCM requiere antes el token de APNs, que puede tardar unos segundos.
  Future<bool> _waitForApnsToken() async {
    for (var i = 0; i < 10; i++) {
      if (await FirebaseMessaging.instance.getAPNSToken() != null) return true;
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    debugPrint('No se obtuvo el token de APNs: revise la capacidad Push Notifications en Xcode.');
    return false;
  }

  void _showForeground(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;
    _local.show(
      id: message.hashCode,
      title: notification.title,
      body: notification.body,
      payload: message.data['route'],
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          styleInformation: BigTextStyleInformation(notification.body ?? ''),
        ),
      ),
    );
  }

  void _open(String? route) {
    if (route == null || !route.startsWith('/')) return;
    final navigator = navigatorKey.currentState;
    if (navigator == null) {
      // Aún no hay sesión o la app se está abriendo: se abre al entrar.
      _pendingRoute = route;
      return;
    }
    navigator.pushNamed(route);
  }
}
