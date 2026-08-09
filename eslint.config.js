import js from '@eslint/js';

export default [
  {
    files: ['src/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        location: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        MutationObserver: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
];
