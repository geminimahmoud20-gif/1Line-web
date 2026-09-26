import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'scripts/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrors: 'none' 
      }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // CRM design-system guard (UX audit DEF-14, 2026-09-26): ~600 hard-coded colours and ad-hoc
    // font sizes bypassed the theme tokens and caused the dark-mode and contrast failures.
    // Warn (not error) so existing code still builds; new code should use the tokens.
    files: ['src/components/crm/**/*.jsx', 'src/components/CrmAdminPanel.jsx', 'src/pages/CrmPage.jsx'],
    rules: {
      'no-restricted-syntax': ['warn',
        {
          // raw sizes only ('0.72rem', '11px', 12) — 'var(--crm-text-*)' is also a Literal and must pass
          selector: "Property[key.name='fontSize'][value.raw=/^['\"]?[\\d.]+(rem|px|em)?['\"]?$/]",
          message: "Use a CRM type token: fontSize: 'var(--crm-text-xs|sm|base|md|lg|xl|2xl)'."
        },
        {
          selector: "Property[key.name=/^(color|background|backgroundColor|borderColor)$/][value.value=/^#[0-9a-fA-F]{3,8}$/]",
          message: "Use a theme token (var(--crm-ink), var(--crm-muted), var(--crm-card)…) so light and dark mode both work."
        }
      ]
    }
  },
])
