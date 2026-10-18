import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> with LoaderMixin {
  List<Map<String, dynamic>> users = [];
  String query = '';

  @override
  Future<void> fetch() async => users = asMapList(await context.api.get('/users'));

  Future<void> _open([Map<String, dynamic>? user]) async {
    final saved = await openForm<bool>(context, UserFormScreen(user: user));
    if (saved == true) reload(silent: true);
  }

  Future<void> _delete(Map<String, dynamic> user) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar usuario', message: '¿Está seguro de eliminar a ${user['name']}?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/users/${user['id']}'), success: 'Usuario eliminado')) {
      reload(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = query.toLowerCase();
    final filtered = users
        .where((u) =>
            (u['name'] ?? '').toString().toLowerCase().contains(q) || (u['email'] ?? '').toString().toLowerCase().contains(q))
        .toList();
    return AppScaffold(
      title: 'Usuarios',
      route: '/users',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(),
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Nuevo usuario'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: SearchField(hint: 'Buscar por nombre o email...', onChanged: (v) => setState(() => query = v)),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: filtered.isEmpty ? 1 : filtered.length,
                itemBuilder: (context, i) {
                  if (filtered.isEmpty) return const EmptyView('No se encontraron usuarios.');
                  final u = filtered[i];
                  final roles = asMapList(u['roles']).map((r) => r['role']?['name']).whereType<String>().join(', ');
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () => _open(u),
                      leading: CircleAvatar(child: Text((u['name'] ?? '?').toString().characters.first.toUpperCase())),
                      title: Text(u['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text([
                        u['email'] ?? '',
                        roles.isEmpty ? 'Sin rol' : roles,
                        'Comisión ${formatNumber(u['commissionPercentage'])}%',
                      ].join('\n')),
                      isThreeLine: true,
                      trailing: IconButton(
                          tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _delete(u)),
                    ),
                  );
                },
              )),
        ),
      ]),
    );
  }
}

class UserFormScreen extends StatefulWidget {
  const UserFormScreen({super.key, this.user});

  final Map<String, dynamic>? user;

  @override
  State<UserFormScreen> createState() => _UserFormScreenState();
}

class _UserFormScreenState extends State<UserFormScreen> with LoaderMixin {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.user?['name'] ?? '');
  late final _email = TextEditingController(text: widget.user?['email'] ?? '');
  late final _phone = TextEditingController(text: widget.user?['phoneNumber'] ?? '');
  final _password = TextEditingController();
  late final _commission = TextEditingController(
      text: widget.user?['commissionPercentage'] == null ? '50' : formatNumber(widget.user!['commissionPercentage']));
  late Set<int> _roleIds = {for (final r in asMapList(widget.user?['roles'])) toInt(r['roleId'])};
  List<Map<String, dynamic>> roles = [];
  bool _saving = false;

  bool get _isEdit => widget.user != null;

  @override
  Future<void> fetch() async => roles = asMapList(await context.api.get('/roles'));

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final payload = {
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'phoneNumber': _phone.text.trim(),
      'roleIds': _roleIds.toList(),
      'commissionPercentage': double.tryParse(_commission.text.replaceAll(',', '.')) ?? 0,
      if (_password.text.isNotEmpty) 'password': _password.text,
    };
    try {
      if (_isEdit) {
        await context.api.patch('/users/${widget.user!['id']}', payload);
      } else {
        await context.api.post('/users', payload);
      }
      if (!mounted) return;
      showSuccess(context, _isEdit ? 'Usuario actualizado' : 'Usuario creado');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar el usuario');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Editar usuario' : 'Nuevo usuario')),
      body: loaderBody(() => Form(
            key: _formKey,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              TextFormField(
                  controller: _name, decoration: const InputDecoration(labelText: 'Nombre completo *'), validator: requiredValidator),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email *'),
                validator: requiredValidator,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Teléfono (Yape/Plin)', hintText: '999 999 999'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: InputDecoration(labelText: _isEdit ? 'Contraseña (dejar en blanco para mantener)' : 'Contraseña *'),
                validator: (v) => !_isEdit && (v == null || v.isEmpty) ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _commission,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Comisión (%)'),
              ),
              const FormSectionTitle('Roles'),
              MultiSelectChips(
                options: {for (final r in roles) toInt(r['id']): r['name'] ?? ''},
                selected: _roleIds,
                onChanged: (v) => setState(() => _roleIds = v),
              ),
              const SizedBox(height: 24),
              SubmitButton(label: _isEdit ? 'Actualizar' : 'Guardar', busy: _saving, onPressed: _save),
            ]),
          )),
    );
  }
}
