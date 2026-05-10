import type { Preview } from '@storybook/react-vite'
import '../src/App.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
      config: {
        rules: [
          {
            // Radix UI の FocusGuard による既知の誤検知
            id: 'aria-hidden-focus',
            enabled: false,
          },
        ],
      },
    },
  },
}

export default preview