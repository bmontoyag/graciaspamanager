import 'package:shared_preferences/shared_preferences.dart';

/// URL del backend (NestJS).
///
/// Orden de prioridad:
/// 1. La URL guardada desde la pantalla de login ("Servidor").
/// 2. `--dart-define=API_URL=...` al compilar.
/// 3. El servidor de producción.
class AppConfig {
  static const String defaultApiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://graciaspa.duckdns.org/api',
  );

  static const _apiUrlKey = 'apiUrl';

  /// Minutos de inactividad antes de cerrar la sesión (igual que la web).
  static const int inactivityTimeoutMinutes = 15;

  static Future<String> loadApiUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return normalize(prefs.getString(_apiUrlKey) ?? defaultApiUrl);
  }

  static Future<void> saveApiUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    final value = normalize(url);
    if (value.isEmpty || value == normalize(defaultApiUrl)) {
      await prefs.remove(_apiUrlKey);
    } else {
      await prefs.setString(_apiUrlKey, value);
    }
  }

  static String normalize(String url) {
    var value = url.trim();
    while (value.endsWith('/')) {
      value = value.substring(0, value.length - 1);
    }
    return value;
  }
}
