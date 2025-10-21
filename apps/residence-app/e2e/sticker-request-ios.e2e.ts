import { by, device, element, expect, waitFor } from 'detox';

describe('Sticker Request - iOS', () => {
  beforeAll(async () => {
    await device.launchApp();
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

    // Enable airplane mode (offline)
    await device.setURLBlacklist(['.*']);

    // Fill sticker request form
    await element(by.id('member-selector')).tap();
    await element(by.text('John Doe')).tap();

    await element(by.id('vehicle-plate-input')).typeText('ABC 123');
    await element(by.id('vehicle-make-input')).typeText('Toyota');
    await element(by.id('vehicle-model-input')).typeText('Camry');
    await element(by.id('vehicle-color-input')).typeText('Silver');

    await element(by.id('vehicle-type-selector')).tap();
    await element(by.text('Car')).tap();

    // Upload document (mock)
    await element(by.id('document-upload-button')).tap();
    await element(by.text('Choose from Library')).tap();

    // Submit request (should queue offline)
    await element(by.id('submit-request-button')).tap();

    // Verify offline queue message
    await expect(element(by.text('Request Queued'))).toBeVisible();
    await element(by.text('OK')).tap();

    // Disable airplane mode (go online)
    await device.clearURLBlacklist();

    // Wait for sync
    await waitFor(element(by.id('sync-indicator')))
      .toHaveText('Synced')
      .withTimeout(10000);

    // Simulate approval from backend
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

    // Verify notification appears
    await expect(element(by.text('Sticker Approved! 🎉'))).toBeVisible();

    // Navigate to sticker details
    await element(by.id('view-sticker-button')).tap();

    // Verify sticker status
    await expect(element(by.text('APPROVED'))).toBeVisible();
    await expect(element(by.text('ABC 123'))).toBeVisible();
  });

  it('should validate plate number format', async () => {
    await element(by.id('tab-stickers')).tap();
    await element(by.id('request-sticker-button')).tap();

    // Test invalid plate format
    await element(by.id('vehicle-plate-input')).typeText('INVALID123456');
    await element(by.id('submit-request-button')).tap();

    await expect(element(by.text('Invalid plate format'))).toBeVisible();

    // Test valid plate format
    await element(by.id('vehicle-plate-input')).clearText();
    await element(by.id('vehicle-plate-input')).typeText('AB 1234');

    await expect(element(by.text('Invalid plate format'))).not.toBeVisible();
  });

  it('should handle sticker renewal', async () => {
    await element(by.id('tab-stickers')).tap();

    // Find expiring sticker
    await element(by.id('filter-expiring')).tap();
    await element(by.id('sticker-item-0')).tap();

    // Tap renewal button
    await element(by.id('renew-sticker-button')).tap();

    // Verify form is pre-populated
    await expect(element(by.id('vehicle-plate-input'))).toHaveText('ABC 123');
    await expect(element(by.id('renewal-badge'))).toBeVisible();

    // Submit renewal
    await element(by.id('submit-request-button')).tap();

    await expect(element(by.text('Renewal request submitted'))).toBeVisible();
  });
});