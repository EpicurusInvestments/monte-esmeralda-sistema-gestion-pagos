/* eslint-disable react-refresh/only-export-components -- patrón de contexto: el provider y su
   hook viven juntos. */

/** Avisos (toasts) de la app, montados UNA vez en la raíz.
 *
 * Por qué global y no dentro de cada pantalla: el `Toast` de PrimeReact usa `appendTo: "self"`,
 * o sea que se renderiza donde se monta, y en la versión instalada **ninguna hoja de estilos lo
 * posiciona** (el tema solo trae `.p-toast { opacity: 1 }` y los estilos que inyecta el
 * componente solo fijan `width`). Montado dentro del panel de detalle —que es `overflow:
 * hidden`— quedaría recortado. Aquí se monta en la raíz y `theme.css` le da la posición fija
 * de forma explícita, sin depender de detalles internos de la librería.
 */

import { Toast } from "primereact/toast";
import { createContext, useCallback, useContext, useRef } from "react";
import type { ReactNode } from "react";

interface Avisos {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
}

const ToastContext = createContext<Avisos | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Toast>(null);

  const exito = useCallback((mensaje: string) => {
    ref.current?.show({ severity: "success", summary: mensaje, life: 3000 });
  }, []);

  const error = useCallback((mensaje: string) => {
    ref.current?.show({ severity: "error", summary: mensaje, life: 5000 });
  }, []);

  return (
    <ToastContext.Provider value={{ exito, error }}>
      <Toast ref={ref} position="top-right" />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): Avisos {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
