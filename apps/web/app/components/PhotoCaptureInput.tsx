"use client";

import React, { useState, useRef, useEffect } from "react";

interface PhotoCaptureInputProps {
  photoUrl?: string | null;
  onChange: (photoUrl: string | null) => void;
  label?: string;
}

export default function PhotoCaptureInput({
  photoUrl,
  onChange,
  label = "Profile Photo",
}: PhotoCaptureInputProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when modal closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported on this browser or device.");
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOpen(true);

      // Delay attaching stream to ref until modal rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access camera. Please allow camera permissions in your browser.";
      setCameraError(msg);
      setIsCameraOpen(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = 400;
    canvas.height = 400;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const startX = ((video.videoWidth || size) - size) / 2;
      const startY = ((video.videoHeight || size) - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onChange(dataUrl);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read and compress
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          onChange(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label" style={{ marginBottom: 8, display: "block" }}>
        {label}
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {/* Photo Avatar Preview */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            backgroundColor: "var(--color-page, #f3f4f6)",
            border: "2px dashed var(--color-border, #d1d5db)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Profile preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-secondary, #6b7280)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          {/* Camera Button */}
          <button
            type="button"
            onClick={startCamera}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Use Camera</span>
          </button>

          {/* Remove Button */}
          {photoUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn btn-secondary"
              style={{ padding: "6px 10px", fontSize: 12, color: "var(--color-danger-text, #dc2626)" }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Live Camera Capture Modal */}
      {isCameraOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: "100%",
              backgroundColor: "#ffffff",
              padding: 20,
              borderRadius: 16,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>
              Take Picture
            </h3>

            {cameraError ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: "var(--color-danger-text, #dc2626)", fontSize: 13, marginBottom: 12 }}>
                  {cameraError}
                </p>
                <button type="button" onClick={stopCamera} className="btn btn-secondary">
                  Close
                </button>
              </div>
            ) : (
              <div>
                {/* Video Viewport */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 280,
                    backgroundColor: "#000000",
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Mirror effect for natural feel
                    }}
                  />
                  {/* Portrait Oval Frame Guide */}
                  <div
                    style={{
                      position: "absolute",
                      width: 180,
                      height: 220,
                      borderRadius: "50%",
                      border: "2px dashed rgba(255, 255, 255, 0.75)",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        display: "inline-block",
                      }}
                    />
                    <span>Snap Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
