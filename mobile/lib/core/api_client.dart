import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

/// Error devuelto por el backend (mensaje de NestJS) o por la red.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Cliente HTTP con el token JWT, equivalente a `apiFetch` de la web.
class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final http.Client _http;
  String baseUrl;
  String? token;

  /// Se llama cuando el backend responde 401 con una sesión abierta.
  void Function()? onUnauthorized;

  static const _timeout = Duration(seconds: 30);

  Uri uri(String path, [Map<String, String>? query]) {
    final url = Uri.parse('$baseUrl$path');
    return query == null ? url : url.replace(queryParameters: query);
  }

  Map<String, String> _headers({bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send(() => _http.get(uri(path, query), headers: _headers()));

  Future<dynamic> post(String path, [Object? body]) => _send(
        () => _http.post(uri(path),
            headers: _headers(json: body != null), body: body == null ? null : jsonEncode(body)),
      );

  Future<dynamic> patch(String path, [Object? body]) => _send(
        () => _http.patch(uri(path),
            headers: _headers(json: body != null), body: body == null ? null : jsonEncode(body)),
      );

  Future<dynamic> delete(String path) => _send(() => _http.delete(uri(path), headers: _headers()));

  /// Descarga binaria (backup).
  Future<Uint8List> download(String path) async {
    final res = await _guard(() => _http.get(uri(path), headers: _headers()));
    _check(res);
    return res.bodyBytes;
  }

  /// Envío multipart (restaurar backup).
  Future<dynamic> upload(String path, {required String field, required List<int> bytes, required String filename}) {
    return _send(() async {
      final request = http.MultipartRequest('POST', uri(path))
        ..headers.addAll(_headers())
        ..files.add(http.MultipartFile.fromBytes(field, bytes, filename: filename));
      final streamed = await _http.send(request);
      return http.Response.fromStream(streamed);
    }, timeout: const Duration(minutes: 5));
  }

  Future<dynamic> _send(Future<http.Response> Function() request, {Duration timeout = _timeout}) async {
    final res = await _guard(request, timeout: timeout);
    _check(res);
    return _decode(res);
  }

  Future<http.Response> _guard(Future<http.Response> Function() request, {Duration timeout = _timeout}) async {
    try {
      return await request().timeout(timeout);
    } on TimeoutException {
      throw ApiException('El servidor tardó demasiado en responder.');
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('No hay conexión con el servidor.');
    }
  }

  void _check(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    if (res.statusCode == 401 && token != null) {
      onUnauthorized?.call();
      throw ApiException('Su sesión expiró. Inicie sesión nuevamente.', statusCode: 401);
    }
    final data = _decode(res);
    String message;
    if (data is Map && data['message'] != null) {
      final raw = data['message'];
      message = raw is List ? raw.join(', ') : raw.toString();
    } else if (data is String && data.isNotEmpty && data.length < 300) {
      message = data;
    } else {
      message = res.reasonPhrase ?? 'Error ${res.statusCode}';
    }
    throw ApiException(message, statusCode: res.statusCode);
  }

  dynamic _decode(http.Response res) {
    final text = utf8.decode(res.bodyBytes, allowMalformed: true);
    if (text.isEmpty) return null;
    try {
      return jsonDecode(text);
    } catch (_) {
      return text;
    }
  }
}
