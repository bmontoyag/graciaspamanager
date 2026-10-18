import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../navigation.dart';
import '../../widgets/common.dart';
import '../../widgets/fields.dart';
import '../../widgets/loader.dart';

/// Crear o editar un gasto. Si [expense] tiene `id` se edita; si no, se usa como datos iniciales.
/// Devuelve true si se guardó.
class ExpenseFormScreen extends StatefulWidget {
  const ExpenseFormScreen({super.key, this.expense});

  final Map<String, dynamic>? expense;

  @override
  State<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends State<ExpenseFormScreen> with LoaderMixin {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  String _category = '';
  int _typeId = 0;
  int _workerId = 0;
  DateTime _date = limaToday();
  bool _saving = false;

  List<Map<String, dynamic>> users = [];
  List<Map<String, dynamic>> types = [];

  bool get _isEdit => widget.expense?['id'] != null;

  @override
  void initState() {
    super.initState();
    final e = widget.expense;
    if (e != null) {
      _description.text = e['description'] ?? '';
      _amount.text = e['amount'] == null ? '' : toDouble(e['amount']).toStringAsFixed(2);
      _category = e['category'] ?? '';
      _typeId = toInt(e['typeId']);
      _workerId = toInt(e['workerId']);
      if (e['date'] != null) _date = effectiveDay(e['date']);
    }
  }

  @override
  Future<void> fetch() async {
    final results = await Future.wait([
      context.api.get('/users'),
      context.api.get('/expense-types').catchError((_) => <dynamic>[]),
    ]);
    users = asMapList(results[0]);
    types = asMapList(results[1]);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final payload = {
      'description': _description.text.trim(),
      'amount': double.parse(_amount.text.replaceAll(',', '.')),
      'category': _category,
      'typeId': _typeId == 0 ? null : _typeId,
      // Se fija 12:00 UTC para no cruzar de día
      'date': calendarIso(_date),
      if (_workerId != 0) 'workerId': _workerId,
    };
    try {
      if (_isEdit) {
        await context.api.patch('/expenses/${widget.expense!['id']}', payload);
      } else {
        await context.api.post('/expenses', payload);
      }
      if (!mounted) return;
      showSuccess(context, _isEdit ? 'Gasto actualizado' : 'Gasto registrado');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e, prefix: 'Error al guardar el gasto');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Editar gasto' : 'Nuevo gasto')),
      body: loaderBody(() => Form(
            key: _formKey,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              TextFormField(
                controller: _description,
                decoration: const InputDecoration(labelText: 'Descripción *'),
                validator: requiredValidator,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Monto (S/) *'),
                validator: (v) => double.tryParse((v ?? '').replaceAll(',', '.')) == null ? 'Monto no válido' : null,
              ),
              const SizedBox(height: 12),
              SelectField<String>(
                label: 'Categoría general *',
                value: _category,
                items: {
                  '': 'Seleccionar...',
                  ...expenseCategories,
                  if (_category.isNotEmpty && !expenseCategories.containsKey(_category)) _category: _category,
                },
                validator: (v) => v == null || v.isEmpty ? 'Seleccione una categoría' : null,
                onChanged: (v) => setState(() => _category = v ?? ''),
              ),
              const SizedBox(height: 12),
              SelectField<int>(
                label: 'Tipo de gasto (admin)',
                value: _typeId,
                items: {0: 'Ninguno', for (final t in types) toInt(t['id']): t['name'] ?? ''},
                onChanged: (v) => setState(() => _typeId = v ?? 0),
              ),
              const SizedBox(height: 12),
              SelectField<int>(
                label: 'Asignar a',
                value: _workerId,
                items: {0: 'Negocio (Gracia Spa)', for (final u in users) toInt(u['id']): u['name'] ?? ''},
                onChanged: (v) => setState(() => _workerId = v ?? 0),
              ),
              if (_category == 'Salarios') ...[
                const SizedBox(height: 12),
                Card(
                  color: const Color(0xFFF5F3FF),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Pagar con billetera digital:', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Row(children: [
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF742284)),
                            onPressed: () async {
                              if (!await openExternal('yape://')) openExternal('https://www.yape.com.pe/');
                            },
                            child: const Text('Abrir Yape'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF00B5E2)),
                            onPressed: () => openExternal('https://pling.pe/'),
                            child: const Text('Abrir Plin'),
                          ),
                        ),
                      ]),
                    ]),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              DateField(label: 'Fecha', value: _date, onChanged: (d) => setState(() => _date = d ?? _date)),
              const SizedBox(height: 24),
              SubmitButton(label: _isEdit ? 'Actualizar' : 'Guardar', busy: _saving, onPressed: _save),
            ]),
          )),
    );
  }
}
