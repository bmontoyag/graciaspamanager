import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/store/AuthContext';
import { ThemeProvider } from './src/store/ThemeContext';
import { Colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import AttentionsScreen from './src/screens/AttentionsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import UsersScreen from './src/screens/UsersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DailyClosingScreen from './src/screens/DailyClosingScreen';
import ServicesScreen from './src/screens/ServicesScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Dashboard: undefined;
  Calendar: undefined;
  Clients: undefined;
  Attentions: undefined;
  Expenses: undefined;
  Reports: undefined;
  Users: undefined;
  Settings: undefined;
  DailyClosing: undefined;
  Services: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function NavigationRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgPage }}>
        <ActivityIndicator size="large" color={Colors.sidebar} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Attentions" component={AttentionsScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="DailyClosing" component={DailyClosingScreen} />
            <Stack.Screen name="Services" component={ServicesScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationRouter />
      </ThemeProvider>
    </AuthProvider>
  );
}
