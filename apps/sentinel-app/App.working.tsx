import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { Card } from './src/components/ui/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const WorkingApp: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Icon name="shield-account" size={48} color="#2563eb" />
          <Text style={styles.title}>Sentinel Security App</Text>
          <Text style={styles.subtitle}>Working Version - Core Components Test</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>✅ Fixed Issues</Text>
          <Text style={styles.cardText}>• Icon imports corrected</Text>
          <Text style={styles.cardText}>• Camera API updated</Text>
          <Text style={styles.cardText}>• Notification API fixed</Text>
          <Text style={styles.cardText}>• BLE service improved</Text>
          <Text style={styles.cardText}>• TypeScript errors reduced</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📱 Features Ready</Text>
          <Text style={styles.cardText}>• Theme context working</Text>
          <Text style={styles.cardText}>• UI components functional</Text>
          <Text style={styles.cardText}>• Basic navigation structure</Text>
          <Text style={styles.cardText}>• Service layers implemented</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Still Needed</Text>
          <Text style={styles.cardText}>• Complete path resolution fix</Text>
          <Text style={styles.cardText}>• Full navigation integration</Text>
          <Text style={styles.cardText}>• Database connection setup</Text>
          <Text style={styles.cardText}>• Authentication implementation</Text>
        </Card>

        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Status: Basic Framework Working ✅</Text>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WorkingApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 20,
  },
  statusBar: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  statusText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#0369a1',
  },
});