// src/utils/speech.js

export const speak = (text) => {
  return new Promise((resolve) => { // Return a promise
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);

    utter.onend = () => resolve(); // resolve when speech ends

    synth.speak(utter);
  });
};


export const listen = (onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript.toLowerCase();
    onResult(result);
  };

  recognition.onerror = (event) => onError(event.error);
};

