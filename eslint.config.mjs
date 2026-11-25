import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

/** Dependencies flow one way: modules -> common -> core -> config */
const forbid = (files, layers) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: layers.map((layer) => ({
          group: [`@app/${layer}/*`, `**/../${layer}/*`],
          message: `This layer must not import from "${layer}".`
        }))
      }
    ]
  }
})

export default tseslint.config(
  { ignores: ['dist/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  forbid(['src/config/**/*.ts'], ['core', 'common', 'modules']),
  forbid(['src/core/**/*.ts'], ['common', 'modules']),
  forbid(['src/common/**/*.ts'], ['modules'])
)
