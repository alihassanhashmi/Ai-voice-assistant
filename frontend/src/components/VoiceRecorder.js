import React, { useState, useRef } from "react";

export default function VoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const response = await fetch("http://127.0.0.1:8000/api/v1/voice/stt", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setTranscript(data.text);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div className="p-4 border rounded-xl shadow-md">
      <button
        onClick={recording ? stopRecording : startRecording}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {transcript && (
        <p className="mt-4 text-gray-700">
          <strong>Transcript:</strong> {transcript}
        </p>
      )}
    </div>
  );
}
