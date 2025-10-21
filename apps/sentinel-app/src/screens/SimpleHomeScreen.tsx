import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SimpleHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleLogout = async () => {
    await logout();
  };

  const handleModulePress = (moduleId: string, moduleTitle: string) => {
    switch (moduleId) {
      case 'monitoring':
        navigation.navigate('GateMonitoring' as never);
        break;
      case 'entries':
        navigation.navigate('EntryLog' as never);
        break;
      case 'guests':
        navigation.navigate('GuestVerification' as never);
        break;
      case 'deliveries':
        navigation.navigate('DeliveryHandoff' as never);
        break;
      case 'incidents':
        navigation.navigate('IncidentReport' as never);
        break;
      default:
        Alert.alert('Module Not Available', `${moduleTitle} is currently under development.`);
    }
  };

  const securityModules = [
    {
      id: 'monitoring',
      title: 'Gate Monitoring',
      icon: 'shield-account',
      color: theme.colors.primary,
      description: 'Monitor gate access and security status',
    },
    {
      id: 'entries',
      title: 'Entry Log',
      icon: 'login',
      color: '#22c55e',
      description: 'View and manage entry records',
    },
    {
      id: 'guests',
      title: 'Guest Management',
      icon: 'account-group',
      color: theme.colors.warning,
      description: 'Manage guest registrations',
    },
    {
      id: 'deliveries',
      title: 'Deliveries',
      icon: 'package-variant',
      color: '#8b5cf6',
      description: 'Track delivery entries',
    },
    {
      id: 'incidents',
      title: 'Incidents',
      icon: 'alert-circle',
      color: theme.colors.error,
      description: 'Report and track incidents',
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.primary,
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    userInfo: {
      flex: 1,
    },
    welcomeText: {
      color: '#ffffff',
      fontSize: 14,
      opacity: 0.9,
    },
    userName: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
    },
    userRole: {
      color: '#ffffff',
      fontSize: 16,
      opacity: 0.8,
      marginTop: 4,
    },
    logoutButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 20,
    },
    modulesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    moduleCard: {
      width: '48%',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    moduleIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    moduleTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    moduleDescription: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 16,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    statusText: {
      textAlign: 'center',
      fontSize: 12,
      color: theme.colors.muted,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Security Officer'}</Text>
            <Text style={styles.userRole}>{user?.role || 'Guard'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Security Modules</Text>
        <View style={styles.modulesGrid}>
          {securityModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              activeOpacity={0.7}
              onPress={() => handleModulePress(module.id, module.title)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
                <Icon name={module.icon} size={24} color={module.color} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.statusText}>
          Sentinel Security System v1.0 • Status: Active
        </Text>
      </View>
    </View>
  );
};

export default SimpleHomeScreen;