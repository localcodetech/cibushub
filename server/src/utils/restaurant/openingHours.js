

const GHANA_TIME_ZONE = "Africa/Accra";
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "18:30" or "18:30:00" -> 1110 (minutes after midnight)
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

// Which day it is and what time it is in Ghana, whatever the server's clock zone
export const getGhanaDayAndTime = (moment = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GHANA_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(moment);

  const findPart = (type) => parts.find((part) => part.type === type).value;

  return {
    dayOfWeek: WEEKDAY_NAMES.indexOf(findPart("weekday")),
    minutesNow: Number(findPart("hour")) * 60 + Number(findPart("minute")),
  };
};

export const isWithinOpeningHours = (openingHours, moment = new Date()) => {
  const { dayOfWeek, minutesNow } = getGhanaDayAndTime(moment);
  const yesterday = (dayOfWeek + 6) % 7;

  const todayHours = openingHours.find((day) => day.dayOfWeek === dayOfWeek);
  const yesterdayHours = openingHours.find((day) => day.dayOfWeek === yesterday);

  // Today's hours, e.g. 08:00-22:00, or the evening part of 18:00-02:00
  if (todayHours && !todayHours.isClosed) {
    const opens = timeToMinutes(todayHours.opensAt);
    const closes = timeToMinutes(todayHours.closesAt);
    const crossesMidnight = closes < opens;

    if (!crossesMidnight && minutesNow >= opens && minutesNow < closes) {
      return true;
    }
    if (crossesMidnight && minutesNow >= opens) {
      return true;
    }
  }

  // Yesterday's late hours that run past midnight, e.g. 00:00-02:00 of 18:00-02:00
  if (yesterdayHours && !yesterdayHours.isClosed) {
    const opens = timeToMinutes(yesterdayHours.opensAt);
    const closes = timeToMinutes(yesterdayHours.closesAt);
    const crossesMidnight = closes < opens;

    if (crossesMidnight && minutesNow < closes) {
      return true;
    }
  }

  return false;
};

export const isRestaurantOpen = (restaurant, moment = new Date()) => {
  if (!restaurant.isAcceptingOrders) {
    return false;
  }

  return isWithinOpeningHours(restaurant.openingHours || [], moment);
};
