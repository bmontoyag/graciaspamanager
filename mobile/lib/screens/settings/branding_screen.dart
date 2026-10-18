import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/branding.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/loader.dart';

class _Theme {
  const _Theme(this.name, this.primary, this.sidebar, this.background);
  final String name;
  final String primary;
  final String sidebar;
  final String background;
}

const _themes = [
  _Theme('Gracia (marca)', '#56685A', '#3F4F44', '#F3F2EC'),
  _Theme('Clásico Dark', '#2C3E50', '#2C3E50', '#F8F9FA'),
  _Theme('Ocean Blue', '#0EA5E9', '#0F172A', '#F0F9FF'),
  _Theme('Forest Green', '#10B981', '#064E3B', '#F0FDF4'),
  _Theme('Sunset Orange', '#F97316', '#7C2D12', '#FFF7ED'),
  _Theme('Royal Purple', '#8B5CF6', '#4C1D95', '#F5F3FF'),
  _Theme('Minimal Black', '#000000', '#000000', '#FFFFFF'),
];

const _maxImageBytes = 5 * 1024 * 1024;

/// Personalización: colores del sistema, logo y fondo del login.
class BrandingScreen extends StatefulWidget {
  const BrandingScreen({super.key});

  @override
  State<BrandingScreen> createState() => _BrandingScreenState();
}

class _BrandingScreenState extends State<BrandingScreen> with LoaderMixin {
  final _primary = TextEditingController();
  final _sidebar = TextEditingController();
  final _background = TextEditingController();
  String? logoUrl;
  String? loginBgUrl;
  bool _saving = false;

  @override
  Future<void> fetch() async {
    final config = asMap(await context.api.get('/configuration'));
    _primary.text = (config['primaryColor'] ?? '#56685A').toString().toUpperCase();
    _sidebar.text = (config['sidebarColor'] ?? '#3F4F44').toString().toUpperCase();
    _background.text = (config['backgroundColor'] ?? '#F3F2EC').toString().toUpperCase();
    logoUrl = (config['logoUrl'] ?? '').toString().isEmpty ? null : config['logoUrl'];
    loginBgUrl = (config['loginBgUrl'] ?? '').toString().isEmpty ? null : config['loginBgUrl'];
  }

  void _applyTheme(_Theme theme) {
    setState(() {
      _primary.text = theme.primary;
      _sidebar.text = theme.sidebar;
      _background.text = theme.background;
    });
    showSuccess(context, 'Tema "${theme.name}" aplicado. Guarde para confirmar.');
  }

  Future<void> _pickImage(bool logo) async {
    final file = await FilePicker.pickFile(type: FileType.image);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    if (bytes.length > _maxImageBytes) {
      showError(context, 'El archivo es muy grande. Máximo 5MB.');
      return;
    }
    final ext = (file.extension ?? 'png').toLowerCase().replaceFirst('.', '');
    final mime = switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'gif' => 'image/gif',
      'webp' => 'image/webp',
      'svg' => 'image/svg+xml',
      _ => 'image/png',
    };
    final uri = 'data:$mime;base64,${base64Encode(bytes)}';
    setState(() => logo ? logoUrl = uri : loginBgUrl = uri);
  }

  Future<void> _save() async {
    for (final c in [_primary, _sidebar, _background]) {
      if (parseHexColor(c.text) == null) {
        showError(context, 'Color no válido: ${c.text}. Use el formato #RRGGBB.');
        return;
      }
    }
    setState(() => _saving = true);
    final branding = context.read<Branding>();
    final ok = await runAction(
      () => context.api.patch('/configuration', {
        'primaryColor': _primary.text.trim(),
        'sidebarColor': _sidebar.text.trim(),
        'backgroundColor': _background.text.trim(),
        'logoUrl': ?logoUrl,
        'loginBgUrl': ?loginBgUrl,
      }),
      success: 'Configuración guardada exitosamente',
    );
    if (ok) await branding.load();
    if (mounted) setState(() => _saving = false);
  }

  Widget _colorField(TextEditingController c, String label) {
    final color = parseHexColor(c.text);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        textCapitalization: TextCapitalization.characters,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          labelText: label,
          hintText: '#RRGGBB',
          prefixIcon: Padding(
            padding: const EdgeInsets.all(10),
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: color ?? Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.black26),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _imagePicker(String label, String? uri, bool logo) {
    final bytes = decodeDataUri(uri);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      Container(
        height: 96,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.antiAlias,
        child: bytes != null
            ? Image.memory(bytes, fit: logo ? BoxFit.contain : BoxFit.cover)
            : uri != null && uri.startsWith('http')
                ? Image.network(uri, fit: logo ? BoxFit.contain : BoxFit.cover)
                : Center(child: Text('Sin imagen', style: TextStyle(color: Theme.of(context).colorScheme.outline))),
      ),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        onPressed: () => _pickImage(logo),
        icon: const Icon(Icons.upload_outlined),
        label: const Text('Seleccionar imagen (máx. 5MB)'),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Personalización',
      route: '/branding',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            SectionCard(
              title: 'Temas predefinidos',
              icon: Icons.palette_outlined,
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                for (final theme in _themes)
                  ActionChip(
                    avatar: Row(mainAxisSize: MainAxisSize.min, children: [
                      for (final hex in [theme.primary, theme.sidebar])
                        Container(
                          width: 8,
                          height: 16,
                          color: parseHexColor(hex),
                        ),
                    ]),
                    label: Text(theme.name),
                    onPressed: () => _applyTheme(theme),
                  ),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Colores',
              icon: Icons.format_color_fill,
              child: Column(children: [
                _colorField(_primary, 'Color primario'),
                _colorField(_sidebar, 'Color de barra / menú'),
                _colorField(_background, 'Color de fondo'),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Imágenes',
              icon: Icons.image_outlined,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                _imagePicker('Logo del negocio', logoUrl, true),
                const SizedBox(height: 16),
                _imagePicker('Fondo de login', loginBgUrl, false),
              ]),
            ),
            const SizedBox(height: 24),
            SubmitButton(label: 'Guardar cambios', busy: _saving, onPressed: _save),
          ])),
    );
  }
}
