import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface AlertData {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  target_audience: 'all' | 'residents' | 'security' | 'staff';
  is_active: boolean;
}

const ALERT_SEVERITY = [
  { value: 'info', label: 'Information', color: '#3b82f6', icon: 'information' },
  { value: 'warning', label: 'Warning', color: '#f59e0b', icon: 'alert' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444', icon: 'alert-circle' },
  { value: 'critical', label: 'Critical', color: '#7c3aed', icon: 'alert-octagon' },
];

const TARGET_AUDIENCE = [
  { value: 'all', label: 'All Users', icon: 'account-group' },
  { value: 'residents', label: 'Residents Only', icon: 'home' },
  { value: 'security', label: 'Security Staff', icon: 'shield-account' },
  { value: 'staff', label: 'All Staff', icon: 'account-tie' },
];

export const BroadcastAlertScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState<AlertData>({
    title: '',
    message: '',
    severity: 'info',
    target_audience: 'all',
    is_active: true,
  });
  const { theme } = useTheme();

  const selectSeverity = (severity: string) => {
    setAlertData(prev => ({ ...prev, severity: severity as any }));
  };

  const selectAudience = (target_audience: string) => {
    setAlertData(prev => ({ ...prev, target_audience: target_audience as any }));
  };

  const validateForm = () => {
    if (!alertData.title.trim()) {
      Alert.alert('Error', 'Please enter an alert title');
      return false;
    }
    if (!alertData.message.trim()) {
      Alert.alert('Error', 'Please enter an alert message');
      return false;
    }
    return true;
  };

  const sendBroadcast = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const officerId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from('broadcast_alerts')
        .insert({
          title: alertData.title,
          message: alertData.message,
          severity: alertData.severity,
          target_audience: alertData.target_audience,
          is_active: alertData.is_active,
          created_by: officerId,
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Alert broadcasted successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAlertData({
                title: '',
                message: '',
                severity: 'info',
                target_audience: 'all',
                is_active: true,
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending broadcast:', error);
      Alert.alert('Error', 'Failed to send broadcast alert');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const severityConfig = ALERT_SEVERITY.find(s => s.value === severity);
    return severityConfig ? severityConfig.color : theme.colors.text;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Broadcast Alert
        </Text>

        {/* Alert Severity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Alert Severity
          </Text>
          <View style={styles.severityContainer}>
            {ALERT_SEVERITY.map((severity) => (
              <TouchableOpacity
                key={severity.value}
                style={[
                  styles.severityCard,
                  {
                    backgroundColor: alertData.severity === severity.value
                      ? severity.color
                      : theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => selectSeverity(severity.value)}
              >
                <Icon
                  name={severity.icon}
                  size={24}
                  color={alertData.severity === severity.value ? '#ffffff' : severity.color}
                />
                <Text style={[
                  styles.severityLabel,
                  {
                    color: alertData.severity === severity.value ? '#ffffff' : theme.colors.text,
                  }
                ]}>
                  {severity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Audience */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Target Audience
          </Text>
          <View style={styles.audienceGrid}>
            {TARGET_AUDIENCE.map((audience) => (
              <TouchableOpacity
                key={audience.value}
                style={[
                  styles.audienceCard,
                  {
                    backgroundColor: alertData.target_audience === audience.value
                      ? theme.colors.primary
                      : theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => selectAudience(audience.value)}
              >
                <Icon
                  name={audience.icon}
                  size={20}
                  color={alertData.target_audience === audience.value ? '#ffffff' : theme.colors.text}
                />
                <Text style={[
                  styles.audienceLabel,
                  {
                    color: alertData.target_audience === audience.value ? '#ffffff' : theme.colors.text,
                  }
                ]}>
                  {audience.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alert Title */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Alert Title
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Enter alert title"
            placeholderTextColor={theme.colors.muted}
            value={alertData.title}
            onChangeText={(text) => setAlertData(prev => ({ ...prev, title: text }))}
            maxLength={100}
          />
          <Text style={[styles.characterCount, { color: theme.colors.muted }]}>
            {alertData.title.length}/100 characters
          </Text>
        </View>

        {/* Alert Message */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Alert Message
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Enter detailed alert message"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={8}
            value={alertData.message}
            onChangeText={(text) => setAlertData(prev => ({ ...prev, message: text }))}
            maxLength={500}
          />
          <Text style={[styles.characterCount, { color: theme.colors.muted }]}>
            {alertData.message.length}/500 characters
          </Text>
        </View>

        {/* Active Status */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
              Active Immediately
            </Text>
            <Switch
              value={alertData.is_active}
              onValueChange={(value) => setAlertData(prev => ({ ...prev, is_active: value }))}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <Text style={[styles.switchDescription, { color: theme.colors.muted }]}>
            {alertData.is_active
              ? 'Alert will be visible to users immediately'
              : 'Alert will be saved but not visible to users'}
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Preview
          </Text>
          <View style={[
            styles.previewCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: getSeverityColor(alertData.severity),
              borderWidth: 2,
            }
          ]}>
            <View style={styles.previewHeader}>
              <Icon
                name={ALERT_SEVERITY.find(s => s.value === alertData.severity)?.icon || 'information'}
                size={20}
                color={getSeverityColor(alertData.severity)}
              />
              <Text style={[
                styles.previewSeverity,
                { color: getSeverityColor(alertData.severity) }
              ]}>
                {alertData.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
              {alertData.title || 'Alert Title'}
            </Text>
            <Text style={[styles.previewMessage, { color: theme.colors.text }]}>
              {alertData.message || 'Alert message will appear here...'}
            </Text>
            <View style={styles.previewFooter}>
              <Text style={[styles.previewAudience, { color: theme.colors.muted }]}>
                To: {TARGET_AUDIENCE.find(a => a.value === alertData.target_audience)?.label}
              </Text>
              <Text style={[styles.previewStatus, { color: theme.colors.muted }]}>
                {alertData.is_active ? 'Active' : 'Draft'}
              </Text>
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={sendBroadcast}
          disabled={loading || !alertData.title.trim() || !alertData.message.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Icon name="send" size={20} color="#ffffff" />
              <Text style={styles.sendButtonText}>Send Broadcast</Text>
            </>
          )}
        </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityCard: {
    flex: 1,
    marginHorizontal: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  audienceCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  audienceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    height: 150,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchDescription: {
    fontSize: 14,
    marginTop: 8,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewSeverity: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewAudience: {
    fontSize: 12,
  },
  previewStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});