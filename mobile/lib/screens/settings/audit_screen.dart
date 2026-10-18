import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/loader.dart';

/// "clave: valor • clave: valor" a partir del JSON guardado en el log.
String auditDetails(dynamic data) {
  if (data == null) return '-';
  dynamic parsed = data;
  if (data is String) {
    try {
      parsed = jsonDecode(data);
    } catch (_) {
      return data;
    }
  }
  if (parsed is! Map) return '$parsed';
  return parsed.entries.map((e) => '${e.key}: ${e.value is Map || e.value is List ? jsonEncode(e.value) : e.value}').join(' • ');
}

StatusInfo auditAction(String? action) {
  final a = (action ?? '').toUpperCase();
  if (['CREATE', 'CREA', 'POST'].contains(a)) return const StatusInfo('NUEVO', Tone.success);
  if (['UPDATE', 'EDITA', 'PATCH', 'PUT'].contains(a)) return const StatusInfo('EDICIÓN', Tone.info);
  if (['DELETE', 'ELIMINA'].contains(a)) return const StatusInfo('ELIMINACIÓN', Tone.danger);
  if (['LOGIN', 'ACCESO'].contains(a)) return const StatusInfo('ACCESO', Tone.brand);
  return StatusInfo(a.isEmpty ? '-' : a, Tone.neutral);
}

/// Registro de auditoría (solo administradores).
class AuditScreen extends StatefulWidget {
  const AuditScreen({super.key});

  @override
  State<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends State<AuditScreen> with LoaderMixin {
  List<Map<String, dynamic>> logs = [];
  String query = '';

  bool get _hasAccess {
    final user = context.session.user;
    return user != null && (user.isAdmin || user.roles.contains('Admin'));
  }

  @override
  Future<void> fetch() async {
    if (!_hasAccess) return;
    logs = asMapList(await context.api.get('/audit-logs'));
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasAccess) {
      return const AppScaffold(
        title: 'Auditoría',
        route: '/audit',
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.gpp_bad_outlined, size: 56, color: Color(0xFFDC2626)),
              SizedBox(height: 12),
              Text('Acceso denegado', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              SizedBox(height: 8),
              Text(
                'No tienes los permisos necesarios para ver el registro de auditoría. Consulta con un administrador.',
                textAlign: TextAlign.center,
              ),
            ]),
          ),
        ),
      );
    }
    final q = query.toLowerCase();
    final filtered = logs.where((log) {
      final text = '${log['action']} ${log['entity']} ${log['user']?['name'] ?? ''} ${auditDetails(log['newData'])}'.toLowerCase();
      return text.contains(q);
    }).toList();
    return AppScaffold(
      title: 'Auditoría',
      route: '/audit',
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: SearchField(hint: 'Buscar por usuario, acción o tabla...', onChanged: (v) => setState(() => query = v)),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: filtered.isEmpty ? 1 : filtered.length + 1,
                itemBuilder: (context, i) {
                  if (filtered.isEmpty) {
                    return const EmptyView('No se encontraron registros de auditoría', icon: Icons.history);
                  }
                  if (i == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('${filtered.length} registros encontrados',
                          style: TextStyle(color: Theme.of(context).colorScheme.outline)),
                    );
                  }
                  final log = filtered[i - 1];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ExpansionTile(
                      shape: const Border(),
                      title: Row(children: [
                        StatusBadge.info(auditAction(log['action'])),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('${log['entity'] ?? ''} #${log['entityId'] ?? ''}',
                              style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                        ),
                      ]),
                      subtitle: Text('${log['user']?['name'] ?? 'Sistema / Anónimo'} · ${formatDateTime(log['createdAt'])}'),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      expandedAlignment: Alignment.centerLeft,
                      children: [
                        SelectableText(auditDetails(log['newData']),
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                      ],
                    ),
                  );
                },
              )),
        ),
      ]),
    );
  }
}
