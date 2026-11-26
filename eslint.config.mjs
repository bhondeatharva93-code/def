import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'js/**/*', 'tests/**/*', 'server/**/*', 'netlify/**/*', 'src/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
