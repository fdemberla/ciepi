import type { CSSProperties, ReactNode } from "react";

/**
 * Marco con la forma angulada del isotipo ("boomerang") que el manual de
 * INADEH usa para enmarcar fotografías (pp. 39 y 110-113): esquinas
 * redondeadas y una esquina recortada en diagonal con uniones suaves.
 *
 * Se define una sola vez como clipPath en coordenadas relativas
 * (objectBoundingBox), así funciona con cualquier tamaño.
 */
const CLIP_ID = "ciepi-boomerang-clip";

// Esquinas redondeadas (r≈0.06) y diagonal inferior derecha de (1, 0.6) a (0.68, 1).
const PATH =
  "M0.06,0 H0.94 Q1,0 1,0.06 V0.58 Q1,0.62 0.975,0.65 L0.72,0.975 Q0.70,1 0.665,1 H0.06 Q0,1 0,0.94 V0.06 Q0,0 0.06,0 Z";

export function BoomerangClipDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <clipPath id={CLIP_ID} clipPathUnits="objectBoundingBox">
          <path d={PATH} />
        </clipPath>
      </defs>
    </svg>
  );
}

interface BoomerangFrameProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function BoomerangFrame({ children, className = "", style }: BoomerangFrameProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ clipPath: `url(#${CLIP_ID})`, ...style }}>
      {children}
    </div>
  );
}
