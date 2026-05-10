// .storybook/preview.ts
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a1a' },   // 石仏テーマ
        { name: 'light', value: '#f5f5f5' },
      ],
    },
  },
};

export default preview;