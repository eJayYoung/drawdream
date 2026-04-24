'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';

interface PanoramaViewerProps {
  imageUrl: string;
  title?: string;
  onClose?: () => void;
  onCapture?: (capturedImageDataUrl: string) => void;
}

export function PanoramaViewer({ imageUrl, title = '360°全景图', onClose, onCapture }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [fov, setFov] = useState(75);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setIsLoaded(true);
    img.onerror = () => console.error('Failed to load panorama image');
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!isLoaded) return;
    renderPanorama();
  }, [isLoaded, rotation, fov]);

  const renderPanorama = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const fovRad = (fov * Math.PI) / 180;
      const halfFov = fovRad / 2;
      const sphereRadius = Math.min(width, height) / (2 * Math.tan(halfFov));

      const imgAspect = img.width / img.height;
      const imgHeight = height;
      const imgWidth = imgHeight * imgAspect;

      const hAngle = (rotation.x * Math.PI) / 180;
      const vAngle = Math.max(-89, Math.min(89, rotation.y)) * (Math.PI / 180);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nx = (x - width / 2) / sphereRadius;
          const ny = (y - height / 2) / sphereRadius;
          const r = Math.sqrt(nx * nx + ny * ny + 1);
          let nx3d = nx / r;
          let ny3d = ny / r;
          const nz3d = 1 / r;

          const cosV = Math.cos(vAngle);
          const sinV = Math.sin(vAngle);
          const nxRot = nx3d;
          const nyRot = ny3d * cosV - nz3d * sinV;
          const nzRot = ny3d * sinV + nz3d * cosV;

          const cosH = Math.cos(-hAngle);
          const sinH = Math.sin(-hAngle);
          const nxFinal = nxRot * cosH + nzRot * sinH;
          const nyFinal = nyRot;
          const nzFinal = -nxRot * sinH + nzRot * cosH;

          let azimuth = Math.atan2(nxFinal, nzFinal);
          let elevation = Math.asin(Math.max(-1, Math.min(1, nyFinal)));

          const u = (azimuth + Math.PI) / (2 * Math.PI);
          const v = (Math.PI / 2 - elevation) / Math.PI;

          const px = Math.floor(u * imgWidth) % imgWidth;
          const py = Math.floor(v * imgHeight);

          if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
            try {
              ctx.drawImage(img, px, py, 1, 1, x, y, 1, 1);
            } catch {
              // ignore out of bounds
            }
          }
        }
      }
    };
    img.src = imageUrl;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastPos.x;
    const deltaY = e.clientY - lastPos.y;
    setRotation(prev => ({ x: prev.x + deltaX * 0.5, y: prev.y - deltaY * 0.5 }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setFov(prev => Math.max(30, Math.min(120, prev + e.deltaY * 0.1)));
  };

  const handleReset = () => {
    setRotation({ x: 0, y: 0 });
    setFov(75);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleCapture = async () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      if (onCapture) onCapture(dataUrl);
    } catch (error) {
      console.error('Failed to capture:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-black/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Camera size={18} className="text-white" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
            <RotateCcw size={14} />重置
          </button>
          <button onClick={handleCapture} disabled={isCapturing} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90 disabled:opacity-50">
            <Download size={14} />截图
          </button>
          <button onClick={toggleFullscreen} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
              <X size={14} />关闭
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="flex-1 cursor-grab active:cursor-grabbing" onWheel={handleWheel} style={{ width: '100%', height: '100%' }} />

      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-black/50 px-4 py-2">
        <div className="text-xs text-white/70">拖动旋转视角 | 滚轮缩放</div>
        <div className="flex items-center gap-4 text-xs text-white/70">
          <span>FOV: {Math.round(fov)}°</span>
          <span>水平: {Math.round(rotation.x % 360)}°</span>
          <span>垂直: {Math.round(rotation.y)}°</span>
        </div>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-sm text-white/70">加载中...</div>
        </div>
      )}
    </div>
  );
}
