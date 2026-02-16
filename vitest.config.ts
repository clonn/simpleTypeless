import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'src/main/**/*.ts',
        'src/shared/**/*.ts'
      ],
      exclude: [
        'src/main/index.ts', // Electron bootstrap - not unit testable
        'src/main/audio/opusWorker.ts', // Worker thread entry
        'src/**/*.test.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
