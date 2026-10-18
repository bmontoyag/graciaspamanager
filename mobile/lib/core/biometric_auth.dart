import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'api_client.dart';

typedef BiometricCredentials = ({String email, String password});

/// Ingreso con huella (Android) o Face ID / Touch ID (iOS).
///
/// Las credenciales se guardan en el almacenamiento seguro del sistema
/// (Keychain / Keystore) y solo se usan tras validar la biometría.
class BiometricAuth {
  BiometricAuth(this._storage, {LocalAuthentication? auth}) : _auth = auth ?? LocalAuthentication();

  final FlutterSecureStorage _storage;
  final LocalAuthentication _auth;

  static const _credentialsKey = 'biometricCredentials';

  /// Hay hardware biométrico y el usuario tiene al menos una huella o rostro registrado.
  Future<bool> isAvailable() async {
    try {
      return await _auth.isDeviceSupported() && (await _auth.getAvailableBiometrics()).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Nombre para mostrar en botones y mensajes.
  Future<String> label() async {
    if (defaultTargetPlatform != TargetPlatform.iOS) return 'huella digital';
    try {
      final types = await _auth.getAvailableBiometrics();
      return types.contains(BiometricType.face) ? 'Face ID' : 'Touch ID';
    } catch (_) {
      return 'Face ID';
    }
  }

  Future<bool> isEnabled() async => (await _storage.read(key: _credentialsKey)) != null;

  Future<String?> enabledEmail() async => (await _read())?.email;

  Future<void> enable(String email, String password) =>
      _storage.write(key: _credentialsKey, value: jsonEncode({'email': email.trim(), 'password': password}));

  Future<void> disable() => _storage.delete(key: _credentialsKey);

  /// Actualiza los datos guardados si el ingreso biométrico está activo.
  Future<void> update({String? email, String? password}) async {
    final current = await _read();
    if (current == null) return;
    await enable(email ?? current.email, password ?? current.password);
  }

  /// Pide la biometría y devuelve las credenciales guardadas, o null si se canceló.
  Future<BiometricCredentials?> unlock() async {
    final credentials = await _read();
    if (credentials == null) return null;
    try {
      final ok = await _auth.authenticate(
        localizedReason: 'Confirme su identidad para ingresar a Gracia Spa',
        biometricOnly: true,
      );
      return ok ? credentials : null;
    } on LocalAuthException catch (e) {
      switch (e.code) {
        case LocalAuthExceptionCode.userCanceled:
        case LocalAuthExceptionCode.systemCanceled:
        case LocalAuthExceptionCode.timeout:
          return null;
        case LocalAuthExceptionCode.temporaryLockout:
        case LocalAuthExceptionCode.biometricLockout:
          throw ApiException('Demasiados intentos fallidos. Ingrese con su contraseña.');
        default:
          throw ApiException('No se pudo validar la biometría. Ingrese con su contraseña.');
      }
    }
  }

  Future<BiometricCredentials?> _read() async {
    try {
      final raw = await _storage.read(key: _credentialsKey);
      if (raw == null) return null;
      final data = jsonDecode(raw) as Map<String, dynamic>;
      return (email: data['email'] as String, password: data['password'] as String);
    } catch (_) {
      return null;
    }
  }
}
