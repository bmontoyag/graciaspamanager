import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/branding.dart';
import '../core/config.dart';
import '../core/session.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _showPassword = false;
  bool _loading = false;
  String? _error;

  /// 'huella digital' / 'Face ID' si el dispositivo lo soporta; null si no.
  String? _biometricLabel;
  bool _biometricEnabled = false;

  @override
  void initState() {
    super.initState();
    final session = context.read<Session>();
    _error = session.logoutReason;
    _initBiometrics(autoPrompt: session.logoutReason == null);
  }

  Future<void> _initBiometrics({required bool autoPrompt}) async {
    final biometrics = context.read<Session>().biometrics;
    if (!await biometrics.isAvailable()) return;
    final label = await biometrics.label();
    final enabled = await biometrics.isEnabled();
    final email = await biometrics.enabledEmail();
    if (!mounted) return;
    setState(() {
      _biometricLabel = label;
      _biometricEnabled = enabled;
      if (email != null && _email.text.isEmpty) _email.text = email;
    });
    if (enabled && autoPrompt) _loginWithBiometrics();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<Session>().login(_email.text, _password.text, onAuthenticated: _offerBiometrics);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loginWithBiometrics() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<Session>().loginWithBiometrics();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '$e';
          _biometricEnabled = false;
        });
        _initBiometrics(autoPrompt: false);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Tras un ingreso con contraseña, ofrece activar (o actualizar) el ingreso biométrico.
  Future<void> _offerBiometrics() async {
    final label = _biometricLabel;
    if (label == null || !mounted) return;
    final biometrics = context.read<Session>().biometrics;
    final email = _email.text.trim();
    final savedEmail = await biometrics.enabledEmail();
    if (savedEmail?.toLowerCase() == email.toLowerCase()) {
      // Mantiene la contraseña guardada al día.
      await biometrics.enable(email, _password.text);
      return;
    }
    if (!mounted) return;
    final accept = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: Icon(label == 'huella digital' ? Icons.fingerprint : Icons.face),
        title: Text('¿Ingresar con $label?'),
        content: Text('La próxima vez podrá ingresar con su $label sin escribir la contraseña.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Ahora no')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Activar')),
        ],
      ),
    );
    if (accept == true) await biometrics.enable(email, _password.text);
  }

  Future<void> _editServer() async {
    final session = context.read<Session>();
    final branding = context.read<Branding>();
    final controller = TextEditingController(text: session.api.baseUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Servidor'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Dirección del backend de Gracia Spa (API).'),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            keyboardType: TextInputType.url,
            autocorrect: false,
            decoration: const InputDecoration(hintText: 'https://midominio.com/api'),
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, AppConfig.defaultApiUrl),
            child: const Text('Restablecer'),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Guardar')),
        ],
      ),
    );
    if (result == null || result.trim().isEmpty) return;
    await AppConfig.saveApiUrl(result);
    session.api.baseUrl = AppConfig.normalize(result);
    await branding.load();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final branding = context.watch<Branding>();
    final bg = decodeDataUri(branding.loginBgUrl);
    final hasBg = bg != null || (branding.loginBgUrl?.startsWith('http') ?? false);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          color: branding.background,
          image: !hasBg
              ? null
              : DecorationImage(
                  fit: BoxFit.cover,
                  image: bg != null ? MemoryImage(bg) : NetworkImage(branding.loginBgUrl!) as ImageProvider,
                  colorFilter: const ColorFilter.mode(Color(0x66000000), BlendMode.darken),
                ),
        ),
        child: SafeArea(
          child: Stack(children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Card(
                    elevation: 6,
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Form(
                        key: _formKey,
                        child: AutofillGroup(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            Center(child: BrandLogo(url: branding.logoUrl, height: 64)),
                            const SizedBox(height: 28),
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.username, AutofillHints.email],
                              autocorrect: false,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(labelText: 'Correo electrónico', hintText: 'nombre@correo.com'),
                              validator: (v) => v == null || !v.contains('@') ? 'Ingrese un correo válido' : null,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _password,
                              obscureText: !_showPassword,
                              autofillHints: const [AutofillHints.password],
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _login(),
                              decoration: InputDecoration(
                                labelText: 'Contraseña',
                                suffixIcon: IconButton(
                                  tooltip: _showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña',
                                  icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                                  onPressed: () => setState(() => _showPassword = !_showPassword),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Ingrese su contraseña' : null,
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0x1AB91C1C),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                              ),
                            ],
                            const SizedBox(height: 24),
                            FilledButton(
                              onPressed: _loading ? null : _login,
                              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                              child: _loading
                                  ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                      SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                                      SizedBox(width: 10),
                                      Text('Ingresando...'),
                                    ])
                                  : const Text('Iniciar sesión'),
                            ),
                            if (_biometricEnabled && _biometricLabel != null) ...[
                              const SizedBox(height: 12),
                              OutlinedButton.icon(
                                onPressed: _loading ? null : _loginWithBiometrics,
                                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                                icon: Icon(_biometricLabel == 'huella digital' ? Icons.fingerprint : Icons.face),
                                label: Text('Ingresar con $_biometricLabel'),
                              ),
                            ],
                          ]),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: IconButton(
                tooltip: 'Servidor',
                icon: Icon(Icons.dns_outlined, color: hasBg ? Colors.white : null),
                onPressed: _editServer,
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
