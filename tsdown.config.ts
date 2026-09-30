import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    element: 'src/element/index.ts',
    'element-define': 'src/element/define.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  clean: true,
  unbundle: true,
  publint: true,
  attw: { profile: 'node16' },
  inputOptions: {
    onLog(level, log, handler) {
      if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('use client')) return;
      handler(level, log);
    },
  },
});
