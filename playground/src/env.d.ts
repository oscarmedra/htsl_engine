/// <reference types="vite/client" />

declare module "plotly.js-dist-min" {
  const Plotly: {
    newPlot(el: Element, data: unknown[], layout?: unknown, config?: unknown): Promise<unknown>;
  };
  export default Plotly;
}
