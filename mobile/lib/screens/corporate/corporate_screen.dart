import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import 'company_form_screen.dart';
import 'event_detail_screen.dart';
import 'quote_detail_screen.dart';

/// Primera jornada y cuántas más hay, p. ej. "12/05/2025 (+2)".
String daysLabel(dynamic days) {
  final list = asMapList(days);
  if (list.isEmpty) return '-';
  final first = formatDay(list.first['date']);
  return list.length == 1 ? first : '$first (+${list.length - 1})';
}

class CorporateScreen extends StatefulWidget {
  const CorporateScreen({super.key});

  @override
  State<CorporateScreen> createState() => _CorporateScreenState();
}

class _CorporateScreenState extends State<CorporateScreen> with LoaderMixin, SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this)
    ..addListener(() {
      if (!_tabs.indexIsChanging) return;
      _search.clear();
      setState(() {
        query = '';
        statusFilter = 'all';
      });
    });
  final _search = TextEditingController();

  List<Map<String, dynamic>> quotes = [];
  List<Map<String, dynamic>> events = [];
  List<Map<String, dynamic>> companies = [];
  String query = '';
  String statusFilter = 'all';

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/corporate/quotes'),
      context.api.get('/corporate/events'),
      context.api.get('/companies'),
    ]);
    quotes = asMapList(results[0]);
    events = asMapList(results[1]);
    companies = asMapList(results[2]);
  }

  Future<void> _openQuote(int? id) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuoteDetailScreen(quoteId: id)));
    reload(silent: true);
  }

  Future<void> _openEvent(int id) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: id)));
    reload(silent: true);
  }

  Future<void> _openCompany([Map<String, dynamic>? company]) async {
    final saved = await openForm<Map<String, dynamic>>(context, CompanyFormScreen(company: company));
    if (saved != null) reload(silent: true);
  }

  Future<void> _deleteQuote(Map<String, dynamic> quote) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar cotización', message: '¿Eliminar la cotización ${quote['code']}?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/corporate/quotes/${quote['id']}'), success: 'Cotización eliminada')) {
      reload(silent: true);
    }
  }

  Future<void> _deleteCompany(Map<String, dynamic> company) async {
    final ok = await confirmDialog(context,
        title: 'Eliminar empresa', message: '¿Eliminar la empresa ${company['name']}?', confirmText: 'Eliminar', destructive: true);
    if (!ok || !mounted) return;
    if (await runAction(() => context.api.delete('/companies/${company['id']}'), success: 'Empresa eliminada')) {
      reload(silent: true);
    }
  }

  bool _has(dynamic value, String q) => (value ?? '').toString().toLowerCase().contains(q);

  @override
  Widget build(BuildContext context) {
    final tab = _tabs.index;
    final statusOptions = tab == 0 ? quoteStatus : (tab == 1 ? eventStatus : null);
    return AppScaffold(
      title: 'Corporativo',
      route: '/corporate',
      actions: [
        IconButton(
          tooltip: 'Datos del emisor',
          icon: const Icon(Icons.tune),
          onPressed: () => openForm<bool>(context, const IssuerFormScreen()),
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        labelColor: Colors.white,
        unselectedLabelColor: Colors.white70,
        indicatorColor: Colors.white,
        tabs: [
          Tab(text: 'Cotizaciones (${quotes.length})'),
          Tab(text: 'Eventos (${events.length})'),
          Tab(text: 'Empresas (${companies.length})'),
        ],
      ),
      floatingActionButton: tab == 2
          ? FloatingActionButton.extended(
              onPressed: () => _openCompany(), icon: const Icon(Icons.add_business), label: const Text('Nueva empresa'))
          : FloatingActionButton.extended(
              onPressed: () => _openQuote(null), icon: const Icon(Icons.add), label: const Text('Nueva cotización')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(children: [
            Expanded(
              flex: 3,
              child: SearchField(controller: _search, hint: 'Buscar...', onChanged: (v) => setState(() => query = v)),
            ),
            if (statusOptions != null) ...[
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: SelectField<String>(
                  label: 'Estado',
                  value: statusFilter,
                  items: {'all': 'Todos', for (final e in statusOptions.entries) e.key: e.value.label},
                  onChanged: (v) => setState(() => statusFilter = v ?? 'all'),
                ),
              ),
            ],
          ]),
        ),
        Expanded(
          child: loaderBody(() => TabBarView(controller: _tabs, children: [_quotesList(), _eventsList(), _companiesList()])),
        ),
      ]),
    );
  }

  Widget _list(int count, String empty, Widget Function(int) builder) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      itemCount: count == 0 ? 1 : count,
      itemBuilder: (context, i) => count == 0 ? EmptyView(empty) : builder(i),
    );
  }

  Widget _quotesList() {
    final q = query.toLowerCase();
    final filtered = quotes.where((quote) {
      final matchesText = _has(quote['code'], q) || _has(quote['company']?['name'], q) || _has(quote['title'], q);
      final status = isQuoteExpired(quote) ? 'EXPIRED' : quote['status'];
      return matchesText && (statusFilter == 'all' || status == statusFilter);
    }).toList();
    return _list(filtered.length, 'No hay cotizaciones.', (i) {
      final quote = filtered[i];
      return Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          onTap: () => _openQuote(toInt(quote['id'])),
          title: Row(children: [
            Text(quote['code'] ?? '', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            StatusBadge.info(displayQuoteStatus(quote)),
          ]),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 4),
            Text(quote['company']?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
            if ((quote['location'] ?? '').toString().isNotEmpty) Text(quote['location']),
            Text('Emisión ${formatDay(quote['issueDate'])} · Jornadas ${daysLabel(quote['days'])}'),
          ]),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(formatMoney(quote['total']), style: const TextStyle(fontWeight: FontWeight.w700)),
            if (quote['event'] == null)
              IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _deleteQuote(quote)),
          ]),
        ),
      );
    });
  }

  Widget _eventsList() {
    final q = query.toLowerCase();
    final filtered = events.where((e) {
      final matchesText = _has(e['title'], q) || _has(e['company']?['name'], q);
      return matchesText && (statusFilter == 'all' || e['status'] == statusFilter);
    }).toList();
    return _list(filtered.length, 'No hay eventos. Convierta una cotización aceptada para crear uno.', (i) {
      final e = filtered[i];
      final status = eventStatus[e['status']];
      final balance = toDouble(e['balance']);
      return Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _openEvent(toInt(e['id'])),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(e['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700))),
                if (status != null) StatusBadge.info(status),
              ]),
              const SizedBox(height: 4),
              Text([
                e['company']?['name'] ?? '',
                if (e['quote'] != null) e['quote']['code'] ?? '',
                'Jornadas ${daysLabel(e['days'])}',
              ].where((s) => s.toString().isNotEmpty).join(' · ')),
              const Divider(),
              Row(children: [
                Expanded(child: _amount('Monto', formatMoney(e['agreedAmount']))),
                Expanded(child: _amount('Cobrado', formatMoney(e['totalPaid']), color: const Color(0xFF16A34A))),
                Expanded(
                    child: _amount('Saldo', formatMoney(balance), color: balance > 0 ? const Color(0xFFD97706) : null)),
              ]),
            ]),
          ),
        ),
      );
    });
  }

  Widget _amount(String label, String value, {Color? color}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
      Text(value, style: TextStyle(fontWeight: FontWeight.w700, color: color)),
    ]);
  }

  Widget _companiesList() {
    final q = query.toLowerCase();
    final filtered = companies.where((c) => _has(c['name'], q) || _has(c['ruc'], q) || _has(c['contactName'], q)).toList();
    return _list(filtered.length, 'No hay empresas registradas.', (i) {
      final c = filtered[i];
      final contact = [c['contactName'], c['contactPhone'], c['contactEmail']]
          .where((v) => v != null && v.toString().isNotEmpty)
          .join(' · ');
      return Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          onTap: () => _openCompany(c),
          title: Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if ((c['ruc'] ?? '').toString().isNotEmpty) Text('RUC ${c['ruc']}'),
            if (contact.isNotEmpty) Text(contact),
            Text('${toInt(c['_count']?['quotes'])} cotizaciones · ${toInt(c['_count']?['events'])} eventos'),
          ]),
          trailing:
              IconButton(tooltip: 'Eliminar', icon: const Icon(Icons.delete_outline), onPressed: () => _deleteCompany(c)),
        ),
      );
    });
  }
}
