import { by, device, element, expect, waitFor } from 'detox';

describe('Sticker Request - Android', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {
        camera: 'YES',
        photos: 'YES',
        notifications: 'YES'
      }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should request sticker offline, sync online, and receive approval notification', async () => {
    // Login first
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Test123456');
    await element(by.id('login-button')).tap();

    // Navigate to stickers
    await element(by.id('tab-stickers')).tap();
    await element(by.id('request-sticker-button')).tap();

    // Enable airplane mode (offline) - Android specific
    await device.toggleAirplaneMode();

    // Fill sticker request form
    await element(by.id('member-selector')).tap();
    await element(by.text('John Doe')).tap();

    await element(by.id('vehicle-plate-input')).typeText('ABC 123');
    await element(by.id('vehicle-make-input')).typeText('Honda');
    await element(by.id('vehicle-model-input')).typeText('Civic');
    await element(by.id('vehicle-color-input')).typeText('Blue');

    await element(by.id('vehicle-type-selector')).tap();
    await element(by.text('Car')).tap();

    // Upload document (mock) - Android specific camera permission
    await element(by.id('document-upload-button')).tap();
    await element(by.text('Take Photo')).tap();

    // Android back button handling
    if (device.getPlatform() === 'android') {
      await device.pressBack();
    }

    // Submit request (should queue offline)
    await element(by.id('submit-request-button')).tap();

    // Verify offline queue message
    await expect(element(by.text('Request Queued'))).toBeVisible();
    await element(by.text('OK')).tap();

    // Disable airplane mode (go online) - Android specific
    await device.toggleAirplaneMode();

    // Wait for sync
    await waitFor(element(by.id('sync-indicator')))
      .toHaveText('Synced')
      .withTimeout(10000);

    // Simulate approval from backend - Android notification
    await device.sendUserNotification({
      trigger: {
        type: 'push'
      },
      title: 'Sticker Approved! 🎉',
      body: 'Your sticker for ABC 123 has been approved',
      payload: {
        type: 'sticker_approved',
        stickerId: 'test-sticker-id'
      }
    });

    // Verify notification appears in notification tray
    await device.openNotificationShade();
    await expect(element(by.text('Sticker Approved! 🎉'))).toBeVisible();
    await element(by.text('Sticker Approved! 🎉')).tap();

    // Verify sticker status
    await expect(element(by.text('APPROVED'))).toBeVisible();
    await expect(element(by.text('ABC 123'))).toBeVisible();
  });

  it('should validate document upload size limit', async () => {
    await element(by.id('tab-stickers')).tap();
    await element(by.id('request-sticker-button')).tap();

    // Try to upload large file (>5MB)
    await element(by.id('document-upload-button')).tap();
    await element(by.text('Browse Files')).tap();

    // Mock large file selection
    // This would be handled by test data setup

    await expect(element(by.text('File Too Large'))).toBeVisible();
  });

  it('should handle Android back button navigation', async () => {
    await element(by.id('tab-stickers')).tap();
    await element(by.id('request-sticker-button')).tap();

    // Press Android back button
    await device.pressBack();

    // Should navigate back to sticker list
    await expect(element(by.id('sticker-list'))).toBeVisible();
  });

  it('should check duplicate plate numbers', async () => {
    await element(by.id('tab-stickers')).tap();
    await element(by.id('request-sticker-button')).tap();

    // Enter existing plate number
    await element(by.id('vehicle-plate-input')).typeText('ABC 123');
    await element(by.id('vehicle-make-input')).typeText('Toyota');
    await element(by.id('submit-request-button')).tap();

    await expect(element(by.text('Duplicate Plate Number'))).toBeVisible();
    await expect(element(by.text('This vehicle plate is already registered'))).toBeVisible();
  });
});