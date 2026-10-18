import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'expense_form_screen.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> with LoaderMixin {
  List<Map<String, dynamic>> expenses = [];
  String query = '';
  DateTime? dateFilter;
  String categoryFilter = 'all';

  /// 'all', 'negocio' o el id del trabajador.
  String workerFilter = 'all';

  @override
  Future<void> fetch() async => expenses = asMapList(await context.api.get('/expenses'));

  Future<void> _open([Map<String, dynamic>? expense]) async {
    final saved = await openForm<bool>(context, ExpenseFormScreen(expense: expense));
    if (saved == true) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> expense) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar gasto', message: '¿Está seguro de eliminar este gasto?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/expenses/${expense['id']}'), success: 'Gasto eliminado')) {
      reload(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = expenses.map((e) => e['category']).whereType<String>().where((c) => c.isNotEmpty).toSet();
    final workers = <String, String>{
      for (final e in expenses)
        if (e['worker'] != null) '${e['workerId']}': e['worker']['name'] ?? '',
    };
    final q = query.toLowerCase();
    final filtered = expenses.where((e) {
      final matchesText = (e['description'] ?? '').toString().toLowerCase().contains(q) ||
          (e['category'] ?? '').toString().toLowerCase().contains(q);
      final matchesCategory = categoryFilter == 'all' || e['category'] == categoryFilter;
      final matchesWorker = workerFilter == 'all' ||
          (workerFilter == 'negocio' && e['workerId'] == null) ||
          '${e['workerId']}' == workerFilter;
      final matchesDate = dateFilter == null || (e['date'] != null && effectiveDay(e['date']) == dateFilter);
      return matchesText && matchesCategory && matchesWorker && matchesDate;
    }).toList();
    final total = filtered.fold<double>(0, (sum, e) => sum + toDouble(e['amount']));

    return AppScaffold(
      title: 'Gastos',
      route: '/expenses',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo gasto'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(children: [
            SearchField(hint: 'Buscar por descripción...', onChanged: (v) => setState(() => query = v)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: DateField(
                    label: 'Fecha', value: dateFilter, clearable: true, onChanged: (d) => setState(() => dateFilter = d)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SelectField<String>(
                  label: 'Categoría',
                  value: categoryFilter,
                  items: {'all': 'Todas', for (final c in categories) c: c},
                  onChanged: (v) => setState(() => categoryFilter = v ?? 'all'),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            SelectField<String>(
              label: 'Asignado',
              value: workerFilter,
              items: {'all': 'Todos', 'negocio': 'Negocio (general)', ...workers},
              onChanged: (v) => setState(() => workerFilter = v ?? 'all'),
            ),
          ]),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: filtered.isEmpty ? 1 : filtered.length + 1,
                itemBuilder: (context, index) {
                  if (filtered.isEmpty) return const EmptyView('No se encontraron gastos.');
                  if (index == filtered.length) {
                    return Padding(
                      padding: const EdgeInsets.all(12),
                      child: InfoRow('Total (${filtered.length})', '- ${formatMoney(total)}',
                          bold: true, color: const Color(0xFFB91C1C)),
                    );
                  }
                  final e = filtered[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () => _open(e),
                      title: Text(e['description'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text([
                        formatDate(e['date']),
                        e['category'] ?? '',
                        e['worker']?['name'] ?? 'Negocio',
                      ].where((s) => s.toString().isNotEmpty).join(' · ')),
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text('- ${formatMoney(e['amount'])}',
                            style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFB91C1C))),
                        IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(e)),
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
