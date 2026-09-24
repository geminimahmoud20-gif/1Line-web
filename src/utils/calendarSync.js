// =============================================================
//  1LINE SOLUTIONS CRM - CALENDAR & VIEWING APPOINTMENT SYNC
//  Supports Google Calendar direct URL and Apple/Outlook .ics file download
// =============================================================

/**
 * Format Date to iCalendar / Google UTC format (YYYYMMDDTHHMMSSZ)
 */
function formatDateToIcsString(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates direct URL to open Google Calendar with prefilled appointment details
 */
export function generateGoogleCalendarUrl({
  title = 'معاينة عقارية - 1Line Real Estate',
  description = '',
  location = 'سوهاج، مصر',
  startTime = null,
  durationMinutes = 60
}) {
  const start = startTime ? new Date(startTime) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow by default
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const startFormatted = formatDateToIcsString(start);
  const endFormatted = formatDateToIcsString(end);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location,
    dates: `${startFormatted}/${endFormatted}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an .ics standard calendar file string
 */
export function generateIcsContent({
  title = 'معاينة عقارية مع العميل - 1Line Real Estate',
  description = '',
  location = 'سوهاج، جمهورية مصر العربية',
  startTime = null,
  durationMinutes = 60,
  uid = 'oneline_' + Date.now()
}) {
  const start = startTime ? new Date(startTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = formatDateToIcsString(new Date());

  const cleanDescription = (description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const cleanTitle = (title || '').replace(/,/g, '\\,');
  const cleanLocation = (location || '').replace(/,/g, '\\,');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//1Line Real Estate Solutions//CRM Calendar Sync 2026//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@oneline-sohag.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDateToIcsString(start)}`,
    `DTEND:${formatDateToIcsString(end)}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M', // 1 hour reminder before viewing
    'ACTION:DISPLAY',
    'DESCRIPTION:تذكير بموعد معاينة عقارية 1Line',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Triggers standard browser download of .ics calendar event
 */
export function downloadIcsFile(appointmentData, filename = '1Line-Appointment.ics') {
  if (typeof window === 'undefined') return;

  const icsData = generateIcsContent(appointmentData);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
