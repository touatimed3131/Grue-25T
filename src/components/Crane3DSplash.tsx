import React, { useEffect, useState } from 'react';

export interface Crane3DSplashProps {
  durationMs?: number;
  onComplete?: () => void;
  showOverlay?: boolean;
  title?: string;
  subtitle?: string;
}

export const Crane3DSplash: React.FC<Crane3DSplashProps> = ({
  durationMs = 3500,
  onComplete,
  showOverlay = true,
  title = 'GRUE 25T',
  subtitle = 'Gestion Chantier & Flotte',
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (elapsed < durationMs) {
        frameId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, onComplete]);

  // Smooth ease-in-out curve
  const rawT = progress / 100;


  // Camera orbit around the crane
  const rotateY = -14 + Math.sin(rawT * Math.PI) * 28;
  const rotateX = 5 - Math.sin(rawT * Math.PI) * 4;
  const scale = 0.94 + rawT * 0.12;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#070B14',
        backgroundImage:
          'radial-gradient(circle at 50% 54%, rgba(245, 158, 11, 0.24) 0%, rgba(15, 23, 42, 0.88) 55%, #05080F 100%)',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '42px 20px',
        perspective: '1100px',
      }}
    >
      {/* Top Luxury Header */}
      {showOverlay && (
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FDE047, #F59E0B)',
              color: '#090D16',
              fontWeight: 900,
              fontSize: '15px',
              letterSpacing: '0.12em',
              boxShadow: '0 0 25px rgba(251, 191, 36, 0.45)',
            }}
          >
            25T MOBILE CRANE
          </span>
          <h1
            style={{
              marginTop: '12px',
              color: '#FFFFFF',
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '0.14em',
              textShadow: '0 4px 20px rgba(0,0,0,0.85)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              marginTop: '4px',
              color: '#FCD34D',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </p>
        </div>
      )}

      {/* Center 3D Orbiting Real Crane with Articulated Hydraulic Boom */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          transition: 'transform 60ms linear',
        }}
      >
        {/* Golden Ground Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            width: '84%',
            height: '26px',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0) 75%)',
            filter: 'blur(8px)',
          }}
        />

              {/* Full Real Crane Image with Cinematic 3D Camera Orbit */}
        <div style={{ position: 'relative', width: '94%', maxHeight: '44vh' }}>
          <img
            src="/crane-real.png"
            alt="Grue Mobile 25T"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 22px 30px rgba(0, 0, 0, 0.85)) contrast(1.06)',
            }}
          />
        </div>

      {/* Bottom Luxury Progress Bar */}
      {showOverlay && (
        <div style={{ width: '100%', maxWidth: '260px', zIndex: 10, textAlign: 'center' }}>
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(251, 191, 36, 0.25)',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #D97706, #FDE047, #F59E0B)',
                borderRadius: '999px',
              }}
            />
          </div>
          <p
            style={{
              marginTop: '10px',
              color: 'rgba(253, 230, 138, 0.85)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default Crane3DSplash;
