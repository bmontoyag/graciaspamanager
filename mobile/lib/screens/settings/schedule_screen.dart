import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Horario de atención, tiempo entre citas y bloqueos (feriados, mantenimiento).
class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> with LoaderMixin {
  String openTime = '09:00';
  String closeTime = '21:00';
  final _buffer = TextEditingController(text: '10');
  List<Map<String, dynamic>> slots = [];
  bool _saving = false;

  DateTime? _slotDate;
  String? _slotStart;
  String? _slotEnd;
  final _slotReason = TextEditingController();

  @override
  Future<void> fetch() async {
    final results = await Future.wait([context.api.get('/configuration'), context.api.get('/blocked-slots')]);
    final config = asMap(results[0]);
    openTime = config['openTime'] ?? '09:00';
    closeTime = config['closeTime'] ?? '21:00';
    _buffer.text = '${config['appointmentBuffer'] ?? 10}';
    slots = asMapList(results[1]);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await runAction(
      () => context.api.patch('/configuration', {
        'openTime': openTime,
        'closeTime': closeTime,
        'appointmentBuffer': int.tryParse(_buffer.text) ?? 0,
      }),
      success: 'Horarios actualizados correctamente',
    );
    if (mounted) setState(() => _saving = false);
    if (!ok) return;
  }

  Future<void> _addSlot() async {
    if (_slotDate == null || _slotStart == null || _slotEnd == null) {
      showError(context, 'Complete la fecha, la hora de inicio y la hora de fin');
      return;
    }
    final ok = await runAction(
      () => context.api.post('/blocked-slots', {
        'date': dateKey(_slotDate!),
        'startTime': _slotStart,
        'endTime': _slotEnd,
        'reason': _slotReason.text.trim(),
      }),
      success: 'Bloqueo agregado correctamente',
    );
    if (!ok || !mounted) return;
    setState(() {
      _slotDate = null;
      _slotStart = null;
      _slotEnd = null;
      _slotReason.clear();
    });
    reload(silent: true);
  }

  Future<void> _deleteSlot(Map<String, dynamic> slot) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar bloqueo', message: '¿Estás seguro de eliminar este bloqueo?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/blocked-slots/${slot['id']}'))) reload(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Horarios de atención',
      route: '/schedule',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            SectionCard(
              title: 'Configuración general',
              icon: Icons.schedule,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  Expanded(
                      child: TimeField(label: 'Hora de apertura', value: openTime, onChanged: (v) => setState(() => openTime = v))),
                  const SizedBox(width: 12),
                  Expanded(
                      child: TimeField(label: 'Hora de cierre', value: closeTime, onChanged: (v) => setState(() => closeTime = v))),
                ]),
                const SizedBox(height: 12),
                TextField(
                  controller: _buffer,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Tiempo entre citas (minutos)',
                    helperText: 'Margen automático para limpieza/preparación entre citas.',
                  ),
                ),
                const SizedBox(height: 16),
                SubmitButton(label: 'Guardar cambios', busy: _saving, onPressed: _save),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Bloqueos y feriados',
              subtitle: 'Días u horas en que el negocio no estará disponible para citas.',
              icon: Icons.block,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const FormSectionTitle('Nuevo bloqueo'),
                DateField(label: 'Fecha', value: _slotDate, onChanged: (d) => setState(() => _slotDate = d)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: TimeField(label: 'Inicio', value: _slotStart, onChanged: (v) => setState(() => _slotStart = v))),
                  const SizedBox(width: 12),
                  Expanded(child: TimeField(label: 'Fin', value: _slotEnd, onChanged: (v) => setState(() => _slotEnd = v))),
                ]),
                const SizedBox(height: 12),
                TextField(
                  controller: _slotReason,
                  decoration: const InputDecoration(labelText: 'Motivo (opcional)', hintText: 'Ej. Feriado, mantenimiento'),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(onPressed: _addSlot, icon: const Icon(Icons.add), label: const Text('Agregar bloqueo')),
                const FormSectionTitle('Bloqueos registrados'),
                if (slots.isEmpty) const EmptyView('No hay bloqueos registrados.', icon: Icons.event_available),
                for (final slot in slots)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.event_busy, color: Color(0xFFDC2626)),
                    title: Text(formatDate(slot['date'])),
                    subtitle: Text([
                      '${slot['startTime']} - ${slot['endTime']}',
                      if ((slot['reason'] ?? '').toString().isNotEmpty) slot['reason'],
                    ].join(' · ')),
                    trailing:
                        IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _deleteSlot(slot)),
                  ),
              ]),
            ),
          ])),
    );
  }
}
