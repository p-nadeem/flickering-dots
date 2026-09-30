// Flat ESLint config shared by every workspace package.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

const DOM_GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Core, presets and player stay DOM-free so they run in Node and any renderer.
  {
    files: ['src/core/**/*.ts', 'src/presets/**/*.ts', 'src/player/**/*.ts'],
    rules: { 'no-restricted-globals': ['error', ...DOM_GLOBALS] },
  },
  prettier,
);
