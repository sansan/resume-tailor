import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'dist-electron',
      // Legacy custom test runners (not Vitest)
      'src/shared/sanitize.test.ts',
      'src/shared/settings-validation.test.ts',
      'src/main/services/claude-code.integration.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'dist-electron', 'src/test'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@schemas': path.resolve(__dirname, './src/schemas'),
      '@app-types': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@prompts': path.resolve(__dirname, './src/prompts'),
    },
  },
})
