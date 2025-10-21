import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';

interface RadioButtonProps {
  label: string;
  value: string;
  onValueChange: () => void;
  selected: boolean;
  icon?: string;
  color?: string;
  style?: ViewStyle;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  value,
  onValueChange,
  selected,
  icon,
  color,
  style,
}) => {
  const { theme } = useTheme();

  const actualColor = color || theme.colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: selected ? actualColor + '20' : theme.colors.card,
          borderColor: selected ? actualColor : theme.colors.border,
        },
        style,
      ]}
      onPress={onValueChange}
      activeOpacity={0.7}
    >
      <View style={styles.radioButton}>
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: actualColor,
              backgroundColor: selected ? actualColor : 'transparent',
            },
          ]}
        >
          {selected && (
            <View
              style={[
                styles.radioDot,
                {
                  backgroundColor: '#ffffff',
                },
              ]}
            />
          )}
        </View>
      </View>

      {icon && (
        <Icon
          name={icon}
          size={20}
          color={selected ? actualColor : theme.colors.text}
          style={styles.icon}
        />
      )}

      <Text
        style={[
          styles.label,
          {
            color: selected ? actualColor : theme.colors.text,
            fontWeight: selected ? '600' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  radioButton: {
    marginRight: 12,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
});