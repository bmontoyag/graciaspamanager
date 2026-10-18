import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/format.dart';

/// Campo de fecha. El valor es un día en UTC (sin hora).
class DateField extends StatelessWidget {
  const DateField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.enabled = true,
    this.clearable = false,
    this.firstDate,
  });

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final bool enabled;
  final bool clearable;
  final DateTime? firstDate;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: !enabled
          ? null
          : () async {
              final initial = value ?? limaToday();
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime(initial.year, initial.month, initial.day),
                firstDate: firstDate ?? DateTime(1920),
                lastDate: DateTime(2100),
              );
              if (picked != null) onChanged(DateTime.utc(picked.year, picked.month, picked.day));
            },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          enabled: enabled,
          suffixIcon: clearable && value != null && enabled
              ? IconButton(icon: const Icon(Icons.clear), onPressed: () => onChanged(null))
              : const Icon(Icons.calendar_today, size: 18),
        ),
        child: Text(value == null ? 'Seleccionar' : DateFormat('dd/MM/yyyy').format(value!)),
      ),
    );
  }
}

/// Campo de hora con valor "HH:mm".
class TimeField extends StatelessWidget {
  const TimeField({super.key, required this.label, required this.value, required this.onChanged, this.enabled = true});

  final String label;
  final String? value;
  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: !enabled
          ? null
          : () async {
              final parts = (value ?? '09:00').split(':');
              final picked = await showTimePicker(
                context: context,
                initialTime: TimeOfDay(hour: int.tryParse(parts[0]) ?? 9, minute: int.tryParse(parts[1]) ?? 0),
              );
              if (picked != null) onChanged(hhmm(picked.hour, picked.minute));
            },
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, enabled: enabled, suffixIcon: const Icon(Icons.schedule, size: 18)),
        child: Text(value == null || value!.isEmpty ? '--:--' : value!),
      ),
    );
  }
}

/// Lista desplegable controlada.
class SelectField<T> extends StatelessWidget {
  const SelectField({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.validator,
  });

  final String label;
  final T? value;
  final Map<T, String> items;
  final ValueChanged<T?> onChanged;
  final bool enabled;
  final FormFieldValidator<T>? validator;

  @override
  Widget build(BuildContext context) {
    final current = items.containsKey(value) ? value : null;
    return DropdownButtonFormField<T>(
      key: ValueKey('$label:$current:${items.length}'),
      initialValue: current,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      validator: validator,
      items: [
        for (final entry in items.entries)
          DropdownMenuItem<T>(value: entry.key, child: Text(entry.value, overflow: TextOverflow.ellipsis)),
      ],
      onChanged: enabled ? onChanged : null,
    );
  }
}

/// Selector con búsqueda en hoja inferior, para listas largas (clientes, servicios).
class SearchSelectField extends StatelessWidget {
  const SearchSelectField({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.subtitleOf,
    this.searchHint = 'Buscar...',
    this.enabled = true,
    this.emptyLabel = 'Seleccionar',
  });

  final String label;
  final List<Map<String, dynamic>> options;
  final int? value;
  final ValueChanged<Map<String, dynamic>?> onChanged;
  final String Function(Map<String, dynamic>)? subtitleOf;
  final String searchHint;
  final bool enabled;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    final selected = options.where((o) => toIntOrNull(o['id']) == value).firstOrNull;
    return InkWell(
      onTap: !enabled
          ? null
          : () async {
              final picked = await showModalBottomSheet<Map<String, dynamic>>(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                builder: (_) => _SearchSheet(title: label, options: options, subtitleOf: subtitleOf, hint: searchHint),
              );
              if (picked != null) onChanged(picked);
            },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          enabled: enabled,
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          selected == null ? '$emptyLabel (${options.length})' : selected['name']?.toString() ?? '',
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}

class _SearchSheet extends StatefulWidget {
  const _SearchSheet({required this.title, required this.options, required this.hint, this.subtitleOf});

  final String title;
  final List<Map<String, dynamic>> options;
  final String hint;
  final String Function(Map<String, dynamic>)? subtitleOf;

  @override
  State<_SearchSheet> createState() => _SearchSheetState();
}

class _SearchSheetState extends State<_SearchSheet> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final q = query.toLowerCase();
    final filtered = widget.options.where((o) {
      final name = o['name']?.toString().toLowerCase() ?? '';
      final extra = widget.subtitleOf?.call(o).toLowerCase() ?? '';
      return name.contains(q) || extra.contains(q) || '${o['id']}' == q;
    }).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(children: [
              Expanded(child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium)),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              autofocus: true,
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: widget.hint),
              onChanged: (v) => setState(() => query = v),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text('Sin resultados'))
                : ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final option = filtered[index];
                      final subtitle = widget.subtitleOf?.call(option);
                      return ListTile(
                        title: Text(option['name']?.toString() ?? ''),
                        subtitle: subtitle == null || subtitle.isEmpty ? null : Text(subtitle),
                        onTap: () => Navigator.pop(context, option),
                      );
                    },
                  ),
          ),
        ]),
      ),
    );
  }
}

/// Selección múltiple con chips (terapeutas, roles, módulos).
class MultiSelectChips extends StatelessWidget {
  const MultiSelectChips({super.key, required this.options, required this.selected, required this.onChanged});

  final Map<int, String> options;
  final Set<int> selected;
  final ValueChanged<Set<int>> onChanged;

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) return const Text('Sin opciones disponibles');
    return Wrap(
      spacing: 8,
      runSpacing: 4,
      children: [
        for (final entry in options.entries)
          FilterChip(
            label: Text(entry.value),
            selected: selected.contains(entry.key),
            onSelected: (value) {
              final next = {...selected};
              value ? next.add(entry.key) : next.remove(entry.key);
              onChanged(next);
            },
          ),
      ],
    );
  }
}

/// Validador de campo obligatorio.
String? requiredValidator(String? value) => value == null || value.trim().isEmpty ? 'Campo requerido' : null;

/// Abre un formulario a pantalla completa y devuelve su resultado.
Future<T?> openForm<T>(BuildContext context, Widget form) =>
    Navigator.of(context).push<T>(MaterialPageRoute(builder: (_) => form, fullscreenDialog: true));
