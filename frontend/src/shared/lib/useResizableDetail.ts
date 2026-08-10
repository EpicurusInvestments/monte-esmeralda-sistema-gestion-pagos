/** Ancho ajustable del panel de detalle (patrón lista + detalle).
 *
 * El panel arranca en el ancho por defecto del tema (`--detail-width`) y se puede ensanchar
 * arrastrando su borde izquierdo, hasta +200px. El mínimo ES el ancho por defecto: el panel
 * nunca se hace más angosto de lo que fue diseñado (los formularios de detalle no caben).
 *
 * El valor se recuerda en `localStorage` y lo comparten las tres pantallas que usan el
 * patrón (Conceptos, Proveedores y las bandejas de Solicitudes): es una preferencia de
 * espacio de trabajo, no de una pantalla concreta.
 *
 * Uso:
 *   const detalle = useResizableDetail();
 *   <div className="split">
 *     <div className="list-pane">…</div>
 *     <DetailResizeHandle {...detalle.handleProps} />
 *     <aside className="detail-pane" style={{ width: detalle.width }}>…</aside>
 *   </div>
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

/** Clave de la preferencia; el prefijo `me.` es del proyecto (Monte Esmeralda). */
const STORAGE_KEY = "me.detailPaneWidth";

/** Cuánto se puede ensanchar el panel por encima de su ancho por defecto. */
const HOLGURA = 200;

/** Respaldo si `--detail-width` no se puede leer (p. ej. en jsdom). Debe coincidir con el
 *  valor del token en `theme.css`. */
const ANCHO_POR_DEFECTO = 420;

/** Salto del ajuste con teclado (flechas). */
const PASO_TECLADO = 16;

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Ancho por defecto tomado del tema, para no duplicar el número en dos sitios. */
function leerAnchoBase(): number {
  if (typeof window === "undefined") return ANCHO_POR_DEFECTO;
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--detail-width");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : ANCHO_POR_DEFECTO;
}

function leerPreferencia(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    // localStorage puede estar bloqueado (modo privado, políticas del navegador).
    return null;
  }
}

function guardarPreferencia(ancho: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(ancho)));
  } catch {
    // Sin persistencia se sigue pudiendo arrastrar; solo no se recuerda.
  }
}

export interface DetailHandleProps {
  dragging: boolean;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export interface ResizableDetail {
  /** Ancho actual en px; va inline en `.detail-pane`. */
  width: number;
  min: number;
  max: number;
  /** Props para el agarre (`DetailResizeHandle`). */
  handleProps: DetailHandleProps;
}

export function useResizableDetail(): ResizableDetail {
  // El rango se fija al montar: depende del tema, que no cambia en caliente.
  const [min] = useState(leerAnchoBase);
  const max = min + HOLGURA;

  const [width, setWidth] = useState(() => clamp(leerPreferencia() ?? min, min, max));
  const [dragging, setDragging] = useState(false);
  // Punto de partida del arrastre (x del puntero + ancho en ese momento).
  const inicio = useRef<{ x: number; ancho: number } | null>(null);

  /** Mientras se arrastra, el cursor y la ausencia de selección deben valer en toda la
   *  página: el puntero se sale del agarre constantemente. */
  useEffect(() => {
    if (!dragging) return;
    document.body.classList.add("resizing-detail");
    return () => document.body.classList.remove("resizing-detail");
  }, [dragging]);

  const aplicar = useCallback(
    (nuevo: number) => {
      const acotado = clamp(nuevo, min, max);
      setWidth(acotado);
      return acotado;
    },
    [min, max],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      // La captura mantiene los eventos en el agarre aunque el puntero salga de sus 6px.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      inicio.current = { x: e.clientX, ancho: width };
      setDragging(true);
    },
    [width],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!inicio.current) return;
      // El agarre está a la IZQUIERDA del panel: mover el puntero hacia la izquierda
      // (clientX menor) lo ensancha.
      aplicar(inicio.current.ancho + (inicio.current.x - e.clientX));
    },
    [aplicar],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!inicio.current) return;
      inicio.current = null;
      setDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      guardarPreferencia(width);
    },
    [width],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      let destino: number | null = null;
      if (e.key === "ArrowLeft") destino = width + PASO_TECLADO;
      else if (e.key === "ArrowRight") destino = width - PASO_TECLADO;
      else if (e.key === "Home") destino = min;
      else if (e.key === "End") destino = max;
      if (destino === null) return;
      e.preventDefault();
      guardarPreferencia(aplicar(destino));
    },
    [width, min, max, aplicar],
  );

  return {
    width,
    min,
    max,
    handleProps: {
      dragging,
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": Math.round(width),
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
    },
  };
}
