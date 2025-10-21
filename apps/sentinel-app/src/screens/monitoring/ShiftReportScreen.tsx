import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface ShiftReport {
  id: string;
  shift_id: string;
  officer_id: string;
  officer_name?: string;
  gate_name?: string;
  shift_start: string;
  shift_end?: string;
  total_entries: number;
  total_exits: number;
  guest_visits: number;
  deliveries: number;
  incidents: number;
  summary: string;
  notes: string;
  created_at: string;
}

interface ShiftData {
  gate_id: string;
  shift_date: string;
  entries: any[];
  exits: any[];
  guest_visits: any[];
  deliveries: any[];
  incidents: any[];
  summary: string;
  notes: string;
}

export const ShiftReportScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [shiftData, setShiftData] = useState<ShiftData>({
    gate_id: '',
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    entries: [],
    exits: [],
    guest_visits: [],
    deliveries: [],
    incidents: [],
    summary: '',
    notes: '',
  });
  const { theme } = useTheme();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_reports')
        .select(`
          *,
          gates(name),
          security_officers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading shift reports:', error);
      Alert.alert('Error', 'Failed to load shift reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const generateReport = async () => {
    if (!shiftData.gate_id || !shiftData.shift_date) {
      Alert.alert('Error', 'Please select gate and date');
      return;
    }

    setGenerating(true);
    try {
      const officerId = (await supabase.auth.getUser()).data.user?.id;

      // Get shift data
      const startOfDay = new Date(shiftData.shift_date);
      const endOfDay = new Date(shiftData.shift_date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch data for the shift
      const [entriesResult, exitsResult, guestsResult, deliveriesResult, incidentsResult] = await Promise.all([
        supabase
          .from('gate_entries')
          .select('*')
          .eq('gate_id', shiftData.gate_id)
          .gte('entry_timestamp', startOfDay.toISOString())
          .lte('entry_timestamp', endOfDay.toISOString()),
        supabase
          .from('gate_entries')
          .select('*')
          .eq('gate_id', shiftData.gate_id)
          .not('exit_timestamp', 'is', null)
          .gte('exit_timestamp', startOfDay.toISOString())
          .lte('exit_timestamp', endOfDay.toISOString()),
        supabase
          .from('guest_access_logs')
          .select('*')
          .eq('gate_id', shiftData.gate_id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        supabase
          .from('deliveries')
          .select('*')
          .eq('gate_id', shiftData.gate_id)
          .gte('arrival_timestamp', startOfDay.toISOString())
          .lte('arrival_timestamp', endOfDay.toISOString()),
        supabase
          .from('incidents')
          .select('*')
          .eq('location', shiftData.gate_id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
      ]);

      const entries = entriesResult.data || [];
      const exits = exitsResult.data || [];
      const guestVisits = guestsResult.data || [];
      const deliveries = deliveriesResult.data || [];
      const incidents = incidentsResult.data || [];

      // Generate summary
      const summary = `Shift completed with ${entries.length} entries, ${exits.length} exits, ${guestVisits.length} guest visits, ${deliveries.length} deliveries, and ${incidents.length} incidents reported.`;

      // Create shift report
      const { error } = await supabase
        .from('shift_reports')
        .insert({
          officer_id: officerId,
          gate_id: shiftData.gate_id,
          shift_date: shiftData.shift_date,
          total_entries: entries.length,
          total_exits: exits.length,
          guest_visits: guestVisits.length,
          deliveries: deliveries.length,
          incidents: incidents.length,
          summary: summary,
          notes: shiftData.notes,
        });

      if (error) throw error;

      Alert.alert('Success', 'Shift report generated successfully');
      loadReports();

      // Reset form
      setShiftData({
        gate_id: '',
        shift_date: format(new Date(), 'yyyy-MM-dd'),
        entries: [],
        exits: [],
        guest_visits: [],
        deliveries: [],
        incidents: [],
        summary: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate shift report');
    } finally {
      setGenerating(false);
    }
  };

  const renderReport = ({ item }: { item: ShiftReport }) => (
    <TouchableOpacity
      style={[
        styles.reportCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
      ]}
      onPress={() => {
        Alert.alert('Shift Report Details', `
Officer: ${item.officer_name || 'Unknown'}
Gate: ${item.gate_name || 'Unknown'}
Date: ${format(new Date(item.shift_date), 'MMM dd, yyyy')}

Summary:
${item.summary}

Notes:
${item.notes || 'No additional notes'}
        `.trim());
      }}
    >
      <View style={styles.reportHeader}>
        <View>
          <Text style={[styles.officerName, { color: theme.colors.text }]}>
            {item.officer_name || 'Unknown Officer'}
          </Text>
          <Text style={[styles.gateName, { color: theme.colors.muted }]}>
            {item.gate_name || 'Unknown Gate'}
          </Text>
        </View>
        <Text style={[styles.reportDate, { color: theme.colors.muted }]}>
          {format(new Date(item.created_at), 'MMM dd, HH:mm')}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="login" size={16} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.total_entries}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
            Entries
          </Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="logout" size={16} color={theme.colors.info} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.total_exits}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
            Exits
          </Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="account-group" size={16} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.guest_visits}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
            Guests
          </Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="package-variant" size={16} color={theme.colors.warning} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {item.deliveries}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
            Delivery
          </Text>
        </View>

        {item.incidents > 0 && (
          <View style={styles.statItem}>
            <Icon name="alert" size={16} color={theme.colors.error} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {item.incidents}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
              Incidents
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.summary, { color: theme.colors.text }]} numberOfLines={2}>
        {item.summary}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading shift reports...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Shift Reports
        </Text>

        {/* Generate New Report Section */}
        <View style={[
          styles.generateSection,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Generate New Report
          </Text>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Gate:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }
              ]}
              placeholder="Enter gate ID"
              placeholderTextColor={theme.colors.muted}
              value={shiftData.gate_id}
              onChangeText={(text) => setShiftData(prev => ({ ...prev, gate_id: text }))}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Date:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.muted}
              value={shiftData.shift_date}
              onChangeText={(text) => setShiftData(prev => ({ ...prev, shift_date: text }))}
            />
          </View>

          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Additional notes (optional)"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
            value={shiftData.notes}
            onChangeText={(text) => setShiftData(prev => ({ ...prev, notes: text }))}
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={generateReport}
            disabled={generating}
          >
            {generating ? (
              <Text style={styles.generateButtonText}>Generating...</Text>
            ) : (
              <>
                <Icon name="file-document" size={20} color="#ffffff" />
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Reports
          </Text>

          {reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="file-document-outline" size={64} color={theme.colors.muted} />
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                No shift reports yet
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id}>
                {renderReport({ item: report })}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  generateSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportsSection: {
    flex: 1,
  },
  reportCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  officerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  gateName: {
    fontSize: 14,
    marginTop: 2,
  },
  reportDate: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});