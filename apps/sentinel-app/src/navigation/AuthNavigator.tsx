import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SimpleLoginScreen from '../screens/auth/SimpleLoginScreen';
// import GateSelectionScreen from '../screens/auth/GateSelectionScreen';
// import ClockInScreen from '../screens/auth/ClockInScreen';
import { useAuth } from '../contexts/AuthContext';

export type AuthParamList = {
  Login: undefined;
  GateSelection: undefined;
  ClockIn: undefined;
};

const Stack = createNativeStackNavigator<AuthParamList>();

const AuthNavigator: React.FC = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={SimpleLoginScreen}
        options={{
          title: 'Security Login',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;