/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** See `lib/notifications.ts` for what each of these configures. */
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_EMAILJS_NEW_REQUEST_TEMPLATE_ID?: string;
  readonly VITE_EMAILJS_REVIEWED_TEMPLATE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
