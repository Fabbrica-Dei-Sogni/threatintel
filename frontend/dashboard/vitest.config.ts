import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        all: true,
        include: [
          'src/api/**/*.ts', 
          'src/stores/**/*.ts', 
          'src/composable/**/*.ts', 
          'src/utils/**/*.ts'
        ],
        exclude: [
          'node_modules/**',
          'dist/**',
          '**/*.d.ts',
          '**/*.config.ts',
          'src/tests/**',
          'src/**/*.test.ts',
          'src/**/*.spec.ts',
          '**/*.vue',
          '**/*.css',
          '**/*.scss'
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      },
      include: ['src/**/*.{test,spec}.ts'],
    },
  })
);
