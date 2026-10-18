import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'quote_detail_screen.dart';

/// Detalle de un evento corporativo: jornadas, terapeutas, cobros y gastos.
class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key, required this.eventId});

  final int eventId;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> with LoaderMixin {
  Map<String, dynamic> event = {};
  List<Map<String, dynamic>> users = [];
  bool _busy = false;

  final _title = TextEditingController();
  final _location = TextEditingController();
  final _agreedAmount = TextEditingController();
  final _notes = TextEditingController();

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/corporate/events/${widget.eventId}'),
      context.api.get('/users').catchError((_) => <dynamic>[]),
    ]);
    _apply(results[0]);
    users = asMapList(results[1]);
  }

  void _apply(dynamic data) {
    event = asMap(data);
    _title.text = event['title'] ?? '';
    _location.text = event['location'] ?? '';
    _agreedAmount.text = formatNumber(event['agreedAmount']);
    _notes.text = event['notes'] ?? '';
  }

  /// Ejecuta una llamada que devuelve el evento actualizado.
  Future<bool> _run(Future<dynamic> Function() action, {String? success}) async {
    setState(() => _busy = true);
    try {
      final result = await action();
      if (!mounted) return false;
      if (result is Map && result['id'] != null) setState(() => _apply(result));
      if (success != null) showSuccess(context, success);
      return true;
    } catch (e) {
      if (mounted) showError(context, e);
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteEvent() async {
    final ok = await confirmDialog(context,
        title: '¿Eliminar el evento?',
        message: 'La cotización volverá a estado Aceptada.',
        confirmText: 'Eliminar',
        destructive: true);
    if (!ok || !mounted) return;
    final done = await _run(() => context.api.delete('/corporate/events/${widget.eventId}'), success: 'Evento eliminado');
    if (done && mounted) Navigator.pop(context);
  }

  Future<void> _removeItem(String path, String message) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar registro', message: '¿Eliminar este registro?', confirmText: 'Eliminar', destructive: true);
    if (ok && mounted) await _run(() => context.api.delete(path), success: message);
  }

  Future<void> _addDay() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _NewDaySheet(),
    );
    if (result != null && mounted) {
      await _run(() => context.api.post('/corporate/events/${widget.eventId}/days', result), success: 'Jornada agregada');
    }
  }

  Future<void> _addPayment() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _PaymentSheet(),
    );
    if (result != null && mounted) {
      await _run(() => context.api.post('/corporate/events/${widget.eventId}/payments', result), success: 'Cobro registrado');
    }
  }

  Future<void> _addExpense() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _ExpenseSheet(),
    );
    if (result != null && mounted) {
      await _run(() => context.api.post('/corporate/events/${widget.eventId}/expenses', result), success: 'Gasto registrado');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(event['title'] ?? 'Evento'),
        actions: [
          if (event.isNotEmpty)
            IconButton(tooltip: 'Eliminar evento', onPressed: _busy ? null : _deleteEvent, icon: const Icon(Icons.delete_outline)),
        ],
      ),
      body: loaderBody(_content),
    );
  }

  Widget _content() {
    final summary = asMap(event['summary']);
    final quote = event['quote'] == null ? null : asMap(event['quote']);
    final days = asMapList(event['days']);
    final payments = asMapList(event['payments']);
    final workerExpenseIds = {
      for (final d in days)
        for (final w in asMapList(d['workers']))
          if (w['expenseId'] != null) w['expenseId'],
    };
    final otherExpenses = asMapList(event['expenses']).where((e) => !workerExpenseIds.contains(e['id'])).toList();
    final defaultRate = toDouble(quote?['therapistDayRate']);
    final margin = toDouble(summary['estimatedMargin']);
    final outline = Theme.of(context).colorScheme.outline;

    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), children: [
      Text(
        [event['company']?['name'], event['location']].where((v) => v != null && v.toString().isNotEmpty).join(' · '),
        style: TextStyle(color: outline),
      ),
      if (quote != null)
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => QuoteDetailScreen(quoteId: toInt(quote['id'])))),
            icon: const Icon(Icons.description_outlined, size: 18),
            label: Text('Cotización ${quote['code'] ?? ''}'),
          ),
        ),
      const SizedBox(height: 8),
      SelectField<String>(
        label: 'Estado del evento',
        value: event['status'],
        enabled: !_busy,
        items: {for (final e in eventStatus.entries) e.key: e.value.label},
        onChanged: (v) {
          if (v != null && v != event['status']) {
            _run(() => context.api.patch('/corporate/events/${widget.eventId}', {'status': v}), success: 'Estado actualizado');
          }
        },
      ),
      const SizedBox(height: 16),
      StatGrid(children: [
        StatCard(
          label: 'Monto acordado',
          value: formatMoney(summary['agreedAmount']),
          hint: quote?['includeIgv'] == true ? 'Incluye IGV ${formatMoney(quote!['igvAmount'])}' : null,
        ),
        StatCard(
          label: 'Cobrado',
          value: formatMoney(summary['totalPaid']),
          color: const Color(0xFF16A34A),
          hint: 'Saldo: ${formatMoney(summary['balance'])}',
        ),
        StatCard(
          label: 'Pago terapeutas',
          value: formatMoney(summary['therapistCost']),
          color: const Color(0xFFDC2626),
          hint: 'Pagado ${formatMoney(summary['therapistPaid'])} · Pendiente ${formatMoney(summary['therapistPending'])}',
        ),
        StatCard(
          label: 'Margen estimado',
          value: formatMoney(margin),
          color: margin >= 0 ? Theme.of(context).colorScheme.primary : const Color(0xFFDC2626),
          hint: 'Otros gastos ${formatMoney(summary['otherExpenses'])} · ${toInt(summary['sessionsTotal'])} sesiones',
        ),
      ]),
      const SizedBox(height: 20),
      Row(children: [
        Expanded(child: Text('Jornadas', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700))),
        TextButton.icon(onPressed: _busy ? null : _addDay, icon: const Icon(Icons.add), label: const Text('Agregar jornada')),
      ]),
      const SizedBox(height: 8),
      for (final day in days)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _DayCard(
            day: day,
            users: users,
            defaultRate: defaultRate,
            busy: _busy,
            run: _run,
          ),
        ),
      const SizedBox(height: 8),
      SectionCard(
        title: 'Cobros a la empresa',
        icon: Icons.payments_outlined,
        trailing: IconButton(tooltip: 'Registrar cobro', onPressed: _busy ? null : _addPayment, icon: const Icon(Icons.add_circle_outline)),
        child: payments.isEmpty
            ? const EmptyView('Sin cobros registrados.')
            : Column(children: [
                for (final p in payments)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${paymentTypes[p['type']] ?? p['type']} · ${paymentMethods[p['method']] ?? p['method']}'),
                    subtitle: Text([formatDay(p['date']), if ((p['notes'] ?? '').toString().isNotEmpty) p['notes']].join(' · ')),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(formatMoney(p['amount']),
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF16A34A))),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _removeItem('/corporate/event-payments/${p['id']}', 'Cobro eliminado'),
                      ),
                    ]),
                  ),
              ]),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Otros gastos del evento',
        icon: Icons.receipt_long_outlined,
        subtitle: 'Los pagos a terapeutas se registran desde cada jornada y también aparecen en Gastos.',
        trailing: IconButton(tooltip: 'Registrar gasto', onPressed: _busy ? null : _addExpense, icon: const Icon(Icons.add_circle_outline)),
        child: otherExpenses.isEmpty
            ? const EmptyView('Sin gastos adicionales.')
            : Column(children: [
                for (final e in otherExpenses)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(e['description'] ?? ''),
                    subtitle: Text('${formatDay(e['date'])} · ${e['category'] ?? ''}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('- ${formatMoney(e['amount'])}',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _removeItem('/corporate/event-expenses/${e['id']}', 'Gasto eliminado'),
                      ),
                    ]),
                  ),
              ]),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Datos del evento',
        icon: Icons.edit_note,
        child: Column(children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Título')),
          const SizedBox(height: 12),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Lugar')),
          const SizedBox(height: 12),
          TextField(
            controller: _agreedAmount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Monto acordado (S/)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Notas (accesos, contacto en sede, etc.)'),
          ),
          const SizedBox(height: 16),
          SubmitButton(
            label: 'Guardar datos',
            busy: _busy,
            onPressed: () => _run(
              () => context.api.patch('/corporate/events/${widget.eventId}', {
                'title': _title.text,
                'location': _location.text,
                'agreedAmount': double.tryParse(_agreedAmount.text.replaceAll(',', '.')) ?? 0,
                'notes': _notes.text,
              }),
              success: 'Evento actualizado',
            ),
          ),
        ]),
      ),
    ]);
  }
}

class _DayCard extends StatefulWidget {
  const _DayCard({required this.day, required this.users, required this.defaultRate, required this.busy, required this.run});

  final Map<String, dynamic> day;
  final List<Map<String, dynamic>> users;
  final double defaultRate;
  final bool busy;
  final Future<bool> Function(Future<dynamic> Function() action, {String? success}) run;

  @override
  State<_DayCard> createState() => _DayCardState();
}

class _DayCardState extends State<_DayCard> {
  int _workerId = 0;
  late final _payAmount = TextEditingController(text: formatNumber(widget.defaultRate));

  Map<String, dynamic> get day => widget.day;

  Future<void> _assign() async {
    if (_workerId == 0) return;
    try {
      final result = asMap(await context.api.post('/corporate/event-days/${day['id']}/workers', {
        'workerId': _workerId,
        'payAmount': double.tryParse(_payAmount.text.replaceAll(',', '.')) ?? 0,
      }));
      if (!mounted) return;
      final warnings = (result['warnings'] as List? ?? []).map((w) => '$w').toList();
      // El evento actualizado se aplica a través de run
      await widget.run(() async => result['event']);
      if (!mounted) return;
      setState(() => _workerId = 0);
      if (warnings.isNotEmpty) {
        showWarning(context, 'Terapeuta asignada con advertencias: ${warnings.join(' ')}');
      } else {
        showSuccess(context, 'Terapeuta asignada');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _editSessions() async {
    final value = await promptText(context,
        title: 'Sesiones atendidas', initial: day['sessionsCount'] == null ? '' : '${day['sessionsCount']}', label: 'Sesiones');
    if (value == null || !mounted) return;
    widget.run(() => context.api.patch('/corporate/event-days/${day['id']}', {'sessionsCount': int.tryParse(value.trim()) ?? 0}),
        success: 'Sesiones registradas');
  }

  Future<void> _editAmount(Map<String, dynamic> w) async {
    final value = await promptText(context, title: 'Pago de ${w['worker']?['name'] ?? ''}', initial: formatNumber(w['payAmount']), label: 'Monto S/');
    if (value == null || !mounted) return;
    final amount = double.tryParse(value.replaceAll(',', '.')) ?? 0;
    if (amount == toDouble(w['payAmount'])) return;
    widget.run(() => context.api.patch('/corporate/event-workers/${w['id']}', {'payAmount': amount}), success: 'Monto actualizado');
  }

  Future<void> _unpay(Map<String, dynamic> w) async {
    final ok = await confirmDialog(context,
        title: '¿Revertir el pago?', message: 'Se eliminará el gasto asociado a este pago.', confirmText: 'Revertir');
    if (ok && mounted) {
      widget.run(() => context.api.post('/corporate/event-workers/${w['id']}/unpay'), success: 'Pago revertido');
    }
  }

  Future<void> _removeDay() async {
    final ok = await confirmDialog(context,
        title: 'Eliminar jornada', message: '¿Eliminar esta jornada?', confirmText: 'Eliminar', destructive: true);
    if (ok && mounted) {
      widget.run(() => context.api.delete('/corporate/event-days/${day['id']}'), success: 'Jornada eliminada');
    }
  }

  @override
  Widget build(BuildContext context) {
    final workers = asMapList(day['workers']);
    final assigned = workers.map((w) => toInt(w['workerId'])).toSet();
    final available = widget.users.where((u) => u['isActive'] != false && !assigned.contains(toInt(u['id']))).toList();
    final dayTotal = workers.fold<double>(0, (sum, w) => sum + toDouble(w['payAmount']));
    final status = dayStatus[day['status']];
    final outline = Theme.of(context).colorScheme.outline;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(
              child: Text(capitalize(formatDay(day['date'], "EEEE dd 'de' MMMM 'de' yyyy")),
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            if (status != null) StatusBadge.info(status),
          ]),
          Text('${day['startTime']} - ${day['endTime']} · ${workers.length} terapeutas · ${formatMoney(dayTotal)}',
              style: TextStyle(color: outline, fontSize: 13)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: SelectField<String>(
                label: 'Estado',
                value: day['status'],
                enabled: !widget.busy,
                items: {for (final e in dayStatus.entries) e.key: e.value.label},
                onChanged: (v) {
                  if (v != null && v != day['status']) {
                    widget.run(() => context.api.patch('/corporate/event-days/${day['id']}', {'status': v}),
                        success: 'Estado de jornada actualizado');
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: widget.busy ? null : _editSessions,
              child: Text('Sesiones: ${day['sessionsCount'] ?? '-'}'),
            ),
            IconButton(
              tooltip: 'Eliminar jornada',
              onPressed: widget.busy ? null : _removeDay,
              icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
            ),
          ]),
          const Divider(height: 24),
          if (workers.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text('Sin terapeutas asignadas.', textAlign: TextAlign.center, style: TextStyle(color: outline)),
            ),
          for (final w in workers)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(w['worker']?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    w['isPaid'] == true
                        ? const StatusBadge('Pagado', tone: Tone.success)
                        : const StatusBadge('Pendiente', tone: Tone.warning),
                  ]),
                ),
                w['isPaid'] == true
                    ? Text(formatMoney(w['payAmount']), style: const TextStyle(fontWeight: FontWeight.w600))
                    : TextButton(onPressed: widget.busy ? null : () => _editAmount(w), child: Text(formatMoney(w['payAmount']))),
                if (w['isPaid'] == true)
                  IconButton(tooltip: 'Revertir pago', onPressed: widget.busy ? null : () => _unpay(w), icon: const Icon(Icons.undo))
                else ...[
                  IconButton(
                    tooltip: 'Pagar',
                    onPressed: widget.busy
                        ? null
                        : () => widget.run(() => context.api.post('/corporate/event-workers/${w['id']}/pay', {}),
                            success: 'Pago registrado en Gastos'),
                    icon: const Icon(Icons.check_circle, color: Color(0xFF16A34A)),
                  ),
                  IconButton(
                    tooltip: 'Retirar',
                    onPressed: widget.busy
                        ? null
                        : () => widget.run(() => context.api.delete('/corporate/event-workers/${w['id']}'),
                            success: 'Terapeuta retirada'),
                    icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                  ),
                ],
              ]),
            ),
          const Divider(height: 24),
          SelectField<int>(
            label: 'Asignar terapeuta',
            value: _workerId,
            items: {0: 'Seleccionar...', for (final u in available) toInt(u['id']): u['name'] ?? ''},
            onChanged: (v) => setState(() => _workerId = v ?? 0),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _payAmount,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Pago S/'),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: _workerId == 0 || widget.busy ? null : _assign,
              icon: const Icon(Icons.person_add_alt),
              label: const Text('Asignar'),
            ),
          ]),
        ]),
      ),
    );
  }
}

/// Contenedor común de las hojas inferiores con formulario.
class _Sheet extends StatelessWidget {
  const _Sheet({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
          ]),
          const SizedBox(height: 8),
          ...children,
        ]),
      ),
    );
  }
}

class _NewDaySheet extends StatefulWidget {
  const _NewDaySheet();

  @override
  State<_NewDaySheet> createState() => _NewDaySheetState();
}

class _NewDaySheetState extends State<_NewDaySheet> {
  DateTime? date;
  String start = '09:00';
  String end = '13:00';

  @override
  Widget build(BuildContext context) {
    return _Sheet(title: 'Agregar jornada', children: [
      DateField(label: 'Fecha *', value: date, onChanged: (d) => setState(() => date = d)),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TimeField(label: 'Inicio', value: start, onChanged: (v) => setState(() => start = v))),
        const SizedBox(width: 12),
        Expanded(child: TimeField(label: 'Fin', value: end, onChanged: (v) => setState(() => end = v))),
      ]),
      const SizedBox(height: 16),
      SubmitButton(
        label: 'Agregar jornada',
        icon: Icons.add,
        onPressed: date == null
            ? null
            : () => Navigator.pop(context, {'date': dateKey(date!), 'startTime': start, 'endTime': end}),
      ),
    ]);
  }
}

class _PaymentSheet extends StatefulWidget {
  const _PaymentSheet();

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _notes = TextEditingController();
  DateTime date = limaToday();
  String method = 'TRANSFER';
  String type = 'ADVANCE';

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: _Sheet(title: 'Registrar cobro', children: [
        TextFormField(
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Monto S/ *'),
          validator: (v) => (double.tryParse((v ?? '').replaceAll(',', '.')) ?? 0) <= 0 ? 'Monto no válido' : null,
        ),
        const SizedBox(height: 12),
        DateField(label: 'Fecha', value: date, onChanged: (d) => setState(() => date = d ?? date)),
        const SizedBox(height: 12),
        SelectField<String>(label: 'Tipo', value: type, items: paymentTypes, onChanged: (v) => setState(() => type = v ?? type)),
        const SizedBox(height: 12),
        SelectField<String>(
          label: 'Método',
          value: method,
          items: {for (final k in ['TRANSFER', 'CASH', 'CARD', 'YAPE', 'PLIN']) k: paymentMethods[k]!},
          onChanged: (v) => setState(() => method = v ?? method),
        ),
        const SizedBox(height: 12),
        TextFormField(controller: _notes, decoration: const InputDecoration(labelText: 'Nota (opcional)')),
        const SizedBox(height: 16),
        SubmitButton(
          label: 'Registrar cobro',
          icon: Icons.add,
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(context, {
              'amount': double.parse(_amount.text.replaceAll(',', '.')),
              'date': dateKey(date),
              'method': method,
              'type': type,
              if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
            });
          },
        ),
      ]),
    );
  }
}

class _ExpenseSheet extends StatefulWidget {
  const _ExpenseSheet();

  @override
  State<_ExpenseSheet> createState() => _ExpenseSheetState();
}

class _ExpenseSheetState extends State<_ExpenseSheet> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  DateTime date = limaToday();
  String category = 'Otros';

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: _Sheet(title: 'Registrar gasto del evento', children: [
        TextFormField(
          controller: _description,
          decoration: const InputDecoration(labelText: 'Descripción *', hintText: 'Ej. Movilidad'),
          validator: requiredValidator,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Monto S/ *'),
          validator: (v) => (double.tryParse((v ?? '').replaceAll(',', '.')) ?? 0) <= 0 ? 'Monto no válido' : null,
        ),
        const SizedBox(height: 12),
        DateField(label: 'Fecha', value: date, onChanged: (d) => setState(() => date = d ?? date)),
        const SizedBox(height: 12),
        SelectField<String>(
          label: 'Categoría',
          value: category,
          items: {for (final c in eventExpenseCategories) c: c},
          onChanged: (v) => setState(() => category = v ?? category),
        ),
        const SizedBox(height: 16),
        SubmitButton(
          label: 'Registrar gasto',
          icon: Icons.add,
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(context, {
              'description': _description.text.trim(),
              'amount': double.parse(_amount.text.replaceAll(',', '.')),
              'date': dateKey(date),
              'category': category,
            });
          },
        ),
      ]),
    );
  }
}
