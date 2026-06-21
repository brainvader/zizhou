/**
 * docs/bom/test-analysis.ts
 *
 * @context CTX-22: Test Context
 *
 * Vitest テストファイル解析結果の型契約。
 * Rust 側の analyze_tests / list_test_suites / list_test_cases との対応を定義する。
 *
 * 命名規則:
 *   TestFile    — test_file テーブルのレコード型
 *   TestSuite   — test_suite テーブルのレコード型（describe に対応）
 *   TestCase    — test_case テーブルのレコード型（it / test に対応）
 *   TestStorage — CRUD ストレージ層インタフェース
 */

// ============================================================
// TestFile
// ============================================================

/**
 * Vitest テストファイル（*.test.ts / *.spec.ts）のレコード型。
 *
 * @field id        SurrealDB Thing 型: "test_file:xxx"
 * @field projectId 所属プロジェクトの ID
 * @field filePath  rootPath 相対 / forward slash
 */
export type TestFile = {
    id: string
    projectId: string
    filePath: string
}

// ============================================================
// TestSuite
// ============================================================

/**
 * describe ブロックに対応するレコード型。
 *
 * @field id            SurrealDB Thing 型: "test_suite:xxx"
 * @field testFileId    所属テストファイルの ID
 * @field parentSuiteId ネスト describe の親 ID（トップレベルは null）
 * @field name          describe の第一引数
 * @field nodeIds       import から解決した SourceNode の ID 集合
 *                      SourceGraphView の Subflow 表示に使用する
 */
export type TestSuite = {
    id: string
    testFileId: string
    parentSuiteId: string | null
    name: string
    nodeIds: string[]
}

// ============================================================
// TestCase
// ============================================================

/**
 * it / test ブロックに対応するレコード型。
 *
 * @field id       SurrealDB Thing 型: "test_case:xxx"
 * @field suiteId  所属 TestSuite の ID
 * @field name     it の第一引数
 * @field order    ファイル内の定義順（0 始まり）
 */
export type TestCase = {
    id: string
    suiteId: string
    name: string
    order: number
}

// ============================================================
// TestStorage
// ============================================================

/**
 * TestStorage
 *
 * テスト解析結果の CRUD を担うストレージ層インタフェース。
 * Props DI で差し替え可能にするためインタフェースとして定義する。
 *
 * 実装: src/services/TestStorage.ts の defaultTestStorage
 */
export type TestStorage = {
    /**
     * *.test.ts / *.spec.ts を tree-sitter で解析し
     * test_file / test_suite / test_case を UPSERT する。
     */
    analyzeTests: (projectId: string) => Promise<void>

    /**
     * プロジェクト配下の TestSuite 一覧を返す。
     * SourceGraphView の contexts prop に変換して使用する。
     */
    listTestSuites: (projectId: string) => Promise<TestSuite[]>

    /**
     * TestSuite 配下の TestCase 一覧を返す。
     * 右ペインの it 一覧表示に使用する。
     */
    listTestCases: (suiteId: string) => Promise<TestCase[]>
}

// ============================================================
// SourceContext への変換ヘルパー型
// ============================================================

/**
 * TestSuite を SourceGraphView の contexts prop に変換するときの中間型。
 * src/hooks/useTestContexts.ts で使用する想定。
 *
 * TestSuite.nodeIds が空でないものだけを SourceContext として扱う。
 */
export type TestSuiteAsContext = {
    /** source_context 相当の ID（"test_suite:xxx" をそのまま使用） */
    id: string
    /** describe 名 = Subflow ラベル */
    name: string
    projectId: string
    nodeIds: string[]
}