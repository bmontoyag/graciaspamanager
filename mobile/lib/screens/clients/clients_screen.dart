import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'client_form_screen.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> with LoaderMixin {
  List<Map<String, dynamic>> clients = [];
  String query = '';

  @override
  Future<void> fetch() async => clients = asMapList(await context.api.get('/clients'));

  Future<void> _open([Map<String, dynamic>? client]) async {
    final saved = await openForm(context, ClientFormScreen(client: client));
    if (saved != null) reload(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final q = query.toLowerCase();
    final filtered = clients
        .where((c) =>
            (c['name'] ?? '').toString().toLowerCase().contains(q) ||
            (c['phone'] ?? '').toString().contains(q) ||
            (c['email'] ?? '').toString().toLowerCase().contains(q))
        .toList();
    return AppScaffold(
      title: 'Clientes',
      route: '/clients',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _open(),
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Nuevo cliente'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: SearchField(hint: 'Buscar por nombre, teléfono o email...', onChanged: (v) => setState(() => query = v)),
        ),
        Expanded(
          child: loaderBody(() => ListView.separated(
                padding: const EdgeInsets.only(bottom: 96),
                itemCount: filtered.isEmpty ? 1 : filtered.length + 1,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  if (filtered.isEmpty) return const EmptyView('No hay clientes registrados.');
                  if (index == filtered.length) {
                    return Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text('Total: ${filtered.length} clientes', textAlign: TextAlign.center),
                    );
                  }
                  final c = filtered[index];
                  final birthday = c['birthday'] == null ? null : formatDay(c['birthday'], 'dd/MM');
                  return ListTile(
                    leading: CircleAvatar(child: Text((c['name'] ?? '?').toString().characters.first.toUpperCase())),
                    title: Text(c['name'] ?? ''),
                    subtitle: Text([
                      if ((c['phone'] ?? '').toString().isNotEmpty) c['phone'],
                      if (birthday != null) '🎂 $birthday',
                    ].join('  ·  ')),
                    trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text('${toInt(c['loyaltyPoints'])}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      const Text('pts', style: TextStyle(fontSize: 11)),
                    ]),
                    onTap: () => _open(c),
                  );
                },
              )),
        ),
      ]),
    );
  }
}
