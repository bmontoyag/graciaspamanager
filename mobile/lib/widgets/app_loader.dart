import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/branding.dart';

/// Logo del negocio con un pulso suave y una barra de progreso.
class AppLoader extends StatefulWidget {
  const AppLoader({super.key, this.logoHeight = 40, this.message});

  final double logoHeight;
  final String? message;

  @override
  State<AppLoader> createState() => _AppLoaderState();
}

class _AppLoaderState extends State<AppLoader> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
  late final Animation<double> _curve = CurvedAnimation(parent: _pulse, curve: Curves.easeInOut);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final branding = context.watch<Branding>();
    final barWidth = widget.logoHeight * 3;
    return Semantics(
      label: widget.message ?? 'Cargando',
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        FadeTransition(
          opacity: Tween(begin: 0.45, end: 1.0).animate(_curve),
          child: ScaleTransition(
            scale: Tween(begin: 0.96, end: 1.0).animate(_curve),
            child: BrandLogo(url: branding.logoUrl, height: widget.logoHeight),
          ),
        ),
        SizedBox(height: widget.logoHeight * 0.45),
        SizedBox(
          width: barWidth,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              minHeight: 3,
              color: branding.primary,
              backgroundColor: branding.primary.withValues(alpha: 0.15),
            ),
          ),
        ),
        if (widget.message != null) ...[
          const SizedBox(height: 12),
          Text(widget.message!, textAlign: TextAlign.center),
        ],
      ]),
    );
  }
}

/// Pantalla completa mientras se restaura la sesión al abrir la app.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.watch<Branding>().background,
      body: const Center(child: AppLoader(logoHeight: 64)),
    );
  }
}
