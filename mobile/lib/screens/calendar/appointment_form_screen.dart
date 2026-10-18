import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import '../clients/client_form_screen.dart';

class _ServiceLine {
  _ServiceLine({required this.serviceId, required this.workerIds, required this.cost, required this.duration});

  int serviceId;
  Set<int> workerIds;
  double cost;
  int duration;
}

/// Nueva cita (varios servicios seguidos) o edición de una cita. Devuelve true si se guardó.
class AppointmentFormScreen extends StatefulWidget {
  const AppointmentFormScreen({super.key, this.appointment, this.initialDate});

  final Map<String, dynamic>? appointment;
  final DateTime? initialDate;

  @override
  State<AppointmentFormScreen> createState() => _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends State<AppointmentFormScreen> with LoaderMixin {
  List<Map<String, dynamic>> clients = [];
  List<Map<String, dynamic>> services = [];
  List<Map<String, dynamic>> workers = [];
  String whatsappTemplate = '';

  int? clientId;
  late DateTime day;
  String time = '09:00';
  String status = 'PENDING';
  final notes = TextEditingController();
  final advanceAmount = TextEditingController();
  String paymentMethod = 'CASH';
  final List<_ServiceLine> lines = [];

  // Servicio en edición
  int? currentServiceId;
  Set<int> currentWorkers = {};
  final currentCost = TextEditingController();
  final currentDuration = TextEditingController();
  int? editingIndex;

  bool saving = false;

  Map<String, dynamic>? get appointment => widget.appointment;

  @override
  void initState() {
    super.initState();
    day = widget.initialDate ?? limaToday();
    final appt = appointment;
    if (appt != null) {
      final start = toLima(parseIso(appt['date'])!);
      day = DateTime.utc(start.year, start.month, start.day);
      time = hhmm(start.hour, start.minute);
      clientId = toIntOrNull(appt['clientId']);
      status = appt['status'] ?? 'PENDING';
      notes.text = appt['notes'] ?? '';
      final advance = asMapList(appt['payments']).where((p) => p['type'] == 'ADVANCE').firstOrNull;
      if (advance != null) {
        advanceAmount.text = formatNumber(advance['amount']);
        paymentMethod = advance['method'] ?? 'CASH';
      }
      final workerList = asMapList(appt['workers']);
      lines.add(_ServiceLine(
        serviceId: toInt(appt['serviceId']),
        workerIds: workerList.isNotEmpty
            ? workerList.map((w) => toInt(w['workerId'])).toSet()
            : {if (appt['workerId'] != null) toInt(appt['workerId'])},
        cost: toDouble(appt['cost']),
        duration: toInt(appt['duration']) == 0 ? 60 : toInt(appt['duration']),
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
      api.get('/configuration').catchError((_) => <String, dynamic>{}),
    ]);
    clients = asMapList(results[0]);
    services = asMapList(results[1]);
    workers = asMapList(results[2]);
    whatsappTemplate = asMap(results[3])['whatsappMessageTemplate'] ?? '';
  }

  Map<String, dynamic>? _service(int? id) => services.where((s) => toInt(s['id']) == id).firstOrNull;

  void _selectService(int? id) {
    final svc = _service(id);
    setState(() {
      currentServiceId = id;
      if (svc != null) {
        currentCost.text = formatNumber(svc['price']);
        currentDuration.text = '${toInt(svc['durationMin'])}';
      }
    });
  }

  void _editLine(int index) {
    final line = lines[index];
    setState(() {
      editingIndex = index;
      currentServiceId = line.serviceId;
      currentWorkers = {...line.workerIds};
      currentCost.text = formatNumber(line.cost);
      currentDuration.text = '${line.duration}';
    });
  }

  void _addLine() {
    final cost = double.tryParse(currentCost.text.replaceAll(',', '.'));
    final duration = int.tryParse(currentDuration.text);
    if (currentServiceId == null || currentWorkers.isEmpty || cost == null || duration == null) {
      showError(context, 'Complete los datos del servicio y asigne al menos un terapeuta');
      return;
    }
    final line = _ServiceLine(serviceId: currentServiceId!, workerIds: {...currentWorkers}, cost: cost, duration: duration);
    setState(() {
      if (editingIndex != null) {
        lines[editingIndex!] = line;
        editingIndex = null;
      } else if (appointment != null) {
        // Una cita existente tiene un solo servicio: se reemplaza.
        lines
          ..clear()
          ..add(line);
      } else {
        lines.add(line);
      }
      currentServiceId = null;
      currentWorkers = {};
      currentCost.clear();
      currentDuration.clear();
    });
  }

  Future<void> _newClient() async {
    final created = await openForm<Map<String, dynamic>>(context, const ClientFormScreen());
    if (created == null) return;
    setState(() {
      clients.add(created);
      clientId = toInt(created['id']);
    });
  }

  DateTime get _startInstant {
    final parts = time.split(':').map(int.parse).toList();
    return fromLima(day.year, day.month, day.day, parts[0], parts[1]);
  }

  Future<void> _submit() async {
    if (clientId == null) {
      showError(context, 'Seleccione un cliente');
      return;
    }
    if (lines.isEmpty) {
      showError(context, 'Agregue al menos un servicio');
      return;
    }
    setState(() => saving = true);
    final advance = double.tryParse(advanceAmount.text.replaceAll(',', '.')) ?? 0;
    final date = _startInstant.toIso8601String();
    try {
      dynamic result;
      if (appointment != null) {
        final line = lines.first;
        result = await context.api.patch('/appointments/${appointment!['id']}', {
          'clientId': clientId,
          'serviceId': line.serviceId,
          'workerIds': line.workerIds.toList(),
          'date': date,
          'status': status,
          'cost': line.cost,
          'duration': line.duration,
          'notes': notes.text,
          'advanceAmount': advance,
          'paymentMethod': paymentMethod,
        });
      } else {
        result = await context.api.post('/appointments/batch', {
          'clientId': clientId,
          'date': date,
          'status': status,
          'notes': notes.text,
          'services': [
            for (final line in lines)
              {'serviceId': line.serviceId, 'workerIds': line.workerIds.toList(), 'cost': line.cost, 'duration': line.duration},
          ],
          'advanceAmount': advance,
          'paymentMethod': paymentMethod,
        });
      }
      if (!mounted) return;
      final created = asMap(result is List && result.isNotEmpty ? result.first : result);
      await _showConfirmation(created);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> _showConfirmation(Map<String, dynamic> created) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 48),
        title: Text(appointment != null ? '¡Cita actualizada!' : '¡Reserva registrada!'),
        content: const Text('La cita ha sido guardada exitosamente en el sistema.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cerrar')),
          if (whatsappTemplate.isNotEmpty)
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
              icon: const Icon(Icons.chat),
              label: const Text('Enviar WhatsApp'),
              onPressed: () {
                Navigator.pop(dialogContext);
                _sendWhatsapp(created);
              },
            ),
        ],
      ),
    );
  }

  void _sendWhatsapp(Map<String, dynamic> created) {
    final client = clients.where((c) => toInt(c['id']) == toInt(created['clientId'] ?? clientId)).firstOrNull;
    final phone = client?['phone'] as String?;
    if (phone == null || phone.isEmpty) {
      showError(context, 'El cliente no tiene un número de teléfono registrado.');
      return;
    }
    final service = _service(toIntOrNull(created['serviceId']) ?? lines.first.serviceId);
    final start = toLima(parseIso(created['date']) ?? _startInstant);
    final message = whatsappTemplate
        .replaceAll('{name}', client?['name'] ?? '')
        .replaceAll('{service}', service?['name'] ?? '')
        .replaceAll('{date}', DateFormat("dd 'de' MMMM 'de' yyyy", 'es').format(start))
        .replaceAll('{time}', DateFormat('HH:mm').format(start));
    openWhatsApp(phone, message);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(appointment != null ? 'Editar cita' : 'Nueva cita')),
      body: loaderBody(_form),
    );
  }

  Widget _form() {
    final workerOptions = {for (final w in workers) toInt(w['id']): w['name']?.toString() ?? ''};
    var cumulative = 0;
    final start = _startInstant;
    final totalCost = lines.fold<double>(0, (sum, l) => sum + l.cost);
    final totalDuration = lines.fold<int>(0, (sum, l) => sum + l.duration);

    return ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [
        Expanded(
          child: SearchSelectField(
            label: 'Cliente *',
            options: clients,
            value: clientId,
            searchHint: 'Buscar por nombre o teléfono',
            subtitleOf: (c) => c['phone']?.toString() ?? '',
            onChanged: (c) => setState(() => clientId = toIntOrNull(c?['id'])),
          ),
        ),
        IconButton.filledTonal(tooltip: 'Nuevo cliente', onPressed: _newClient, icon: const Icon(Icons.person_add_alt)),
      ]),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: DateField(label: 'Fecha', value: day, onChanged: (d) => setState(() => day = d ?? day))),
        const SizedBox(width: 12),
        Expanded(child: TimeField(label: 'Hora de inicio', value: time, onChanged: (t) => setState(() => time = t))),
      ]),
      const SizedBox(height: 12),
      SelectField<String>(
        label: 'Estado',
        value: status,
        items: {
          for (final key in ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']) key: appointmentStatus[key]!.label,
          if (status == 'NO_SHOW') 'NO_SHOW': appointmentStatus['NO_SHOW']!.label,
        },
        onChanged: (v) => setState(() => status = v ?? status),
      ),
      const FormSectionTitle('Servicios de la reserva'),
      if (lines.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No hay servicios agregados todavía.')))
      else
        Card(
          child: Column(children: [
            for (var i = 0; i < lines.length; i++)
              Builder(builder: (context) {
                final line = lines[i];
                final lineStart = start.add(Duration(minutes: cumulative));
                cumulative += line.duration;
                return ListTile(
                  leading: Text(formatTime(lineStart), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  title: Text(_service(line.serviceId)?['name'] ?? 'Servicio'),
                  subtitle: Text(
                      '${line.workerIds.map((id) => workerOptions[id]).whereType<String>().join(', ')} · ${line.duration} min'),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(formatMoney(line.cost), style: const TextStyle(fontWeight: FontWeight.w700)),
                    IconButton(tooltip: 'Editar', icon: const Icon(Icons.edit_outlined), onPressed: () => _editLine(i)),
                    IconButton(
                      tooltip: 'Eliminar',
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => setState(() {
                        lines.removeAt(i);
                        editingIndex = null;
                      }),
                    ),
                  ]),
                );
              }),
            const Divider(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Row(children: [
                const Expanded(child: Text('Resumen total', style: TextStyle(fontWeight: FontWeight.w700))),
                Text('$totalDuration min   ', style: TextStyle(color: Theme.of(context).colorScheme.outline)),
                Text(formatMoney(totalCost), style: const TextStyle(fontWeight: FontWeight.w800)),
              ]),
            ),
          ]),
        ),
      const SizedBox(height: 12),
      Card(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(editingIndex != null ? 'Editar servicio' : 'Agregar servicio',
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            SearchSelectField(
              label: 'Servicio',
              options: services,
              value: currentServiceId,
              emptyLabel: 'Seleccionar servicio',
              subtitleOf: (s) => formatMoney(s['price']),
              onChanged: (s) => _selectService(toIntOrNull(s?['id'])),
            ),
            const SizedBox(height: 8),
            const Text('Terapeutas asignados *'),
            const SizedBox(height: 4),
            MultiSelectChips(
              options: workerOptions,
              selected: currentWorkers,
              onChanged: (v) => setState(() => currentWorkers = v),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: currentCost,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Costo (S/)'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: currentDuration,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Duración (min)'),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _addLine,
              icon: const Icon(Icons.add),
              label: Text(editingIndex != null
                  ? 'Guardar cambios en servicio'
                  : appointment != null
                      ? 'Actualizar servicio'
                      : 'Añadir a la reserva'),
            ),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: notes,
        maxLines: 2,
        decoration: const InputDecoration(labelText: 'Notas', hintText: 'Opcional...'),
      ),
      const FormSectionTitle('Adelanto para separar la cita'),
      Row(children: [
        Expanded(
          child: TextField(
            controller: advanceAmount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Monto (S/)', hintText: '0.00'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: SelectField<String>(
            label: 'Método de pago',
            value: paymentMethod,
            items: paymentMethods,
            onChanged: (v) => setState(() => paymentMethod = v ?? paymentMethod),
          ),
        ),
      ]),
      const SizedBox(height: 24),
      SubmitButton(
        label: appointment != null ? 'Actualizar reserva' : 'Confirmar reserva',
        busy: saving,
        onPressed: lines.isEmpty ? null : _submit,
      ),
      const SizedBox(height: 24),
    ]);
  }
}
