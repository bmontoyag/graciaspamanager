import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'annual_report_screen.dart';
import 'charts.dart';

/// Resumen mensual: ingresos, gastos, ganancia y gráficos.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> with LoaderMixin {
  int month = limaToday().month;
  int year = limaToday().year;
  int therapistId = 0;
  int serviceId = 0;
  int clientId = 0;
  bool showAttentionsLine = false;

  List<Map<String, dynamic>> allAttentions = [];
  List<Map<String, dynamic>> allExpenses = [];
  List<Map<String, dynamic>> corporatePayments = [];
  List<Map<String, dynamic>> therapists = [];
  List<Map<String, dynamic>> services = [];
  List<Map<String, dynamic>> clients = [];
  bool _optionsLoaded = false;

  @override
  Future<void> fetch() async {
    final lastDay = DateTime.utc(year, month + 1, 0).day;
    final from = dateKey(DateTime.utc(year, month, 1));
    final to = dateKey(DateTime.utc(year, month, lastDay));
    final results = await Future.wait([
      context.api.get('/attentions'),
      context.api.get('/expenses'),
      context.api.get('/corporate/payments', query: {'from': from, 'to': to}).catchError((_) => <dynamic>[]),
      if (!_optionsLoaded) ...[
        context.api.get('/users').catchError((_) => <dynamic>[]),
        context.api.get('/services').catchError((_) => <dynamic>[]),
        context.api.get('/clients').catchError((_) => <dynamic>[]),
      ],
    ]);
    allAttentions = asMapList(results[0]);
    allExpenses = asMapList(results[1]);
    corporatePayments = asMapList(results[2]);
    if (!_optionsLoaded) {
      therapists = asMapList(results[3]);
      services = asMapList(results[4]);
      clients = asMapList(results[5]);
      _optionsLoaded = true;
    }
  }

  bool _inMonth(dynamic date) {
    if (date == null) return false;
    final day = effectiveDay(date);
    return day.year == year && day.month == month;
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Reportes',
      route: '/reports',
      actions: [
        IconButton(
          tooltip: 'Análisis anual',
          icon: const Icon(Icons.bar_chart),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AnnualReportScreen())),
        ),
      ],
      body: loaderBody(_content),
    );
  }

  Widget _filters() {
    final currentYear = limaToday().year;
    return SectionCard(
      title: 'Filtros',
      icon: Icons.filter_alt_outlined,
      child: Column(children: [
        Row(children: [
          Expanded(
            child: SelectField<int>(
              label: 'Mes',
              value: month,
              items: {for (var m = 1; m <= 12; m++) m: capitalize(DateFormat('MMMM', 'es').format(DateTime(2000, m)))},
              onChanged: (v) {
                setState(() => month = v ?? month);
                reload();
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: SelectField<int>(
              label: 'Año',
              value: year,
              items: {for (var y = currentYear - 2; y <= currentYear + 2; y++) y: '$y'},
              onChanged: (v) {
                setState(() => year = v ?? year);
                reload();
              },
            ),
          ),
        ]),
        const SizedBox(height: 8),
        SelectField<int>(
          label: 'Terapeuta',
          value: therapistId,
          items: {0: 'Todos', for (final t in therapists) toInt(t['id']): t['name'] ?? ''},
          onChanged: (v) => setState(() => therapistId = v ?? 0),
        ),
        const SizedBox(height: 8),
        SelectField<int>(
          label: 'Servicio',
          value: serviceId,
          items: {0: 'Todos', for (final s in services) toInt(s['id']): s['name'] ?? ''},
          onChanged: (v) => setState(() => serviceId = v ?? 0),
        ),
        const SizedBox(height: 8),
        SearchSelectField(
          label: 'Cliente',
          options: [
            {'id': 0, 'name': 'Todos'},
            ...clients,
          ],
          value: clientId,
          onChanged: (c) => setState(() => clientId = toInt(c?['id'])),
        ),
      ]),
    );
  }

  Widget _content() {
    final attentions = allAttentions.where((att) {
      if (!_inMonth(att['date'])) return false;
      if (therapistId != 0 && !asMapList(att['workers']).any((w) => toInt(w['workerId']) == therapistId)) return false;
      if (serviceId != 0 && toInt(att['serviceId']) != serviceId) return false;
      if (clientId != 0 && toInt(att['clientId']) != clientId) return false;
      return true;
    }).toList();
    final expenses = allExpenses.where((e) => _inMonth(e['date'])).toList();

    final totalIncome = attentions.fold<double>(0, (s, a) => s + toDouble(a['totalCost']));
    final corporateIncome = corporatePayments.fold<double>(0, (s, p) => s + toDouble(p['amount']));
    final totalExpenses = expenses.fold<double>(0, (s, e) => s + toDouble(e['amount']));
    final netProfit = totalIncome + corporateIncome - totalExpenses;
    final uniqueClients = attentions.map((a) => a['clientId']).toSet().length;

    // Por terapeuta
    final therapistRevenue = <String, double>{};
    final therapistCount = <String, int>{};
    for (final att in attentions) {
      for (final w in asMapList(att['workers'])) {
        final name = w['worker']?['name'] ?? 'Desconocido';
        therapistRevenue[name] = (therapistRevenue[name] ?? 0) + toDouble(att['totalCost']);
        therapistCount[name] = (therapistCount[name] ?? 0) + 1;
      }
    }

    // Por servicio
    final serviceStats = <int, ({String name, int count, double revenue})>{};
    for (final att in attentions) {
      final id = toInt(att['serviceId']);
      final current = serviceStats[id];
      serviceStats[id] = (
        name: att['service']?['name'] ?? 'Desconocido',
        count: (current?.count ?? 0) + 1,
        revenue: (current?.revenue ?? 0) + toDouble(att['totalCost']),
      );
    }
    final serviceList = serviceStats.values.toList()..sort((a, b) => b.revenue.compareTo(a.revenue));

    // Evolución diaria, métodos de pago y categorías de gasto
    final daysInMonth = DateTime.utc(year, month + 1, 0).day;
    final dailyIncome = List<double>.filled(daysInMonth, 0);
    final dailyCount = List<double>.filled(daysInMonth, 0);
    final methodStats = <String, double>{};
    for (final att in attentions) {
      final day = effectiveDay(att['date']).day;
      dailyIncome[day - 1] += toDouble(att['totalCost']);
      dailyCount[day - 1] += 1;
      for (final p in asMapList(att['payments'])) {
        final method = paymentMethods[p['method']] ?? (p['method'] ?? 'Otros').toString();
        methodStats[method] = (methodStats[method] ?? 0) + toDouble(p['amount']);
      }
    }
    final categoryStats = <String, double>{};
    for (final e in expenses) {
      final category = (e['category'] ?? '').toString().isEmpty ? 'Sin categoría' : e['category'];
      categoryStats[category] = (categoryStats[category] ?? 0) + toDouble(e['amount']);
    }

    final palette = chartPalette(context);
    final daily = showAttentionsLine ? dailyCount : dailyIncome;
    final dailyColor = showAttentionsLine ? palette[1] : palette[0];

    return ListView(padding: const EdgeInsets.all(16), children: [
      _filters(),
      const SizedBox(height: 16),
      StatGrid(children: [
        StatCard(label: 'Ingresos', value: formatMoney(totalIncome), color: const Color(0xFF16A34A), icon: Icons.trending_up),
        StatCard(
            label: 'Ingresos corporativos',
            value: formatMoney(corporateIncome),
            color: const Color(0xFF16A34A),
            icon: Icons.business_center_outlined),
        StatCard(label: 'Gastos', value: formatMoney(totalExpenses), color: const Color(0xFFDC2626), icon: Icons.trending_down),
        StatCard(
          label: 'Ganancia',
          value: formatMoney(netProfit),
          color: netProfit >= 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
          icon: Icons.attach_money,
        ),
        StatCard(label: 'Atenciones', value: '${attentions.length}', icon: Icons.event_note),
        StatCard(label: 'Clientes únicos', value: '$uniqueClients', icon: Icons.people_outline),
      ]),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Evolución diaria',
        icon: Icons.show_chart,
        child: Column(children: [
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Ingresos (S/)')),
              ButtonSegment(value: true, label: Text('Atenciones')),
            ],
            selected: {showAttentionsLine},
            onSelectionChanged: (v) => setState(() => showAttentionsLine = v.first),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 220,
            child: LineChart(LineChartData(
              minY: 0,
              maxY: niceMax(daily.fold<double>(0, (a, b) => a > b ? a : b)),
              gridData: const FlGridData(drawVerticalLine: false),
              borderData: FlBorderData(show: false),
              titlesData: axisTitles(
                bottomInterval: 5,
                bottom: (value, meta) =>
                    SideTitleWidget(meta: meta, child: Text('${value.toInt()}', style: const TextStyle(fontSize: 10))),
              ),
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  getTooltipItems: (spots) => [
                    for (final s in spots)
                      LineTooltipItem(
                        'Día ${s.x.toInt()}\n${showAttentionsLine ? '${s.y.toInt()} atenciones' : formatMoney(s.y)}',
                        const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                  ],
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: [for (var i = 0; i < daysInMonth; i++) FlSpot(i + 1.0, daily[i])],
                  isCurved: true,
                  preventCurveOverShooting: true,
                  color: dailyColor,
                  barWidth: 3,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(show: true, color: dailyColor.withValues(alpha: 0.12)),
                ),
              ],
            )),
          ),
        ]),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Distribución por terapeuta',
        icon: Icons.people_outline,
        child: HorizontalBars(
          data: therapistRevenue,
          subtitles: {for (final e in therapistCount.entries) e.key: '${e.value} atenciones'},
        ),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Servicios',
        subtitle: 'Top 5 por cantidad de atenciones',
        icon: Icons.pie_chart_outline,
        child: PieWithLegend(
          money: false,
          data: {for (final s in serviceList.take(5)) s.name: s.count.toDouble()},
        ),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Medios de pago',
        icon: Icons.account_balance_wallet_outlined,
        child: PieWithLegend(data: methodStats),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Gastos',
        icon: Icons.trending_down,
        child: PieWithLegend(data: categoryStats, emptyText: 'No hay gastos registrados.'),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Detalle de servicios',
        icon: Icons.table_rows_outlined,
        child: serviceList.isEmpty
            ? const EmptyView('No hay datos disponibles.')
            : Column(children: [
                for (final s in serviceList)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                        '${s.count} atenciones · ${totalIncome > 0 ? (s.revenue / totalIncome * 100).toStringAsFixed(1) : '0'}% del total'),
                    trailing: Text(formatMoney(s.revenue), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
              ]),
      ),
    ]);
  }
}
