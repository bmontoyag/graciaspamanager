import 'package:flutter_test/flutter_test.dart';
import 'package:gracia_spa/screens/corporate/quote_pdf.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() => initializeDateFormatting('es'));

  final quote = {
    'id': 1,
    'code': 'COT-2026-001',
    'title': 'JORNADA DE BIENESTAR',
    'subtitle': 'Masajes corporativos',
    'issueDate': '2026-10-01T12:00:00.000Z',
    'validityDays': 7,
    'introduction': 'Presentación de la propuesta.',
    'serviceDescription': 'Sesiones en silla ergonómica.',
    'focusZones': ['Cuello', 'Espalda'],
    'sessionDurationMin': 15,
    'therapistsCount': 2,
    'chairsCount': 2,
    'modality': 'Atención abierta continua',
    'scopeItems': ['Terapeutas profesionales', 'Traslado incluido'],
    'conditions': [
      {'title': 'Reserva', 'text': 'Se confirma con la aceptación.'},
    ],
    'showIssuerRuc': true,
    'includeIgv': true,
    'igvIncluded': false,
    'igvRate': 18,
    'discount': 50,
    'subtotal': 1000,
    'igvAmount': 171,
    'total': 1121,
    'showBreakdown': true,
    'company': {'name': 'Empresa SAC', 'ruc': '20123456789'},
    'location': 'Sede Central',
    'days': [
      {'id': 1, 'date': '2026-10-21T12:00:00.000Z', 'startTime': '09:00', 'endTime': '13:00'},
      {'id': 2, 'date': '2026-10-22T12:00:00.000Z', 'startTime': '14:00', 'endTime': '18:30'},
    ],
    'items': [
      {'id': 1, 'description': 'Jornada de masajes', 'quantity': 2, 'unitPrice': 500, 'subtotal': 1000},
    ],
  };

  test('genera un PDF de la cotización', () async {
    final bytes = await buildQuotePdf(quote, {'businessName': 'Gracia Spa', 'businessRuc': '10456789123'});
    expect(String.fromCharCodes(bytes.take(5)), '%PDF-');
    expect(bytes.length, greaterThan(1000));
  });

  test('etiqueta de fechas del servicio', () {
    expect(serviceDatesLabel([quote['days'] as List].expand((d) => d).cast<Map<String, dynamic>>().toList()),
        '21 y 22 de octubre, 2026');
  });
}
