import 'package:url_launcher/url_launcher.dart';

/// Número para WhatsApp: solo dígitos y código de Perú si tiene 9 dígitos.
String whatsappPhone(String phone) {
  var digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 9) digits = '51$digits';
  return digits;
}

Future<bool> openWhatsApp(String phone, String message) =>
    openExternal('https://wa.me/${whatsappPhone(phone)}?text=${Uri.encodeComponent(message)}');

Future<bool> openExternal(String url) async {
  try {
    return await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}
