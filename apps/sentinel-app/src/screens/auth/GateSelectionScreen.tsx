import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusIndicator } from '../../components/ui/StatusIndicator';

type AuthStackParamList = {
  GateSelection: undefined;
  ClockIn: { gateId: string; gateName: string };
};

type GateSelectionScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'GateSelection'>;

interface Gate {
  id: string;
  name: string;
  type: 'main' | 'side' | 'service' | 'emergency';
  is_active: boolean;
  operating_hours?: any;
  hardware_settings?: any;
}

export const GateSelectionScreen: React.FC = () => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { officer } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<GateSelectionScreenNavigationProp>();

  useEffect(() => {
    loadGates();
  }, []);

  const loadGates = async () => {
    try {
      if (!officer?.tenantId) {
        console.error('No tenant ID found');
        return;
      }

      const { data, error } = await supabase
        .from('gates')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading gates:', error);
        return;
      }

      setGates(data || []);
    } catch (error) {
      console.error('Error loading gates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGates();
    setRefreshing(false);
  };

  const handleGateSelect = (gate: Gate) => {
    navigation.navigate('ClockIn', {
      gateId: gate.id,
      gateName: gate.name,
    });
  };

  const getGateTypeIcon = (type: string) => {
    switch (type) {
      case 'main':
        return 'door';
      case 'side':
        return 'door-sliding';
      case 'service':
        return 'truck';
      case 'emergency':
        return 'alarm-light';
      default:
        return 'door';
    }
  };

  const getGateTypeColor = (type: string) => {
    switch (type) {
      case 'main':
        return 'primary';
      case 'side':
        return 'secondary';
      case 'service':
        return 'warning';
      case 'emergency':
        return 'danger';
      default:
        return 'primary';
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    gateName: [styles.gateName, { color: theme.colors.text }],
    gateType: [styles.gateType, { color: theme.colors.muted }],
    emptyText: [styles.emptyText, { color: theme.colors.muted }],
    officerText: [styles.officerText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading Gates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={textStyles.title}>Select Gate</Text>
        <Text style={textStyles.subtitle}>Choose your assigned gate for this shift</Text>
        {officer && (
          <View style={styles.officerInfo}>
            <Icon name="account" size={16} color={theme.colors.muted} />
            <Text style={textStyles.officerText}>
              {officer.email} • {officer.role === 'security_head' ? 'Security Head' : 'Security Officer'}
            </Text>
          </View>
        )}
      </View>

      {/* Gates List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {gates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="door-open" size={64} color={theme.colors.muted} />
            <Text style={textStyles.emptyText}>No active gates available</Text>
            <Text style={textStyles.subtitle}>
              Please contact your administrator if you believe this is an error
            </Text>
            <Button
              title="Refresh"
              onPress={loadGates}
              variant="outline"
              icon={<Icon name="refresh" size={20} color={theme.colors.primary} />}
            />
          </View>
        ) : (
          <View style={styles.gatesContainer}>
            {gates.map((gate) => (
              <Card
                key={gate.id}
                style={styles.gateCard}
                onPress={() => handleGateSelect(gate)}
              >
                <View style={styles.gateHeader}>
                  <View style={styles.gateIconContainer}>
                    <Icon
                      name={getGateTypeIcon(gate.type)}
                      size={32}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.gateInfo}>
                    <Text style={textStyles.gateName}>{gate.name}</Text>
                    <View style={styles.gateTypeContainer}>
                      <Badge
                        title={gate.type}
                        variant={getGateTypeColor(gate.type) as any}
                        size="small"
                      />
                      <View style={styles.statusContainer}>
                        <StatusIndicator status="online" size="small" />
                        <Text style={textStyles.gateType}>Active</Text>
                      </View>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color={theme.colors.muted} />
                </View>

                {gate.operating_hours && (
                  <View style={styles.operatingHours}>
                    <Icon name="clock" size={16} color={theme.colors.muted} />
                    <Text style={textStyles.gateType}>
                      Gate Hours: {formatOperatingHours(gate.operating_hours)}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const formatOperatingHours = (hours: any): string => {
  // Simple formatting - you can expand this based on your needs
  if (typeof hours === 'string') return hours;
  if (Array.isArray(hours) && hours.length > 0) {
    return `${hours[0]?.open || 'N/A'} - ${hours[0]?.close || 'N/A'}`;
  }
  return '24/7';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  officerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  officerText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  gatesContainer: {
    gap: 16,
  },
  gateCard: {
    padding: 16,
  },
  gateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gateInfo: {
    flex: 1,
  },
  gateName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gateTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gateType: {
    fontSize: 14,
  },
  operatingHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
});