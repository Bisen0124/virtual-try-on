import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

// 3D Glasses component
function Glasses3D({ glassesPos }) {
  const { scene } = useGLTF("/glasses/black.glb");
  const ref = useRef();

  
  useFrame(() => {
    if (glassesPos && ref.current) {
      // Map video pixel coordinates to Three.js orthographic plane
      const x = glassesPos.x - 640 / 2; // center video
      const y = -(glassesPos.y - 480 / 2); // invert y axis
      const z = 0; // in front of camera

      ref.current.position.set(x, y, z);
      const scale = glassesPos.width * 1.2; // adjust for GLB size
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return <primitive ref={ref} object={scene} />;
}

// Main Try-On Component
function TryOnGlasses() {
  const videoRef = useRef(null);
  const [glassesPos, setGlassesPos] = useState(null);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setGlassesPos(null);
        return;
      }

      const landmarks = results.multiFaceLandmarks[0];
      if (!landmarks[33] || !landmarks[263]) return;

      const leftEye = landmarks[33];
      const rightEye = landmarks[263];

      const midX = (leftEye.x + rightEye.x) / 2 * 640;
      const midY = (leftEye.y + rightEye.y) / 2 * 480;
      const eyeDist = Math.hypot(
        (rightEye.x - leftEye.x) * 640,
        (rightEye.y - leftEye.y) * 480
      );

      setGlassesPos({
        x: midX,
        y: midY,
        width: eyeDist,
      });
    });

    const cam = new Camera(videoRef.current, {
      onFrame: async () => await faceMesh.send({ image: videoRef.current }),
      width: 640,
      height: 480,
    });
    cam.start();
  }, []);

  return (
    <div style={{ width: 640, height: 480, position: "relative" }}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={640}
        height={480}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      />

      {/* 3D Canvas */}
      <Canvas
        orthographic
        camera={{ left: -320, right: 320, top: 240, bottom: -240, near: -100, far: 1000, position: [0, 0, 10] }}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[0, 0, 10]} />
        {glassesPos && <Glasses3D glassesPos={glassesPos} />}
      </Canvas>
    </div>
  );
}

export default TryOnGlasses;
