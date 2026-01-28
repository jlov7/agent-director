/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

declare module '*.json' {
  const value: unknown;
  export default value;
}
