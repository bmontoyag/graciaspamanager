import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Crear o editar una empresa cliente. Devuelve la empresa guardada.
class CompanyFormScreen extends StatefulWidget {
  const CompanyFormScreen({super.key, this.company});

  final Map<String, dynamic>? company;

  @override
  State<CompanyFormScreen> createState() => _CompanyFormScreenState();
}

class _CompanyFormScreenState extends State<CompanyFormScreen> {
  static const _fields = ['name', 'ruc', 'contactName', 'contactPhone', 'contactEmail', 'address', 'notes'];

  final _formKey = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _c = {
    for (final f in _fields) f: TextEditingController(text: widget.company?[f]?.toString() ?? ''),
  };
  bool _saving = false;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    // Los campos vacíos no se envían para no fallar la validación del email
    final payload = {
      for (final f in _fields)
        if (_c[f]!.text.trim().isNotEmpty) f: _c[f]!.text.trim(),
    };
    try {
      final company = widget.company;
      final saved = company != null
          ? await context.api.patch('/companies/${company['id']}', payload)
          : await context.api.post('/companies', payload);
      if (!mounted) return;
      showSuccess(context, company != null ? 'Empresa actualizada' : 'Empresa registrada');
      Navigator.pop(context, asMap(saved));
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar la empresa');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(String key, String label, {TextInputType? type, int maxLines = 1, int? maxLength, FormFieldValidator<String>? validator}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _c[key],
        keyboardType: type,
        maxLines: maxLines,
        maxLength: maxLength,
        validator: validator,
        decoration: InputDecoration(labelText: label, counterText: ''),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.company != null ? 'Editar empresa' : 'Nueva empresa')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          _field('name', 'Razón social / Nombre *', validator: requiredValidator),
          _field('ruc', 'RUC (opcional)', type: TextInputType.number, maxLength: 11),
          _field('contactName', 'Contacto'),
          _field('contactPhone', 'Teléfono', type: TextInputType.phone),
          _field('contactEmail', 'Email', type: TextInputType.emailAddress),
          _field('address', 'Dirección'),
          _field('notes', 'Notas', maxLines: 2),
          const SizedBox(height: 12),
          SubmitButton(label: widget.company != null ? 'Actualizar' : 'Guardar', busy: _saving, onPressed: _save),
        ]),
      ),
    );
  }
}

/// Datos del negocio que aparecen como emisor en las cotizaciones.
class IssuerFormScreen extends StatefulWidget {
  const IssuerFormScreen({super.key});

  @override
  State<IssuerFormScreen> createState() => _IssuerFormScreenState();
}

class _IssuerFormScreenState extends State<IssuerFormScreen> with LoaderMixin {
  final _name = TextEditingController();
  final _ruc = TextEditingController();
  final _igv = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  @override
  Future<void> fetch() async {
    final config = asMap(await context.api.get('/configuration'));
    _name.text = config['businessName'] ?? 'Gracia Spa';
    _ruc.text = config['businessRuc'] ?? '';
    _address.text = config['businessAddress'] ?? '';
    _phone.text = config['businessPhone'] ?? '';
    _email.text = config['businessEmail'] ?? '';
    _igv.text = config['igvRate'] == null ? '18' : formatNumber(config['igvRate']);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await context.api.patch('/configuration', {
        'businessName': _name.text.trim(),
        'businessRuc': _ruc.text.trim(),
        'businessAddress': _address.text.trim(),
        'businessPhone': _phone.text.trim(),
        'businessEmail': _email.text.trim(),
        'igvRate': double.tryParse(_igv.text.replaceAll(',', '.')) ?? 18,
      });
      if (!mounted) return;
      showSuccess(context, 'Datos del emisor actualizados');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Datos del emisor')),
      body: loaderBody(() => Form(
            key: _formKey,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              Text(
                'Se muestran en el encabezado de las cotizaciones. El RUC solo aparece en las cotizaciones donde se active "Mostrar RUC del emisor".',
                style: TextStyle(color: Theme.of(context).colorScheme.outline),
              ),
              const SizedBox(height: 16),
              TextFormField(
                  controller: _name, decoration: const InputDecoration(labelText: 'Nombre comercial *'), validator: requiredValidator),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _ruc,
                    maxLength: 11,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'RUC', counterText: ''),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _igv,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Tasa IGV (%)'),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextFormField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Teléfono')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
              const SizedBox(height: 12),
              TextFormField(controller: _address, decoration: const InputDecoration(labelText: 'Dirección')),
              const SizedBox(height: 24),
              SubmitButton(label: 'Guardar', busy: _saving, onPressed: _save),
            ]),
          )),
    );
  }
}
