import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import '../clients/client_form_screen.dart';

class _AttentionLine {
  _AttentionLine(this.serviceId, this.workerIds, this.totalCost);
  final int serviceId;
  final Set<int> workerIds;
  final double totalCost;
}

/// Registrar (varios servicios) o editar una atención. Devuelve true si se guardó.
class AttentionFormScreen extends StatefulWidget {
  const AttentionFormScreen({super.key, this.attention});

  final Map<String, dynamic>? attention;

  @override
  State<AttentionFormScreen> createState() => _AttentionFormScreenState();
}

class _AttentionFormScreenState extends State<AttentionFormScreen> with LoaderMixin {
  List<Map<String, dynamic>> clients = [];
  List<Map<String, dynamic>> services = [];
  List<Map<String, dynamic>> workers = [];
  List<Map<String, dynamic>> appointments = [];

  int? clientId;
  int? appointmentId;
  DateTime date = limaToday();
  final notes = TextEditingController();
  final List<_AttentionLine> lines = [];
  double advanceAmount = 0;

  int? currentServiceId;
  Set<int> currentWorkers = {};
  final currentCost = TextEditingController();
  bool saving = false;

  Map<String, dynamic>? get attention => widget.attention;

  @override
  void initState() {
    super.initState();
    final att = attention;
    if (att != null) {
      clientId = toIntOrNull(att['clientId']);
      appointmentId = toIntOrNull(att['appointmentId']);
      notes.text = att['notes'] ?? '';
      if (att['date'] != null) date = effectiveDay(att['date']);
      lines.add(_AttentionLine(
        toInt(att['serviceId']),
        asMapList(att['workers']).map((w) => toInt(w['workerId'])).toSet(),
        toDouble(att['totalCost']),
      ));
    }
  }

  @override
  Future<void> fetch() async {
    final api = context.api;
    final results = await Future.wait([
      api.get('/clients'),
      api.get('/services'),
      api.get('/users'),
      api.get('/appointments').catchError((_) => <dynamic>[]),
    ]);
    clients = asMapList(results[0]);
    services = asMapList(results[1]);
    workers = asMapList(results[2]);
    appointments = asMapList(results[3]);
  }

  Map<String, dynamic>? _service(int? id) => services.where((s) => toInt(s['id']) == id).firstOrNull;

  Future<void> _selectAppointment(int? id) async {
    setState(() => appointmentId = id);
    if (id == null) {
      setState(() {
        advanceAmount = 0;
        if (attention == null) lines.clear();
      });
      return;
    }
    try {
      final apt = asMap(await context.api.get('/appointments/$id'));
      final advance = asMapList(apt['payments'])
          .where((p) => p['type'] == 'ADVANCE')
          .fold<double>(0, (sum, p) => sum + toDouble(p['amount']));
      final workerList = asMapList(apt['workers']);
      if (!mounted) return;
      setState(() {
        advanceAmount = advance;
        // Precarga el servicio de la cita
        if (apt['serviceId'] != null) {
          lines
            ..clear()
            ..add(_AttentionLine(
              toInt(apt['serviceId']),
              workerList.isNotEmpty
                  ? workerList.map((w) => toInt(w['workerId'])).toSet()
                  : {if (apt['workerId'] != null) toInt(apt['workerId'])},
              toDouble(apt['cost']),
            ));
        }
      });
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  void _addLine() {
    final cost = double.tryParse(currentCost.text.replaceAll(',', '.'));
    if (currentServiceId == null || cost == null) {
      showError(context, 'Debe seleccionar un servicio y establecer su costo');
      return;
    }
    if (currentWorkers.isEmpty) {
      showError(context, 'Debe asignar al menos un terapeuta por servicio');
      return;
    }
    setState(() {
      final line = _AttentionLine(currentServiceId!, {...currentWorkers}, cost);
      if (attention != null) lines.clear();
      lines.add(line);
      currentServiceId = null;
      currentWorkers = {};
      currentCost.clear();
    });
  }

  Future<void> _newClient() async {
    final created = await openForm<Map<String, dynamic>>(context, const ClientFormScreen());
    if (created == null) return;
    setState(() {
      clients.add(created);
      clientId = toInt(created['id']);
      appointmentId = null;
    });
  }

  Future<void> _newService() async {
    final name = TextEditingController();
    final price = TextEditingController();
    final duration = TextEditingController(text: '60');
    final created = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (dialogContext) {
        var creating = false;
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) => AlertDialog(
            title: const Text('Nuevo servicio'),
            content: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: name, autofocus: true, decoration: const InputDecoration(labelText: 'Nombre *')),
              const SizedBox(height: 8),
              TextField(
                controller: price,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Precio S/ *'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: duration,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Duración (min)'),
              ),
            ]),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')),
              FilledButton(
                onPressed: creating
                    ? null
                    : () async {
                        final priceValue = double.tryParse(price.text.replaceAll(',', '.'));
                        if (name.text.trim().isEmpty || priceValue == null) {
                          showError(context, 'Nombre y precio son requeridos');
                          return;
                        }
                        setDialogState(() => creating = true);
                        try {
                          final result = await context.api.post('/services', {
                            'name': name.text.trim(),
                            'price': priceValue,
                            'durationMin': int.tryParse(duration.text) ?? 60,
                          });
                          if (dialogContext.mounted) Navigator.pop(dialogContext, asMap(result));
                        } catch (e) {
                          setDialogState(() => creating = false);
                          if (mounted) showError(context, e);
                        }
                      },
                child: Text(creating ? 'Creando...' : 'Crear y seleccionar'),
              ),
            ],
          ),
        );
      },
    );
    if (created == null || !mounted) return;
    setState(() {
      services.add(created);
      currentServiceId = toInt(created['id']);
      currentCost.text = formatNumber(created['price']);
    });
    showSuccess(context, 'Servicio "${created['name']}" creado y seleccionado');
  }

  Future<void> _submit() async {
    if (clientId == null) {
      showError(context, 'Seleccione un cliente');
      return;
    }
    if (lines.isEmpty) {
      showError(context, 'Debe agregar al menos un servicio a la atención');
      return;
    }
    setState(() => saving = true);
    final base = {
      'clientId': clientId,
      'notes': notes.text,
      'date': calendarIso(date),
      'appointmentId': ?appointmentId,
    };
    try {
      if (attention != null) {
        final line = lines.first;
        await context.api.patch('/attentions/${attention!['id']}', {
          ...base,
          'serviceId': line.serviceId,
          'workerIds': line.workerIds.toList(),
          'totalCost': line.totalCost,
        });
      } else {
        await context.api.post('/attentions/batch', {
          ...base,
          'services': [
            for (final line in lines)
              {'serviceId': line.serviceId, 'workerIds': line.workerIds.toList(), 'totalCost': line.totalCost},
          ],
        });
      }
      if (!mounted) return;
      showSuccess(context, attention != null ? 'Atención actualizada' : 'Atención registrada');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(attention != null ? 'Editar atención' : 'Nueva atención')),
      body: loaderBody(_form),
    );
  }

  Widget _form() {
    final workerOptions = {for (final w in workers) toInt(w['id']): w['name']?.toString() ?? ''};
    final total = lines.fold<double>(0, (sum, l) => sum + l.totalCost);
    final clientAppointments =
        appointments.where((a) => toInt(a['clientId']) == clientId && a['status'] != 'CANCELLED').toList();

    return ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [
        Expanded(
          child: SearchSelectField(
            label: 'Cliente *',
            options: clients,
            value: clientId,
            searchHint: 'Buscar por nombre o teléfono',
            subtitleOf: (c) => c['phone']?.toString() ?? '',
            onChanged: (c) => setState(() {
              clientId = toIntOrNull(c?['id']);
              appointmentId = null;
              advanceAmount = 0;
            }),
          ),
        ),
        IconButton.filledTonal(tooltip: 'Nuevo cliente', onPressed: _newClient, icon: const Icon(Icons.person_add_alt)),
      ]),
      Row(children: [
        const Expanded(child: FormSectionTitle('Servicios *')),
        TextButton.icon(onPressed: _newService, icon: const Icon(Icons.add_circle_outline), label: const Text('Nuevo servicio')),
      ]),
      if (lines.isNotEmpty)
        Card(
          child: Column(children: [
            for (var i = 0; i < lines.length; i++)
              ListTile(
                title: Text(_service(lines[i].serviceId)?['name'] ?? 'Servicio'),
                subtitle: Text(
                    'Terapeutas: ${lines[i].workerIds.map((id) => workerOptions[id]).whereType<String>().join(', ')}'),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(formatMoney(lines[i].totalCost), style: const TextStyle(fontWeight: FontWeight.w700)),
                  IconButton(
                    tooltip: 'Quitar',
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => lines.removeAt(i)),
                  ),
                ]),
              ),
            const Divider(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Column(children: [
                InfoRow('Costo total', formatMoney(total), bold: true),
                if (advanceAmount > 0) ...[
                  InfoRow('Adelanto registrado', '- ${formatMoney(advanceAmount)}', color: const Color(0xFF15803D)),
                  InfoRow('Saldo a cobrar', formatMoney(total - advanceAmount), bold: true),
                ],
              ]),
            ),
          ]),
        ),
      const SizedBox(height: 8),
      Card(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SearchSelectField(
              label: 'Servicio',
              options: services,
              value: currentServiceId,
              emptyLabel: 'Seleccionar servicio',
              subtitleOf: (s) => formatMoney(s['price']),
              onChanged: (s) => setState(() {
                currentServiceId = toIntOrNull(s?['id']);
                if (s != null) currentCost.text = formatNumber(s['price']);
              }),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: currentCost,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Costo (S/)'),
            ),
            const SizedBox(height: 8),
            const Text('Personal asignado *'),
            const SizedBox(height: 4),
            MultiSelectChips(
              options: workerOptions,
              selected: currentWorkers,
              onChanged: (v) => setState(() => currentWorkers = v),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _addLine,
              icon: const Icon(Icons.add),
              label: Text(attention != null ? 'Reemplazar servicio' : 'Añadir a la atención'),
            ),
          ]),
        ),
      ),
      if (clientId != null) ...[
        const SizedBox(height: 12),
        SelectField<int>(
          label: 'Cita asociada (opcional)',
          value: appointmentId ?? 0,
          items: {
            0: 'Sin cita asociada',
            for (final a in clientAppointments)
              toInt(a['id']): '${formatDateTime(a['date'])} — ${a['service']?['name'] ?? ''}',
          },
          onChanged: (v) => _selectAppointment(v == 0 ? null : v),
        ),
      ],
      const SizedBox(height: 12),
      DateField(label: 'Fecha', value: date, onChanged: (d) => setState(() => date = d ?? date)),
      const SizedBox(height: 12),
      TextField(controller: notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notas')),
      const SizedBox(height: 24),
      SubmitButton(
        label: attention != null ? 'Actualizar atención' : 'Guardar atención',
        busy: saving,
        onPressed: lines.isEmpty ? null : _submit,
      ),
      const SizedBox(height: 24),
    ]);
  }
}
