import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/branding.dart';
import 'core/config.dart';
import 'core/push_notifications.dart';
import 'core/session.dart';
import 'navigation.dart';
import 'screens/login_screen.dart';
import 'widgets/app_loader.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');
  final api = ApiClient(baseUrl: await AppConfig.loadApiUrl());
  final push = PushNotifications(api);
  final session = Session(api, push: push);
  final branding = Branding(api);
  // La app se muestra de inmediato con el loader mientras se restaura la sesión.
  runApp(GraciaSpaApp(session: session, branding: branding));
  branding.load();
  await push.init();
  session.restore();
}

class GraciaSpaApp extends StatefulWidget {
  const GraciaSpaApp({super.key, required this.session, required this.branding});

  final Session session;
  final Branding branding;

  @override
  State<GraciaSpaApp> createState() => _GraciaSpaAppState();
}

class _GraciaSpaAppState extends State<GraciaSpaApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) widget.session.checkInactivity();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: widget.session),
        ChangeNotifierProvider.value(value: widget.branding),
      ],
      child: Consumer2<Session, Branding>(builder: (context, session, branding, _) {
        if (session.restoring) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: branding.theme(),
            home: const SplashScreen(),
          );
        }
        final loggedIn = session.isLoggedIn;
        // Si se abrió la app desde una notificación, se muestra su pantalla al entrar.
        if (loggedIn) WidgetsBinding.instance.addPostFrameCallback((_) => session.push?.openPendingRoute());
        return MaterialApp(
          // Al iniciar o cerrar sesión se crea un historial de navegación nuevo.
          key: ValueKey(loggedIn ? 'user-${session.user!.id}' : 'guest'),
          navigatorKey: loggedIn ? session.push?.navigatorKey : null,
          title: 'Gracia Spa',
          debugShowCheckedModeBanner: false,
          theme: branding.theme(),
          locale: const Locale('es', 'PE'),
          supportedLocales: const [Locale('es', 'PE'), Locale('es')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          initialRoute: loggedIn ? homeModuleFor(session).route : '/login',
          onGenerateRoute: (settings) => loggedIn
              ? onGenerateRoute(settings)
              : MaterialPageRoute(builder: (_) => const LoginScreen(), settings: const RouteSettings(name: '/login')),
          // Solo la pantalla inicial, sin apilar "/" debajo.
          onGenerateInitialRoutes: (initialRoute) => [
            loggedIn
                ? onGenerateRoute(RouteSettings(name: initialRoute))
                : MaterialPageRoute(builder: (_) => const LoginScreen(), settings: const RouteSettings(name: '/login')),
          ],
          builder: (context, child) => Listener(
            behavior: HitTestBehavior.translucent,
            onPointerDown: (_) => session.registerActivity(),
            child: child,
          ),
        );
      }),
    );
  }
}
