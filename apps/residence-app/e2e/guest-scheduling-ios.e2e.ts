import { by, device, element, expect, waitFor } from 'detox';

describe('Guest Scheduling - iOS', () => {
  beforeAll(async () => {
    await device.launchApp();
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

    // Set arrival time (future)
    await element(by.id('arrival-date-picker')).tap();
    // iOS date picker interaction
    await element(by.type('UIPickerView')).setColumnToValue(0, 'Tomorrow');
    await element(by.type('UIPickerView')).setColumnToValue(1, '10:00 AM');
    await element(by.text('Done')).tap();

    // Submit
    await element(by.id('submit-guest-button')).tap();

    // Verify QR code is generated
    await waitFor(element(by.id('qr-code-display')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('Jane Visitor'))).toBeVisible();
    await expect(element(by.text('XYZ 789'))).toBeVisible();

    // Simulate guest arrival notification
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

    // Verify notification appears
    await expect(element(by.text('Guest Arrived 🚗'))).toBeVisible();
  });

  it('should handle offline guest scheduling with sync', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('schedule-guest-button')).tap();

    // Enable airplane mode (offline)
    await device.setURLBlacklist(['.*']);

    // Fill guest form
    await element(by.id('guest-name-input')).typeText('Bob Visitor');
    await element(by.id('guest-phone-input')).typeText('+639123456789');
    await element(by.id('submit-guest-button')).tap();

    // Verify queued message
    await expect(element(by.text('Guest Queued'))).toBeVisible();
    await element(by.text('OK')).tap();

    // QR should still be generated locally
    await expect(element(by.id('qr-code-display'))).toBeVisible();

    // Disable airplane mode (go online)
    await device.clearURLBlacklist();

    // Wait for sync
    await waitFor(element(by.id('sync-indicator')))
      .toHaveText('Synced')
      .withTimeout(10000);
  });

  it('should edit scheduled guest', async () => {
    await element(by.id('tab-guests')).tap();

    // Find scheduled guest
    await element(by.id('guest-item-0')).tap();
    await element(by.id('edit-guest-button')).tap();

    // Update details
    await element(by.id('guest-phone-input')).clearText();
    await element(by.id('guest-phone-input')).typeText('+639987654321');

    await element(by.id('save-changes-button')).tap();

    // Verify changes saved
    await expect(element(by.text('Guest Updated'))).toBeVisible();
    await expect(element(by.text('+639987654321'))).toBeVisible();
  });

  it('should cancel scheduled guest', async () => {
    await element(by.id('tab-guests')).tap();

    // Find scheduled guest
    await element(by.id('guest-item-0')).tap();

    // Cancel guest
    await element(by.id('cancel-guest-button')).tap();
    await element(by.text('Yes, Cancel')).tap();

    // Verify cancelled
    await expect(element(by.text('Guest Cancelled'))).toBeVisible();
    await expect(element(by.id('cancelled-badge'))).toBeVisible();
  });

  it('should share QR code', async () => {
    await element(by.id('tab-guests')).tap();
    await element(by.id('guest-item-0')).tap();

    // Share QR
    await element(by.id('share-qr-button')).tap();

    // iOS share sheet should appear
    await expect(element(by.type('UIActivityViewController'))).toBeVisible();
    await element(by.text('Cancel')).tap();
  });
});