import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'biometric_auth.dart';
import 'config.dart';
import 'push_notifications.dart';

/// Usuario autenticado (respuesta de `POST /auth/login`).
class SessionUser {
  SessionUser({
    required this.id,
    required this.name,
    required this.email,
    required this.roles,
    required this.permissions,
  });

  final int id;
  final String name;
  final String email;
  final List<String> roles;
  final List<String> permissions;

  bool get isAdmin => permissions.contains('all');

  factory SessionUser.fromJson(Map<String, dynamic> json) => SessionUser(
        id: (json['id'] as num).toInt(),
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        roles: [for (final r in (json['roles'] as List? ?? [])) r is Map ? r['name'].toString() : r.toString()],
        permissions: [for (final p in (json['permissions'] as List? ?? [])) p.toString()],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'roles': roles,
        'permissions': permissions,
      };
}

/// Estado de la sesión: token, usuario, permisos y cierre por inactividad.
class Session extends ChangeNotifier {
  Session(this.api, {this.push, FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage() {
    biometrics = BiometricAuth(_storage);
    api.onUnauthorized = () => logout(reason: 'Su sesión expiró. Inicie sesión nuevamente.');
  }

  final ApiClient api;
  final PushNotifications? push;
  final FlutterSecureStorage _storage;
  late final BiometricAuth biometrics;

  static const _tokenKey = 'accessToken';
  static const _userKey = 'user';
  static const _lastActivityKey = 'lastActivity';

  SessionUser? user;
  bool restoring = true;

  /// Mensaje para mostrar en el login (sesión expirada o cerrada por inactividad).
  String? logoutReason;

  Timer? _inactivityTimer;
  DateTime _lastActivity = DateTime.now();

  bool get isLoggedIn => user != null && api.token != null;

  bool can(String? permission) {
    final u = user;
    if (u == null) return false;
    return permission == null || u.permissions.contains('all') || u.permissions.contains(permission);
  }

  Future<void> restore() async {
    try {
      api.baseUrl = await AppConfig.loadApiUrl();
      final token = await _storage.read(key: _tokenKey);
      final rawUser = await _storage.read(key: _userKey);
      if (token != null && rawUser != null) {
        if (await _expiredWhileClosed()) {
          await _storage.delete(key: _tokenKey);
          await _storage.delete(key: _userKey);
          logoutReason = _inactivityMessage;
          return;
        }
        api.token = token;
        user = SessionUser.fromJson(jsonDecode(rawUser) as Map<String, dynamic>);
        _startInactivityTimer();
        unawaited(push?.register());
      }
    } catch (_) {
      api.token = null;
      user = null;
    } finally {
      restoring = false;
      notifyListeners();
    }
  }

  /// Lanza [ApiException] si las credenciales no son válidas.
  ///
  /// [onAuthenticated] se ejecuta con credenciales válidas, antes de entrar a la app
  /// (mientras la pantalla de login sigue montada).
  Future<void> login(String email, String password, {Future<void> Function()? onAuthenticated}) async {
    api.token = null;
    try {
      final data = await api.post('/auth/login', {'email': email.trim(), 'password': password});
      final token = data['access_token'] as String;
      final loggedUser = SessionUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
      await onAuthenticated?.call();
      api.token = token;
      user = loggedUser;
      logoutReason = null;
      await _storage.write(key: _tokenKey, value: token);
      await _storage.write(key: _userKey, value: jsonEncode(loggedUser.toJson()));
      _startInactivityTimer();
      unawaited(push?.register());
      notifyListeners();
    } on ApiException catch (e) {
      if (e.statusCode == 401) throw ApiException('Correo o contraseña incorrectos.', statusCode: 401);
      rethrow;
    }
  }

  /// Devuelve false si el usuario canceló la biometría.
  Future<bool> loginWithBiometrics() async {
    final credentials = await biometrics.unlock();
    if (credentials == null) return false;
    try {
      await login(credentials.email, credentials.password);
      return true;
    } on ApiException catch (e) {
      if (e.statusCode != 401) rethrow;
      // La contraseña cambió desde otro dispositivo o la web.
      await biometrics.disable();
      throw ApiException('Su contraseña cambió. Ingrese con su contraseña para reactivar el ingreso biométrico.',
          statusCode: 401);
    }
  }

  Future<void> logout({String? reason}) async {
    _inactivityTimer?.cancel();
    if (user == null && api.token == null) return;
    // Solo el cierre manual deja de recibir avisos: tras inactividad o expiración el
    // dispositivo sigue registrado. La petición sale antes de borrar el token.
    if (reason == null) unawaited(push?.unregister());
    api.token = null;
    user = null;
    logoutReason = reason;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
    notifyListeners();
  }

  /// Actualiza nombre/correo guardados tras editar el perfil.
  Future<void> updateProfile({String? name, String? email}) async {
    final u = user;
    if (u == null) return;
    user = SessionUser(
      id: u.id,
      name: name ?? u.name,
      email: email ?? u.email,
      roles: u.roles,
      permissions: u.permissions,
    );
    await _storage.write(key: _userKey, value: jsonEncode(user!.toJson()));
    if (email != null) await biometrics.update(email: email);
    notifyListeners();
  }

  /// Se llama en cada toque de pantalla.
  void registerActivity() {
    if (!isLoggedIn) return;
    _lastActivity = DateTime.now();
  }

  /// Al volver del segundo plano se verifica cuánto tiempo pasó.
  void checkInactivity() {
    if (!isLoggedIn) return;
    if (DateTime.now().difference(_lastActivity) >= const Duration(minutes: AppConfig.inactivityTimeoutMinutes)) {
      logout(reason: _inactivityMessage);
    }
  }

  /// Se llama al pasar a segundo plano: si el sistema cierra la app, al reabrirla se
  /// compara con esta hora para no restaurar una sesión inactiva.
  Future<void> saveLastActivity() async {
    if (!isLoggedIn) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastActivityKey, _lastActivity.millisecondsSinceEpoch);
  }

  Future<bool> _expiredWhileClosed() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getInt(_lastActivityKey);
    if (saved == null) return false;
    final elapsed = DateTime.now().difference(DateTime.fromMillisecondsSinceEpoch(saved));
    return elapsed >= const Duration(minutes: AppConfig.inactivityTimeoutMinutes);
  }

  static String get _inactivityMessage =>
      'Sesión cerrada por inactividad tras ${AppConfig.inactivityTimeoutLabel}.';

  void _startInactivityTimer() {
    _lastActivity = DateTime.now();
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer.periodic(const Duration(seconds: 5), (_) => checkInactivity());
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    super.dispose();
  }
}
