import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react/jsx-runtime', 'react-dom', 'echarts', 'echarts/core'],
    treeshake: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
  },
  {
    entry: { chart: 'src/chart.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react/jsx-runtime', 'react-dom', 'echarts', 'echarts/core'],
    treeshake: true,
    outDir: 'dist',
    target: 'es2020',
  },
]);
