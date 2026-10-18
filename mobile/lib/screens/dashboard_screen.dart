import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../core/constants.dart';
import '../core/format.dart';
import '../core/links.dart';
import '../core/session.dart';
import '../navigation.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with LoaderMixin {
  Map<String, dynamic> stats = {};
  List<Map<String, dynamic>> appointments = [];
  List<Map<String, dynamic>> birthdays = [];
  String birthdayTemplate = defaultBirthdayMessage;

  @override
  Future<void> fetch() async {
    final api = context.api;
    final results = await Future.wait([
      api.get('/dashboard/stats'),
      api.get('/dashboard/appointments'),
      api.get('/clients').catchError((_) => <dynamic>[]),
      api.get('/configuration').catchError((_) => <String, dynamic>{}),
    ]);
    stats = asMap(results[0]);
    appointments = asMapList(results[1]);
    birthdays = _upcomingBirthdays(asMapList(results[2]));
    final config = asMap(results[3]);
    if ((config['birthdayMessage'] as String?)?.isNotEmpty == true) birthdayTemplate = config['birthdayMessage'];
  }

  /// Próximo cumpleaños (en los siguientes 7 días).
  DateTime _nextBirthday(Map client) {
    final birthday = parseIso(client['birthday'])!;
    final today = limaToday();
    var next = DateTime.utc(today.year, birthday.month, birthday.day);
    if (next.isBefore(today)) next = DateTime.utc(today.year + 1, birthday.month, birthday.day);
    return next;
  }

  List<Map<String, dynamic>> _upcomingBirthdays(List<Map<String, dynamic>> clients) {
    final today = limaToday();
    final limit = today.add(const Duration(days: 7));
    final upcoming = clients.where((c) => c['birthday'] != null && !_nextBirthday(c).isAfter(limit)).toList();
    upcoming.sort((a, b) => _nextBirthday(a).compareTo(_nextBirthday(b)));
    return upcoming;
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final isAdmin = session.user?.isAdmin ?? false;
    return AppScaffold(
      title: isAdmin ? 'Dashboard' : 'Resumen',
      route: '/dashboard',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            Text('Hola, ${session.user?.name.split(' ').first ?? ''}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            Text(capitalize(DateFormat("EEEE d 'de' MMMM", 'es').format(limaToday())),
                style: TextStyle(color: Theme.of(context).colorScheme.outline)),
            const SizedBox(height: 16),
            _stats(),
            const SizedBox(height: 16),
            _todayAppointments(session),
            if (birthdays.isNotEmpty) ...[const SizedBox(height: 16), _birthdays()],
            const SizedBox(height: 16),
            _quickLinks(session),
          ])),
    );
  }

  Widget _stats() {
    final salesMonth = toDouble(stats['salesMonth']);
    final corporateMonth = toDouble(stats['corporateMonth']);
    final expensesMonth = toDouble(stats['expensesMonth']);
    final net = salesMonth + corporateMonth - expensesMonth;
    final corporateToday = toDouble(stats['corporateToday']);
    return Column(children: [
      StatGrid(children: [
        StatCard(
          label: 'Ingresos hoy',
          value: formatMoney(stats['salesToday']),
          color: const Color(0xFF16A34A),
          hint: corporateToday > 0 ? '+ Corporativos: ${formatMoney(corporateToday)}' : null,
        ),
        StatCard(label: 'Gastos hoy', value: formatMoney(stats['expensesToday']), color: const Color(0xFFDC2626)),
        StatCard(label: 'Citas hoy', value: '${toInt(stats['appointmentsToday'])}'),
        StatCard(label: 'Total clientes', value: '${toInt(stats['totalClients'])}'),
        StatCard(
          label: 'Ingresos mes',
          value: formatMoney(salesMonth),
          color: const Color(0xFF15803D),
          hint: corporateMonth > 0 ? '+ Corporativos: ${formatMoney(corporateMonth)}' : null,
        ),
        StatCard(label: 'Gastos mes', value: formatMoney(expensesMonth), color: const Color(0xFFB91C1C)),
      ]),
      const SizedBox(height: 10),
      SizedBox(
        width: double.infinity,
        child: StatCard(
          label: 'Utilidad neta mensual',
          value: formatMoney(net),
          color: net >= 0 ? Theme.of(context).colorScheme.primary : const Color(0xFFDC2626),
        ),
      ),
    ]);
  }

  Widget _todayAppointments(Session session) {
    return SectionCard(
      title: 'Citas de hoy',
      icon: Icons.event,
      trailing: session.can('calendar')
          ? TextButton(
              onPressed: () => Navigator.of(context).pushReplacementNamed('/calendar'),
              child: const Text('Ver calendario'),
            )
          : null,
      child: appointments.isEmpty
          ? const EmptyView('No hay citas programadas para hoy.', icon: Icons.event_available)
          : Column(children: [
              for (final appt in appointments)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: SizedBox(
                    width: 64,
                    child: Text(formatTime(appt['date']), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  title: Text(appt['client']?['name'] ?? 'Cliente sin nombre'),
                  subtitle: Text([
                    appt['service']?['name'] ?? '—',
                    _workerNames(appt),
                  ].where((s) => s.isNotEmpty).join(' · ')),
                  trailing: StatusBadge.info(
                      appointmentStatus[appt['status']] ?? StatusInfo('${appt['status']}', Tone.neutral)),
                ),
            ]),
    );
  }

  String _workerNames(Map appt) {
    final workers = appt['workers'] as List? ?? [];
    if (workers.isNotEmpty) {
      return workers.map((w) => w['worker']?['name']).whereType<String>().join(', ');
    }
    return appt['worker']?['name'] ?? '';
  }

  Widget _birthdays() {
    final today = limaToday();
    return SectionCard(
      title: 'Próximos cumpleaños (7 días)',
      icon: Icons.cake_outlined,
      child: Column(children: [
        for (final client in birthdays)
          Builder(builder: (context) {
            final next = _nextBirthday(client);
            final isToday = next == today;
            final phone = client['phone'] as String?;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isToday ? const Color(0xFFFDF2F8) : null,
                border: Border.all(color: isToday ? const Color(0xFFFBCFE8) : const Color(0xFFDAD9D0)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(client['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    Text.rich(TextSpan(children: [
                      TextSpan(text: DateFormat("d 'de' MMMM", 'es').format(next)),
                      if (isToday)
                        const TextSpan(
                            text: '  ¡Es hoy!', style: TextStyle(color: Color(0xFFDB2777), fontWeight: FontWeight.w700)),
                    ])),
                    Text(phone?.isNotEmpty == true ? phone! : 'Sin número',
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
                  ]),
                ),
                if (phone?.isNotEmpty == true)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
                    onPressed: () => openWhatsApp(phone!, birthdayTemplate.replaceAll('{name}', client['name'] ?? '')),
                    icon: const Icon(Icons.chat, size: 18),
                    label: const Text('Felicitar'),
                  ),
              ]),
            );
          }),
      ]),
    );
  }

  Widget _quickLinks(Session session) {
    const links = [
      ('/calendar', 'Calendario', 'Ver citas programadas', Icons.calendar_month, 'calendar'),
      ('/attentions', 'Atenciones', 'Registrar una atención', Icons.check_circle_outline, 'attentions'),
      ('/clients', 'Clientes', 'Gestionar clientes', Icons.people_outline, 'clients'),
      ('/daily-closing', 'Cierre diario', 'Revisar ventas del día', Icons.attach_money, 'daily_closing'),
    ];
    final visible = links.where((l) => session.can(l.$5)).toList();
    if (visible.isEmpty) return const SizedBox.shrink();
    return SectionCard(
      title: 'Accesos rápidos',
      child: Column(children: [
        for (final link in visible)
          Card(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: ListTile(
              leading: Icon(link.$4, color: Theme.of(context).colorScheme.primary),
              title: Text(link.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(link.$3),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushReplacementNamed(link.$1),
            ),
          ),
      ]),
    );
  }
}
