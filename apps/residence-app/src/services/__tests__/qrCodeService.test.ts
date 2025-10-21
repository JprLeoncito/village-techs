import qrCodeService from '../qrCodeService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('QR Code Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate valid QR code format', () => {
    const guestData = {
      id: 'guest-123',
      household_id: 'house-456',
      guest_name: 'John Smith',
      arrival_date: new Date('2024-12-01T10:00:00'),
      departure_date: new Date('2024-12-01T18:00:00'),
    };

    const qrData = qrCodeService.generateQRData(guestData);
    const parsed = JSON.parse(qrData);

    expect(parsed).toHaveProperty('id', 'guest-123');
    expect(parsed).toHaveProperty('h', 'house-456');
    expect(parsed).toHaveProperty('n', 'John Smith');
    expect(parsed).toHaveProperty('a');
    expect(parsed).toHaveProperty('d');
    expect(parsed).toHaveProperty('v', 1);
  });

  it('should generate unique guest pass ID', () => {
    const id1 = qrCodeService.generatePassId();
    const id2 = qrCodeService.generatePassId();

    // Should be unique
    expect(id1).not.toBe(id2);

    // Should match format GP-XXXXXX
    expect(id1).toMatch(/^GP-[A-Z0-9]{6}$/);
    expect(id2).toMatch(/^GP-[A-Z0-9]{6}$/);
  });

  it('should validate QR code data structure', () => {
    const validQR = JSON.stringify({
      id: 'guest-123',
      h: 'house-456',
      n: 'John Smith',
      a: Date.now(),
      d: Date.now() + 86400000,
      v: 1,
    });

    const invalidQR = JSON.stringify({
      id: 'guest-123',
      // Missing required fields
    });

    expect(qrCodeService.validateQRData(validQR)).toBe(true);
    expect(qrCodeService.validateQRData(invalidQR)).toBe(false);
  });

  it('should check QR code expiry correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const futureQR = JSON.stringify({
      id: 'guest-123',
      h: 'house-456',
      n: 'John Smith',
      a: Date.now(),
      d: futureDate.getTime(),
      v: 1,
    });

    const pastQR = JSON.stringify({
      id: 'guest-123',
      h: 'house-456',
      n: 'John Smith',
      a: Date.now(),
      d: pastDate.getTime(),
      v: 1,
    });

    expect(qrCodeService.isExpired(futureQR)).toBe(false);
    expect(qrCodeService.isExpired(pastQR)).toBe(true);
  });

  it('should encode QR data with compression for multi-day visits', () => {
    const multiDayGuest = {
      id: 'guest-123',
      household_id: 'house-456',
      guest_name: 'John Smith',
      arrival_date: new Date('2024-12-01T10:00:00'),
      departure_date: new Date('2024-12-05T18:00:00'),
      vehicle_plate: 'ABC 123',
      purpose: 'Family visit for holidays',
    };

    const qrData = qrCodeService.generateQRData(multiDayGuest);
    const parsed = JSON.parse(qrData);

    // Check that dates are properly encoded
    const arrivalDate = new Date(parsed.a);
    const departureDate = new Date(parsed.d);

    const daysDiff = Math.ceil(
      (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBe(4); // 5 days visit
  });

  it('should generate share URL for guest pass', async () => {
    const guestId = 'guest-123';
    const mockUrl = `https://village.app/guest/${guestId}`;

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { url: mockUrl },
      error: null,
    });

    const url = await qrCodeService.generateShareUrl(guestId);

    expect(url).toBe(mockUrl);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-guest-url', {
      body: { guestId },
    });
  });

  it('should handle QR generation errors gracefully', () => {
    const invalidData = null;

    expect(() => qrCodeService.generateQRData(invalidData)).toThrow(
      'Invalid guest data for QR generation'
    );
  });

  it('should compress long guest names', () => {
    const longNameGuest = {
      id: 'guest-123',
      household_id: 'house-456',
      guest_name: 'John William Alexander Smith-Johnson III',
      arrival_date: new Date(),
      departure_date: new Date(),
    };

    const qrData = qrCodeService.generateQRData(longNameGuest);
    const parsed = JSON.parse(qrData);

    // Should truncate or abbreviate long names
    expect(parsed.n.length).toBeLessThanOrEqual(30);
  });
});