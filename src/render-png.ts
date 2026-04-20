import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import fontRegular from "./fonts/CormorantGaramond-Regular.ttf";
import fontBold from "./fonts/CormorantGaramond-Bold.ttf";

const MAX_DIM = 8000;

let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(resvgWasm as unknown as WebAssembly.Module);
  }
  return wasmReady;
}

export interface RenderOptions {
  scale?: number;            // default 2
  background?: string;       // default transparent
  maxDim?: number;           // default 8000
}

export async function svgToPng(svg: string, opts: RenderOptions = {}): Promise<Uint8Array> {
  await ensureWasm();
  const scale = opts.scale ?? 2;
  const maxDim = opts.maxDim ?? MAX_DIM;

  const resvg = new Resvg(svg, {
    background: opts.background, // undefined => transparent
    font: {
      fontBuffers: [
        new Uint8Array(fontRegular as ArrayBuffer),
        new Uint8Array(fontBold as ArrayBuffer),
      ],
      loadSystemFonts: false,
    },
    fitTo: { mode: "zoom", value: scale },
  });

  const outW = Math.ceil(resvg.width * scale);
  const outH = Math.ceil(resvg.height * scale);
  if (outW > maxDim || outH > maxDim) {
    throw new RenderTooLargeError(
      `Rendered size ${outW}x${outH} exceeds max ${maxDim}px. Reduce scale or shrink tree.`,
    );
  }

  const rendered = resvg.render();
  const png = rendered.asPng();
  rendered.free();
  resvg.free();
  return png;
}

export class RenderTooLargeError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RenderTooLargeError";
  }
}
