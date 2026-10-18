import 'package:flutter_test/flutter_test.dart';
import 'package:gracia_spa/core/constants.dart';
import 'package:gracia_spa/core/format.dart';
import 'package:gracia_spa/core/links.dart';
import 'package:gracia_spa/screens/settings/audit_screen.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('montos', () {
    test('formatMoney usa soles con separador de miles', () {
      expect(formatMoney(1234.5), 'S/ 1,234.50');
      expect(formatMoney('80'), 'S/ 80.00');
      expect(formatMoney(null), 'S/ 0.00');
    });

    test('formatNumber quita ceros innecesarios', () {
      expect(formatNumber(18), '18');
      expect(formatNumber('2.50'), '2.5');
    });
  });

  group('fechas', () {
    test('las fechas de calendario se leen en UTC sin cambiar de día', () {
      expect(effectiveDay('2026-03-05T12:00:00.000Z'), DateTime.utc(2026, 3, 5));
      expect(effectiveDay('1990-07-21T00:00:00.000Z'), DateTime.utc(1990, 7, 21));
      expect(effectiveDay('2026-03-05'), DateTime.utc(2026, 3, 5));
    });

    test('los instantes se muestran en hora de Lima', () {
      // 02:30 UTC del 6 es 21:30 del 5 en Lima
      expect(effectiveDay('2026-03-06T02:30:00.000Z'), DateTime.utc(2026, 3, 5));
      expect(formatTime('2026-03-06T02:30:00.000Z'), '09:30 p. m.');
    });

    test('fromLima convierte una hora de Lima a UTC', () {
      expect(fromLima(2026, 3, 5, 21, 30).toIso8601String(), '2026-03-06T02:30:00.000Z');
    });

    test('calendarIso guarda el día a las 12:00 UTC', () {
      expect(calendarIso(DateTime.utc(2026, 1, 9)), '2026-01-09T12:00:00.000Z');
    });

    test('etiquetas de hora y duración', () {
      expect(formatTime12('13:05'), '1:05 p. m.');
      expect(formatTime12('00:15'), '12:15 a. m.');
      expect(durationLabel('09:00', '13:30'), '4 horas y 30 minutos');
      expect(durationLabel('09:00', '09:45'), '45 minutos');
    });
  });

  group('cotizaciones', () {
    test('una cotización enviada vence según su vigencia', () {
      final old = {'status': 'SENT', 'issueDate': '2020-01-01T12:00:00.000Z', 'validityDays': 7};
      expect(isQuoteExpired(old), isTrue);
      expect(displayQuoteStatus(old).label, 'Vencida');
      expect(isQuoteExpired({...old, 'status': 'ACCEPTED'}), isFalse);
    });
  });

  test('whatsappPhone agrega el código de Perú a números de 9 dígitos', () {
    expect(whatsappPhone('987 654 321'), '51987654321');
    expect(whatsappPhone('+51 987654321'), '51987654321');
  });

  test('auditDetails muestra el JSON como clave: valor', () {
    expect(auditDetails('{"name":"Ana","amount":20}'), 'name: Ana • amount: 20');
    expect(auditDetails(null), '-');
  });
}
