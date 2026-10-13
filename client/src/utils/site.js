// Which site this is. The same build runs on all of them (see docs/deployment.md):
//   cibushubgh.com (and www.)  the real site
//   demo.cibushubgh.com        the demo: made-up restaurants, Paystack test mode
//   localhost / dev.           development, with the demo data
const REAL_SITE_HOSTS = ["cibushubgh.com", "www.cibushubgh.com"];

export const isRealSite = REAL_SITE_HOSTS.includes(window.location.hostname);

// Shows the "Demo" banner
export const isDemoSite = window.location.hostname.startsWith("demo.");
