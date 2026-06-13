import { invoke } from '@tauri-apps/api/core'
import type { TestStorage, TestSuite, TestCase } from '@/bom/test-analysis'

/**
 * defaultTestStorage
 *
 * Vitest テスト解析結果の CRUD ストレージ層の既定実装。
 * Tauri コマンド invoke をラップする。
 *
 * Props DI 用に TestStorage 型を export しており、テスト・Storybook では
 * `{ ...defaultTestStorage, listTestSuites: mockFn }` で部分上書き可能。
 *
 * @context CTX-22
 * @bom     docs/bom/test-analysis.ts TestStorage
 */
export const defaultTestStorage: TestStorage = {
    /**
     * *.test.ts / *.spec.ts を tree-sitter で解析し
     * test_file / test_suite / test_case を UPSERT する。
     * @param projectId プロジェクト ID
     */
    analyzeTests: (projectId: string): Promise<void> =>
        invoke<void>('analyze_tests', { projectId }),

    /**
     * プロジェクト配下の TestSuite 一覧を返す。
     * @param projectId プロジェクト ID
     */
    listTestSuites: (projectId: string): Promise<TestSuite[]> =>
        invoke<TestSuite[]>('list_test_suites', { projectId }),

    /**
     * TestSuite 配下の TestCase 一覧を返す。
     * @param suiteId TestSuite ID
     */
    listTestCases: (suiteId: string): Promise<TestCase[]> =>
        invoke<TestCase[]>('list_test_cases', { suiteId }),
}