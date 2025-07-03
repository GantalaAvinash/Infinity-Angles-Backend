// Date utility functions
class DateUtils {
  // Get relative time string (e.g., "5 min ago", "2 hours ago")
  static getRelativeTime(date) {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  // Format date to ISO string
  static toISOString(date) {
    return new Date(date).toISOString();
  }

  // Check if date is valid
  static isValidDate(date) {
    return date instanceof Date && !isNaN(date);
  }

  // Get start of day
  static getStartOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Get end of day
  static getEndOfDay(date = new Date()) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}

module.exports = DateUtils;
