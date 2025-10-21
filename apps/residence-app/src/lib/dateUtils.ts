/**
 * Simple date utility functions to replace date-fns dependency
 */

/**
 * Format date to readable string (e.g., "Jan 15, 2024")
 */
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format time to readable string (e.g., "3:30 PM")
 */
export const formatTime = (timeString: string): string => {
  // If it's already a time string like "14:30:00"
  const time = timeString.includes(':') ? timeString : `2000-01-01T${timeString}`;
  const d = new Date(time);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatDistanceToNow = (date: string | Date, options?: { addSuffix?: boolean }): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Simple fallback for Intl.RelativeTimeFormat
  const formatRelative = (value: number, unit: string): string => {
    const suffix = diffMs < 0 ? 'in ' : '';
    const pastSuffix = options?.addSuffix ? ' ago' : '';

    if (diffMs < 0) {
      return `in ${Math.abs(value)} ${unit}${Math.abs(value) !== 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(value)} ${unit}${Math.abs(value) !== 1 ? 's' : ''}${pastSuffix}`;
    }
  };

  if (Math.abs(diffSeconds) < 60) {
    return formatRelative(diffSeconds, 'second');
  } else if (Math.abs(diffMinutes) < 60) {
    return formatRelative(diffMinutes, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return formatRelative(diffHours, 'hour');
  } else if (Math.abs(diffDays) < 7) {
    return formatRelative(diffDays, 'day');
  } else if (Math.abs(diffWeeks) < 4) {
    return formatRelative(diffWeeks, 'week');
  } else if (Math.abs(diffMonths) < 12) {
    return formatRelative(diffMonths, 'month');
  } else {
    return formatRelative(diffYears, 'year');
  }
};

/**
 * Check if date is today
 */
export const isToday = (date: string | Date): boolean => {
  const today = new Date();
  const target = new Date(date);
  return today.toDateString() === target.toDateString();
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date: string | Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  return tomorrow.toDateString() === target.toDateString();
};

/**
 * Get relative date label (Today, Tomorrow, or formatted date)
 */
export const getRelativeDateLabel = (date: string | Date): string => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDate(date);
};