import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'warn',
    restriction: 'off',
  },
});
