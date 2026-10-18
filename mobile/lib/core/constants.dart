import 'package:flutter/material.dart';

import 'format.dart';

enum Tone { success, warning, danger, info, neutral, brand }

class StatusInfo {
  const StatusInfo(this.label, this.tone);
  final String label;
  final Tone tone;
}

const appointmentStatus = <String, StatusInfo>{
  'PENDING': StatusInfo('Pendiente', Tone.warning),
  'CONFIRMED': StatusInfo('Confirmada', Tone.success),
  'COMPLETED': StatusInfo('Completada', Tone.info),
  'CANCELLED': StatusInfo('Cancelada', Tone.danger),
  'NO_SHOW': StatusInfo('No asistió', Tone.danger),
};

/// Colores de las citas en el calendario (los mismos de la web).
Color appointmentColor(String? status) {
  switch (status) {
    case 'CONFIRMED':
      return const Color(0xFF059669);
    case 'PENDING':
      return const Color(0xFFD97706);
    case 'COMPLETED':
      return const Color(0xFF2563EB);
    case 'CANCELLED':
    case 'NO_SHOW':
      return const Color(0xFFDC2626);
    default:
      return const Color(0xFF4B5563);
  }
}

const corporateEventColor = Color(0xFF6B7F6A);

const quoteStatus = <String, StatusInfo>{
  'DRAFT': StatusInfo('Borrador', Tone.neutral),
  'SENT': StatusInfo('Enviada', Tone.info),
  'ACCEPTED': StatusInfo('Aceptada', Tone.success),
  'REJECTED': StatusInfo('Rechazada', Tone.danger),
  'CONVERTED': StatusInfo('Convertida', Tone.brand),
  'EXPIRED': StatusInfo('Vencida', Tone.warning),
};

const eventStatus = <String, StatusInfo>{
  'SCHEDULED': StatusInfo('Programado', Tone.info),
  'IN_PROGRESS': StatusInfo('En curso', Tone.warning),
  'COMPLETED': StatusInfo('Completado', Tone.success),
  'CANCELLED': StatusInfo('Cancelado', Tone.danger),
};

const dayStatus = <String, StatusInfo>{
  'SCHEDULED': StatusInfo('Programada', Tone.info),
  'COMPLETED': StatusInfo('Realizada', Tone.success),
  'CANCELLED': StatusInfo('Cancelada', Tone.danger),
};

const paymentMethods = <String, String>{
  'CASH': 'Efectivo',
  'YAPE': 'Yape',
  'PLIN': 'Plin',
  'CARD': 'Tarjeta',
  'TRANSFER': 'Transferencia',
};

const paymentTypes = <String, String>{
  'ADVANCE': 'Adelanto',
  'FULL': 'Pago total',
  'RELICIDATION': 'Saldo / Liquidación',
};

/// Categorías generales de gasto (formulario de Gastos).
const expenseCategories = <String, String>{
  'Salarios': 'Salarios/Comisiones',
  'Alquiler': 'Alquiler',
  'Servicios': 'Servicios',
  'Insumos': 'Insumos',
  'Mantenimiento': 'Mantenimiento',
  'Marketing': 'Marketing',
  'Otros': 'Otros',
};

/// Categorías de gastos de eventos corporativos.
const eventExpenseCategories = ['Otros', 'Insumos', 'Servicios', 'Marketing'];

/// Una cotización en borrador o enviada vence a los `validityDays` de su emisión.
bool isQuoteExpired(Map quote) {
  if (!['DRAFT', 'SENT'].contains(quote['status'])) return false;
  final issue = parseIso(quote['issueDate']);
  if (issue == null) return false;
  final expires = issue.add(Duration(days: toInt(quote['validityDays'])));
  return expires.isBefore(DateTime.now().toUtc());
}

StatusInfo displayQuoteStatus(Map quote) =>
    isQuoteExpired(quote) ? quoteStatus['EXPIRED']! : (quoteStatus[quote['status']] ?? StatusInfo('${quote['status']}', Tone.neutral));

/// Textos por defecto de una cotización nueva.
class DefaultQuote {
  static const title = 'JORNADA DE BIENESTAR PARA COLABORADORES';
  static const subtitle = 'Propuesta de servicio de masajes corporativos descontracturantes';
  static const introduction =
      'En Gracia Spa creemos firmemente que generar espacios de bienestar dentro del entorno laboral contribuye activamente a mejorar el clima organizacional y la productividad. Ponemos a disposición de su organización nuestro equipo profesional especializado para trasladar una experiencia integral de relajación y desconexión directamente a sus instalaciones.';
  static const serviceDescription =
      'Se brindarán sesiones individuales de masaje relajante y descontracturante en silla ergonómica, diseñadas para aliviar rápidamente la fatiga física y liberar la tensión muscular acumulada.';
  static const focusZones = ['Cuello y Zona Cervical', 'Hombros', 'Espalda', 'Brazos y Manos'];
  static const modality = 'Atención abierta continua';
  static const scopeItems = [
    'Terapeutas profesionales por jornada',
    'Sillas de masaje ergonómicas',
    'Sesiones descontracturantes',
    'Atención simultánea de colaboradores',
    'Coordinación y montaje de espacio previa',
    'Traslado y logística 100% incluida',
    'Organización del flujo de personas',
    'Desmontaje y retiro al finalizar',
  ];
  static const conditions = [
    {'title': 'Coordinación & Reserva', 'text': 'Fechas y horarios quedan reservados tras la confirmación formal de la propuesta.'},
    {'title': 'Espacio e Instalaciones', 'text': 'El cliente proveerá el área adecuada con espacio suficiente para las sillas y libre circulación.'},
    {'title': 'Dinámica de Atención', 'text': 'Modalidad abierta según llegada y disponibilidad de los colaboradores en el horario acordado.'},
    {'title': 'Vigencia de Cotización', 'text': 'Propuesta válida por 7 días calendario a partir de la fecha de emisión.'},
  ];
}

const defaultBirthdayMessage =
    '¡Hola {name}! 🎉 De parte de todo el equipo de Gracia Spa queremos desearte un muy feliz cumpleaños. 🎂 Tenemos una promoción especial para ti por tu día, ¡escríbenos para agendarla! 💆‍♀️✨';
