import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Fallo obteniendo permisos para push notifications');
            return null;
        }

        try {
            // Obtenemos el Expo Push Token. Es posible pasarle el projectId de EAS, 
            // pero para Expo Go la configuración por defecto bastara provisoriamente.
            const pushTokenString = (await Notifications.getExpoPushTokenAsync()).data;
            token = pushTokenString;
        } catch (e) {
            console.error('Error generando token:', e);
        }
    } else {
        console.log('Debe usar un dispositivo físico para Push Notifications');
    }

    return token;
}
