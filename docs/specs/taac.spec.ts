/**
 * @context CTX-22b: Test as a Context (TaaC) — ロジック検証
 * @bom docs/bom/source-graph.ts
 *
 * @story
 * 1. テストファイルが未選択のとき空グラフと案内メッセージが表示される（Empty State）
 * 2. テストファイルを選択すると onGetRelatedNodes が呼ばれグラフが表示される
 * 3. 依存先ノード（dependencies）が選択ノードの左側に配置される
 * 4. 利用先ノード（dependents）が選択ノードの右側に配置される
 * 5. テストファイル以外が selectedFilePath に渡されてもグラフは更新されない
 *
 * @output
 * - src/components/SourceGraphView.tsx（onGetRelatedNodes / TaaC モード）
 * - docs/bom/source-graph.ts（isTestFile / computeTaaCLayout）
 */

import { test, expect } from 'vitest'
import { isTestFile, computeTaaCLayout, DEFAULT_TAAC_LAYOUT } from '../../docs/bom/source-graph'
import type { RelatedNodes } from '../../docs/bom/source-graph'

// ============================================================
// フィクスチャ
// ============================================================

const makeNode = (filePath: string): RelatedNodes['center'] => ({
    id: `node:${filePath}`,
    type: 'sourceNode',
    position: { x: 0, y: 0 },
    data: { label: filePath.split('/').pop() ?? filePath, filePath },
})

const CENTER = makeNode('src/App.test.tsx')
const DEP_A = makeNode('src/lib/a.ts')
const DEP_B = makeNode('src/lib/b.ts')
const DNT_A = makeNode('src/index.ts')

const FULL_RELATED: RelatedNodes = {
    center: CENTER,
    dependencies: [DEP_A, DEP_B],
    dependents: [DNT_A],
}

// ============================================================
// isTestFile
// ============================================================

test('isTestFile: .test.ts を true と判定する', () => {
    expect(isTestFile('src/lib/utils.test.ts')).toBe(true)
})

test('isTestFile: .spec.ts を true と判定する', () => {
    expect(isTestFile('src/components/Button.spec.ts')).toBe(true)
})

test('isTestFile: .test.tsx を true と判定する', () => {
    expect(isTestFile('src/components/App.test.tsx')).toBe(true)
})

test('isTestFile: .spec.tsx を true と判定する', () => {
    expect(isTestFile('src/components/App.spec.tsx')).toBe(true)
})

test('isTestFile: 通常の .ts は false と判定する', () => {
    expect(isTestFile('src/lib/utils.ts')).toBe(false)
})

test('isTestFile: 通常の .tsx は false と判定する', () => {
    expect(isTestFile('src/components/Button.tsx')).toBe(false)
})

test('isTestFile: node_modules 配下のテストファイルも true（除外は Rust 側が担う）', () => {
    expect(isTestFile('node_modules/lib/index.test.ts')).toBe(true)
})

// ============================================================
// computeTaaCLayout
// ============================================================

test('computeTaaCLayout: center は (centerX, centerY) に配置される', () => {
    const positions = computeTaaCLayout(FULL_RELATED, DEFAULT_TAAC_LAYOUT)
    const pos = positions.get(CENTER.data.filePath!)!
    expect(pos.x).toBe(DEFAULT_TAAC_LAYOUT.centerX)
    expect(pos.y).toBe(DEFAULT_TAAC_LAYOUT.centerY)
})

test('computeTaaCLayout: dependencies は center より左に配置される', () => {
    const positions = computeTaaCLayout(FULL_RELATED, DEFAULT_TAAC_LAYOUT)
    for (const dep of FULL_RELATED.dependencies) {
        const pos = positions.get(dep.data.filePath!)!
        expect(pos.x).toBeLessThan(DEFAULT_TAAC_LAYOUT.centerX)
    }
})

test('computeTaaCLayout: dependents は center より右に配置される', () => {
    const positions = computeTaaCLayout(FULL_RELATED, DEFAULT_TAAC_LAYOUT)
    for (const dep of FULL_RELATED.dependents) {
        const pos = positions.get(dep.data.filePath!)!
        expect(pos.x).toBeGreaterThan(DEFAULT_TAAC_LAYOUT.centerX)
    }
})

test('computeTaaCLayout: 全ノードの座標が Map に含まれる', () => {
    const positions = computeTaaCLayout(FULL_RELATED, DEFAULT_TAAC_LAYOUT)
    const expected = 1 + FULL_RELATED.dependencies.length + FULL_RELATED.dependents.length
    expect(positions.size).toBe(expected)
})

test('computeTaaCLayout: 依存先・利用先が 0 件でも center の座標は変わらない', () => {
    const isolated: RelatedNodes = { center: CENTER, dependencies: [], dependents: [] }
    const positions = computeTaaCLayout(isolated, DEFAULT_TAAC_LAYOUT)
    const pos = positions.get(CENTER.data.filePath!)!
    expect(pos.x).toBe(DEFAULT_TAAC_LAYOUT.centerX)
    expect(pos.y).toBe(DEFAULT_TAAC_LAYOUT.centerY)
})

test('computeTaaCLayout: 複数の dependencies は verticalSpacing で等間隔に並ぶ', () => {
    const positions = computeTaaCLayout(FULL_RELATED, DEFAULT_TAAC_LAYOUT)
    const y0 = positions.get(DEP_A.data.filePath!)!.y
    const y1 = positions.get(DEP_B.data.filePath!)!.y
    expect(Math.abs(y1 - y0)).toBeCloseTo(DEFAULT_TAAC_LAYOUT.verticalSpacing)
})