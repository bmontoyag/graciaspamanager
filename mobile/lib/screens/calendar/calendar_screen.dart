import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../core/session.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';
import '../corporate/event_detail_screen.dart';
import 'appointment_form_screen.dart';

/// Elemento del calendario: una cita o una jornada corporativa.
class _Entry {
  _Entry.appointment(this.data)
      : corporate = false,
        start = toLima(parseIso(data['date'])!),
        color = appointmentColor(data['status']);

  _Entry.corporate(this.data)
      : corporate = true,
        start = _corporateStart(data),
        color = corporateEventColor;

  final Map<String, dynamic> data;
  final bool corporate;
  final DateTime start;
  final Color color;

  static DateTime _corporateStart(Map data) {
    final day = parseIso(data['date'])!;
    final parts = (data['startTime'] as String).split(':').map(int.parse).toList();
    return DateTime.utc(day.year, day.month, day.day, parts[0], parts[1]);
  }
}

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> with LoaderMixin {
  final Map<String, List<_Entry>> _byDay = {};
  DateTime _focused = limaToday();
  DateTime _selected = limaToday();
  CalendarFormat _format = CalendarFormat.month;
  String openTime = '09:00';
  String closeTime = '21:00';

  @override
  Future<void> fetch() async {
    final api = context.api;
    final results = await Future.wait([
      api.get('/appointments'),
      api.get('/corporate/calendar').catchError((_) => <dynamic>[]),
      api.get('/configuration').catchError((_) => <String, dynamic>{}),
    ]);
    _byDay.clear();
    for (final appt in asMapList(results[0])) {
      if (appt['date'] == null) continue;
      final entry = _Entry.appointment(appt);
      _byDay.putIfAbsent(dateKey(entry.start), () => []).add(entry);
    }
    for (final day in asMapList(results[1])) {
      final entry = _Entry.corporate(day);
      _byDay.putIfAbsent(dateKey(entry.start), () => []).add(entry);
    }
    for (final list in _byDay.values) {
      list.sort((a, b) => a.start.compareTo(b.start));
    }
    final config = asMap(results[2]);
    openTime = config['openTime'] ?? openTime;
    closeTime = config['closeTime'] ?? closeTime;
  }

  List<_Entry> _entries(DateTime day) => _byDay[dateKey(day)] ?? const [];

  Future<void> _openAppointment([Map<String, dynamic>? appointment]) async {
    final saved = await openForm<bool>(
      context,
      AppointmentFormScreen(appointment: appointment, initialDate: appointment == null ? _selected : null),
    );
    if (saved == true) reload(silent: true);
  }

  void _openCorporate(_Entry entry) {
    final eventId = toInt(entry.data['event']?['id']);
    if (!context.read<Session>().can('corporate')) {
      showError(context, 'No tiene acceso al módulo Corporativo.');
      return;
    }
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: eventId)))
        .then((_) => reload(silent: true));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Calendario de citas',
      route: '/calendar',
      actions: [
        IconButton(
          tooltip: 'Hoy',
          icon: const Icon(Icons.today),
          onPressed: () => setState(() => _focused = _selected = limaToday()),
        ),
      ],
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAppointment(),
        icon: const Icon(Icons.add),
        label: const Text('Nueva cita'),
      ),
      body: loaderBody(() {
        final entries = _entries(_selected);
        return ListView(padding: const EdgeInsets.only(bottom: 96), children: [
          Card(
            margin: const EdgeInsets.all(12),
            child: TableCalendar<_Entry>(
              locale: 'es',
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2100, 12, 31),
              focusedDay: _focused,
              selectedDayPredicate: (d) => isSameDay(d, _selected),
              calendarFormat: _format,
              availableCalendarFormats: const {
                CalendarFormat.month: 'Mes',
                CalendarFormat.twoWeeks: '2 semanas',
                CalendarFormat.week: 'Semana',
              },
              startingDayOfWeek: StartingDayOfWeek.monday,
              eventLoader: _entries,
              onFormatChanged: (f) => setState(() => _format = f),
              onPageChanged: (d) => _focused = d,
              onDaySelected: (selected, focused) => setState(() {
                _selected = DateTime.utc(selected.year, selected.month, selected.day);
                _focused = focused;
              }),
              headerStyle: const HeaderStyle(titleCentered: true, formatButtonShowsNext: false),
              calendarStyle: CalendarStyle(
                todayDecoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
                  shape: BoxShape.circle,
                ),
                selectedDecoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle),
              ),
              calendarBuilders: CalendarBuilders(
                markerBuilder: (context, day, events) {
                  if (events.isEmpty) return null;
                  return Positioned(
                    bottom: 4,
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      for (final e in events.take(4))
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          decoration: BoxDecoration(color: e.color, shape: BoxShape.circle),
                        ),
                      if (events.length > 4)
                        Text('+${events.length - 4}', style: const TextStyle(fontSize: 9)),
                    ]),
                  );
                },
              ),
            ),
          ),
          const _Legend(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(
              capitalize(DateFormat("EEEE d 'de' MMMM", 'es').format(_selected)),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Horario de atención: ${formatTime12(openTime)} - ${formatTime12(closeTime)}',
                style: TextStyle(color: Theme.of(context).colorScheme.outline, fontSize: 12)),
          ),
          if (entries.isEmpty) const EmptyView('No hay citas para este día.', icon: Icons.event_available),
          for (final entry in entries) _entryTile(entry),
        ]);
      }),
    );
  }

  Widget _entryTile(_Entry entry) {
    final data = entry.data;
    if (entry.corporate) {
      final workers = asMapList(data['workers']).map((w) => w['worker']?['name']).whereType<String>().join(', ');
      return Card(
        margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: ListTile(
          leading: Container(width: 6, height: 40, color: entry.color),
          title: Text('Corporativo: ${data['event']?['company']?['name'] ?? data['event']?['title'] ?? ''}'),
          subtitle: Text([
            '${formatTime12(data['startTime'])} - ${formatTime12(data['endTime'])}',
            if (workers.isNotEmpty) workers,
          ].join(' · ')),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _openCorporate(entry),
        ),
      );
    }
    final workers = asMapList(data['workers']).map((w) => w['worker']?['name']).whereType<String>().join(', ');
    final status = appointmentStatus[data['status']] ?? StatusInfo('${data['status']}', Tone.neutral);
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: ListTile(
        leading: Container(width: 6, height: 40, color: entry.color),
        title: Text('${data['client']?['name'] ?? 'Cliente'} - ${data['service']?['name'] ?? 'Servicio'}'),
        subtitle: Text([
          formatClock(entry.start),
          '${toInt(data['duration'])} min',
          if (workers.isNotEmpty) workers else if (data['worker'] != null) data['worker']['name'],
        ].join(' · ')),
        trailing: StatusBadge.info(status),
        onTap: () => _openAppointment(data),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    const items = [
      ('Confirmado', Color(0xFF059669)),
      ('Pendiente', Color(0xFFD97706)),
      ('Completado', Color(0xFF2563EB)),
      ('Cancelado / No asistió', Color(0xFFDC2626)),
      ('Evento corporativo', corporateEventColor),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Wrap(spacing: 12, runSpacing: 4, children: [
        for (final (label, color) in items)
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 12)),
          ]),
      ]),
    );
  }
}
