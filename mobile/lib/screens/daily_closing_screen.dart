import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/constants.dart';
import '../core/format.dart';
import '../core/links.dart';
import '../navigation.dart';
import '../widgets/common.dart';
import '../widgets/fields.dart';
import '../widgets/loader.dart';
import 'expenses/expense_form_screen.dart';

enum _PayStatus { pending, paid, observed }

class _TherapistPayment {
  _TherapistPayment(this.id, this.name, this.phone);
  final int id;
  final String name;
  final String? phone;
  double totalCommission = 0;
  int attentionCount = 0;
  final List<Map<String, dynamic>> workerRecords = [];
  Map<String, dynamic>? paidExpense;
  _PayStatus status = _PayStatus.pending;
}

class DailyClosingScreen extends StatefulWidget {
  const DailyClosingScreen({super.key});

  @override
  State<DailyClosingScreen> createState() => _DailyClosingScreenState();
}

class _DailyClosingScreenState extends State<DailyClosingScreen> with LoaderMixin {
  DateTime selectedDate = limaToday();
  List<Map<String, dynamic>> attentions = [];
  List<Map<String, dynamic>> expenses = [];

  @override
  Future<void> fetch() async {
    final results = await Future.wait([context.api.get('/attentions'), context.api.get('/expenses')]);
    attentions = asMapList(results[0]).where((a) => a['date'] != null && effectiveDay(a['date']) == selectedDate).toList();
    // Los gastos de eventos corporativos no forman parte de la caja diaria del local
    expenses = asMapList(results[1])
        .where((e) => e['date'] != null && effectiveDay(e['date']) == selectedDate && e['corporateEventId'] == null)
        .toList();
  }

  List<_TherapistPayment> _therapists() {
    final map = <int, _TherapistPayment>{};
    for (final att in attentions) {
      for (final w in asMapList(att['workers'])) {
        final id = toInt(w['workerId']);
        final t = map.putIfAbsent(id, () => _TherapistPayment(id, w['worker']?['name'] ?? 'Desconocido', w['worker']?['phoneNumber']));
        t.totalCommission += toDouble(w['commissionAmount']);
        t.attentionCount += 1;
        t.workerRecords.add(w);
      }
    }
    // Se detecta si ya se pagó buscando un gasto del día asignado a la terapeuta
    for (final e in expenses) {
      final t = map[toInt(e['workerId'])];
      if (e['workerId'] == null || t == null) continue;
      t.paidExpense = e;
      t.status = (toDouble(e['amount']) - t.totalCommission).abs() <= 1 ? _PayStatus.paid : _PayStatus.observed;
    }
    return map.values.toList();
  }

  Future<void> _registerPayment(_TherapistPayment t) async {
    final expense = t.paidExpense != null
        ? {...t.paidExpense!, 'workerId': t.id}
        : {
            'description': 'Pago atenciones del día ${formatDate(dateKey(selectedDate))} - ${t.name}',
            'amount': t.totalCommission,
            'category': 'Salarios',
            'date': dateKey(selectedDate),
            'workerId': t.id,
          };
    final saved = await openForm<bool>(context, ExpenseFormScreen(expense: expense));
    if (saved != true || !mounted) return;
    // Marca las comisiones como pagadas
    await runAction(() async {
      final paidAt = DateTime.now().toUtc().toIso8601String();
      await Future.wait([
        for (final record in t.workerRecords)
          context.api.patch('/attention-workers/${record['id']}', {'isPaid': true, 'paidAt': paidAt}),
      ]);
    });
    reload(silent: true);
  }

  Future<void> _payWithYape(_TherapistPayment t) async {
    final phone = t.phone!.replaceAll(RegExp(r'\s'), '');
    await Clipboard.setData(ClipboardData(text: phone));
    if (!mounted) return;
    final open = await confirmDialog(
      context,
      title: 'Pagar con Yape',
      message: 'Teléfono $phone copiado al portapapeles. Monto exacto a pagar: ${formatMoney(t.totalCommission)}.',
      confirmText: 'Abrir Yape',
    );
    if (open && !await openExternal('yape://') && mounted) {
      showError(context, 'No se pudo abrir Yape en este dispositivo.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Cierre diario',
      route: '/daily-closing',
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: DateField(
            label: 'Fecha',
            value: selectedDate,
            onChanged: (d) {
              if (d == null) return;
              setState(() => selectedDate = d);
              reload();
            },
          ),
        ),
        Expanded(child: loaderBody(_content)),
      ]),
    );
  }

  Widget _content() {
    final totalIncome = attentions.fold<double>(0, (sum, a) => sum + toDouble(a['totalCost']));
    final totalExpenses = expenses.fold<double>(0, (sum, e) => sum + toDouble(e['amount']));
    final net = totalIncome - totalExpenses;
    final clientsServed = attentions.map((a) => a['clientId']).toSet().length;
    final therapists = _therapists();

    return ListView(padding: const EdgeInsets.all(16), children: [
      StatGrid(children: [
        StatCard(label: 'Ingresos totales', value: formatMoney(totalIncome), color: const Color(0xFF16A34A), icon: Icons.trending_up),
        StatCard(label: 'Gastos totales', value: formatMoney(totalExpenses), color: const Color(0xFFDC2626), icon: Icons.trending_down),
        StatCard(
          label: 'Ganancia neta',
          value: formatMoney(net),
          color: net >= 0 ? const Color(0xFF2563EB) : const Color(0xFFDC2626),
          icon: Icons.attach_money,
        ),
        StatCard(label: 'Clientes atendidos', value: '$clientsServed', icon: Icons.people_outline),
      ]),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Pagos a terapeutas',
        icon: Icons.payments_outlined,
        child: therapists.isEmpty
            ? const EmptyView('No hay pagos pendientes para esta fecha.')
            : Column(children: [
                for (final t in therapists) _therapistTile(t),
                const Divider(),
                InfoRow(
                  'Total a pagar (${therapists.fold<int>(0, (s, t) => s + t.attentionCount)} atenciones)',
                  formatMoney(therapists.fold<double>(0, (s, t) => s + t.totalCommission)),
                  bold: true,
                ),
              ]),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Detalle de atenciones (${attentions.length})',
        icon: Icons.receipt_long_outlined,
        child: attentions.isEmpty
            ? const EmptyView('No hay atenciones registradas para esta fecha.')
            : Column(children: [
                for (final att in attentions)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(att['client']?['name'] ?? ''),
                    subtitle: Text([
                      att['service']?['name'] ?? '',
                      asMapList(att['workers']).map((w) => w['worker']?['name']).whereType<String>().join(', '),
                    ].where((s) => s.isNotEmpty).join(' · ')),
                    trailing: Text(formatMoney(att['totalCost']), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
              ]),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Detalle de gastos (${expenses.length})',
        icon: Icons.account_balance_wallet_outlined,
        child: expenses.isEmpty
            ? const EmptyView('No hay gastos registrados para esta fecha.')
            : Column(children: [
                for (final e in expenses)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(e['description'] ?? ''),
                    subtitle: Text('${e['category'] ?? ''} · ${e['worker']?['name'] ?? 'Negocio'}'),
                    trailing: Text(formatMoney(e['amount']),
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFB91C1C))),
                  ),
              ]),
      ),
    ]);
  }

  Widget _therapistTile(_TherapistPayment t) {
    final Widget badge;
    switch (t.status) {
      case _PayStatus.paid:
        badge = StatusBadge('Pagado (${formatMoney(t.paidExpense?['amount'])})', tone: Tone.success);
      case _PayStatus.observed:
        badge = StatusBadge('Observado · pagado ${formatMoney(t.paidExpense?['amount'])}', tone: Tone.warning);
      case _PayStatus.pending:
        badge = const StatusBadge('Pendiente', tone: Tone.neutral);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700)),
              Text('${t.attentionCount} atenciones${t.phone != null ? ' · ${t.phone}' : ''}',
                  style: TextStyle(color: Theme.of(context).colorScheme.outline, fontSize: 12)),
            ]),
          ),
          Text(formatMoney(t.totalCommission), style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF15803D))),
        ]),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
          badge,
          if (t.status != _PayStatus.pending)
            OutlinedButton(onPressed: () => _registerPayment(t), child: const Text('Editar pago'))
          else ...[
            if (t.phone != null && t.phone!.isNotEmpty)
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF742284)),
                onPressed: () => _payWithYape(t),
                icon: const Icon(Icons.attach_money, size: 18),
                label: const Text('Yape'),
              ),
            FilledButton(onPressed: () => _registerPayment(t), child: const Text('Registrar pago')),
          ],
        ]),
      ]),
    );
  }
}
