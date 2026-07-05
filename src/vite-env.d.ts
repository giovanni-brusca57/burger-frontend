/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_REFERRAL: string;
  readonly VITE_TRC20_DEPOSIT_ADDRESS: string;
  readonly VITE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
