import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = ({
  label,
  error,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) => {
  const { theme } = useTheme();

  const backgroundColor = theme.colors.background;
  const borderColor = error ? theme.colors.error : theme.colors.border;
  const textColor = theme.colors.text;
  const placeholderColor = theme.colors.muted;

  const containerStyles = {
    ...styles.container,
    ...containerStyle,
  };

  const inputContainerStyles = {
    ...styles.inputContainer,
    backgroundColor,
    borderColor,
    borderWidth: 1,
    ...(error && styles.errorInput),
  };

  const inputStyles = {
    ...styles.input,
    color: textColor,
    ...inputStyle,
    ...style,
  };

  const labelStyles = {
    ...styles.label,
    color: textColor,
  };

  const errorStyles = {
    ...styles.error,
    color: theme.colors.error,
  };

  return (
    <View style={containerStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      <View style={inputContainerStyles}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={inputStyles}
          placeholderTextColor={placeholderColor}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={errorStyles}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  errorInput: {
    borderColor: '#ef4444',
  },
  error: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});