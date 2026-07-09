import '@testing-library/jest-dom/vitest';

// jsdom には ResizeObserver が実装されていない。React Flow が内部で
// 使用するため、jsdom 環境（unit プロジェクト）向けに最小限のスタブを補う。
// storybook プロジェクトは実ブラウザ（chromium）で動くため対象外。
if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
