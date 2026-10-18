import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

class RolesScreen extends StatefulWidget {
  const RolesScreen({super.key});

  @override
  State<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends State<RolesScreen> with LoaderMixin {
  List<Map<String, dynamic>> roles = [];
  List<Map<String, dynamic>> modules = [];

  @override
  Future<void> fetch() async {
    final results = await Future.wait([context.api.get('/roles'), context.api.get('/modules')]);
    roles = asMapList(results[0]);
    modules = asMapList(results[1]);
  }

  Future<void> _open([Map<String, dynamic>? role]) async {
    final saved = await openForm<bool>(context, RoleFormScreen(role: role, modules: modules));
    if (saved == true) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> role) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar rol', message: '¿Eliminar el rol ${role['name']}?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/roles/${role['id']}'), success: 'Rol eliminado')) reload(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Roles y permisos',
      route: '/roles',
      floatingActionButton:
          FloatingActionButton.extended(onPressed: () => _open(), icon: const Icon(Icons.add), label: const Text('Nuevo rol')),
      body: loaderBody(() => ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            itemCount: roles.isEmpty ? 1 : roles.length,
            itemBuilder: (context, i) {
              if (roles.isEmpty) return const EmptyView('No hay roles registrados.');
              final role = roles[i];
              final roleModules = asMapList(role['modules']).map((m) => m['module']?['name']).whereType<String>();
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: SectionCard(
                  title: role['name'] ?? '',
                  subtitle: (role['description'] ?? '').toString().isEmpty ? 'Sin descripción' : role['description'],
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(tooltip: 'Editar', icon: const Icon(Icons.edit_outlined), onPressed: () => _open(role)),
                    IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(role)),
                  ]),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Módulos permitidos:', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      for (final name in roleModules) StatusBadge(name, tone: Tone.brand),
                      if (roleModules.isEmpty) const Text('Ninguno'),
                    ]),
                  ]),
                ),
              );
            },
          )),
    );
  }
}

class RoleFormScreen extends StatefulWidget {
  const RoleFormScreen({super.key, this.role, required this.modules});

  final Map<String, dynamic>? role;
  final List<Map<String, dynamic>> modules;

  @override
  State<RoleFormScreen> createState() => _RoleFormScreenState();
}

class _RoleFormScreenState extends State<RoleFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.role?['name'] ?? '');
  late final _description = TextEditingController(text: widget.role?['description'] ?? '');
  late Set<int> _moduleIds = {for (final m in asMapList(widget.role?['modules'])) toInt(m['moduleId'])};
  bool _saving = false;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final payload = {'name': _name.text.trim(), 'description': _description.text.trim(), 'moduleIds': _moduleIds.toList()};
    try {
      if (widget.role != null) {
        await context.api.patch('/roles/${widget.role!['id']}', payload);
      } else {
        await context.api.post('/roles', payload);
      }
      if (!mounted) return;
      showSuccess(context, widget.role != null ? 'Rol actualizado' : 'Rol creado');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar el rol');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.role != null ? 'Editar rol' : 'Nuevo rol')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nombre del rol *'), validator: requiredValidator),
          const SizedBox(height: 12),
          TextFormField(controller: _description, decoration: const InputDecoration(labelText: 'Descripción')),
          const FormSectionTitle('Permisos (módulos)'),
          for (final m in widget.modules)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _moduleIds.contains(toInt(m['id'])),
              title: Text(m['name'] ?? ''),
              subtitle: (m['key'] ?? '').toString().isEmpty ? null : Text('${m['key']}'),
              onChanged: (v) => setState(() {
                _moduleIds = {..._moduleIds};
                v == true ? _moduleIds.add(toInt(m['id'])) : _moduleIds.remove(toInt(m['id']));
              }),
            ),
          const SizedBox(height: 24),
          SubmitButton(label: 'Guardar', busy: _saving, onPressed: _save),
        ]),
      ),
    );
  }
}
