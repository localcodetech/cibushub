// 850 -> "850 m", 2140 -> "2.1 km"
export const formatDistance = (metres) => {
  if (metres === null || metres === undefined) {
    return "";
  }
  if (metres < 1000) {
    return Math.round(metres) + " m";
  }
  return (metres / 1000).toFixed(1) + " km";
};
