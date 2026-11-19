import React from 'react';
import {
  type TopoGridDensity,
  type TopoGridFade,
  type TopoGridIntensity,
  type TopoGridPlacement,
  type TopoGridTone,
  buildTopoGridStyle,
  resolveTopoGridClassName,
} from './topoGridUtils';

export type {
  TopoGridDensity,
  TopoGridFade,
  TopoGridIntensity,
  TopoGridPlacement,
  TopoGridTone,
};

export interface TopoGridOverlayProps {
  /** Selects `.bw-topo-grid` (light surfaces) or `.bw-topo-grid-dark` (obsidian surfaces). */
  tone?: TopoGridTone;
  /** Optional edge feathering so the coordinate grid dissolves seamlessly into surrounding surfaces. */
  fade?: TopoGridFade;
  /** Cadence of the architectural grid (`default` preserves `.bw-topo-grid`'s 32px mesh). */
  density?: TopoGridDensity;
  /** Visual restraint level for persistent workspace backdrops vs analytical stages. */
  intensity?: TopoGridIntensity;
  /** Positioning mode (`absolute` fills its nearest relative container; `fixed` pins to viewport). */
  placement?: TopoGridPlacement;
  /** Inherits parent border-radius by default so cards and tactile surfaces clip cleanly. */
  rounded?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TopoGridOverlay
 * Subtle, non-interactive persistent background utility applying `.bw-topo-grid`
 * (or `.bw-topo-grid-dark`) across core BrainWise workspace modules and analytical surfaces.
 */
export const TopoGridOverlay: React.FC<TopoGridOverlayProps> = ({
  tone = 'light',
  fade = 'edges',
  density = 'default',
  intensity = 'subtle',
  placement = 'absolute',
  rounded = true,
  className = '',
  style,
}) => {
  const computedClassName = resolveTopoGridClassName({
    tone,
    placement,
    rounded,
    className,
  });

  const computedStyle = buildTopoGridStyle({
    fade,
    density,
    intensity,
    style,
  });

  return (
    <div
      aria-hidden="true"
      data-topo-grid={tone}
      data-topo-fade={fade}
      className={computedClassName}
      style={computedStyle}
    />
  );
};
