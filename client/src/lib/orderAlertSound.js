// The "new order" sound on the owner's board [AC-RORD-01].
//
// Browsers stay silent until the person has tapped the page, so the board shows an
// "Turn on sound" button. Its tap creates the AudioContext (the browser's speaker),
// and from then on new orders can ding.
// The sound is made in code (two short beeps), so there is no audio file to download.

let speaker = null;

// Call from a tap. Returns true if sound is now on.
export const turnOnAlertSound = async () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return false;
  }
  if (!speaker) {
    speaker = new AudioContextClass();
  }
  await speaker.resume();
  playNewOrderSound();
  return speaker.state === "running";
};

export const isAlertSoundOn = () => speaker !== null && speaker.state === "running";

// One beep: a tone that fades out, starting `startAt` seconds from now
const beep = (startAt, frequency) => {
  const tone = speaker.createOscillator();
  const volume = speaker.createGain();
  const start = speaker.currentTime + startAt;

  tone.type = "sine";
  tone.frequency.value = frequency;
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

  tone.connect(volume);
  volume.connect(speaker.destination);
  tone.start(start);
  tone.stop(start + 0.4);
};

// "Ding-ding": does nothing if sound wasn't turned on
export const playNewOrderSound = () => {
  if (!isAlertSoundOn()) {
    return;
  }
  beep(0, 880);
  beep(0.25, 1175);
};
