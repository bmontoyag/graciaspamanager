import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// Colores e imágenes de marca (`GET /configuration/public`), con la paleta Gracia por defecto.
class Branding extends ChangeNotifier {
  Branding(this.api);

  final ApiClient api;

  static const defaultPrimary = Color(0xFF56685A);
  static const defaultSidebar = Color(0xFF3F4F44);
  static const defaultBackground = Color(0xFFF3F2EC);

  static const _cacheKey = 'publicConfig';

  Color primary = defaultPrimary;
  Color sidebar = defaultSidebar;
  Color background = defaultBackground;
  String businessName = 'Gracia Spa';
  String? logoUrl;
  String? loginBgUrl;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_cacheKey);
    if (cached != null) {
      try {
        _apply(jsonDecode(cached) as Map);
      } catch (_) {}
    }
    try {
      final config = await api.get('/configuration/public');
      if (config is Map) {
        _apply(config);
        // Las imágenes pueden ser data URIs grandes: solo se guardan los colores.
        await prefs.setString(_cacheKey, jsonEncode({
          'primaryColor': config['primaryColor'],
          'sidebarColor': config['sidebarColor'],
          'backgroundColor': config['backgroundColor'],
          'businessName': config['businessName'],
        }));
      }
    } catch (_) {
      // Sin conexión: se mantienen los colores en caché o los de marca.
    }
  }

  void _apply(Map config) {
    primary = parseHexColor(config['primaryColor']) ?? defaultPrimary;
    sidebar = parseHexColor(config['sidebarColor']) ?? defaultSidebar;
    background = parseHexColor(config['backgroundColor']) ?? defaultBackground;
    businessName = (config['businessName'] as String?)?.trim().isNotEmpty == true ? config['businessName'] : 'Gracia Spa';
    if (config.containsKey('logoUrl')) logoUrl = _nonEmpty(config['logoUrl']);
    if (config.containsKey('loginBgUrl')) loginBgUrl = _nonEmpty(config['loginBgUrl']);
    notifyListeners();
  }

  String? _nonEmpty(dynamic value) => value is String && value.trim().isNotEmpty ? value : null;

  ThemeData theme() {
    final scheme = ColorScheme.fromSeed(seedColor: primary, primary: primary, surface: Colors.white);
    final base = ThemeData(useMaterial3: true, colorScheme: scheme, scaffoldBackgroundColor: background);
    return base.copyWith(
      appBarTheme: AppBarTheme(
        backgroundColor: sidebar,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFFDAD9D0)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFCFCEC4)),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(backgroundColor: primary, foregroundColor: Colors.white),
      dividerTheme: const DividerThemeData(color: Color(0xFFDAD9D0), space: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}

Color? parseHexColor(dynamic value) {
  if (value is! String) return null;
  var hex = value.trim().replaceFirst('#', '');
  if (hex.length == 3) hex = hex.split('').map((c) => '$c$c').join();
  if (hex.length != 6) return null;
  final parsed = int.tryParse(hex, radix: 16);
  return parsed == null ? null : Color(0xFF000000 | parsed);
}

String colorToHex(Color color) {
  final value = color.toARGB32() & 0xFFFFFF;
  return '#${value.toRadixString(16).padLeft(6, '0').toUpperCase()}';
}

/// Decodifica una imagen guardada como data URI (`data:image/png;base64,...`).
Uint8List? decodeDataUri(String? uri) {
  if (uri == null || !uri.startsWith('data:')) return null;
  final comma = uri.indexOf(',');
  if (comma < 0) return null;
  try {
    return base64Decode(uri.substring(comma + 1));
  } catch (_) {
    return null;
  }
}

/// Muestra el logo configurado o el logo incluido en la app.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.url, this.height = 56, this.color});

  final String? url;
  final double height;

  /// Para pintar el logo en blanco sobre fondos oscuros.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final bytes = decodeDataUri(url);
    final fallback = Image.asset('assets/images/logo.png', height: height, color: color, fit: BoxFit.contain);
    if (bytes != null) {
      return Image.memory(bytes, height: height, color: color, fit: BoxFit.contain, errorBuilder: (_, _, _) => fallback);
    }
    if (url != null && url!.startsWith('http')) {
      return Image.network(url!, height: height, color: color, fit: BoxFit.contain, errorBuilder: (_, _, _) => fallback);
    }
    return fallback;
  }
}
