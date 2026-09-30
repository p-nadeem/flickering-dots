// Flat ESLint config shared by every workspace package.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

const EAGER_MODULES = [
  '../presets',
  '../presets/index',
  '../core/recipes',
  '../core/recipes/index',
  '../core/recipes/options',
  '../core/build',
  '../core/resolve',
];
const DOM_GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.*', 'compat/fixtures/**'] },
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
  {
    files: ['src/element/**/*.ts', 'src/react/**/*.ts', 'src/player/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: EAGER_MODULES.map((name) => ({
            name,
            message:
              'The render path loads presets and recipes lazily; use presets/store or core/recipes/store.',
          })),
        },
      ],
    },
  },
  {
    files: ['compat/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  prettier,
);
