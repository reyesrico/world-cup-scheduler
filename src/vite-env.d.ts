/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Web3Forms access key for the feedback form (injected at build time). */
  readonly VITE_WEB3FORMS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
