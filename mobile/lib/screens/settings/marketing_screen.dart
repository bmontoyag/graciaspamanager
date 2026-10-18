import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/loader.dart';

/// Mensajes de WhatsApp, redes sociales, fidelidad y fuentes de captación.
class MarketingScreen extends StatefulWidget {
  const MarketingScreen({super.key});

  @override
  State<MarketingScreen> createState() => _MarketingScreenState();
}

class _MarketingScreenState extends State<MarketingScreen> with LoaderMixin {
  final _confirmation = TextEditingController();
  final _birthday = TextEditingController();
  final _marketing = TextEditingController();
  final _facebook = TextEditingController();
  final _instagram = TextEditingController();
  final _tiktok = TextEditingController();
  final _whatsapp = TextEditingController();
  final _loyalty = TextEditingController(text: '10');
  final _newSource = TextEditingController();
  List<String> sources = [];
  bool _saving = false;

  @override
  Future<void> fetch() async {
    final config = asMap(await context.api.get('/configuration'));
    _confirmation.text = config['whatsappMessageTemplate'] ?? '';
    _birthday.text = config['birthdayMessage'] ?? '';
    _marketing.text = config['marketingMessage'] ?? '';
    _facebook.text = config['facebookUrl'] ?? '';
    _instagram.text = config['instagramUrl'] ?? '';
    _tiktok.text = config['tiktokUrl'] ?? '';
    _whatsapp.text = config['whatsappUrl'] ?? '';
    if (config['loyaltyPointsToRedeem'] != null) _loyalty.text = '${toInt(config['loyaltyPointsToRedeem'])}';
    sources = [for (final s in (config['discoverySources'] as List? ?? [])) '$s'];
  }

  void _addSource() {
    final source = _newSource.text.trim();
    if (source.isEmpty || sources.contains(source)) return;
    setState(() {
      sources = [...sources, source];
      _newSource.clear();
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await runAction(
      () => context.api.patch('/configuration', {
        'birthdayMessage': _birthday.text,
        'whatsappMessageTemplate': _confirmation.text,
        'marketingMessage': _marketing.text,
        'discoverySources': sources,
        'facebookUrl': _facebook.text.trim(),
        'instagramUrl': _instagram.text.trim(),
        'tiktokUrl': _tiktok.text.trim(),
        'whatsappUrl': _whatsapp.text.trim(),
        'loyaltyPointsToRedeem': int.tryParse(_loyalty.text) ?? 10,
      }),
      success: 'Configuración de mensajes guardada',
    );
    if (mounted) setState(() => _saving = false);
  }

  Widget _message(TextEditingController c, String label, String help) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: TextField(
          controller: c,
          minLines: 3,
          maxLines: 6,
          decoration: InputDecoration(labelText: label, helperText: help, helperMaxLines: 2, alignLabelWithHint: true),
        ),
      );

  Widget _url(TextEditingController c, String label, IconData icon, String hint) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: c,
          keyboardType: TextInputType.url,
          decoration: InputDecoration(labelText: label, hintText: hint, prefixIcon: Icon(icon)),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Marketing y campañas',
      route: '/marketing',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            SectionCard(
              title: 'Plantillas de WhatsApp',
              icon: Icons.chat_outlined,
              child: Column(children: [
                _message(_confirmation, 'Mensaje de confirmación de reserva', 'Variables: {name}, {service}, {date}, {time}.'),
                _message(_birthday, 'Mensaje de cumpleaños', 'Variables: {name}.'),
                _message(_marketing, 'Mensaje de captación / promociones', 'Texto para campañas y promociones.'),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Redes sociales',
              icon: Icons.public,
              child: Column(children: [
                _url(_facebook, 'Facebook', Icons.facebook, 'https://facebook.com/...'),
                _url(_instagram, 'Instagram', Icons.camera_alt_outlined, 'https://instagram.com/...'),
                _url(_tiktok, 'TikTok', Icons.music_note_outlined, 'https://tiktok.com/@...'),
                _url(_whatsapp, 'WhatsApp', Icons.chat, 'https://wa.me/...'),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Programa de fidelidad',
              icon: Icons.card_giftcard,
              child: TextField(
                controller: _loyalty,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Puntos para canjear premio',
                  suffixText: 'puntos',
                  helperText: 'Cuántos puntos debe acumular un cliente para canjear su beneficio.',
                  helperMaxLines: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: '¿De dónde nos conoció?',
              subtitle: 'Estas opciones aparecen al registrar un cliente para saber qué canales son los más efectivos.',
              icon: Icons.campaign_outlined,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _newSource,
                      decoration: const InputDecoration(hintText: 'Nueva fuente (ej. TikTok)'),
                      onSubmitted: (_) => _addSource(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(onPressed: _addSource, icon: const Icon(Icons.add), label: const Text('Agregar')),
                ]),
                const SizedBox(height: 12),
                if (sources.isEmpty)
                  Text('No hay fuentes configuradas.', style: TextStyle(color: Theme.of(context).colorScheme.outline)),
                Wrap(spacing: 8, runSpacing: 4, children: [
                  for (final s in sources)
                    InputChip(label: Text(s), onDeleted: () => setState(() => sources = sources.where((x) => x != s).toList())),
                ]),
              ]),
            ),
            const SizedBox(height: 24),
            SubmitButton(label: 'Guardar cambios', busy: _saving, onPressed: _save),
          ])),
    );
  }
}
