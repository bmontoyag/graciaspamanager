import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/format.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Copia de seguridad manual, restauración y backup automático por correo.
class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key});

  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> with LoaderMixin {
  bool enabled = false;
  String frequency = 'daily';
  String time = '02:00';
  final _email = TextEditingController();
  PlatformFile? _restoreFile;
  bool _busy = false;

  @override
  Future<void> fetch() async {
    final config = asMap(await context.api.get('/configuration'));
    enabled = config['backupEnabled'] == true;
    frequency = config['backupFrequency'] ?? 'daily';
    time = config['backupTime'] ?? '02:00';
    _email.text = config['backupEmail'] ?? '';
  }

  Future<void> _busyRun(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _download() => _busyRun(() async {
        final bytes = await context.api.download('/backup/download');
        final dir = await getTemporaryDirectory();
        final file = File('${dir.path}/backup-${dateKey(limaToday())}.sql');
        await file.writeAsBytes(bytes);
        if (!mounted) return;
        showSuccess(context, 'Backup descargado correctamente');
        await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], subject: 'Backup Gracia Spa'));
      });

  Future<void> _pickRestoreFile() async {
    final file = await FilePicker.pickFile(type: FileType.any);
    if (file == null || !mounted) return;
    if (!file.name.toLowerCase().endsWith('.sql')) {
      showError(context, 'Seleccione un archivo .sql');
      return;
    }
    setState(() => _restoreFile = file);
  }

  Future<void> _restore() async {
    final file = _restoreFile;
    if (file == null) {
      showError(context, 'Por favor, selecciona un archivo primero');
      return;
    }
    final ok = await confirmDialog(context,
        title: '¿Restaurar la base de datos?',
        message: 'Esta acción reemplazará todos los datos actuales y no se puede deshacer.',
        confirmText: 'Sí, restaurar',
        destructive: true);
    if (!ok || !mounted) return;
    await _busyRun(() async {
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      await context.api.upload('/backup/restore', field: 'file', bytes: bytes, filename: file.name);
      if (!mounted) return;
      setState(() => _restoreFile = null);
      showSuccess(context, 'Base de datos restaurada correctamente');
    });
  }

  Future<void> _saveConfig() => _busyRun(() async {
        await context.api.patch('/configuration', {
          'backupEnabled': enabled,
          'backupFrequency': frequency,
          'backupTime': time,
          'backupEmail': _email.text.trim(),
        });
        if (mounted) showSuccess(context, 'Configuración de backup actualizada');
      });

  Future<void> _testEmail() => _busyRun(() async {
        await context.api.post('/backup/test-email');
        if (mounted) showSuccess(context, 'Email de prueba enviado (revisa tu bandeja y carpeta de spam)');
      });

  @override
  Widget build(BuildContext context) {
    final muted = TextStyle(color: Theme.of(context).colorScheme.outline);
    return AppScaffold(
      title: 'Backup y restauración',
      route: '/backup',
      body: loaderBody(() => ListView(padding: const EdgeInsets.all(16), children: [
            if (_busy) const LinearProgressIndicator(),
            SectionCard(
              title: 'Copia de seguridad manual',
              icon: Icons.storage,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(
                  'Descarga una copia completa de la base de datos actual. Se recomienda hacer esto antes de realizar cambios importantes.',
                  style: muted,
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                    onPressed: _busy ? null : _download, icon: const Icon(Icons.download), label: const Text('Descargar backup')),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Restaurar copia de seguridad',
              icon: Icons.restore,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('Sube un archivo .sql para restaurar la base de datos. Todos los datos actuales serán reemplazados.',
                    style: muted),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _pickRestoreFile,
                  icon: const Icon(Icons.attach_file),
                  label: Text(_restoreFile?.name ?? 'Seleccionar archivo .sql'),
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB91C1C)),
                  onPressed: _busy || _restoreFile == null ? null : _restore,
                  icon: const Icon(Icons.warning_amber),
                  label: const Text('Restaurar base de datos'),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Backup automático',
              icon: Icons.schedule_send,
              subtitle: 'Recibe copias de seguridad periódicas en tu correo electrónico.',
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Habilitar backup automático'),
                  value: enabled,
                  onChanged: (v) => setState(() => enabled = v),
                ),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: SelectField<String>(
                      label: 'Frecuencia',
                      value: frequency,
                      enabled: enabled,
                      items: const {'daily': 'Diario', 'weekly': 'Semanal', 'monthly': 'Mensual'},
                      onChanged: (v) => setState(() => frequency = v ?? frequency),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                      child: TimeField(label: 'Hora', value: time, enabled: enabled, onChanged: (v) => setState(() => time = v))),
                ]),
                const SizedBox(height: 12),
                TextField(
                  controller: _email,
                  enabled: enabled,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email de destino',
                    helperText: 'Asegúrate de haber configurado las credenciales SMTP en el servidor.',
                    helperMaxLines: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _busy || !enabled || _email.text.trim().isEmpty ? null : _testEmail,
                    icon: const Icon(Icons.mark_email_read_outlined),
                    label: const Text('Enviar email de prueba'),
                  ),
                ),
                const SizedBox(height: 8),
                SubmitButton(label: 'Guardar configuración', busy: _busy, onPressed: _saveConfig),
              ]),
            ),
          ])),
    );
  }
}
