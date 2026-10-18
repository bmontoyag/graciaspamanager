import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gracia_spa/core/api_client.dart';
import 'package:gracia_spa/core/branding.dart';
import 'package:gracia_spa/core/session.dart';
import 'package:gracia_spa/main.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Backend simulado: login con una cuenta y listas vacías para el resto.
http.Client fakeBackend({List<String> permissions = const ['all']}) {
  return MockClient((request) async {
    final path = request.url.path;
    if (path.endsWith('/auth/login')) {
      final body = jsonDecode(request.body) as Map;
      if (body['password'] != 'secreto') {
        return http.Response(jsonEncode({'message': 'Unauthorized', 'statusCode': 401}), 401);
      }
      return http.Response(
        jsonEncode({
          'access_token': 'token-de-prueba',
          'user': {'id': 1, 'name': 'Ana', 'email': 'ana@spa.pe', 'roles': ['Admin'], 'permissions': permissions},
        }),
        201,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }
    if (path.endsWith('/dashboard/stats')) {
      return http.Response(jsonEncode({'totalClients': 0, 'appointmentsToday': 0}), 200);
    }
    if (path.contains('/configuration')) return http.Response('{}', 200);
    return http.Response('[]', 200);
  });
}

Future<Session> pumpApp(WidgetTester tester, http.Client client) async {
  final api = ApiClient(baseUrl: 'https://api.test', httpClient: client);
  final session = Session(api);
  final branding = Branding(api);
  await tester.runAsync(session.restore);
  await tester.pumpWidget(GraciaSpaApp(session: session, branding: branding));
  await tester.pumpAndSettle();
  return session;
}

/// Cierra la app y detiene el temporizador de inactividad de la sesión.
Future<void> closeApp(WidgetTester tester, Session session) async {
  await tester.pumpWidget(const SizedBox());
  session.dispose();
}

Future<void> login(WidgetTester tester, String password) async {
  await tester.enterText(find.widgetWithText(TextFormField, 'Correo electrónico'), 'ana@spa.pe');
  await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), password);
  await tester.tap(find.text('Iniciar sesión'));
  await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('muestra un error con una contraseña incorrecta', (tester) async {
    await pumpApp(tester, fakeBackend());
    expect(find.text('Iniciar sesión'), findsOneWidget);

    await login(tester, 'incorrecta');

    expect(find.text('Correo o contraseña incorrectos.'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
  });

  testWidgets('un administrador entra al dashboard', (tester) async {
    final session = await pumpApp(tester, fakeBackend());

    await login(tester, 'secreto');

    expect(find.text('Iniciar sesión'), findsNothing);
    expect(find.widgetWithText(AppBar, 'Dashboard'), findsOneWidget);
    await closeApp(tester, session);
  });

  testWidgets('el menú solo muestra los módulos permitidos', (tester) async {
    final session = await pumpApp(tester, fakeBackend(permissions: ['calendar', 'clients']));

    await login(tester, 'secreto');

    // Sin permiso de dashboard entra al primer módulo permitido
    expect(find.widgetWithText(AppBar, 'Calendario de citas'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();
    expect(find.text('Clientes'), findsOneWidget);
    expect(find.text('Gastos'), findsNothing);
    expect(find.text('Reportes'), findsNothing);
    await closeApp(tester, session);
  });
}
