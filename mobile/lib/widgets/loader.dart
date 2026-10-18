import 'package:flutter/material.dart';

import 'common.dart';

/// Carga de datos con estados de carga y error para pantallas.
mixin LoaderMixin<T extends StatefulWidget> on State<T> {
  bool loading = true;
  String? loadError;

  /// Obtiene los datos; se llama desde [reload].
  Future<void> fetch();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload({bool silent = false}) async {
    if (!silent) {
      setState(() {
        loading = true;
        loadError = null;
      });
    }
    try {
      await fetch();
      loadError = null;
    } catch (e) {
      loadError = '$e';
      if (silent && mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  /// Muestra carga/error o el contenido.
  Widget loaderBody(Widget Function() builder) {
    if (loading) return const LoadingView();
    if (loadError != null) return ErrorView(message: loadError!, onRetry: reload);
    return RefreshIndicator(onRefresh: () => reload(silent: true), child: builder());
  }

  /// Ejecuta una acción mostrando el error si falla. Devuelve true si tuvo éxito.
  Future<bool> runAction(Future<void> Function() action, {String? success}) async {
    try {
      await action();
      if (mounted && success != null) showSuccess(context, success);
      return true;
    } catch (e) {
      if (mounted) showError(context, e);
      return false;
    }
  }
}

List<Map<String, dynamic>> asMapList(dynamic data) =>
    data is List ? [for (final item in data) if (item is Map) Map<String, dynamic>.from(item)] : [];

Map<String, dynamic> asMap(dynamic data) => data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
