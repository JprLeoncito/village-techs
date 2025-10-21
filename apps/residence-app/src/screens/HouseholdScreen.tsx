import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { householdMemberService, HouseholdMember } from '../services/householdMemberService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Icons, IconColors } from '../constants/icons';
import networkStatus from '../lib/networkStatus';

export const HouseholdScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadMembers();
    checkNetworkStatus();

    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOnline(connected);
      if (connected) {
        householdMemberService.processOfflineQueue();
      }
    });

    return () => {
      networkStatus.removeListener(unsubscribe);
    };
  }, []);

  const checkNetworkStatus = () => {
    setIsOnline(networkStatus.isConnected());
  };

  const loadMembers = async () => {
    try {
      const data = await householdMemberService.getHouseholdMembers({ status: 'active' });
      setMembers(data);
    } catch (error) {
      console.error('Error loading household members:', error);
      Alert.alert('Error', 'Failed to load household members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const handleAddMember = () => {
    navigation.navigate('AddEditHouseholdMember' as never, { mode: 'create' } as never);
  };

  const handleEditMember = (memberId: string) => {
    navigation.navigate('AddEditHouseholdMember' as never, { mode: 'edit', memberId } as never);
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${memberName} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await householdMemberService.deleteHouseholdMember(memberId);
              if (result.success) {
                Alert.alert('Success', 'Member removed successfully');
                loadMembers();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'self':
        return 'person';
      case 'spouse':
        return 'favorite';
      case 'child':
        return 'child-care';
      case 'parent':
        return 'elderly';
      case 'sibling':
        return 'people';
      case 'grandparent':
        return 'elderly';
      case 'grandchild':
        return 'child-care';
      default:
        return 'person';
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'self':
        return '#10b981';
      case 'spouse':
        return '#8b5cf6';
      case 'child':
        return '#3b82f6';
      case 'parent':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LoadingSpinner size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.muted }]}>Loading household members...</Text>
      </View>
    );
  }

  const residents = members.filter(m => m.member_type === 'resident');
  const beneficialUsers = members.filter(m => m.member_type === 'beneficial_user');

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="signal-wifi-off" size={20} color={IconColors.warning} />
          <Text style={styles.offlineText}>You're offline. Showing cached data.</Text>
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Household Members</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]} onPress={handleAddMember}>
            <Text style={[styles.addButtonText, { color: '#ffffff' }]}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{members.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total Members</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{residents.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Residents</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{beneficialUsers.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Beneficial Users</Text>
          </Card>
        </View>

        {/* Household Members */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="family-restroom" size={24} color={IconColors.primary} />
            <Text style={styles.sectionTitle}>Family Members ({residents.length})</Text>
          </View>
        {residents.map((member) => {
          const age = calculateAge(member.date_of_birth);
          return (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <View style={[styles.relationshipIcon, { backgroundColor: getRelationshipColor(member.relationship_to_head) }]}>
                      <MaterialIcons
                        name={getRelationshipIcon(member.relationship_to_head)}
                        size={16}
                        color="#ffffff"
                      />
                    </View>
                    <Text style={styles.memberName}>
                      {member.first_name} {member.last_name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.relationshipBadge,
                      { backgroundColor: getRelationshipColor(member.relationship_to_head) },
                    ]}
                  >
                    <Text style={styles.relationshipText}>
                      {member.relationship_to_head.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.memberDetails}>
                {age !== null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Age:</Text>
                    <Text style={styles.detailValue}>{age} years old</Text>
                  </View>
                )}
                {member.contact_email && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{member.contact_email}</Text>
                  </View>
                )}
                {member.contact_phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{member.contact_phone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={() => handleEditMember(member.id)}
                >
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.colors.card, borderColor: '#ef4444', borderWidth: 1 }]}
                  onPress={() => handleDeleteMember(member.id, `${member.first_name} ${member.last_name}`)}
                >
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Beneficial Users */}
      {beneficialUsers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="vpn-key" size={24} color={IconColors.warning} />
            <Text style={styles.sectionTitle}>Beneficial Users ({beneficialUsers.length})</Text>
          </View>
          {beneficialUsers.map((member) => (
            <View key={member.id} style={[styles.memberCard, styles.beneficialCard]}>
              <View style={styles.memberHeader}>
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <View style={[styles.relationshipIcon, { backgroundColor: IconColors.warning }]}>
                      <MaterialIcons name="person" size={16} color="#ffffff" />
                    </View>
                    <Text style={styles.memberName}>
                      {member.first_name} {member.last_name}
                    </Text>
                  </View>
                  <View style={[styles.relationshipBadge, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.relationshipText}>BENEFICIAL USER</Text>
                  </View>
                </View>
              </View>

              <View style={styles.memberDetails}>
                {member.contact_phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{member.contact_phone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={() => handleEditMember(member.id)}
                >
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.colors.card, borderColor: '#ef4444', borderWidth: 1 }]}
                  onPress={() => handleDeleteMember(member.id, `${member.first_name} ${member.last_name}`)}
                >
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {members.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="family-restroom" size={64} color={IconColors.muted} />
          <Text style={styles.emptyTitle}>No Household Members</Text>
          <Text style={styles.emptyText}>Add family members to get started.</Text>
          <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddMember}>
            <Text style={[styles.emptyButtonText, { color: '#ffffff' }]}>Add First Member</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
    offlineBanner: {
      backgroundColor: '#fef3c7',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#f59e0b',
    },
    offlineIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    offlineText: {
      flex: 1,
      fontSize: 13,
      color: '#92400e',
      fontWeight: '500',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    addButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      fontWeight: '600',
      fontSize: 14,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    statNumber: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    section: {
      padding: 16,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    memberCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    beneficialCard: {
      backgroundColor: theme.dark ? '#92400e' : '#fef3c7',
    },
    memberHeader: {
      marginBottom: 12,
    },
    memberInfo: {
      gap: 8,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    relationshipIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    relationshipBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    relationshipText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    memberDetails: {
      gap: 6,
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    deleteButton: {
      borderColor: '#ef4444',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    emptyButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 16,
    },
  });

export default HouseholdScreen;
