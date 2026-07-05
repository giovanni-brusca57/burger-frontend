import { Modal } from './Modal';

/**
 * Place this once at the root of your application (inside Router & i18n providers).
 * It renders the global modal driven by `useModalStore` — no prop drilling needed.
 *
 * ```tsx
 * // main.tsx or App.tsx
 * <ModalProvider />
 * ```
 */
export function ModalProvider() {
  return <Modal />;
}
