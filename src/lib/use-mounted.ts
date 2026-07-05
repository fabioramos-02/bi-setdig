import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** true só após montar no cliente — evita mismatch de hidratação sem
 * setState-em-effect (react-hooks/set-state-in-effect). */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
