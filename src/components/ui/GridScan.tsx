import React from 'react';

type GridScanProps = {
  className?: string;
  style?: React.CSSProperties;
  sensitivity?: number; // unused placeholder for compatibility
  lineThickness?: number;
  linesColor?: string;
  gridScale?: number;
  scanColor?: string;
  scanOpacity?: number;
};

// Lightweight CSS-only approximation of a tunnel grid with a scanning beam.
// This avoids heavy WebGL deps while giving the requested visual.
const GridScan: React.FC<GridScanProps> = ({
  className,
  style,
  lineThickness = 1,
  linesColor = '#392e4e',
  gridScale = 0.1,
  scanColor = '#FF9FFC',
  scanOpacity = 0.4,
}) => {
  const thicknessPx = Math.max(1, lineThickness);
  const gridSize = Math.max(4, Math.round(gridScale * 100));

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className ?? ''}`}
      style={style}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#09090b',
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${gridSize - thicknessPx}px,
              ${linesColor} ${gridSize - thicknessPx}px,
              ${linesColor} ${gridSize}px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent ${gridSize - thicknessPx}px,
              ${linesColor} ${gridSize - thicknessPx}px,
              ${linesColor} ${gridSize}px
            )
          `,
          transform: 'perspective(800px) rotateX(18deg) scale(1.2)',
          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.08))',
        }}
      />
      {/* Scanning beam */}
      <div
        className="absolute inset-0 animate-scan"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${scanColor} ${scanOpacity * 60}%, transparent 100%)`,
          mixBlendMode: 'screen',
          opacity: scanOpacity,
        }}
      />
      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/70 pointer-events-none" />
    </div>
  );
};

export default GridScan;

