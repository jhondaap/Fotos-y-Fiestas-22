import { useEffect, useRef } from "react";

// Declaración global para almacenar la pila de modales abiertos
declare global {
  interface Window {
    openModals?: Array<() => void>;
    ignoreNextPopstate?: boolean;
  }
}

export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  // Mantener la referencia actualizada para evitar re-suscripciones innecesarias
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (!window.openModals) {
      window.openModals = [];
    }

    const closeFn = () => {
      onCloseRef.current();
    };

    window.openModals.push(closeFn);
    
    // Insertamos un estado ficticio en el historial del navegador para capturar el botón atrás
    window.history.pushState({ type: "modal", timestamp: Date.now() }, "");

    return () => {
      if (!window.openModals) return;
      const idx = window.openModals.indexOf(closeFn);
      if (idx !== -1) {
        window.openModals.splice(idx, 1);
        
        // El modal se cerró programáticamente (por botones del frontend)
        // en lugar de por el botón atrás. Debemos descartar el estado ficticio del historial.
        window.ignoreNextPopstate = true;
        window.history.back();
      }
    };
  }, [isOpen]);
}
