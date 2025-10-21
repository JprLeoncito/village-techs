import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GuestScheduleForm from '../GuestScheduleForm';
import { Alert } from 'react-native';

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('GuestScheduleForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate arrival time is not in the past', async () => {
    const { getByTestId, getByText } = render(
      <GuestScheduleForm onSubmit={mockOnSubmit} />
    );

    // Set past date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    fireEvent.changeText(getByTestId('guest-name-input'), 'John Smith');
    fireEvent.changeText(getByTestId('guest-phone-input'), '+639123456789');
    fireEvent.changeText(getByTestId('guest-plate-input'), 'XYZ 789');

    // Mock date picker to set past date
    fireEvent.press(getByTestId('arrival-date-picker'));
    fireEvent(getByTestId('arrival-date-picker'), 'onConfirm', yesterday);

    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Date',
        'Arrival time cannot be in the past'
      );
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    const { getByTestId } = render(
      <GuestScheduleForm onSubmit={mockOnSubmit} />
    );

    // Submit without filling required fields
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        expect.stringContaining('required')
      );
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate phone number format', async () => {
    const { getByTestId } = render(
      <GuestScheduleForm onSubmit={mockOnSubmit} />
    );

    fireEvent.changeText(getByTestId('guest-name-input'), 'John Smith');
    fireEvent.changeText(getByTestId('guest-phone-input'), 'invalid-phone');
    fireEvent.changeText(getByTestId('guest-plate-input'), 'XYZ 789');

    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Phone',
        'Please enter a valid phone number'
      );
    });
  });

  it('should handle multi-day visit dates correctly', async () => {
    const { getByTestId } = render(
      <GuestScheduleForm onSubmit={mockOnSubmit} />
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    fireEvent.changeText(getByTestId('guest-name-input'), 'John Smith');
    fireEvent.changeText(getByTestId('guest-phone-input'), '+639123456789');
    fireEvent.changeText(getByTestId('guest-plate-input'), 'XYZ 789');
    fireEvent.changeText(getByTestId('guest-purpose-input'), 'Family visit');

    // Set visit type to multi-day
    fireEvent.press(getByTestId('visit-type-selector'));
    fireEvent.press(getByTestId('multi-day-option'));

    // Set arrival date
    fireEvent.press(getByTestId('arrival-date-picker'));
    fireEvent(getByTestId('arrival-date-picker'), 'onConfirm', tomorrow);

    // Set departure date
    fireEvent.press(getByTestId('departure-date-picker'));
    fireEvent(getByTestId('departure-date-picker'), 'onConfirm', dayAfter);

    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          guestName: 'John Smith',
          guestPhone: '+639123456789',
          vehiclePlate: 'XYZ 789',
          purpose: 'Family visit',
          visitType: 'multi-day',
          arrivalDate: tomorrow,
          departureDate: dayAfter,
        })
      );
    });
  });

  it('should validate departure date is after arrival date', async () => {
    const { getByTestId } = render(
      <GuestScheduleForm onSubmit={mockOnSubmit} />
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const today = new Date();

    // Set visit type to multi-day
    fireEvent.press(getByTestId('visit-type-selector'));
    fireEvent.press(getByTestId('multi-day-option'));

    // Set arrival date to tomorrow
    fireEvent.press(getByTestId('arrival-date-picker'));
    fireEvent(getByTestId('arrival-date-picker'), 'onConfirm', tomorrow);

    // Set departure date to today (before arrival)
    fireEvent.press(getByTestId('departure-date-picker'));
    fireEvent(getByTestId('departure-date-picker'), 'onConfirm', today);

    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Dates',
        'Departure date must be after arrival date'
      );
    });
  });
});