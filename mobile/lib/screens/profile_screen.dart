import 'package:flutter/material.dart';

import '../navigation.dart';
import '../widgets/common.dart';
import '../widgets/fields.dart';
import '../widgets/loader.dart';

/// Datos del usuario actual y cambio de contraseña.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with LoaderMixin {
  final _profileKey = GlobalKey<FormState>();
  final _passwordKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  List<String> roles = [];
  bool _showPassword = false;
  bool _savingProfile = false;
  bool _savingPassword = false;
  String? _biometricLabel;
  bool _biometricEnabled = false;

  int get _userId => context.session.user!.id;

  @override
  void initState() {
    super.initState();
    _loadBiometrics();
  }

  Future<void> _loadBiometrics() async {
    final biometrics = context.session.biometrics;
    if (!await biometrics.isAvailable()) return;
    final label = await biometrics.label();
    final enabled = await biometrics.isEnabled();
    if (!mounted) return;
    setState(() {
      _biometricLabel = label;
      _biometricEnabled = enabled;
    });
  }

  Future<void> _disableBiometrics() async {
    await context.session.biometrics.disable();
    if (mounted) setState(() => _biometricEnabled = false);
  }

  @override
  Future<void> fetch() async {
    final data = asMap(await context.api.get('/users/$_userId'));
    _name.text = data['name'] ?? '';
    _email.text = data['email'] ?? '';
    roles = asMapList(data['roles']).map((r) => r['role']?['name']).whereType<String>().toList();
    if (roles.isEmpty && mounted) roles = context.session.user!.roles;
  }

  Future<void> _saveProfile() async {
    if (!_profileKey.currentState!.validate()) return;
    setState(() => _savingProfile = true);
    final session = context.session;
    final ok = await runAction(
      () async {
        await context.api.patch('/users/$_userId', {'name': _name.text.trim(), 'email': _email.text.trim()});
        await session.updateProfile(name: _name.text.trim(), email: _email.text.trim());
      },
      success: 'Perfil actualizado correctamente',
    );
    if (mounted) setState(() => _savingProfile = false);
    if (!ok) return;
  }

  Future<void> _savePassword() async {
    if (!_passwordKey.currentState!.validate()) return;
    setState(() => _savingPassword = true);
    final session = context.session;
    final ok = await runAction(
      () async {
        await context.api.patch('/users/$_userId', {'password': _password.text});
        await session.biometrics.update(password: _password.text);
      },
      success: 'Contraseña actualizada correctamente',
    );
    if (!mounted) return;
    setState(() {
      _savingPassword = false;
      if (ok) {
        _password.clear();
        _confirm.clear();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.session.user!;
    return AppScaffold(
      title: 'Mi perfil',
      route: '/profile',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            SectionCard(
              title: 'Información personal',
              icon: Icons.person_outline,
              child: Form(
                key: _profileKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Nombre'), validator: requiredValidator),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: requiredValidator,
                  ),
                  const SizedBox(height: 12),
                  Text('Rol: ${roles.isEmpty ? (user.isAdmin ? 'Administrador' : 'Trabajador') : roles.join(', ')}',
                      style: TextStyle(color: Theme.of(context).colorScheme.outline)),
                  const SizedBox(height: 16),
                  SubmitButton(label: 'Guardar cambios', busy: _savingProfile, onPressed: _saveProfile),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Cambiar contraseña',
              icon: Icons.lock_outline,
              child: Form(
                key: _passwordKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  TextFormField(
                    controller: _password,
                    obscureText: !_showPassword,
                    decoration: InputDecoration(
                      labelText: 'Nueva contraseña',
                      helperText: 'Mínimo 6 caracteres',
                      suffixIcon: IconButton(
                        icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                    ),
                    validator: (v) => (v ?? '').length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirm,
                    obscureText: !_showPassword,
                    decoration: const InputDecoration(labelText: 'Confirmar nueva contraseña'),
                    validator: (v) => v != _password.text ? 'Las contraseñas no coinciden' : null,
                  ),
                  const SizedBox(height: 16),
                  SubmitButton(
                      label: 'Actualizar contraseña', icon: Icons.key, busy: _savingPassword, onPressed: _savePassword),
                ]),
              ),
            ),
            if (_biometricLabel != null) ...[
              const SizedBox(height: 16),
              SectionCard(
                title: 'Ingreso con $_biometricLabel',
                icon: _biometricLabel == 'huella digital' ? Icons.fingerprint : Icons.face,
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _biometricEnabled,
                  title: Text(_biometricEnabled ? 'Activado en este dispositivo' : 'Desactivado'),
                  subtitle: _biometricEnabled
                      ? null
                      : const Text('Para activarlo, cierre sesión e ingrese con su contraseña.'),
                  onChanged: _biometricEnabled ? (_) => _disableBiometrics() : null,
                ),
              ),
            ],
          ])),
    );
  }
}
