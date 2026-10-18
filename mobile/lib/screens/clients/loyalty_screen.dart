import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/loader.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> with LoaderMixin {
  List<Map<String, dynamic>> clients = [];
  int redeemCost = 10;
  String query = '';
  int? redeemingId;
  bool syncing = false;

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/clients'),
      context.api.get('/configuration').catchError((_) => <String, dynamic>{}),
    ]);
    clients = asMapList(results[0])..sort((a, b) => toInt(b['loyaltyPoints']).compareTo(toInt(a['loyaltyPoints'])));
    final points = toInt(asMap(results[1])['loyaltyPointsToRedeem']);
    if (points > 0) redeemCost = points;
  }

  Future<void> _redeem(Map<String, dynamic> client) async {
    final ok = await confirmDialog(
      context,
      title: 'Canjear promoción',
      message: '¿Canjear $redeemCost puntos de ${client['name']} por una promoción?',
      confirmText: 'Canjear',
    );
    if (!ok || !mounted) return;
    setState(() => redeemingId = client['id']);
    final newPoints = toInt(client['loyaltyPoints']) - redeemCost;
    await runAction(
      () => context.api.patch('/clients/${client['id']}', {'loyaltyPoints': newPoints}),
      success: '¡Promoción canjeada para ${client['name']}! Le quedan $newPoints puntos.',
    );
    if (mounted) setState(() => redeemingId = null);
    reload(silent: true);
  }

  Future<void> _sync() async {
    final ok = await confirmDialog(
      context,
      title: 'Sincronizar historial',
      message:
          '¿Desea escanear el historial completo y recalcular los puntos de todos los clientes? Puede tardar unos segundos.',
      confirmText: 'Sincronizar',
    );
    if (!ok || !mounted) return;
    setState(() => syncing = true);
    try {
      final data = await context.api.post('/clients/sync-loyalty');
      if (mounted) showSuccess(context, 'Sincronización completa. Se actualizaron ${data['updatedClients']} clientes.');
      reload(silent: true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al sincronizar puntos');
    } finally {
      if (mounted) setState(() => syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = query.toLowerCase();
    final filtered = clients
        .where((c) => (c['name'] ?? '').toString().toLowerCase().contains(q) || (c['phone'] ?? '').toString().contains(q))
        .toList();
    return AppScaffold(
      title: 'Fidelidad',
      route: '/loyalty',
      actions: [
        IconButton(
          tooltip: 'Sincronizar historial pasado',
          onPressed: syncing ? null : _sync,
          icon: syncing
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.sync),
        ),
      ],
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Acumula 1 punto por cada atención finalizada.'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: SearchField(hint: 'Buscar por nombre o teléfono...', onChanged: (v) => setState(() => query = v)),
              ),
              const SizedBox(width: 8),
              Chip(avatar: const Icon(Icons.emoji_events, size: 18), label: Text('Promo: $redeemCost pts')),
            ]),
          ]),
        ),
        Expanded(
          child: loaderBody(() => ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.isEmpty ? 1 : filtered.length,
                itemBuilder: (context, index) {
                  if (filtered.isEmpty) return const EmptyView('No se encontraron clientes acumulando puntos.');
                  final client = filtered[index];
                  final points = toInt(client['loyaltyPoints']);
                  final canRedeem = points >= redeemCost;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Row(children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Flexible(
                                  child: Text(client['name'] ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                                ),
                                if (canRedeem) const Icon(Icons.star, color: Color(0xFFF59E0B), size: 18),
                              ]),
                              Text(client['phone'] ?? client['email'] ?? 'Sin contacto',
                                  style: TextStyle(color: Theme.of(context).colorScheme.outline)),
                            ]),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: canRedeem ? const Color(0xFFFEF3C7) : const Color(0xFFE8EBE4),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('$points',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  color: canRedeem ? const Color(0xFFB45309) : null,
                                )),
                          ),
                        ]),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: (points / redeemCost).clamp(0, 1).toDouble(),
                            minHeight: 8,
                            color: canRedeem ? const Color(0xFFF59E0B) : null,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                            onPressed: !canRedeem || redeemingId == client['id'] ? null : () => _redeem(client),
                            icon: const Icon(Icons.check_circle_outline, size: 18),
                            label: Text(redeemingId == client['id']
                                ? 'Canjeando...'
                                : canRedeem
                                    ? 'Canjear promo'
                                    : 'Faltan ${redeemCost - points}'),
                          ),
                        ),
                      ]),
                    ),
                  );
                },
              )),
        ),
      ]),
    );
  }
}
