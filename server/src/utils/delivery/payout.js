// What the rider earns for a finished delivery, in whole pesewas [AC-RIDER-07].
// percent: 100 for a normal delivery, 150 for a returned one (DELIVERY_RULES.returnPayoutPercent)
export const riderPayoutFor = (riderEarningsPesewas, percent = 100) => {
  return Math.round((riderEarningsPesewas * percent) / 100);
};
