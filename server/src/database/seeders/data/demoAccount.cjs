const { TERMS_VERSION } = require("../../../utils/legal.js");

// A demo account that can log in straight away: phone and email already verified, and the
// Terms already accepted. Their @example.com addresses can never receive a code, so on
// demo.cibushubgh.com they would otherwise be stuck on "verify your email".
const verifiedDemoAccount = (now) => ({
  phoneVerifiedAt: now,
  emailVerifiedAt: now,
  termsAcceptedAt: now,
  termsVersion: TERMS_VERSION,
});

module.exports = { verifiedDemoAccount };
