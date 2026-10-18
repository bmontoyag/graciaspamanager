import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/branding.dart';
import '../../core/format.dart';

/// Paleta de los gráficos: colores de la marca y luego colores fijos (igual que la web).
List<Color> chartPalette(BuildContext context) {
  final branding = context.watch<Branding>();
  return [
    branding.primary,
    branding.sidebar,
    const Color(0xFFEAB308),
    const Color(0xFF22C55E),
    const Color(0xFFEF4444),
    const Color(0xFF3B82F6),
    const Color(0xFFA855F7),
    const Color(0xFFEC4899),
  ];
}

/// Valor máximo "redondeado" para el eje Y.
double niceMax(double value) {
  if (value <= 0) return 1;
  final magnitude = math.pow(10, (math.log(value) / math.ln10).floor()).toDouble();
  final normalized = value / magnitude;
  final step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

String compactNumber(double value) {
  final abs = value.abs();
  if (abs >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
  if (abs >= 1000) return '${(value / 1000).toStringAsFixed(abs >= 10000 ? 0 : 1)}k';
  return value.toStringAsFixed(0);
}

/// Gráfico circular con leyenda (nombre, monto y porcentaje).
class PieWithLegend extends StatelessWidget {
  const PieWithLegend({super.key, required this.data, this.money = true, this.emptyText = 'Sin datos'});

  final Map<String, double> data;
  final bool money;
  final String emptyText;

  @override
  Widget build(BuildContext context) {
    final palette = chartPalette(context);
    final entries = data.entries.where((e) => e.value > 0).toList();
    final total = entries.fold<double>(0, (sum, e) => sum + e.value);
    if (entries.isEmpty) {
      return SizedBox(
        height: 120,
        child: Center(child: Text(emptyText, style: TextStyle(color: Theme.of(context).colorScheme.outline))),
      );
    }
    return Column(children: [
      SizedBox(
        height: 180,
        child: PieChart(PieChartData(
          sectionsSpace: 2,
          centerSpaceRadius: 36,
          sections: [
            for (var i = 0; i < entries.length; i++)
              PieChartSectionData(
                value: entries[i].value,
                color: palette[i % palette.length],
                radius: 50,
                title: total == 0 ? '' : '${(entries[i].value / total * 100).toStringAsFixed(0)}%',
                titleStyle: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                showTitle: entries[i].value / total >= 0.06,
              ),
          ],
        )),
      ),
      const SizedBox(height: 12),
      for (var i = 0; i < entries.length; i++)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: palette[i % palette.length], borderRadius: BorderRadius.circular(3)),
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(entries[i].key, overflow: TextOverflow.ellipsis)),
            Text(money ? formatMoney(entries[i].value) : formatNumber(entries[i].value),
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
        ),
    ]);
  }
}

/// Barras horizontales simples (por terapeuta).
class HorizontalBars extends StatelessWidget {
  const HorizontalBars({super.key, required this.data, this.subtitles = const {}});

  final Map<String, double> data;
  final Map<String, String> subtitles;

  @override
  Widget build(BuildContext context) {
    final color = chartPalette(context).first;
    final maxValue = data.values.fold<double>(0, math.max);
    if (data.isEmpty) {
      return SizedBox(
        height: 80,
        child: Center(child: Text('Sin datos', style: TextStyle(color: Theme.of(context).colorScheme.outline))),
      );
    }
    return Column(children: [
      for (final entry in data.entries)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w600))),
              Text(formatMoney(entry.value)),
            ]),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: maxValue == 0 ? 0 : entry.value / maxValue,
                minHeight: 10,
                color: color,
                backgroundColor: color.withValues(alpha: 0.12),
              ),
            ),
            if (subtitles[entry.key] != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(subtitles[entry.key]!,
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
              ),
          ]),
        ),
    ]);
  }
}

FlTitlesData axisTitles({required Widget Function(double, TitleMeta) bottom, double bottomInterval = 1}) {
  return FlTitlesData(
    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    leftTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: 40,
        getTitlesWidget: (value, meta) => SideTitleWidget(
          meta: meta,
          child: Text(compactNumber(value), style: const TextStyle(fontSize: 10)),
        ),
      ),
    ),
    bottomTitles: AxisTitles(
      sideTitles: SideTitles(showTitles: true, reservedSize: 24, interval: bottomInterval, getTitlesWidget: bottom),
    ),
  );
}

/// Leyenda horizontal de series.
class SeriesLegend extends StatelessWidget {
  const SeriesLegend({super.key, required this.items});
  final Map<String, Color> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(spacing: 16, runSpacing: 4, children: [
      for (final e in items.entries)
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(color: e.value, borderRadius: BorderRadius.circular(3))),
          const SizedBox(width: 6),
          Text(e.key, style: const TextStyle(fontSize: 12)),
        ]),
    ]);
  }
}
