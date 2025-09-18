module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: [
        'App.tsx',
        'index.tsx',
        'components/**/*.{js,jsx,ts,tsx}',
        'views/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            patterns: [
              {
                group: ['src/game/**'],
                message:
                  'UI modules should depend on public game interfaces instead of deep imports under src/game.',
              },
            ],
          },
        ],
      },
    },
  ],
};
