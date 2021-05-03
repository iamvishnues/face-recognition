import "./App.css";
import * as faceapi from "face-api.js";
import React, { useState, useRef, useEffect } from "react";
function App() {
  const [initializing, setInitializing] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";
      setInitializing(true);
      Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL), //heavier/accurate version of tiny face detector
      ]).then(start);
    };
    loadModels();
  }, []);

  const start = () => {
    navigator.getUserMedia(
      { video: {} },
      (stream) => (videoRef.current.srcObject = stream),
      (err) => console.error(err)
    );
    console.log(process.env.PUBLIC_URL);
    // recognizeFaces();
  };

  async function handelVideo() {
    const labeledDescriptors = await loadLabeledImages();
    console.log(labeledDescriptors);
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7);
    console.log(faceMatcher + "<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>..");

    setInterval(async () => {
      if (initializing) {
        setInitializing(false);
      }
      canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
        videoRef.current
      );
      const displaySize = {
        width: videoRef.current.width,
        height: videoRef.current.height,
      };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();
      console.log(detections);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const results = resizedDetections.map((d) => {
        const bestMatch = faceMatcher.findBestMatch(d.descriptor);
        console.log(bestMatch.toString());
        return faceMatcher.findBestMatch(d.descriptor);
      });
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvasRef.current);
      });
    }, 100);
  }

  function loadLabeledImages() {
    const labels = ["Captain America"]; // for WebCam
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(
            process.env.PUBLIC_URL + `/labeled_images/${label}/${i}.jpg`
          );
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          console.log(label + i + JSON.stringify(detections));
          descriptions.push(detections.descriptor);
        }
        // document.body.append(label + " Faces Loaded | ");
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  }

  return (
    <div className="App FaeReco">
      <div className="WebCam_container">
        <video
          autoPlay
          id="videoInput"
          ref={videoRef}
          width="720"
          height="550"
          onPlay={handelVideo}
          muted
        ></video>
        <canvas
          className="Canva_Conatiner"
          width="720"
          height="550"
          ref={canvasRef}
        />
      </div>
      <span>{initializing ? "Initializing" : "Ready"}</span>
      <p>Please ensure the light is right and use clear bakground </p>
    </div>
  );
}

export default App;
