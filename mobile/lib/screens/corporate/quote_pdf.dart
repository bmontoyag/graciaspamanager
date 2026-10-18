import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart' show PdfPreview;

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/loader.dart';

const _sage = PdfColor.fromInt(0xFF6B7F6A);
const _sageDark = PdfColor.fromInt(0xFF56685A);
const _cream = PdfColor.fromInt(0xFFF3F2EC);
const _line = PdfColor.fromInt(0xFFDAD9D0);
const _ink = PdfColor.fromInt(0xFF1F2421);
const _muted = PdfColor.fromInt(0xFF6B6F6A);

/// Vista previa del PDF de una cotización, con opciones para compartir e imprimir.
class QuotePdfScreen extends StatefulWidget {
  const QuotePdfScreen({super.key, required this.quoteId});

  final int quoteId;

  @override
  State<QuotePdfScreen> createState() => _QuotePdfScreenState();
}

class _QuotePdfScreenState extends State<QuotePdfScreen> with LoaderMixin {
  Map<String, dynamic> quote = {};
  Map<String, dynamic> config = {};

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/corporate/quotes/${widget.quoteId}'),
      context.api.get('/configuration').catchError((_) => <String, dynamic>{}),
    ]);
    quote = asMap(results[0]);
    config = asMap(results[1]);
  }

  @override
  Widget build(BuildContext context) {
    final fileName = '${quote['code'] ?? 'cotizacion'} - ${quote['company']?['name'] ?? ''}.pdf';
    return Scaffold(
      appBar: AppBar(title: Text(quote['code'] ?? 'PDF')),
      body: loading
          ? const LoadingView(message: 'Generando PDF...')
          : loadError != null
              ? ErrorView(message: loadError!, onRetry: reload)
              : PdfPreview(
                  pdfFileName: fileName,
                  canChangeOrientation: false,
                  canChangePageFormat: false,
                  canDebug: false,
                  build: (_) => buildQuotePdf(quote, config),
                ),
    );
  }
}

/// "21 y 22 de octubre, 2026" cuando todas las fechas son del mismo mes; si no, lista completa.
String serviceDatesLabel(List<Map<String, dynamic>> days) {
  if (days.isEmpty) return '-';
  final parts = days.map((d) => parseIso(d['date'])!).toList();
  final sameMonth = parts.every((p) => p.month == parts.first.month && p.year == parts.first.year);
  if (!sameMonth) return days.map((d) => formatDay(d['date'], 'dd MMM yyyy')).join(', ');
  final numbers = parts.map((p) => '${p.day}').toList();
  final joined = numbers.length == 1 ? numbers.first : '${numbers.sublist(0, numbers.length - 1).join(', ')} y ${numbers.last}';
  return '$joined de ${DateFormat('MMMM', 'es').format(parts.first)}, ${parts.first.year}';
}

Future<pw.Font> _font(String name) async => pw.Font.ttf(await rootBundle.load('assets/fonts/$name.ttf'));

/// Genera el PDF con el mismo diseño que la vista de impresión de la web.
Future<Uint8List> buildQuotePdf(Map<String, dynamic> quote, Map<String, dynamic> config) async {
  // Fuentes incluidas en la app (Inter y Lora, licencia OFL) para no depender de internet
  final theme = pw.ThemeData.withFont(
    base: await _font('Inter-Regular'),
    bold: await _font('Inter-SemiBold'),
    italic: await _font('Inter-Italic'),
  );
  final serif = await _font('Lora-SemiBold');
  pw.MemoryImage? logo;
  try {
    logo = pw.MemoryImage((await rootBundle.load('assets/images/logo.png')).buffer.asUint8List());
  } catch (_) {}

  final days = asMapList(quote['days']);
  final items = asMapList(quote['items']);
  final conditions = asMapList(quote['conditions']);
  final focusZones = [for (final z in (quote['focusZones'] as List? ?? [])) '$z'];
  final scopeItems = [for (final s in (quote['scopeItems'] as List? ?? [])) '$s'];
  final company = asMap(quote['company']);
  final businessName = (config['businessName'] ?? '').toString().isEmpty ? 'Gracia Spa' : config['businessName'];
  final therapists = toInt(quote['therapistsCount']);
  final chairs = toInt(quote['chairsCount']);
  final modality = (quote['modality'] ?? '').toString();
  final discount = toDouble(quote['discount']);
  final igvAmount = toDouble(quote['igvAmount']);
  final total = toDouble(quote['total']);
  final includeIgv = quote['includeIgv'] == true;

  final sameSchedule =
      days.every((d) => d['startTime'] == days.first['startTime'] && d['endTime'] == days.first['endTime']);
  final scheduleLabel = days.isEmpty
      ? '-'
      : sameSchedule
          ? '${formatTime12(days.first['startTime'])} - ${formatTime12(days.first['endTime'])}'
          : 'Según jornada';
  final minutes = days.fold<int>(0, (sum, d) => sum + timeToMinutes(d['endTime']) - timeToMinutes(d['startTime']));
  final hoursLabel = minutes % 60 == 0 ? '${minutes ~/ 60} horas' : '${minutes ~/ 60}h ${minutes % 60}m';
  final validUntil = parseIso(quote['issueDate'])!.add(Duration(days: toInt(quote['validityDays'])));

  final hasIntro = (quote['introduction'] ?? '').toString().isNotEmpty;
  final hasService = (quote['serviceDescription'] ?? '').toString().isNotEmpty || focusZones.isNotEmpty;
  // Numeración de secciones según las que se muestran
  final sectionTitles = [
    if (hasIntro) 'Presentación',
    if (hasService) 'Servicio propuesto',
    'Equipo y recursos',
    'Resumen de la jornada',
    if (scopeItems.isNotEmpty) 'Alcance del servicio',
    'Inversión corporativa',
    if (conditions.isNotEmpty) 'Condiciones del servicio',
    'Confirmación & próximos pasos',
  ];

  pw.TextStyle serifStyle(double size, {PdfColor color = _sageDark}) =>
      pw.TextStyle(font: serif, fontSize: size, color: color, fontWeight: pw.FontWeight.bold);
  const labelStyle = pw.TextStyle(fontSize: 7, color: _muted, letterSpacing: 1.2);
  const mutedSmall = pw.TextStyle(fontSize: 9, color: _muted);

  pw.Widget heading(String title) {
    final number = (sectionTitles.indexOf(title) + 1).toString().padLeft(2, '0');
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 8),
      padding: const pw.EdgeInsets.only(left: 10),
      decoration: const pw.BoxDecoration(border: pw.Border(left: pw.BorderSide(color: _sage, width: 4))),
      child: pw.Text('$number. ${title.toUpperCase()}', style: serifStyle(12)),
    );
  }

  pw.Widget section(String title, List<pw.Widget> children) => pw.Padding(
        padding: const pw.EdgeInsets.only(top: 18),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.stretch, children: [heading(title), ...children]),
      );

  pw.Widget box(pw.Widget child, {PdfColor? border, double borderWidth = 1}) => pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: pw.BoxDecoration(
          color: _cream,
          border: pw.Border.all(color: border ?? _line, width: borderWidth),
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: child,
      );

  pw.Widget card(String title, String text) => pw.Container(
        padding: const pw.EdgeInsets.all(12),
        decoration: pw.BoxDecoration(
          border: const pw.Border(
            top: pw.BorderSide(color: _sage, width: 3),
            left: pw.BorderSide(color: _line),
            right: pw.BorderSide(color: _line),
            bottom: pw.BorderSide(color: _line),
          ),
        ),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: _sageDark)),
          pw.SizedBox(height: 4),
          pw.Text(text, style: mutedSmall),
        ]),
      );

  pw.Widget headerCell(String text, {bool right = false}) => pw.Container(
        color: _cream,
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        alignment: right ? pw.Alignment.centerRight : pw.Alignment.centerLeft,
        child: pw.Text(text.toUpperCase(), style: labelStyle),
      );

  pw.Widget cell(pw.Widget child, {bool right = false}) => pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        alignment: right ? pw.Alignment.centerRight : pw.Alignment.centerLeft,
        child: child,
      );

  pw.Widget table(List<pw.Widget> header, List<List<pw.Widget>> rows, Map<int, pw.TableColumnWidth> widths) => pw.Table(
        columnWidths: widths,
        border: const pw.TableBorder(horizontalInside: pw.BorderSide(color: _line), bottom: pw.BorderSide(color: _line)),
        children: [
          pw.TableRow(
            decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: _sage, width: 2))),
            children: header,
          ),
          for (final row in rows) pw.TableRow(children: row),
        ],
      );

  pw.Widget concept(String text) =>
      cell(pw.Text(text, style: pw.TextStyle(color: _sageDark, fontWeight: pw.FontWeight.bold)));

  pw.Widget twoColumns(List<pw.Widget> children) {
    final rows = <pw.Widget>[];
    for (var i = 0; i < children.length; i += 2) {
      rows.add(pw.Padding(
        padding: const pw.EdgeInsets.only(bottom: 10),
        child: pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Expanded(child: children[i]),
          pw.SizedBox(width: 14),
          pw.Expanded(child: i + 1 < children.length ? children[i + 1] : pw.SizedBox()),
        ]),
      ));
    }
    return pw.Column(children: rows);
  }

  final contactLine = [config['businessPhone'], config['businessEmail']]
      .where((v) => v != null && v.toString().isNotEmpty)
      .join(' · ');

  final doc = pw.Document(title: '${quote['code']} - ${company['name'] ?? ''}', author: businessName);
  doc.addPage(pw.MultiPage(
    pageFormat: PdfPageFormat.a4,
    theme: theme.copyWith(defaultTextStyle: theme.defaultTextStyle.copyWith(fontSize: 10, color: _ink, lineSpacing: 2)),
    margin: const pw.EdgeInsets.symmetric(horizontal: 42, vertical: 36),
    footer: (context) => pw.Padding(
      padding: const pw.EdgeInsets.only(top: 16),
      child: pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
        pw.Text('${businessName.toUpperCase()} - PROPUESTA CORPORATIVA ${(company['name'] ?? '').toString().toUpperCase()}',
            style: labelStyle),
        pw.Text('${quote['code']}', style: labelStyle),
      ]),
    ),
    build: (context) => [
      // Encabezado
      pw.Container(
        padding: const pw.EdgeInsets.only(bottom: 10),
        decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: _sage, width: 2))),
        child: pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          logo != null ? pw.Image(logo, height: 52) : pw.Text(businessName, style: serifStyle(18)),
          pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
            pw.Container(
              padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: _sage), borderRadius: pw.BorderRadius.circular(999)),
              child: pw.Text('COTIZACIÓN CORPORATIVA',
                  style: pw.TextStyle(fontSize: 8, color: _sageDark, fontWeight: pw.FontWeight.bold, letterSpacing: 1.4)),
            ),
            pw.SizedBox(height: 6),
            pw.Text('${quote['code']}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
            if (quote['showIssuerRuc'] == true && (config['businessRuc'] ?? '').toString().isNotEmpty)
              pw.Text('RUC ${config['businessRuc']}', style: const pw.TextStyle(fontSize: 8, color: _muted)),
            if (contactLine.isNotEmpty) pw.Text(contactLine, style: const pw.TextStyle(fontSize: 8, color: _muted)),
          ]),
        ]),
      ),
      // Título
      pw.Container(
        margin: const pw.EdgeInsets.only(top: 16),
        padding: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 20),
        decoration: pw.BoxDecoration(color: _sage, borderRadius: pw.BorderRadius.circular(6)),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text('${quote['title'] ?? ''}', style: serifStyle(16, color: PdfColors.white)),
          if ((quote['subtitle'] ?? '').toString().isNotEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 6),
              child: pw.Text('${quote['subtitle']}', style: const pw.TextStyle(color: PdfColors.white)),
            ),
        ]),
      ),
      // Datos generales
      pw.Container(
        margin: const pw.EdgeInsets.only(top: 12),
        child: box(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          for (final (label, value, extra) in [
            (
              'CLIENTE',
              '${company['name'] ?? ''}${(quote['location'] ?? '').toString().isNotEmpty ? ' - ${quote['location']}' : ''}',
              (company['ruc'] ?? '').toString().isNotEmpty ? 'RUC ${company['ruc']}' : null,
            ),
            ('FECHA EMISIÓN', formatDay(quote['issueDate'], "dd 'de' MMMM 'de' yyyy"), null),
            ('FECHAS SERVICIO', serviceDatesLabel(days), null),
            ('HORARIO', scheduleLabel, null),
          ])
            pw.Expanded(
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(right: 8),
                child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Text(label, style: labelStyle),
                  pw.Text(value, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                  if (extra != null) pw.Text(extra, style: const pw.TextStyle(fontSize: 8, color: _muted)),
                ]),
              ),
            ),
        ])),
      ),
      if (hasIntro)
        section('Presentación', [pw.Text('${quote['introduction']}', textAlign: pw.TextAlign.justify)]),
      if (hasService)
        section('Servicio propuesto', [
          if ((quote['serviceDescription'] ?? '').toString().isNotEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 10),
              child: pw.Text('${quote['serviceDescription']}', textAlign: pw.TextAlign.justify),
            ),
          if (focusZones.isNotEmpty)
            box(pw.Column(children: [
              pw.Text('ZONAS DE ENFOQUE PRINCIPAL', style: labelStyle),
              pw.SizedBox(height: 4),
              pw.Text(focusZones.join(' · '), style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            ])),
        ]),
      section('Equipo y recursos', [
        pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Expanded(
            child: card('$therapists ${therapists == 1 ? 'Terapeuta' : 'Terapeutas'}',
                'Equipo profesional altamente capacitado para la atención de sus colaboradores.'),
          ),
          if (chairs > 0) ...[
            pw.SizedBox(width: 14),
            pw.Expanded(
              child: card(
                '$chairs ${chairs == 1 ? 'Silla Ergonómica' : 'Sillas Ergonómicas'}',
                'Equipamiento especializado que permite $chairs ${chairs == 1 ? 'atención' : 'atenciones simultáneas'} con total confort.',
              ),
            ),
          ],
          pw.SizedBox(width: 14),
          pw.Expanded(
            child: card(
              'Atención de ${toInt(quote['sessionDurationMin'])} min',
              'Sesiones fluidas${modality.isNotEmpty ? ' bajo modalidad ${modality.toLowerCase()}' : ''} durante el horario contratado.',
            ),
          ),
        ]),
      ]),
      section('Resumen de la jornada', [
        table(
          [headerCell('Concepto'), headerCell('Detalle del servicio')],
          [
            [
              concept('Fechas del evento'),
              cell(pw.Text(days.map((d) => formatDay(d['date'], "EEEE, d 'de' MMMM 'de' yyyy")).join(' · '))),
            ],
            [
              concept('Horario y Duración'),
              cell(sameSchedule && days.isNotEmpty
                  ? pw.Text('$scheduleLabel (${durationLabel(days.first['startTime'], days.first['endTime'])} por jornada)')
                  : pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                      for (final d in days)
                        pw.Text(
                            '${formatDay(d['date'], 'dd MMM')}: ${formatTime12(d['startTime'])} - ${formatTime12(d['endTime'])} (${durationLabel(d['startTime'], d['endTime'])})'),
                    ])),
            ],
            [
              concept('Capacidad Operativa'),
              cell(pw.Text(
                  '$therapists terapeutas profesionales${chairs > 0 ? ' y $chairs sillas de masaje simultáneas' : ''}')),
            ],
            [
              concept('Modalidad & Lugar'),
              cell(pw.Text([
                if (modality.isNotEmpty) modality,
                '${company['name'] ?? ''}${(quote['location'] ?? '').toString().isNotEmpty ? ' ${quote['location']}' : ''}',
              ].join(' · '))),
            ],
          ],
          {0: const pw.FractionColumnWidth(0.32), 1: const pw.FlexColumnWidth()},
        ),
      ]),
      if (scopeItems.isNotEmpty)
        section('Alcance del servicio', [
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: pw.BoxDecoration(border: pw.Border.all(color: _line), borderRadius: pw.BorderRadius.circular(6)),
            child: twoColumns([
              for (final item in scopeItems)
                pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Container(
                    width: 6,
                    height: 6,
                    margin: const pw.EdgeInsets.only(top: 4, right: 8),
                    decoration: const pw.BoxDecoration(color: _sage, shape: pw.BoxShape.circle),
                  ),
                  pw.Expanded(child: pw.Text(item)),
                ]),
            ]),
          ),
        ]),
      section('Inversión corporativa', [
        if (quote['showBreakdown'] == true)
          pw.Padding(
            padding: const pw.EdgeInsets.only(bottom: 12),
            child: table(
              [
                headerCell('Concepto'),
                headerCell('Cant.', right: true),
                headerCell('P. Unit.', right: true),
                headerCell('Subtotal', right: true),
              ],
              [
                for (final item in items)
                  [
                    cell(pw.Text('${item['description'] ?? ''}')),
                    cell(pw.Text(formatNumber(item['quantity'])), right: true),
                    cell(pw.Text(formatMoney(item['unitPrice'])), right: true),
                    cell(pw.Text(formatMoney(item['subtotal'])), right: true),
                  ],
              ],
              {
                0: const pw.FlexColumnWidth(3),
                1: const pw.FlexColumnWidth(1),
                2: const pw.FlexColumnWidth(1.4),
                3: const pw.FlexColumnWidth(1.4),
              },
            ),
          ),
        box(
          border: _sage,
          borderWidth: 1.5,
          pw.Column(children: [
            if (includeIgv || discount > 0)
              pw.Container(
                width: 260,
                margin: const pw.EdgeInsets.only(bottom: 6),
                child: pw.Column(children: [
                  if (discount > 0) ...[
                    _pdfLine('Subtotal', formatMoney(quote['subtotal'])),
                    _pdfLine('Descuento', '- ${formatMoney(discount)}'),
                  ],
                  if (includeIgv) ...[
                    _pdfLine('Op. gravada', formatMoney(total - igvAmount)),
                    _pdfLine('IGV (${formatNumber(quote['igvRate'])}%)', formatMoney(igvAmount)),
                  ],
                ]),
              ),
            pw.Text('INVERSIÓN TOTAL${includeIgv ? ' (INCLUYE IGV)' : ''}', style: labelStyle),
            pw.SizedBox(height: 4),
            pw.Text(formatMoney(total), style: serifStyle(28)),
            pw.SizedBox(height: 4),
            pw.Text(
              'Incluye ${days.length} ${days.length == 1 ? 'jornada' : 'jornadas'} de servicio ($hoursLabel totales de atención), '
              '$therapists terapeutas, equipos y logística de traslado a la sede.',
              textAlign: pw.TextAlign.center,
              style: mutedSmall,
            ),
          ]),
        ),
      ]),
      if (conditions.isNotEmpty)
        section('Condiciones del servicio', [
          twoColumns([
            for (final c in conditions)
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: const pw.BoxDecoration(
                  color: PdfColor.fromInt(0xFFFAFAF7),
                  border: pw.Border(
                    left: pw.BorderSide(color: _sage, width: 4),
                    top: pw.BorderSide(color: _line),
                    right: pw.BorderSide(color: _line),
                    bottom: pw.BorderSide(color: _line),
                  ),
                ),
                child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Text('${c['title'] ?? ''}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: _sageDark)),
                  pw.SizedBox(height: 2),
                  pw.Text('${c['text'] ?? ''}', style: mutedSmall),
                ]),
              ),
          ]),
          pw.Text('Cotización válida hasta el ${formatDay(validUntil, "dd 'de' MMMM 'de' yyyy")}.',
              style: const pw.TextStyle(fontSize: 8, color: _muted)),
        ]),
      section('Confirmación & próximos pasos', [
        pw.Text(
          'Tras la aprobación, iniciaremos las coordinaciones logísticas para accesos, validación del espacio, datos de contacto '
          'y detalles operativos para asegurar una jornada puntual y organizada.',
          textAlign: pw.TextAlign.justify,
        ),
        pw.SizedBox(height: 14),
        box(pw.Column(children: [
          if (logo != null) pw.Image(logo, height: 40),
          pw.SizedBox(height: 8),
          pw.Text('¡Gracias por considerar a $businessName!', style: serifStyle(12)),
          pw.Text('"Más que un spa, un espacio para sanar"',
              style: pw.TextStyle(fontStyle: pw.FontStyle.italic, color: _muted)),
        ])),
      ]),
    ],
  ));
  return doc.save();
}

pw.Widget _pdfLine(String label, String value) => pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [pw.Text(label, style: const pw.TextStyle(fontSize: 9.5)), pw.Text(value, style: const pw.TextStyle(fontSize: 9.5))],
    );

