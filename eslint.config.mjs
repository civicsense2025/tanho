import next from "eslint-config-next";

// Flat config (ESLint 9). `next lint` was removed in Next 16, and the bare `eslint` script
// needs a config file to run at all — this wires the existing eslint-config-next (which
// exports a flat-config array) so `npm run lint` and CI's static leg work.
const config = [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "test-results/**", "playwright-report/**"] },
  ...next,
];

export default config;
