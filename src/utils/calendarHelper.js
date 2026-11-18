/**
 * Calendar Integration Helper for 1Line CRM
 * Supports Apple Calendar, Google Calendar, Outlook, and native Android/iOS calendars.
 */

export function formatCalendarDate(dateObj) {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates direct Google Calendar link
 */
export function getGoogleCalendarUrl({ title, description = '', location = '', start, end }) {
  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const startStr = formatCalendarDate(startDate);
  const endStr = formatCalendarDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location,
    dates: `${startStr}/${endStr}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Downloads standard .ics calendar file for mobile (Apple/Android) & Outlook
 */
export function downloadIcsFile({ title, description = '', location = '', start, end, filename = 'viewing-appointment.ics' }) {
  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const startStr = formatCalendarDate(startDate);
  const endStr = formatCalendarDate(endDate);
  const nowStr = formatCalendarDate(new Date());
  const uid = `oneline-viewing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@1line.eg`;

  const cleanText = (str) => String(str || '').replace(/[\r\n]+/g, '\\n').replace(/[,;]/g, '\\$&');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//1Line Solutions//CRM Calendar System//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${cleanText(title)}`,
    `DESCRIPTION:${cleanText(description)}`,
    `LOCATION:${cleanText(location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:تذكير بموعد معاينة عقار 1Line',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
