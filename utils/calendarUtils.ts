// utils/calendarUtils.ts

interface GoogleCalendarEvent {
  title: string;
  startTime: number; // Unix timestamp
  endTime?: number; // Unix timestamp, defaults to 1 hour after start
  description?: string;
  location?: string;
}

/**
 * Formats a Unix timestamp into Google Calendar's required datetime string (YYYYMMDDTHHMMSSZ).
 * @param timestamp Unix timestamp in milliseconds.
 * @returns Formatted datetime string.
 */
function formatGoogleCalendarTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace(/[-:]|\.\d{3}/g, ''); // Remove hyphens, colons, milliseconds, and Z is already there
}

/**
 * Generates a Google Calendar "add event" URL.
 * @param eventDetails Details for the calendar event.
 * @returns A URL that, when opened, pre-fills a Google Calendar event creation form.
 */
export function generateGoogleCalendarLink(eventDetails: GoogleCalendarEvent): string {
  const { title, startTime, endTime, description, location } = eventDetails;

  const formattedStartTime = formatGoogleCalendarTime(startTime);
  const calculatedEndTime = endTime || (startTime + 60 * 60 * 1000); // Default to 1 hour later
  const formattedEndTime = formatGoogleCalendarTime(calculatedEndTime);

  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  const params = new URLSearchParams();
  params.append('text', title);
  params.append('dates', `${formattedStartTime}/${formattedEndTime}`);
  if (description) {
    params.append('details', description);
  }
  if (location) {
    params.append('location', location);
  }
  params.append('sf', 'true');
  params.append('output', 'xml'); // Or 'js' or 'json' depending on desired output, but 'xml' often works best for a direct link

  return `${baseUrl}&${params.toString()}`;
}
