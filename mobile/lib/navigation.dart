import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/branding.dart';
import 'core/session.dart';
import 'screens/attentions/attentions_screen.dart';
import 'screens/calendar/calendar_screen.dart';
import 'screens/clients/clients_screen.dart';
import 'screens/clients/loyalty_screen.dart';
import 'screens/corporate/corporate_screen.dart';
import 'screens/daily_closing_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/expenses/expenses_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/reports/reports_screen.dart';
import 'screens/services/services_screen.dart';
import 'screens/settings/audit_screen.dart';
import 'screens/settings/backup_screen.dart';
import 'screens/settings/branding_screen.dart';
import 'screens/settings/expense_types_screen.dart';
import 'screens/settings/marketing_screen.dart';
import 'screens/settings/schedule_screen.dart';
import 'screens/team/roles_screen.dart';
import 'screens/team/users_screen.dart';

extension ApiContext on BuildContext {
  ApiClient get api => read<Session>().api;
  Session get session => read<Session>();
}

class AppModule {
  const AppModule(this.route, this.label, this.icon, this.permission, this.builder);

  final String route;
  final String label;
  final IconData icon;
  final String? permission;
  final WidgetBuilder builder;
}

class NavGroup {
  const NavGroup(this.title, this.modules);
  final String title;
  final List<AppModule> modules;
}

final dashboardModule = AppModule('/dashboard', 'Dashboard', Icons.home_outlined, 'dashboard', (_) => const DashboardScreen());
final profileModule = AppModule('/profile', 'Mi perfil', Icons.account_circle_outlined, null, (_) => const ProfileScreen());

final mainNav = <NavGroup>[
  NavGroup('Operación', [
    AppModule('/calendar', 'Calendario', Icons.calendar_month_outlined, 'calendar', (_) => const CalendarScreen()),
    AppModule('/attentions', 'Atenciones', Icons.receipt_long_outlined, 'attentions', (_) => const AttentionsScreen()),
    AppModule('/clients', 'Clientes', Icons.people_outline, 'clients', (_) => const ClientsScreen()),
    AppModule('/loyalty', 'Fidelidad', Icons.card_giftcard_outlined, 'clients', (_) => const LoyaltyScreen()),
    AppModule('/services', 'Servicios', Icons.spa_outlined, 'services', (_) => const ServicesScreen()),
    AppModule('/corporate', 'Corporativo', Icons.business_center_outlined, 'corporate', (_) => const CorporateScreen()),
  ]),
  NavGroup('Finanzas', [
    AppModule('/expenses', 'Gastos', Icons.account_balance_wallet_outlined, 'expenses', (_) => const ExpensesScreen()),
    AppModule('/daily-closing', 'Cierre diario', Icons.fact_check_outlined, 'daily_closing', (_) => const DailyClosingScreen()),
    AppModule('/reports', 'Reportes', Icons.bar_chart_outlined, 'reports', (_) => const ReportsScreen()),
  ]),
];

final settingsNav = <NavGroup>[
  NavGroup('Equipo', [
    AppModule('/users', 'Personal', Icons.manage_accounts_outlined, 'users', (_) => const UsersScreen()),
    AppModule('/roles', 'Roles y permisos', Icons.verified_user_outlined, 'roles', (_) => const RolesScreen()),
  ]),
  NavGroup('Negocio', [
    AppModule('/schedule', 'Horarios', Icons.schedule_outlined, 'settings', (_) => const ScheduleScreen()),
    AppModule('/expense-types', 'Tipos de gasto', Icons.sell_outlined, 'settings', (_) => const ExpenseTypesScreen()),
    AppModule('/marketing', 'Marketing y redes', Icons.campaign_outlined, 'settings', (_) => const MarketingScreen()),
  ]),
  NavGroup('Sistema', [
    AppModule('/branding', 'Temas y branding', Icons.palette_outlined, 'settings', (_) => const BrandingScreen()),
    AppModule('/backup', 'Backup', Icons.storage_outlined, 'settings', (_) => const BackupScreen()),
    AppModule('/audit', 'Auditoría', Icons.history, 'settings', (_) => const AuditScreen()),
  ]),
];

List<AppModule> get allModules => [
      dashboardModule,
      profileModule,
      for (final group in [...mainNav, ...settingsNav]) ...group.modules,
    ];

/// Primera pantalla según los permisos del usuario.
AppModule homeModuleFor(Session session) {
  if (session.can(dashboardModule.permission)) return dashboardModule;
  for (final group in mainNav) {
    for (final module in group.modules) {
      if (session.can(module.permission)) return module;
    }
  }
  return profileModule;
}

Route<dynamic> onGenerateRoute(RouteSettings settings) {
  final module = allModules.where((m) => m.route == settings.name).firstOrNull ?? dashboardModule;
  return PageRouteBuilder(
    settings: RouteSettings(name: module.route),
    pageBuilder: (context, _, _) => _ModuleGate(module: module),
    transitionDuration: const Duration(milliseconds: 150),
    transitionsBuilder: (_, animation, _, child) => FadeTransition(opacity: animation, child: child),
  );
}

/// Muestra "Sin acceso" si el rol no tiene permiso para el módulo.
class _ModuleGate extends StatelessWidget {
  const _ModuleGate({required this.module});
  final AppModule module;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    if (session.can(module.permission)) return module.builder(context);
    return AppScaffold(
      title: module.label,
      route: module.route,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.lock_outline, size: 48),
            const SizedBox(height: 12),
            Text('Sin acceso', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'Su rol no tiene permiso para el módulo "${module.label}". Si lo necesita, pídale acceso a un administrador.',
              textAlign: TextAlign.center,
            ),
          ]),
        ),
      ),
    );
  }
}

/// Estructura común de cada módulo: barra superior y menú lateral.
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.route,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.bottom,
  });

  final String title;
  final String route;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final PreferredSizeWidget? bottom;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions, bottom: bottom),
      drawer: AppDrawer(currentRoute: route),
      body: SafeArea(top: false, child: body),
      floatingActionButton: floatingActionButton,
    );
  }
}

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key, required this.currentRoute});
  final String currentRoute;

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  late bool settingsOpen = settingsNav.any((g) => g.modules.any((m) => m.route == widget.currentRoute));

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final branding = context.watch<Branding>();
    List<NavGroup> visible(List<NavGroup> groups) => [
          for (final group in groups)
            if (group.modules.any((m) => session.can(m.permission)))
              NavGroup(group.title, group.modules.where((m) => session.can(m.permission)).toList()),
        ];
    final main = visible(mainNav);
    final settings = visible(settingsNav);
    const muted = Color(0x99FFFFFF);

    return Drawer(
      backgroundColor: branding.sidebar,
      child: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: BrandLogo(url: branding.logoUrl, height: 40, color: Colors.white),
          ),
          const Divider(color: Color(0x1FFFFFFF)),
          Expanded(
            child: ListView(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), children: [
              if (session.can('dashboard'))
                _NavTile(
                  module: dashboardModule,
                  label: session.user?.isAdmin == true ? 'Dashboard' : 'Resumen',
                  active: widget.currentRoute == dashboardModule.route,
                ),
              for (final group in main) ...[
                _GroupTitle(group.title),
                for (final module in group.modules) _NavTile(module: module, active: widget.currentRoute == module.route),
              ],
              if (settings.isNotEmpty) ...[
                const SizedBox(height: 12),
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.settings_outlined, color: muted),
                  title: const Text('Configuración', style: TextStyle(color: Colors.white)),
                  trailing: Icon(settingsOpen ? Icons.expand_less : Icons.expand_more, color: muted),
                  onTap: () => setState(() => settingsOpen = !settingsOpen),
                ),
                if (settingsOpen)
                  for (final group in settings) ...[
                    _GroupTitle(group.title, indent: true),
                    for (final module in group.modules)
                      _NavTile(module: module, active: widget.currentRoute == module.route, indent: true),
                  ],
              ],
            ]),
          ),
          const Divider(color: Color(0x1FFFFFFF)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Column(children: [
              _NavTile(module: profileModule, active: widget.currentRoute == profileModule.route),
              ListTile(
                dense: true,
                leading: const Icon(Icons.logout, color: muted),
                title: const Text('Cerrar sesión', style: TextStyle(color: Colors.white)),
                onTap: () => session.logout(),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _GroupTitle extends StatelessWidget {
  const _GroupTitle(this.text, {this.indent = false});
  final String text;
  final bool indent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(indent ? 28 : 12, 16, 12, 4),
      child: Text(text.toUpperCase(),
          style: const TextStyle(color: Color(0x80FFFFFF), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({required this.module, required this.active, this.label, this.indent = false});
  final AppModule module;
  final bool active;
  final String? label;
  final bool indent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: indent ? 16 : 0, bottom: 2),
      child: ListTile(
        dense: true,
        selected: active,
        selectedTileColor: const Color(0x26FFFFFF),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        leading: Icon(module.icon, color: active ? Colors.white : const Color(0xCCFFFFFF)),
        title: Text(label ?? module.label,
            style: TextStyle(color: Colors.white, fontWeight: active ? FontWeight.w700 : FontWeight.normal)),
        onTap: () {
          Navigator.pop(context);
          if (!active) Navigator.of(context).pushReplacementNamed(module.route);
        },
      ),
    );
  }
}
