import 'package:flutter/material.dart';

import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Tipos de gasto administrativos (clasificación adicional a la categoría).
class ExpenseTypesScreen extends StatefulWidget {
  const ExpenseTypesScreen({super.key});

  @override
  State<ExpenseTypesScreen> createState() => _ExpenseTypesScreenState();
}

class _ExpenseTypesScreenState extends State<ExpenseTypesScreen> with LoaderMixin {
  List<Map<String, dynamic>> types = [];

  @override
  Future<void> fetch() async => types = asMapList(await context.api.get('/expense-types'));

  Future<void> _open([Map<String, dynamic>? type]) async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _TypeSheet(type: type),
    );
    if (result == null || !mounted) return;
    final ok = await runAction(
      () => type != null
          ? context.api.patch('/expense-types/${type['id']}', result)
          : context.api.post('/expense-types', result),
      success: type != null ? 'Tipo actualizado' : 'Tipo creado',
    );
    if (ok) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> type) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar tipo', message: '¿Eliminar el tipo "${type['name']}"?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/expense-types/${type['id']}'), success: 'Tipo eliminado')) {
      reload(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Tipos de gastos',
      route: '/expense-types',
      floatingActionButton:
          FloatingActionButton.extended(onPressed: () => _open(), icon: const Icon(Icons.add), label: const Text('Nuevo tipo')),
      body: loaderBody(() => ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            itemCount: types.isEmpty ? 1 : types.length,
            itemBuilder: (context, i) {
              if (types.isEmpty) return const EmptyView('No hay tipos de gastos registrados.');
              final t = types[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  onTap: () => _open(t),
                  title: Text(t['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: (t['description'] ?? '').toString().isEmpty ? null : Text(t['description']),
                  trailing: IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(t)),
                ),
              );
            },
          )),
    );
  }
}

class _TypeSheet extends StatefulWidget {
  const _TypeSheet({this.type});
  final Map<String, dynamic>? type;

  @override
  State<_TypeSheet> createState() => _TypeSheetState();
}

class _TypeSheetState extends State<_TypeSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.type?['name'] ?? '');
  late final _description = TextEditingController(text: widget.type?['description'] ?? '');

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(widget.type != null ? 'Editar tipo' : 'Nuevo tipo', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          TextFormField(
              controller: _name, autofocus: true, decoration: const InputDecoration(labelText: 'Nombre *'), validator: requiredValidator),
          const SizedBox(height: 12),
          TextFormField(controller: _description, maxLines: 2, decoration: const InputDecoration(labelText: 'Descripción')),
          const SizedBox(height: 16),
          SubmitButton(
            label: widget.type != null ? 'Actualizar' : 'Guardar',
            onPressed: () {
              if (!_formKey.currentState!.validate()) return;
              Navigator.pop(context, {'name': _name.text.trim(), 'description': _description.text.trim()});
            },
          ),
        ]),
      ),
    );
  }
}
