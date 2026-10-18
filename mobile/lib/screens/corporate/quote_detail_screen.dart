import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'company_form_screen.dart';
import 'event_detail_screen.dart';
import 'quote_pdf.dart';

double _round2(double v) => (v * 100).roundToDouble() / 100;
double _num(TextEditingController c) => double.tryParse(c.text.replaceAll(',', '.')) ?? 0;

class _Day {
  _Day(this.date, this.startTime, this.endTime);
  DateTime? date;
  String startTime;
  String endTime;
}

class _Item {
  _Item({this.serviceId = 0, String description = '', String quantity = '1', String unitPrice = '0'})
      : description = TextEditingController(text: description),
        quantity = TextEditingController(text: quantity),
        unitPrice = TextEditingController(text: unitPrice);
  int serviceId;
  final TextEditingController description;
  final TextEditingController quantity;
  final TextEditingController unitPrice;
  double get subtotal => _num(quantity) * _num(unitPrice);
}

class _Condition {
  _Condition(String title, String text)
      : title = TextEditingController(text: title),
        text = TextEditingController(text: text);
  final TextEditingController title;
  final TextEditingController text;
}

/// Detalle de una cotización (acciones de estado, PDF) con su formulario.
/// Con [quoteId] nulo crea una cotización nueva.
class QuoteDetailScreen extends StatefulWidget {
  const QuoteDetailScreen({super.key, this.quoteId});

  final int? quoteId;

  @override
  State<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends State<QuoteDetailScreen> with LoaderMixin {
  final _formKey = GlobalKey<FormState>();
  Map<String, dynamic>? quote;
  List<Map<String, dynamic>> companies = [];
  List<Map<String, dynamic>> services = [];
  double configIgvRate = 18;
  bool _busy = false;

  int companyId = 0;
  final location = TextEditingController();
  final title = TextEditingController(text: DefaultQuote.title);
  final subtitle = TextEditingController(text: DefaultQuote.subtitle);
  DateTime issueDate = limaToday();
  final validityDays = TextEditingController(text: '7');
  final introduction = TextEditingController(text: DefaultQuote.introduction);
  final serviceDescription = TextEditingController(text: DefaultQuote.serviceDescription);
  final sessionDurationMin = TextEditingController(text: '15');
  final therapistsCount = TextEditingController(text: '1');
  final chairsCount = TextEditingController(text: '1');
  final modality = TextEditingController(text: DefaultQuote.modality);
  bool showIssuerRuc = false;
  bool includeIgv = false;
  bool igvIncluded = false;
  final discount = TextEditingController(text: '0');
  bool showBreakdown = false;
  final therapistDayRate = TextEditingController(text: '0');
  final notes = TextEditingController();
  List<TextEditingController> focusZones = [for (final z in DefaultQuote.focusZones) TextEditingController(text: z)];
  List<TextEditingController> scopeItems = [for (final s in DefaultQuote.scopeItems) TextEditingController(text: s)];
  List<_Condition> conditions = [for (final c in DefaultQuote.conditions) _Condition(c['title']!, c['text']!)];
  List<_Day> days = [_Day(limaToday(), '09:00', '13:00')];
  List<_Item> items = [_Item(description: 'Jornada de masajes corporativos')];

  bool get readOnly => quote?['status'] == 'CONVERTED';
  double get igvRate => quote != null ? toDouble(quote!['igvRate']) : configIgvRate;

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/companies'),
      context.api.get('/services').catchError((_) => <dynamic>[]),
      context.api.get('/configuration').catchError((_) => <String, dynamic>{}),
      if (widget.quoteId != null) context.api.get('/corporate/quotes/${widget.quoteId}'),
    ]);
    companies = asMapList(results[0]);
    services = asMapList(results[1]).where((s) => s['isActive'] == true).toList();
    configIgvRate = asMap(results[2])['igvRate'] == null ? 18 : toDouble(asMap(results[2])['igvRate']);
    if (widget.quoteId != null) _fill(asMap(results[3]));
  }

  void _fill(Map<String, dynamic> q) {
    quote = q;
    companyId = toInt(q['companyId']);
    location.text = q['location'] ?? '';
    title.text = q['title'] ?? '';
    subtitle.text = q['subtitle'] ?? '';
    issueDate = effectiveDay(q['issueDate']);
    validityDays.text = '${toInt(q['validityDays'])}';
    introduction.text = q['introduction'] ?? '';
    serviceDescription.text = q['serviceDescription'] ?? '';
    sessionDurationMin.text = '${toInt(q['sessionDurationMin'])}';
    therapistsCount.text = '${toInt(q['therapistsCount'])}';
    chairsCount.text = '${toInt(q['chairsCount'])}';
    modality.text = q['modality'] ?? '';
    showIssuerRuc = q['showIssuerRuc'] == true;
    includeIgv = q['includeIgv'] == true;
    igvIncluded = q['igvIncluded'] == true;
    discount.text = formatNumber(q['discount']);
    showBreakdown = q['showBreakdown'] == true;
    therapistDayRate.text = formatNumber(q['therapistDayRate']);
    notes.text = q['notes'] ?? '';
    focusZones = [for (final z in (q['focusZones'] as List? ?? [])) TextEditingController(text: '$z')];
    scopeItems = [for (final s in (q['scopeItems'] as List? ?? [])) TextEditingController(text: '$s')];
    conditions = [for (final c in asMapList(q['conditions'])) _Condition(c['title'] ?? '', c['text'] ?? '')];
    days = [for (final d in asMapList(q['days'])) _Day(effectiveDay(d['date']), d['startTime'] ?? '09:00', d['endTime'] ?? '13:00')];
    items = [
      for (final i in asMapList(q['items']))
        _Item(
          serviceId: toInt(i['serviceId']),
          description: i['description'] ?? '',
          quantity: formatNumber(i['quantity']),
          unitPrice: formatNumber(i['unitPrice']),
        ),
    ];
  }

  ({double subtotal, double base, double igvAmount, double total}) get totals {
    // Mismo cálculo que el backend (CorporateQuotesService.computeTotals)
    final subtotal = _round2(items.fold(0.0, (sum, i) => sum + i.subtotal));
    final base = _round2((subtotal - _num(discount)).clamp(0, double.infinity).toDouble());
    var igvAmount = 0.0;
    var total = base;
    if (includeIgv) {
      if (igvIncluded) {
        igvAmount = _round2(base - base / (1 + igvRate / 100));
      } else {
        igvAmount = _round2(base * igvRate / 100);
        total = _round2(base + igvAmount);
      }
    }
    return (subtotal: subtotal, base: base, igvAmount: igvAmount, total: total);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (companyId == 0) {
      showError(context, 'Seleccione la empresa');
      return;
    }
    if (days.any((d) => d.date == null)) {
      showError(context, 'Complete la fecha de todas las jornadas');
      return;
    }
    final payload = {
      'companyId': companyId,
      if (location.text.trim().isNotEmpty) 'location': location.text.trim(),
      'title': title.text.trim(),
      if (subtitle.text.trim().isNotEmpty) 'subtitle': subtitle.text.trim(),
      'issueDate': dateKey(issueDate),
      'validityDays': int.tryParse(validityDays.text) ?? 7,
      'introduction': introduction.text,
      'serviceDescription': serviceDescription.text,
      'focusZones': focusZones.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList(),
      'sessionDurationMin': int.tryParse(sessionDurationMin.text) ?? 15,
      'therapistsCount': int.tryParse(therapistsCount.text) ?? 1,
      'chairsCount': int.tryParse(chairsCount.text) ?? 0,
      'modality': modality.text,
      'scopeItems': scopeItems.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList(),
      'conditions': [
        for (final c in conditions)
          if (c.title.text.trim().isNotEmpty) {'title': c.title.text, 'text': c.text.text},
      ],
      'showIssuerRuc': showIssuerRuc,
      'includeIgv': includeIgv,
      'igvIncluded': includeIgv && igvIncluded,
      'discount': _num(discount),
      'showBreakdown': showBreakdown,
      'therapistDayRate': _num(therapistDayRate),
      'notes': notes.text,
      'days': [
        for (final d in days) {'date': dateKey(d.date!), 'startTime': d.startTime, 'endTime': d.endTime},
      ],
      'items': [
        for (final i in items)
          {
            if (i.serviceId != 0) 'serviceId': i.serviceId,
            'description': i.description.text,
            'quantity': _num(i.quantity),
            'unitPrice': _num(i.unitPrice),
          },
      ],
    };
    setState(() => _busy = true);
    try {
      if (quote != null) {
        final saved = asMap(await context.api.patch('/corporate/quotes/${quote!['id']}', payload));
        if (!mounted) return;
        setState(() => _fill(saved));
        showSuccess(context, 'Cotización actualizada');
      } else {
        final saved = asMap(await context.api.post('/corporate/quotes', payload));
        if (!mounted) return;
        showSuccess(context, 'Cotización ${saved['code']} creada');
        Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => QuoteDetailScreen(quoteId: toInt(saved['id']))));
      }
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _changeStatus(String status, String message) => _run(() async {
        final updated = asMap(await context.api.patch('/corporate/quotes/${quote!['id']}/status', {'status': status}));
        if (!mounted) return;
        setState(() => _fill(updated));
        showSuccess(context, message);
      });

  void _duplicate() => _run(() async {
        final copy = asMap(await context.api.post('/corporate/quotes/${quote!['id']}/duplicate'));
        if (!mounted) return;
        showSuccess(context, 'Se creó la cotización ${copy['code']}');
        Navigator.of(context)
            .pushReplacement(MaterialPageRoute(builder: (_) => QuoteDetailScreen(quoteId: toInt(copy['id']))));
      });

  Future<void> _convert() async {
    final ok = await confirmDialog(context,
        title: '¿Convertir en evento?',
        message:
            'Se creará un evento corporativo con las jornadas y el monto de esta cotización. La cotización quedará bloqueada para edición.',
        confirmText: 'Convertir');
    if (!ok) return;
    await _run(() async {
      final event = asMap(await context.api.post('/corporate/quotes/${quote!['id']}/convert'));
      if (!mounted) return;
      showSuccess(context, 'Evento creado');
      _openEvent(toInt(event['id']));
    });
  }

  void _openEvent(int id) =>
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: id)));

  Future<void> _newCompany() async {
    final company = await openForm<Map<String, dynamic>>(context, const CompanyFormScreen());
    if (company == null || !mounted) return;
    final data = await context.api.get('/companies');
    setState(() {
      companies = asMapList(data);
      companyId = toInt(company['id']);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.quoteId == null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isNew ? 'Nueva cotización' : (quote?['code'] ?? 'Cotización')),
        actions: [
          if (quote != null)
            IconButton(
              tooltip: 'Ver PDF',
              icon: const Icon(Icons.picture_as_pdf_outlined),
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => QuotePdfScreen(quoteId: toInt(quote!['id'])))),
            ),
        ],
      ),
      body: loaderBody(() => Form(
            key: _formKey,
            child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), children: [
              if (quote != null) ...[_header(), const SizedBox(height: 16)],
              AbsorbPointer(
                absorbing: readOnly,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _formSections()),
              ),
              if (!readOnly) ...[
                const SizedBox(height: 16),
                SubmitButton(label: isNew ? 'Crear cotización' : 'Guardar cambios', busy: _busy, onPressed: _save),
              ],
            ]),
          )),
    );
  }

  Widget _header() {
    final q = quote!;
    final status = q['status'];
    Widget action(String label, IconData icon, VoidCallback onPressed, {Color? color}) => OutlinedButton.icon(
          onPressed: _busy ? null : onPressed,
          style: color == null ? null : OutlinedButton.styleFrom(foregroundColor: color),
          icon: Icon(icon, size: 18),
          label: Text(label),
        );
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(q['code'] ?? '',
                style: const TextStyle(fontFamily: 'monospace', fontSize: 20, fontWeight: FontWeight.w800)),
          ),
          StatusBadge.info(displayQuoteStatus(q)),
        ]),
        const SizedBox(height: 4),
        Text('${q['company']?['name'] ?? ''} · ${formatMoney(q['total'])}'),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          action('Duplicar', Icons.copy, _duplicate),
          if (status == 'DRAFT') action('Marcar enviada', Icons.send, () => _changeStatus('SENT', 'Marcada como enviada')),
          if (['DRAFT', 'SENT', 'REJECTED'].contains(status))
            action('Aceptada', Icons.check_circle_outline, () => _changeStatus('ACCEPTED', 'Cotización aceptada'),
                color: const Color(0xFF15803D)),
          if (['DRAFT', 'SENT', 'ACCEPTED'].contains(status))
            action('Rechazada', Icons.cancel_outlined, () => _changeStatus('REJECTED', 'Cotización rechazada'),
                color: const Color(0xFFDC2626)),
          if (['SENT', 'ACCEPTED', 'REJECTED'].contains(status))
            action('Borrador', Icons.undo, () => _changeStatus('DRAFT', 'Cotización devuelta a borrador')),
          if (status == 'ACCEPTED')
            FilledButton.icon(
                onPressed: _busy ? null : _convert, icon: const Icon(Icons.event_available), label: const Text('Convertir en evento')),
          if (q['event'] != null)
            FilledButton.icon(
                onPressed: () => _openEvent(toInt(q['event']['id'])),
                icon: const Icon(Icons.event_available),
                label: const Text('Ver evento')),
        ]),
        if (readOnly) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F3FF),
              border: Border.all(color: const Color(0xFFDDD6FE)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'Esta cotización ya fue convertida en evento y es de solo lectura. Para una nueva propuesta use "Duplicar".',
              style: TextStyle(color: Color(0xFF5B21B6)),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _text(TextEditingController c, String label,
      {int maxLines = 1, bool number = false, bool required = false, String? hint, bool recalc = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: c,
        maxLines: maxLines,
        keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : null,
        validator: required ? requiredValidator : null,
        onChanged: recalc ? (_) => setState(() {}) : null,
        decoration: InputDecoration(labelText: label, hintText: hint),
      ),
    );
  }

  Widget _stringList(List<TextEditingController> values, String addLabel) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      for (var i = 0; i < values.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            Expanded(child: TextField(controller: values[i])),
            if (!readOnly)
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                onPressed: () => setState(() => values.removeAt(i)),
              ),
          ]),
        ),
      if (!readOnly)
        TextButton.icon(
          onPressed: () => setState(() => values.add(TextEditingController())),
          icon: const Icon(Icons.add),
          label: Text(addLabel),
        ),
    ]);
  }

  Widget _section(String title, List<Widget> children, {String? subtitle}) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: SectionCard(
          title: title,
          subtitle: subtitle,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      );

  List<Widget> _formSections() {
    final t = totals;
    final selectedCompany = companies.where((c) => toInt(c['id']) == companyId).firstOrNull;
    final estimatedTherapistCost = _num(therapistDayRate) * (int.tryParse(therapistsCount.text) ?? 0) * days.length;
    final netIncome = includeIgv ? t.total - t.igvAmount : t.total;
    final margin = netIncome - estimatedTherapistCost;

    return [
      _section('Cliente y emisión', [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: SearchSelectField(
              label: 'Empresa *',
              options: companies,
              value: companyId == 0 ? null : companyId,
              subtitleOf: (c) => (c['ruc'] ?? '').toString().isEmpty ? '' : 'RUC ${c['ruc']}',
              onChanged: (c) => setState(() => companyId = toInt(c?['id'])),
            ),
          ),
          if (!readOnly)
            IconButton(tooltip: 'Nueva empresa', onPressed: _newCompany, icon: const Icon(Icons.add_business_outlined)),
        ]),
        if ((selectedCompany?['contactName'] ?? '').toString().isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Contacto: ${selectedCompany!['contactName']}${(selectedCompany['contactPhone'] ?? '').toString().isNotEmpty ? ' - ${selectedCompany['contactPhone']}' : ''}',
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline),
            ),
          ),
        const SizedBox(height: 12),
        _text(location, 'Sede / Lugar del servicio', hint: 'Ej. Sede La Molina'),
        Row(children: [
          Expanded(child: DateField(label: 'Fecha de emisión', value: issueDate, onChanged: (d) => setState(() => issueDate = d ?? issueDate))),
          const SizedBox(width: 12),
          Expanded(
            child: TextFormField(
              controller: validityDays,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Vigencia (días)'),
            ),
          ),
        ]),
      ]),
      _section('Contenido de la propuesta', [
        _text(title, 'Título', required: true),
        _text(subtitle, 'Subtítulo'),
        _text(introduction, '01. Presentación', maxLines: 5),
        _text(serviceDescription, '02. Servicio propuesto', maxLines: 4),
        const FormSectionTitle('Zonas de enfoque'),
        _stringList(focusZones, 'Agregar zona'),
      ]),
      _section('Equipo y jornadas', [
        Row(children: [
          Expanded(child: _text(therapistsCount, 'Terapeutas', number: true, recalc: true)),
          const SizedBox(width: 12),
          Expanded(child: _text(chairsCount, 'Sillas / camillas', number: true)),
        ]),
        Row(children: [
          Expanded(child: _text(sessionDurationMin, 'Duración sesión (min)', number: true)),
          const SizedBox(width: 12),
          Expanded(child: _text(modality, 'Modalidad')),
        ]),
        const FormSectionTitle('Jornadas *'),
        for (var i = 0; i < days.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(children: [
              Row(children: [
                Expanded(
                  child: DateField(
                    label: 'Jornada ${i + 1}',
                    value: days[i].date,
                    onChanged: (d) => setState(() => days[i].date = d),
                  ),
                ),
                if (!readOnly && days.length > 1)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                    onPressed: () => setState(() => days.removeAt(i)),
                  ),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: TimeField(
                      label: 'Inicio', value: days[i].startTime, onChanged: (v) => setState(() => days[i].startTime = v)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TimeField(label: 'Fin', value: days[i].endTime, onChanged: (v) => setState(() => days[i].endTime = v)),
                ),
              ]),
              if (i < days.length - 1) const Divider(height: 24),
            ]),
          ),
        if (!readOnly)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => days.add(_Day(null, days.last.startTime, days.last.endTime))),
              icon: const Icon(Icons.add),
              label: const Text('Agregar jornada'),
            ),
          ),
      ]),
      _section('Alcance y condiciones', [
        const FormSectionTitle('05. Alcance del servicio'),
        _stringList(scopeItems, 'Agregar ítem'),
        const FormSectionTitle('07. Condiciones del servicio'),
        for (var i = 0; i < conditions.length; i++)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Column(children: [
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: conditions[i].title,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      decoration: const InputDecoration(hintText: 'Título'),
                    ),
                  ),
                  if (!readOnly)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                      onPressed: () => setState(() => conditions.removeAt(i)),
                    ),
                ]),
                const SizedBox(height: 8),
                TextField(controller: conditions[i].text, maxLines: 2),
              ]),
            ),
          ),
        if (!readOnly)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => conditions.add(_Condition('', ''))),
              icon: const Icon(Icons.add),
              label: const Text('Agregar condición'),
            ),
          ),
      ]),
      _section('Inversión', subtitle: 'Conceptos de cobro. Puede mostrar solo el total o el detalle en el PDF.', [
        for (var i = 0; i < items.length; i++) _itemRow(i),
        if (!readOnly)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => items.add(_Item())),
              icon: const Icon(Icons.add),
              label: const Text('Agregar concepto'),
            ),
          ),
        const FormSectionTitle('Opciones tributarias y de presentación'),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: showIssuerRuc,
          onChanged: (v) => setState(() => showIssuerRuc = v ?? false),
          title: const Text('Mostrar RUC del emisor en la cotización'),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: includeIgv,
          onChanged: (v) => setState(() => includeIgv = v ?? false),
          title: Text('Incluir IGV (${formatNumber(igvRate)}%)'),
        ),
        if (includeIgv)
          Padding(
            padding: const EdgeInsets.only(left: 16),
            child: RadioGroup<bool>(
              groupValue: igvIncluded,
              onChanged: (v) => setState(() => igvIncluded = v ?? false),
              child: const Column(children: [
                RadioListTile<bool>(
                    contentPadding: EdgeInsets.zero, value: false, title: Text('Precios más IGV (se suma al total)')),
                RadioListTile<bool>(
                    contentPadding: EdgeInsets.zero, value: true, title: Text('Precios incluyen IGV (se desglosa)')),
              ]),
            ),
          ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: showBreakdown,
          onChanged: (v) => setState(() => showBreakdown = v ?? false),
          title: const Text('Mostrar detalle de conceptos en el PDF'),
        ),
        _text(discount, 'Descuento (S/)', number: true, recalc: true),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(children: [
            InfoRow('Subtotal', formatMoney(t.subtotal)),
            if (_num(discount) > 0) InfoRow('Descuento', '- ${formatMoney(_num(discount))}', color: const Color(0xFFDC2626)),
            if (includeIgv) ...[
              InfoRow('Op. gravada', formatMoney(t.total - t.igvAmount)),
              InfoRow('IGV (${formatNumber(igvRate)}%)', formatMoney(t.igvAmount)),
            ],
            const Divider(),
            InfoRow('Total', formatMoney(t.total), bold: true),
          ]),
        ),
      ]),
      _section('Datos internos',
          subtitle: 'No se muestran en el PDF. Sirven para estimar el margen y sugerir el pago al convertir en evento.', [
        _text(therapistDayRate, 'Pago por terapeuta por jornada (S/)', number: true, recalc: true),
        InfoRow('Costo estimado terapeutas', formatMoney(estimatedTherapistCost)),
        Text('${therapistsCount.text} terapeutas x ${days.length} jornadas',
            style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
        InfoRow('Margen estimado${includeIgv ? ' (sin IGV)' : ''}', formatMoney(margin),
            bold: true, color: margin >= 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626)),
        const SizedBox(height: 12),
        _text(notes, 'Notas internas', maxLines: 2),
      ]),
    ];
  }

  Widget _itemRow(int i) {
    final item = items[i];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor))),
      child: Column(children: [
        SelectField<int>(
          label: 'Servicio (opcional)',
          value: item.serviceId,
          items: {0: 'Personalizado', for (final s in services) toInt(s['id']): s['name'] ?? ''},
          onChanged: (v) => setState(() {
            item.serviceId = v ?? 0;
            final service = services.where((s) => toInt(s['id']) == item.serviceId).firstOrNull;
            if (service != null) {
              item.description.text = service['name'] ?? '';
              item.unitPrice.text = formatNumber(service['price']);
            }
          }),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: item.description,
          validator: requiredValidator,
          decoration: const InputDecoration(labelText: 'Descripción *'),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: TextFormField(
              controller: item.quantity,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Cantidad'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextFormField(
              controller: item.unitPrice,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Precio unit.'),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 92,
            child: Text(formatMoney(item.subtotal), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          if (!readOnly && items.length > 1)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
              onPressed: () => setState(() => items.removeAt(i)),
            ),
        ]),
      ]),
    );
  }
}
