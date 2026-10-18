import 'package:intl/intl.dart';

/// Formato único de montos y fechas (es-PE, soles, hora de Lima), igual que `web-admin/src/lib/format.ts`.
///
/// Lima no tiene horario de verano: siempre es UTC-5.
const Duration limaOffset = Duration(hours: -5);

final NumberFormat _money = NumberFormat('#,##0.00', 'en_US');

double toDouble(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0;
}

int toInt(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? 0;
}

int? toIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

String formatMoney(dynamic value) => 'S/ ${_money.format(toDouble(value))}';

/// Quita ceros innecesarios: 18.00 -> "18", 2.50 -> "2.5".
String formatNumber(dynamic value) {
  final number = toDouble(value);
  if (number == number.roundToDouble()) return number.toStringAsFixed(0);
  return number.toString();
}

/// Fechas "de calendario" (sin hora real): se guardan como YYYY-MM-DD, 00:00Z o 12:00Z.
bool isCalendarDate(String iso) => iso.length == 10 || RegExp(r'T(00|12):00:00(\.000)?Z$').hasMatch(iso);

DateTime? parseIso(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  final text = value.toString();
  if (text.isEmpty) return null;
  return DateTime.tryParse(text.length == 10 ? '${text}T12:00:00Z' : text)?.toUtc();
}

/// Convierte un instante a la "hora de pared" de Lima (DateTime en UTC con los campos de Lima).
DateTime toLima(DateTime instant) => instant.toUtc().add(limaOffset);

/// Instante UTC a partir de una fecha y hora ingresadas en hora de Lima.
DateTime fromLima(int year, int month, int day, [int hour = 0, int minute = 0]) =>
    DateTime.utc(year, month, day, hour, minute).subtract(limaOffset);

/// Día (año, mes, día) que representa la fecha: UTC para fechas de calendario, Lima para el resto.
DateTime effectiveDay(dynamic value) {
  final iso = value.toString();
  final date = parseIso(value)!;
  final shown = isCalendarDate(iso) ? date : toLima(date);
  return DateTime.utc(shown.year, shown.month, shown.day);
}

/// YYYY-MM-DD de un día.
String dateKey(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';

/// Hoy en Lima (sin hora).
DateTime limaToday() {
  final now = toLima(DateTime.now());
  return DateTime.utc(now.year, now.month, now.day);
}

String formatDate(dynamic value, [String pattern = 'dd/MM/yyyy']) {
  if (value == null || value.toString().isEmpty) return '';
  return DateFormat(pattern, 'es').format(effectiveDay(value));
}

/// Para fechas de calendario guardadas a las 12:00 UTC (módulo corporativo).
String formatDay(dynamic value, [String pattern = 'dd/MM/yyyy']) {
  final date = parseIso(value);
  if (date == null) return '';
  return DateFormat(pattern, 'es').format(date);
}

String formatTime(dynamic value) {
  final date = parseIso(value);
  if (date == null) return '';
  return formatClock(toLima(date));
}

String formatDateTime(dynamic value) {
  if (value == null) return '';
  return '${formatDate(value)} ${formatTime(value)}';
}

/// "02:30 p. m."
String formatClock(DateTime time) {
  final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
  final suffix = time.hour < 12 ? 'a. m.' : 'p. m.';
  return '${hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')} $suffix';
}

/// "11:30" -> "11:30 a. m."
String formatTime12(String time) {
  final parts = time.split(':').map(int.parse).toList();
  final h = parts[0];
  final suffix = h < 12 ? 'a. m.' : 'p. m.';
  final hour = h % 12 == 0 ? 12 : h % 12;
  return '$hour:${parts[1].toString().padLeft(2, '0')} $suffix';
}

int timeToMinutes(String time) {
  final parts = time.split(':').map(int.parse).toList();
  return parts[0] * 60 + parts[1];
}

String durationLabel(String start, String end) {
  final minutes = timeToMinutes(end) - timeToMinutes(start);
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  if (hours == 0) return '$rest minutos';
  return rest > 0 ? '$hours horas y $rest minutos' : '$hours horas';
}

/// "HH:mm" a partir de horas y minutos.
String hhmm(int hour, int minute) => '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

/// ISO a las 12:00 UTC para fechas sin hora (atenciones y gastos), igual que la web.
String calendarIso(DateTime day) => '${dateKey(day)}T12:00:00.000Z';

String capitalize(String text) => text.isEmpty ? text : text[0].toUpperCase() + text.substring(1);
