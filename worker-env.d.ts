declare module "*.ttf" {
  const buffer: ArrayBuffer;
  export default buffer;
}

declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

interface Env {
  ASSETS: Fetcher;
  DEV?: string;
}
