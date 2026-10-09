// Adds an outside script (Google's or Apple's sign-in code) to the page once.
// Returns a promise that finishes when the script has loaded.
// Calling it again with the same address reuses the first download.
const loadedScripts = {};

export const loadScript = (src) => {
  if (!loadedScripts[src]) {
    loadedScripts[src] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Let a later call try again (e.g. the internet came back)
        delete loadedScripts[src];
        reject(new Error("Could not load " + src));
      };
      document.head.appendChild(script);
    });
  }
  return loadedScripts[src];
};
