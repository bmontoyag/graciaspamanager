import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'attention_form_screen.dart';

class AttentionsScreen extends StatefulWidget {
  const AttentionsScreen({super.key});

  @override
  State<AttentionsScreen> createState() => _AttentionsScreenState();
}

class _AttentionsScreenState extends State<AttentionsScreen> with LoaderMixin {
  List<Map<String, dynamic>> attentions = [];
  String query = '';
  DateTime? dateFilter;
  int serviceFilter = 0;
  int therapistFilter = 0;

  @override
  Future<void> fetch() async => attentions = asMapList(await context.api.get('/attentions'));

  Future<void> _open([Map<String, dynamic>? attention]) async {
    final saved = await openForm<bool>(context, AttentionFormScreen(attention: attention));
    if (saved == true) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> attention) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar atención', message: '¿Está seguro de eliminar esta atención?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    final done = await runAction(() => context.api.delete('/attentions/${attention['id']}'), success: 'Atención eliminada');
    if (done) reload(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final therapists = <int, String>{};
    final servicesSeen = <int, String>{};
    for (final a in attentions) {
      for (final w in asMapList(a['workers'])) {
        therapists[toInt(w['workerId'])] = w['worker']?['name'] ?? '';
      }
      if (a['service'] != null) servicesSeen[toInt(a['service']['id'])] = a['service']['name'] ?? '';
    }
    final q = query.toLowerCase();
    final filtered = attentions.where((a) {
      final matchesText = (a['client']?['name'] ?? '').toString().toLowerCase().contains(q) ||
          (a['service']?['name'] ?? '').toString().toLowerCase().contains(q);
      final matchesTherapist =
          therapistFilter == 0 || asMapList(a['workers']).any((w) => toInt(w['workerId']) == therapistFilter);
      final matchesService = serviceFilter == 0 || toInt(a['service']?['id']) == serviceFilter;
      final matchesDate = dateFilter == null || (a['date'] != null && effectiveDay(a['date']) == dateFilter);
      return matchesText && matchesTherapist && matchesService && matchesDate;
    }).toList();

    return AppScaffold(
      title: 'Atenciones',
      route: '/attentions',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(),
        icon: const Icon(Icons.add),
        label: const Text('Nueva atención'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(children: [
            SearchField(hint: 'Buscar por cliente o servicio...', onChanged: (v) => setState(() => query = v)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: DateField(
                  label: 'Fecha',
                  value: dateFilter,
                  clearable: true,
                  onChanged: (d) => setState(() => dateFilter = d),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SelectField<int>(
                  label: 'Servicio',
                  value: serviceFilter,
                  items: {0: 'Todos', ...servicesSeen},
                  onChanged: (v) => setState(() => serviceFilter = v ?? 0),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            SelectField<int>(
              label: 'Terapeuta',
              value: therapistFilter,
              items: {0: 'Todos', ...therapists},
              onChanged: (v) => setState(() => therapistFilter = v ?? 0),
            ),
          ]),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: filtered.isEmpty ? 1 : filtered.length,
                itemBuilder: (context, index) {
                  if (filtered.isEmpty) return const EmptyView('No se encontraron atenciones.');
                  final att = filtered[index];
                  final workers = asMapList(att['workers']).map((w) => w['worker']?['name']).whereType<String>().join(', ');
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () => _open(att),
                      title: Text(att['client']?['name'] ?? 'Cliente eliminado',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text([
                        formatDate(att['date']),
                        att['service']?['name'] ?? 'Servicio',
                        if (workers.isNotEmpty) workers,
                      ].join(' · ')),
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(formatMoney(att['totalCost']), style: const TextStyle(fontWeight: FontWeight.w700)),
                        IconButton(
                          tooltip: 'Eliminar',
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(att),
                        ),
                      ]),
                    ),
                  );
                },
              )),
        ),
      ]),
    );
  }
}
