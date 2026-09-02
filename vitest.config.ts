import { defineConfig } from "vitest/config";

/**
 * Semua test dijalankan dengan TZ tetap (UTC) — bukan timezone ambient OS runner.
 * Test yang bergantung fase siang/malam lokal (mis. packages/core/tests/scenario-m2.test.ts)
 * memakai new Date().getHours(), jadi hasilnya harus deterministik lintas mesin/CI.
 */
export default defineConfig({
  test: {
    env: {
      TZ: "UTC",
    },
  },
});
