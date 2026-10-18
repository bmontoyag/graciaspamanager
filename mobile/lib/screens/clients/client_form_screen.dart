import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Expediente del cliente: datos y, al editar, historial de atenciones.
/// Devuelve el cliente guardado.
class ClientFormScreen extends StatefulWidget {
  const ClientFormScreen({super.key, this.client});

  final Map<String, dynamic>? client;

  @override
  State<ClientFormScreen> createState() => _ClientFormScreenState();
}

class _ClientFormScreenState extends State<ClientFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.client?['name'] ?? '');
  late final _phone = TextEditingController(text: widget.client?['phone'] ?? '');
  late final _email = TextEditingController(text: widget.client?['email'] ?? '');
  DateTime? _birthday;
  String? _discoverySource;
  List<String> _sources = [];
  bool _saving = false;

  bool get _isEdit => widget.client != null;

  @override
  void initState() {
    super.initState();
    final birthday = parseIso(widget.client?['birthday']);
    if (birthday != null) _birthday = DateTime.utc(birthday.year, birthday.month, birthday.day);
    _discoverySource = widget.client?['discoverySource'];
    context.api.get('/configuration').then((config) {
      if (mounted && config is Map && config['discoverySources'] is List) {
        setState(() => _sources = [for (final s in config['discoverySources']) s.toString()]);
      }
    }).catchError((_) {});
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      String? orNull(String text) => text.trim().isEmpty ? null : text.trim();
      final payload = {
        'name': _name.text.trim(),
        'phone': ?orNull(_phone.text),
        'email': ?orNull(_email.text),
        if (_birthday != null) 'birthday': '${dateKey(_birthday!)}T00:00:00.000Z',
        if (_discoverySource?.isNotEmpty == true) 'discoverySource': _discoverySource,
      };
      final saved = _isEdit
          ? await context.api.patch('/clients/${widget.client!['id']}', payload)
          : await context.api.post('/clients', payload);
      if (!mounted) return;
      showSuccess(context, _isEdit ? 'Cliente actualizado' : 'Cliente "${saved['name']}" creado');
      Navigator.pop(context, asMap(saved));
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar el cliente');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final form = Form(
      key: _formKey,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        if (_isEdit)
          Card(
            color: const Color(0xFFFEF3C7),
            child: ListTile(
              leading: const Icon(Icons.stars, color: Color(0xFFB45309)),
              title: const Text('Puntos de fidelidad'),
              trailing: Text('${toInt(widget.client!['loyaltyPoints'])} pts',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Nombre completo *'),
          validator: requiredValidator,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Teléfono'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
          validator: (v) => v != null && v.trim().isNotEmpty && !v.contains('@') ? 'Email no válido' : null,
        ),
        const SizedBox(height: 12),
        DateField(label: 'Cumpleaños', value: _birthday, clearable: true, onChanged: (d) => setState(() => _birthday = d)),
        const SizedBox(height: 12),
        SelectField<String>(
          label: '¿De dónde nos conoció?',
          value: _discoverySource ?? '',
          items: {
            '': 'Seleccionar (opcional)',
            for (final s in _sources) s: s,
            if (_discoverySource != null && _discoverySource!.isNotEmpty && !_sources.contains(_discoverySource))
              _discoverySource!: _discoverySource!,
          },
          onChanged: (v) => setState(() => _discoverySource = v),
        ),
        const SizedBox(height: 24),
        SubmitButton(label: _isEdit ? 'Actualizar cliente' : 'Guardar cliente', busy: _saving, onPressed: _save),
      ]),
    );

    if (!_isEdit) {
      return Scaffold(appBar: AppBar(title: const Text('Nuevo cliente')), body: form);
    }

    final attentions = asMapList(widget.client!['attentions']);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Expediente: ${widget.client!['name']}'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Color(0xB3FFFFFF),
            indicatorColor: Colors.white,
            tabs: [Tab(text: 'Perfil y datos'), Tab(text: 'Historial')],
          ),
        ),
        body: TabBarView(children: [
          form,
          attentions.isEmpty
              ? const Center(child: EmptyView('Este cliente aún no tiene un historial de atenciones.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: attentions.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, index) {
                    final att = attentions[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(att['service']?['name'] ?? 'Servicio general'),
                      subtitle: Text(formatDate(att['date'], 'dd MMM yyyy')),
                      trailing: Text(formatMoney(att['totalCost']), style: const TextStyle(fontWeight: FontWeight.w700)),
                    );
                  },
                ),
        ]),
      ),
    );
  }
}
