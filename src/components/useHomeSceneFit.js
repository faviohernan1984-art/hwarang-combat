import { useRef } from 'react';

// The shared HOME markup keeps its refs. Responsive commercial composition is
// CSS-only: never scale text, measure/mutate layout, or attach HOME listeners.
export function useHomeSceneFit() {
  return { sceneRef: useRef(null), contentRef: useRef(null) };
}
