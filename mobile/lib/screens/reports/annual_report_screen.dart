import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'charts.dart';

class _Month {
  double income = 0;
  double expenses = 0;
  double get profit => income - expenses;
}

/// Análisis anual: ingresos, gastos y ganancia por mes.
class AnnualReportScreen extends StatefulWidget {
  const AnnualReportScreen({super.key});

  @override
  State<AnnualReportScreen> createState() => _AnnualReportScreenState();
}

class _AnnualReportScreenState extends State<AnnualReportScreen> with LoaderMixin {
  int year = limaToday().year;
  List<Map<String, dynamic>> attentions = [];
  List<Map<String, dynamic>> expenses = [];

  @override
  Future<void> fetch() async {
    final results = await Future.wait([context.api.get('/attentions'), context.api.get('/expenses')]);
    attentions = asMapList(results[0]);
    expenses = asMapList(results[1]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Análisis anual $year')),
      body: loaderBody(_content),
    );
  }

  Widget _content() {
    final months = List.generate(12, (_) => _Month());
    final methodStats = <String, double>{};
    final categoryStats = <String, double>{};
    for (final att in attentions) {
      if (att['date'] == null) continue;
      final day = effectiveDay(att['date']);
      if (day.year != year) continue;
      months[day.month - 1].income += toDouble(att['totalCost']);
      for (final p in asMapList(att['payments'])) {
        final method = paymentMethods[p['method']] ?? (p['method'] ?? 'Otros').toString();
        methodStats[method] = (methodStats[method] ?? 0) + toDouble(p['amount']);
      }
    }
    for (final e in expenses) {
      if (e['date'] == null) continue;
      final day = effectiveDay(e['date']);
      if (day.year != year) continue;
      months[day.month - 1].expenses += toDouble(e['amount']);
      final category = (e['category'] ?? '').toString().isEmpty ? 'Sin categoría' : e['category'];
      categoryStats[category] = (categoryStats[category] ?? 0) + toDouble(e['amount']);
    }
    final totalIncome = months.fold<double>(0, (s, m) => s + m.income);
    final totalExpenses = months.fold<double>(0, (s, m) => s + m.expenses);
    final netProfit = totalIncome - totalExpenses;

    final palette = chartPalette(context);
    const incomeColor = Color(0xFF22C55E);
    const expenseColor = Color(0xFFEF4444);
    final profitColor = palette[0];
    final maxValue = months.fold<double>(0, (m, e) => [m, e.income, e.expenses, e.profit].reduce((a, b) => a > b ? a : b));
    final minProfit = months.fold<double>(0, (m, e) => e.profit < m ? e.profit : m);
    String monthLabel(int i) => capitalize(DateFormat('MMM', 'es').format(DateTime(2000, i + 1)).replaceAll('.', ''));
    final currentYear = limaToday().year;

    return ListView(padding: const EdgeInsets.all(16), children: [
      SelectField<int>(
        label: 'Año',
        value: year,
        items: {for (var y = currentYear - 2; y <= currentYear + 2; y++) y: '$y'},
        onChanged: (v) => setState(() => year = v ?? year),
      ),
      const SizedBox(height: 16),
      StatGrid(children: [
        StatCard(label: 'Ingresos totales', value: formatMoney(totalIncome), color: const Color(0xFF16A34A), icon: Icons.trending_up),
        StatCard(label: 'Gastos totales', value: formatMoney(totalExpenses), color: const Color(0xFFDC2626), icon: Icons.trending_down),
        StatCard(
          label: 'Ganancia neta',
          value: formatMoney(netProfit),
          color: netProfit >= 0 ? const Color(0xFF2563EB) : const Color(0xFFDC2626),
          icon: Icons.attach_money,
        ),
      ]),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Ingresos vs gastos',
        icon: Icons.bar_chart,
        child: Column(children: [
          SizedBox(
            height: 240,
            child: BarChart(BarChartData(
              maxY: niceMax(maxValue),
              minY: minProfit < 0 ? -niceMax(-minProfit) : 0,
              gridData: const FlGridData(drawVerticalLine: false),
              borderData: FlBorderData(show: false),
              titlesData: axisTitles(
                bottom: (value, meta) => SideTitleWidget(
                  meta: meta,
                  child: Text(monthLabel(value.toInt()), style: const TextStyle(fontSize: 9)),
                ),
              ),
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                    '${['Ingresos', 'Gastos', 'Ganancia'][rodIndex]}\n${formatMoney(rod.toY)}',
                    const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
              barGroups: [
                for (var i = 0; i < 12; i++)
                  BarChartGroupData(x: i, barsSpace: 1, barRods: [
                    BarChartRodData(toY: months[i].income, color: incomeColor, width: 5),
                    BarChartRodData(toY: months[i].expenses, color: expenseColor, width: 5),
                    BarChartRodData(toY: months[i].profit, color: profitColor, width: 5),
                  ]),
              ],
            )),
          ),
          const SizedBox(height: 12),
          SeriesLegend(items: {'Ingresos': incomeColor, 'Gastos': expenseColor, 'Ganancia': profitColor}),
        ]),
      ),
      const SizedBox(height: 16),
      SectionCard(title: 'Ingresos por medio de pago', icon: Icons.account_balance_wallet_outlined, child: PieWithLegend(data: methodStats)),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Gastos por categoría',
        icon: Icons.pie_chart_outline,
        child: PieWithLegend(data: categoryStats, emptyText: 'No hay gastos registrados.'),
      ),
      const SizedBox(height: 16),
      SectionCard(
        title: 'Detalle mensual',
        icon: Icons.table_rows_outlined,
        child: Column(children: [
          for (var i = 0; i < 12; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: Text(capitalize(DateFormat('MMMM', 'es').format(DateTime(2000, i + 1))),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('Ingresos ${formatMoney(months[i].income)} · Gastos ${formatMoney(months[i].expenses)}'),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(formatMoney(months[i].profit),
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: months[i].profit >= 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626))),
                Text(
                  months[i].income > 0 ? '${(months[i].profit / months[i].income * 100).toStringAsFixed(1)}%' : '-',
                  style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline),
                ),
              ]),
            ),
          const Divider(),
          InfoRow('Total', formatMoney(netProfit), bold: true),
        ]),
      ),
    ]);
  }
}
