import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';

interface ThemedDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({
  value,
  onChange,
  minimumDate,
  maximumDate,
  visible,
  onClose,
  title = 'Select Date',
}) => {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date(value));
  const [showYearPicker, setShowYearPicker] = useState(false);

  const years = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - 50 + i;
    return year;
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);

    // Check minimum date constraint
    if (minimumDate && newDate < minimumDate) {
      return;
    }

    // Check maximum date constraint
    if (maximumDate && newDate > maximumDate) {
      return;
    }

    setSelectedDate(newDate);
  };

  const handleMonthChange = (increment: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + increment, 1);
    setSelectedDate(newDate);
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, selectedDate.getMonth(), selectedDate.getDate());
    setSelectedDate(newDate);
    setShowYearPicker(false);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    onClose();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View
          key={`empty-${i}`}
          style={[
            styles.dayCell,
            {
              backgroundColor: theme.colors.card,
            }
          ]}
        />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isSelected = day === selectedDate.getDate();
      // Check if today with timezone awareness
      const now = new Date();
      const todayLocalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isToday = todayLocalDate.getTime() === currentDate.getTime();
      const isDisabled =
        (minimumDate && currentDate < minimumDate) ||
        (maximumDate && currentDate > maximumDate);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            {
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
            isToday && !isSelected && {
              borderWidth: 2,
              borderColor: '#10b981',
            },
            isSelected && {
              backgroundColor: '#10b981',
              borderWidth: 1,
              borderColor: '#10b981',
            },
            isDisabled && {
              backgroundColor: theme.colors.card,
              opacity: 0.3,
            },
          ]}
          onPress={() => !isDisabled && handleDateSelect(day)}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayText,
              isToday && !isSelected && { color: theme.colors.primary, fontWeight: '600' },
              isSelected && { color: '#ffffff', fontWeight: '600' },
              { color: isDisabled ? theme.colors.muted : theme.colors.text },
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
    },
    closeButton: {
      padding: 12,
      borderRadius: 8,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthYearHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    monthYearText: {
      fontSize: 16,
      fontWeight: '600',
    },
    navButton: {
      padding: 12,
      borderRadius: 8,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weekdaysContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
    },
    weekdayText: {
      fontSize: 12,
      fontWeight: '600',
    },
    calendarContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      marginVertical: 2,
      minWidth: 40,
      minHeight: 40,
    },
    dayText: {
      fontSize: 16,
      fontWeight: '500',
    },
        footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderTopWidth: 1,
    },
    yearPickerContainer: {
      maxHeight: 300,
    },
    yearScrollView: {
      maxHeight: 250,
    },
    yearOption: {
      padding: 16,
      borderBottomWidth: 1,
    },
    yearText: {
      fontSize: 16,
      textAlign: 'center',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {!showYearPicker ? (
            <>
              {/* Month/Year Header */}
              <View style={[styles.monthYearHeader, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => handleMonthChange(-1)}
                >
                  <MaterialIcons name="chevron-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowYearPicker(true)}>
                  <Text style={[styles.monthYearText, { color: theme.colors.text }]}>
                    {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => handleMonthChange(1)}
                >
                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Weekdays */}
              <View style={[styles.weekdaysContainer, { borderBottomColor: theme.colors.border }]}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <View key={index} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayText, { color: theme.colors.muted }]}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar */}
              <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card }]}>
                {renderCalendar()}
              </View>
            </>
          ) : (
            /* Year Picker */
            <View style={styles.yearPickerContainer}>
              <View style={[styles.monthYearHeader, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity style={styles.navButton} onPress={() => setShowYearPicker(false)}>
                  <MaterialIcons name="chevron-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.monthYearText, { color: theme.colors.text }]}>Select Year</Text>
                <View style={styles.navButton} />
              </View>
              <ScrollView style={styles.yearScrollView}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearOption, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text style={[styles.yearText, { color: theme.colors.text }]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Button variant="outline" onPress={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onPress={handleConfirm}>
              Confirm
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedDatePicker;