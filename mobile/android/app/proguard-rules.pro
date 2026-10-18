# shared_preferences_android >= 2.5.0 usa Pigeon JNI (paquete jni): el lado Dart
# busca clases y metodos Kotlin por nombre y firma JNI. Si R8 los ofusca o elimina,
# falla en release con NoSuchMethodError / ClassNotFoundException.
-keep class kotlin.Unit { *; }
-keep class kotlin.Result { *; }
-keep class kotlin.Result$Failure { *; }
-keep class kotlin.coroutines.Continuation { *; }
-keep class kotlin.coroutines.intrinsics.** { *; }
-keep class io.flutter.plugins.sharedpreferences.** { *; }
-keep class com.github.dart_lang.jni.** { *; }
-keep class com.github.dart_lang.jni_flutter.** { *; }
