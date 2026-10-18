import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> with LoaderMixin {
  List<Map<String, dynamic>> services = [];
  List<Map<String, dynamic>> categories = [];
  int categoryFilter = 0;

  @override
  Future<void> fetch() async {
    final results = await Future.wait([context.api.get('/services'), context.api.get('/service-categories')]);
    services = asMapList(results[0]);
    categories = asMapList(results[1]);
  }

  Future<void> _open([Map<String, dynamic>? service]) async {
    final saved = await openForm<bool>(context, ServiceFormScreen(service: service, categories: categories));
    if (saved == true) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> service) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar servicio',
        message: '¿Está seguro de eliminar "${service['name']}"?',
        confirmText: 'Eliminar',
        destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/services/${service['id']}'), success: 'Servicio eliminado')) {
      reload(silent: true);
    }
  }

  Future<void> _manageCategories() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _CategoriesSheet(api: context.api, initial: categories),
    );
    reload(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = categoryFilter == 0 ? services : services.where((s) => toInt(s['categoryId']) == categoryFilter).toList();
    return AppScaffold(
      title: 'Servicios',
      route: '/services',
      actions: [
        IconButton(tooltip: 'Categorías', onPressed: _manageCategories, icon: const Icon(Icons.sell_outlined)),
      ],
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo servicio'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: SelectField<int>(
            label: 'Categoría',
            value: categoryFilter,
            items: {0: 'Todas las categorías', for (final c in categories) toInt(c['id']): c['name'] ?? ''},
            onChanged: (v) => setState(() => categoryFilter = v ?? 0),
          ),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: filtered.isEmpty ? 1 : filtered.length,
                itemBuilder: (context, index) {
                  if (filtered.isEmpty) return const EmptyView('No hay servicios registrados.');
                  final s = filtered[index];
                  final active = s['isActive'] != false;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () => _open(s),
                      title: Text(s['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if ((s['description'] ?? '').toString().isNotEmpty) Text(s['description']),
                        const SizedBox(height: 4),
                        Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                          Text('${s['category']?['name'] ?? 'Sin categoría'} · ${toInt(s['durationMin'])} min'),
                          StatusBadge(active ? 'Activo' : 'Inactivo', tone: active ? Tone.success : Tone.neutral),
                        ]),
                      ]),
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(formatMoney(s['price']), style: const TextStyle(fontWeight: FontWeight.w700)),
                        IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(s)),
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

class ServiceFormScreen extends StatefulWidget {
  const ServiceFormScreen({super.key, this.service, required this.categories});

  final Map<String, dynamic>? service;
  final List<Map<String, dynamic>> categories;

  @override
  State<ServiceFormScreen> createState() => _ServiceFormScreenState();
}

class _ServiceFormScreenState extends State<ServiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.service?['name'] ?? '');
  late final _description = TextEditingController(text: widget.service?['description'] ?? '');
  late final _price = TextEditingController(text: widget.service == null ? '' : formatNumber(widget.service!['price']));
  late final _duration = TextEditingController(text: widget.service == null ? '' : '${toInt(widget.service!['durationMin'])}');
  late int _categoryId = toInt(widget.service?['categoryId']);
  late bool _active = widget.service?['isActive'] ?? true;
  bool _saving = false;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final payload = {
      'name': _name.text.trim(),
      if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
      if (_categoryId != 0) 'categoryId': _categoryId,
      'price': double.parse(_price.text.replaceAll(',', '.')),
      'durationMin': int.parse(_duration.text),
      'isActive': _active,
    };
    try {
      if (widget.service != null) {
        await context.api.patch('/services/${widget.service!['id']}', payload);
      } else {
        await context.api.post('/services', payload);
      }
      if (!mounted) return;
      showSuccess(context, widget.service != null ? 'Servicio actualizado' : 'Servicio creado');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar el servicio');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.service != null ? 'Editar servicio' : 'Nuevo servicio')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Nombre del servicio *'),
            validator: requiredValidator,
          ),
          const SizedBox(height: 12),
          TextFormField(controller: _description, maxLines: 3, decoration: const InputDecoration(labelText: 'Descripción')),
          const SizedBox(height: 12),
          SelectField<int>(
            label: 'Categoría',
            value: _categoryId,
            items: {0: 'Sin categoría', for (final c in widget.categories) toInt(c['id']): c['name'] ?? ''},
            onChanged: (v) => setState(() => _categoryId = v ?? 0),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: TextFormField(
                controller: _duration,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Duración (min) *'),
                validator: (v) => (int.tryParse(v ?? '') ?? 0) < 1 ? 'Mínimo 1' : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _price,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Precio (S/) *'),
                validator: (v) => double.tryParse((v ?? '').replaceAll(',', '.')) == null ? 'Precio no válido' : null,
              ),
            ),
          ]),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Servicio activo'),
            value: _active,
            onChanged: (v) => setState(() => _active = v),
          ),
          const SizedBox(height: 16),
          SubmitButton(label: widget.service != null ? 'Actualizar servicio' : 'Crear servicio', busy: _saving, onPressed: _save),
        ]),
      ),
    );
  }
}

class _CategoriesSheet extends StatefulWidget {
  const _CategoriesSheet({required this.api, required this.initial});
  final ApiClient api;
  final List<Map<String, dynamic>> initial;

  @override
  State<_CategoriesSheet> createState() => _CategoriesSheetState();
}

class _CategoriesSheetState extends State<_CategoriesSheet> {
  late List<Map<String, dynamic>> categories = [...widget.initial];
  final _newName = TextEditingController();

  Future<void> _refresh() async {
    final data = await widget.api.get('/service-categories');
    if (mounted) setState(() => categories = asMapList(data));
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _refresh();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _add() async {
    final name = _newName.text.trim();
    if (name.isEmpty) return;
    await _run(() async {
      await widget.api.post('/service-categories', {'name': name});
      _newName.clear();
    });
  }

  Future<void> _rename(Map<String, dynamic> cat) async {
    final name = await promptText(context, title: 'Renombrar categoría', initial: cat['name'] ?? '');
    if (name == null || name.trim().isEmpty || name == cat['name']) return;
    await _run(() async => widget.api.patch('/service-categories/${cat['id']}', {'name': name.trim()}));
  }

  Future<void> _delete(Map<String, dynamic> cat) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar categoría', message: '¿Eliminar "${cat['name']}"?', confirmText: 'Eliminar', destructive: true);
    if (ok) await _run(() async => widget.api.delete('/service-categories/${cat['id']}'));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(children: [
          ListTile(
            title: Text('Gestionar categorías', style: Theme.of(context).textTheme.titleMedium),
            trailing: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _newName,
                  decoration: const InputDecoration(hintText: 'Nueva categoría'),
                  onSubmitted: (_) => _add(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _add, child: const Text('Agregar')),
            ]),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(children: [
              for (final cat in categories)
                ListTile(
                  title: Text(cat['name'] ?? ''),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(tooltip: 'Editar', icon: const Icon(Icons.edit_outlined), onPressed: () => _rename(cat)),
                    IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(cat)),
                  ]),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}
