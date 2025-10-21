import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Temporary redirect component to handle old GatePass routes
 * Redirects to GuestList since Gate Pass functionality is being removed
 */
export const GatePassListScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Redirect to GuestList immediately
    navigation.navigate('GuestList' as never);
  }, [navigation]);

  return null;
};

export default GatePassListScreen;