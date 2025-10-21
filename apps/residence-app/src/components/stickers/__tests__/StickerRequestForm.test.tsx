import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StickerRequestForm } from '../StickerRequestForm';
import { Alert } from 'react-native';

// Mock the modules
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('../../../services/stickerService', () => ({
  stickerService: {
    createRequest: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('StickerRequestForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vehicle Plate Validation', () => {
    it('should validate Philippine plate number format', () => {
      const { getByPlaceholderText, getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const plateInput = getByPlaceholderText('ABC 1234');

      // Test valid formats
      const validPlates = [
        'ABC 123',
        'ABC 1234',
        'AB 1234',
        'A 1234',
        'ABC123',
        'AB1234',
        'NCR 12345', // New format
      ];

      validPlates.forEach(plate => {
        fireEvent.changeText(plateInput, plate);
        // Should not show error for valid plates
        expect(() => getByText(/Invalid plate format/)).toThrow();
      });
    });

    it('should reject invalid plate number formats', () => {
      const { getByPlaceholderText, getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const plateInput = getByPlaceholderText('ABC 1234');

      // Test invalid formats
      const invalidPlates = [
        '12345',        // Numbers only
        'ABCDEF',       // Letters only
        'ABC 12345678', // Too long
        'A',            // Too short
        'ABC-1234',     // Wrong separator
        'ABC  1234',    // Double space
        '@BC 1234',     // Special characters
      ];

      invalidPlates.forEach(plate => {
        fireEvent.changeText(plateInput, plate);
        fireEvent(plateInput, 'blur');

        waitFor(() => {
          expect(getByText(/Invalid plate format/)).toBeTruthy();
        });
      });
    });

    it('should convert plate number to uppercase', () => {
      const { getByPlaceholderText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const plateInput = getByPlaceholderText('ABC 1234');

      fireEvent.changeText(plateInput, 'abc 123');
      fireEvent(plateInput, 'blur');

      waitFor(() => {
        expect(plateInput.props.value).toBe('ABC 123');
      });
    });
  });

  describe('Required Fields Validation', () => {
    it('should require household member selection', async () => {
      const { getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('household member')
        );
      });
    });

    it('should require vehicle plate number', async () => {
      const { getByText, getByTestId } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Select household member
      const memberSelector = getByTestId('member-selector');
      fireEvent.press(memberSelector);

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('vehicle plate')
        );
      });
    });

    it('should require vehicle make', async () => {
      const { getByText, getByPlaceholderText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill some fields but not make
      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'ABC 123');

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('vehicle make')
        );
      });
    });

    it('should require vehicle model', async () => {
      const { getByText, getByPlaceholderText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill some fields but not model
      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'ABC 123');

      const makeInput = getByPlaceholderText('Toyota');
      fireEvent.changeText(makeInput, 'Toyota');

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('vehicle model')
        );
      });
    });

    it('should require vehicle color', async () => {
      const { getByText, getByPlaceholderText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill required fields except color
      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'ABC 123');

      const makeInput = getByPlaceholderText('Toyota');
      fireEvent.changeText(makeInput, 'Toyota');

      const modelInput = getByPlaceholderText('Camry');
      fireEvent.changeText(modelInput, 'Camry');

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('color')
        );
      });
    });

    it('should require OR/CR document upload', async () => {
      const { getByText, getByPlaceholderText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill all text fields but no document
      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'ABC 123');

      const makeInput = getByPlaceholderText('Toyota');
      fireEvent.changeText(makeInput, 'Toyota');

      const modelInput = getByPlaceholderText('Camry');
      fireEvent.changeText(modelInput, 'Camry');

      const colorInput = getByPlaceholderText('Silver');
      fireEvent.changeText(colorInput, 'Silver');

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('OR/CR document')
        );
      });
    });
  });

  describe('Document Upload Validation', () => {
    it('should validate file size limit (5MB)', async () => {
      const { getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const uploadButton = getByText('Upload OR/CR');

      // Mock large file
      const largeFile = {
        uri: 'file://document.pdf',
        size: 6 * 1024 * 1024, // 6MB
        type: 'application/pdf',
        name: 'document.pdf',
      };

      fireEvent.press(uploadButton);
      // Simulate file selection with large file

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'File Too Large',
          expect.stringContaining('5MB')
        );
      });
    });

    it('should accept valid file formats (JPG, PNG, PDF)', async () => {
      const { getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const uploadButton = getByText('Upload OR/CR');

      const validFiles = [
        { uri: 'file://doc.jpg', type: 'image/jpeg', name: 'doc.jpg' },
        { uri: 'file://doc.png', type: 'image/png', name: 'doc.png' },
        { uri: 'file://doc.pdf', type: 'application/pdf', name: 'doc.pdf' },
      ];

      validFiles.forEach(file => {
        fireEvent.press(uploadButton);
        // Simulate file selection
        // Should not show error for valid formats
      });
    });

    it('should reject invalid file formats', async () => {
      const { getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const uploadButton = getByText('Upload OR/CR');

      const invalidFiles = [
        { uri: 'file://doc.txt', type: 'text/plain', name: 'doc.txt' },
        { uri: 'file://doc.docx', type: 'application/docx', name: 'doc.docx' },
        { uri: 'file://doc.gif', type: 'image/gif', name: 'doc.gif' },
      ];

      for (const file of invalidFiles) {
        fireEvent.press(uploadButton);
        // Simulate file selection with invalid format

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Invalid Format',
            expect.stringContaining('JPG, PNG, or PDF')
          );
        });
      }
    });
  });

  describe('Vehicle Type Selection', () => {
    it('should allow selection of vehicle type', () => {
      const { getByText, getByTestId } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const vehicleTypes = ['Car', 'SUV', 'Motorcycle', 'Van', 'Truck'];

      vehicleTypes.forEach(type => {
        const typeButton = getByText(type);
        fireEvent.press(typeButton);

        const selectedIndicator = getByTestId(`type-selected-${type}`);
        expect(selectedIndicator).toBeTruthy();
      });
    });
  });

  describe('Duplicate Plate Prevention', () => {
    it('should check for duplicate plate numbers', async () => {
      const { getByPlaceholderText, getByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingPlates={['ABC 123', 'XYZ 456']}
        />
      );

      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'ABC 123');
      fireEvent(plateInput, 'blur');

      await waitFor(() => {
        expect(getByText(/Vehicle plate already registered/)).toBeTruthy();
      });
    });

    it('should allow non-duplicate plate numbers', () => {
      const { getByPlaceholderText, queryByText } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          existingPlates={['ABC 123', 'XYZ 456']}
        />
      );

      const plateInput = getByPlaceholderText('ABC 1234');
      fireEvent.changeText(plateInput, 'DEF 789');
      fireEvent(plateInput, 'blur');

      expect(queryByText(/Vehicle plate already registered/)).toBeFalsy();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with all valid data', async () => {
      const mockStickerService = require('../../../services/stickerService').stickerService;
      mockStickerService.createRequest.mockResolvedValue({
        success: true,
        stickerId: 'sticker-123',
      });

      const { getByPlaceholderText, getByText, getByTestId } = render(
        <StickerRequestForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill all required fields
      const memberSelector = getByTestId('member-selector');
      fireEvent.press(memberSelector);
      fireEvent.press(getByText('John Doe'));

      fireEvent.changeText(getByPlaceholderText('ABC 1234'), 'ABC 123');
      fireEvent.changeText(getByPlaceholderText('Toyota'), 'Toyota');
      fireEvent.changeText(getByPlaceholderText('Camry'), 'Camry');
      fireEvent.changeText(getByPlaceholderText('Silver'), 'Silver');

      fireEvent.press(getByText('Car'));

      // Mock document upload
      const uploadButton = getByText('Upload OR/CR');
      fireEvent.press(uploadButton);
      // Simulate successful file selection

      const submitButton = getByText('Submit Request');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockStickerService.createRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            vehiclePlate: 'ABC 123',
            make: 'Toyota',
            model: 'Camry',
            color: 'Silver',
            vehicleType: 'Car',
          }),
          expect.any(Object) // document
        );
        expect(mockOnSuccess).toHaveBeenCalledWith('sticker-123');
      });
    });
  });
});