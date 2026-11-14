// The browser knows the student's time zone, such as "Africa/Accra". Streaks and daily goals use it.
export function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Every zone the browser knows, with the current one added if the list is missing it.
export function timeZoneList(current) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones.length ? zones : ["UTC"];
}
