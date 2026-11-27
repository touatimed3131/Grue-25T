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
  const easeT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

  // Camera orbit around the crane
  const rotateY = -14 + Math.sin(rawT * Math.PI) * 28;
  const rotateX = 5 - Math.sin(rawT * Math.PI) * 4;
  const scale = 0.94 + rawT * 0.12;

  // Independent hydraulic boom lift angle (rotates upward from turret pivot on the right)
  const boomLiftAngle = easeT * 18; // Lifts up to 18 degrees clearly!

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

        {/* Container holding both Truck Base and Lifting Boom */}
        <div style={{ position: 'relative', width: '94%', maxHeight: '44vh' }}>
          {/* Layer 1: Truck Chassis & Wheels (stays firmly planted on ground) */}
          <img
            src="/crane-real.png"
            alt="Grue Mobile Chassis"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              clipPath: 'polygon(0% 53%, 76% 53%, 76% 40%, 100% 40%, 100% 100%, 0% 100%)',
              filter: 'drop-shadow(0 20px 28px rgba(0, 0, 0, 0.85)) contrast(1.06)',
            }}
          />

          {/* Layer 2: Telescopic Hydraulic Boom (pivots upward smoothly from the rear turret) */}
          <img
            src="/crane-real.png"
            alt="Grue Hydraulic Boom"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: 'auto',
              display: 'block',
              clipPath: 'polygon(0% 0%, 82% 0%, 82% 48%, 74% 55%, 0% 55%)',
              transformOrigin: '78% 46%',
              transform: `rotate(${boomLiftAngle}deg) scaleX(${1 + easeT * 0.04})`,
              filter: 'drop-shadow(0 12px 18px rgba(0, 0, 0, 0.65)) contrast(1.08) brightness(1.04)',
            }}
          />
        </div>
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
