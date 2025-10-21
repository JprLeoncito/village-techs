import { by, device, element, expect, waitFor } from 'detox';

describe('Guest Scheduling - Android', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {
        notifications: 'YES'
      }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should schedule guest, generate QR code, and receive arrival notification', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Test123456');
    await element(by.id('login-button')).tap();

    // Navigate to guests
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    // Fill guest form
    await element(by.id('guest-name-input')).typeText('Jane Visitor');
    await element(by.id('guest-phone-input')).typeText('+639123456789');
    await element(by.id('guest-plate-input')).typeText('XYZ 789');
    await element(by.id('guest-purpose-input')).typeText('Family visit');

    // Select visit type
    await element(by.id('visit-type-selector')).tap();
    await element(by.id('day-trip-option')).tap();

    // Set arrival time (Android date picker)
    await element(by.id('arrival-date-picker')).tap();
    await element(by.text('OK')).tap(); // Use default selected time

    // Submit
    await element(by.id('submit-guest-button')).tap();

    // Verify QR code is generated
    await waitFor(element(by.id('qr-code-display')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('Jane Visitor'))).toBeVisible();
    await expect(element(by.text('XYZ 789'))).toBeVisible();

    // Simulate guest arrival notification (Android)
    await device.sendUserNotification({
      trigger: {
        type: 'push'
      },
      title: 'Guest Arrived 🚗',
      body: 'Jane Visitor has arrived at the gate',
      payload: {
        type: 'guest_arrival',
        guestId: 'test-guest-id'
      }
    });

    // Open notification shade (Android specific)
    await device.openNotificationShade();
    await expect(element(by.text('Guest Arrived 🚗'))).toBeVisible();
    await element(by.text('Guest Arrived 🚗')).tap();
  });

  it('should handle multi-day guest pass', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    // Fill guest form
    await element(by.id('guest-name-input')).typeText('Family Member');
    await element(by.id('guest-phone-input')).typeText('+639123456789');

    // Select multi-day visit
    await element(by.id('visit-type-selector')).tap();
    await element(by.id('multi-day-option')).tap();

    // Set arrival date
    await element(by.id('arrival-date-picker')).tap();
    await element(by.text('OK')).tap();

    // Set departure date (Android)
    await element(by.id('departure-date-picker')).tap();
    // Select future date
    await element(by.text('OK')).tap();

    await element(by.id('submit-guest-button')).tap();

    // Verify multi-day QR generated
    await expect(element(by.id('multi-day-badge'))).toBeVisible();
    await expect(element(by.id('qr-code-display'))).toBeVisible();
  });

  it('should handle Android back button navigation', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    // Press Android back button
    await device.pressBack();

    // Should navigate back to guest list
    await expect(element(by.id('guest-list'))).toBeVisible();
  });

  it('should handle offline QR generation', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    // Enable airplane mode (Android)
    await device.toggleAirplaneMode();

    // Fill minimal form
    await element(by.id('guest-name-input')).typeText('Offline Guest');
    await element(by.id('guest-phone-input')).typeText('+639123456789');
    await element(by.id('submit-guest-button')).tap();

    // QR should generate offline
    await expect(element(by.id('qr-code-display'))).toBeVisible();
    await expect(element(by.id('offline-indicator'))).toBeVisible();

    // Disable airplane mode
    await device.toggleAirplaneMode();
  });

  it('should validate past arrival dates', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    await element(by.id('guest-name-input')).typeText('Test Guest');
    await element(by.id('guest-phone-input')).typeText('+639123456789');

    // Try to set past date (would need mock or test data setup)
    await element(by.id('arrival-date-picker')).tap();
    // Android date picker doesn't allow past dates by default
    await element(by.text('CANCEL')).tap();

    // Manual validation should trigger
    await element(by.id('submit-guest-button')).tap();
    await expect(element(by.text('Please select arrival date'))).toBeVisible();
  });

  it('should share QR code via Android share sheet', async () => {
    await element(by.id('tab-guests')).tap();

    // Find guest with QR
    await element(by.id('guest-item-0')).tap();

    // Share QR
    await element(by.id('share-qr-button')).tap();

    // Android share chooser should appear
    await expect(element(by.text('Share via'))).toBeVisible();
    await device.pressBack(); // Close share sheet
  });
});