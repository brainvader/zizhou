/**
 * toContextGraph / sidebarItemsFromExtracted — Extractorの出力を
 * ContextGraphNode[]/ContextGraphEdge[]、およびサイドバー項目に変換する
 *
 * @see src/bom/extracted-graph.ts
 * @see src/bom/graph-layout.ts
 */
import { describe, it, expect } from 'vitest'

import {
    toContextGraph,
    sidebarItemsFromExtracted,
    toContextSummaryNodes,
    UI_WHOLE_PROJECT_ID,
    type ExtractResult,
} from './extracted-graph'

const SAMPLE: ExtractResult = {
    nodes: [
        {
            id: 'add-todo-form',
            kind: 'component',
            file: 'src/components/AddTodoForm.tsx',
            context: 'todo',
            describe: 'テキストを入力してTodoを追加する',
            criteria: [
                { label: '空文字では追加ボタンが disabled になる', done: false },
                { label: 'Enterキーで追加できる', done: true },
            ],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'use-todo-store',
            kind: 'hook',
            file: 'src/hooks/useTodoStore.ts',
            context: 'todo',
            describe: 'Todo一覧を保持する',
            criteria: [],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'persist-todos',
            kind: 'service',
            file: 'src/lib/persistTodos.ts',
            context: 'todo',
            describe: 'localStorageへ読み書きする',
            sourceContextMap: 'ContextMap.storage.html',
        },
        {
            id: 'todo-record',
            kind: 'schema',
            file: 'src/types/TodoRecord.ts',
            context: 'todo',
            describe: 'Todo1件のデータ形状',
            sourceContextMap: 'ContextMap.storage.html',
        },
    ],
    edges: [
        { source: 'add-todo-form', target: 'use-todo-store' },
        { source: 'use-todo-store', target: 'persist-todos' },
    ],
}

// 修正後のContextMap（ノードごとに別々のdata-contextを持つ = 1ノード1管理単位）を反映したfixture
const MULTI_CONTEXT_SAMPLE: ExtractResult = {
    nodes: [
        {
            id: 'add-todo-form',
            kind: 'component',
            file: 'src/components/AddTodoForm.tsx',
            context: 'add-todo-form',
            describe: 'テキストを入力してTodoを追加する',
            criteria: [{ label: 'Enterキーで追加できる', done: true }],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'filter-tabs',
            kind: 'component',
            file: 'src/components/FilterTabs.tsx',
            context: 'filter-tabs',
            criteria: [],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'use-todo-store',
            kind: 'hook',
            file: 'src/hooks/useTodoStore.ts',
            context: 'use-todo-store',
            criteria: [],
            sourceContextMap: 'ContextMap.todo.html',
        },
        {
            id: 'persist-todos',
            kind: 'service',
            file: 'src/lib/persistTodos.ts',
            context: 'persist-todos',
            criteria: [],
            sourceContextMap: 'ContextMap.storage.html',
        },
    ],
    edges: [
        { source: 'add-todo-form', target: 'use-todo-store' },
        { source: 'filter-tabs', target: 'use-todo-store' },
        { source: 'use-todo-store', target: 'persist-todos' },
    ],
}

describe('Extractorの出力を ContextGraphNode[] に変換する', () => {
    it('id/label/kind/contextId を正しく変換する', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const addTodoForm = nodes.find((n) => n.id === 'add-todo-form')
        expect(addTodoForm).toMatchObject({
            id: 'add-todo-form',
            label: 'AddTodoForm', // fileのbasename（拡張子抜き）から導出
            kind: 'component',
            contextId: 'todo',
        })
    })

    it('criteria を checklist（label/done）に変換する', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const addTodoForm = nodes.find((n) => n.id === 'add-todo-form')
        expect(addTodoForm?.checklist).toEqual([
            { label: '空文字では追加ボタンが disabled になる', done: false },
            { label: 'Enterキーで追加できる', done: true },
        ])
    })

    it('criteria が空/無いときは checklist を持たない（undefined）', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const useTodoStore = nodes.find((n) => n.id === 'use-todo-store')
        expect(useTodoStore?.checklist).toBeUndefined()
    })

    it('kind: service は NodeKind: external にマッピングされ accent: dashed が付く', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const persistTodos = nodes.find((n) => n.id === 'persist-todos')
        expect(persistTodos?.kind).toBe('external')
        expect(persistTodos?.accent).toBe('dashed')
    })

    it('kind: schema は NodeKind: state にマッピングされ accent: dashed が付く', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const todoRecord = nodes.find((n) => n.id === 'todo-record')
        expect(todoRecord?.kind).toBe('state')
        expect(todoRecord?.accent).toBe('dashed')
    })

    it('component/hook には accent が付かない', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const addTodoForm = nodes.find((n) => n.id === 'add-todo-form')
        const useTodoStore = nodes.find((n) => n.id === 'use-todo-store')
        expect(addTodoForm?.accent).toBeUndefined()
        expect(useTodoStore?.accent).toBeUndefined()
    })

    it('describe をそのまま運ぶ（ノードクリック詳細表示で使うため）', () => {
        const { nodes } = toContextGraph(SAMPLE)
        const addTodoForm = nodes.find((n) => n.id === 'add-todo-form')
        expect(addTodoForm?.describe).toBe('テキストを入力してTodoを追加する')
    })

    it('全ノードに dagre 由来の position（有限の数値）が設定される', () => {
        const { nodes } = toContextGraph(SAMPLE)
        for (const node of nodes) {
            expect(Number.isFinite(node.position.x)).toBe(true)
            expect(Number.isFinite(node.position.y)).toBe(true)
        }
    })
})

describe('Extractorの出力を ContextGraphEdge[] に変換する', () => {
    it('source/target をそのまま引き継ぎ、idを "source-target" で生成する', () => {
        const { edges } = toContextGraph(SAMPLE)
        expect(edges).toEqual([
            { id: 'add-todo-form-use-todo-store', source: 'add-todo-form', target: 'use-todo-store' },
            { id: 'use-todo-store-persist-todos', source: 'use-todo-store', target: 'persist-todos' },
        ])
    })
})

describe('Extractorの出力から、data-contextごとに集約した1ノードを作る（Contextsセクション用）', () => {
    it('ユニークなcontextごとに1ノードだけ作る（4ノード→1ノードに集約される）', () => {
        const nodes = toContextSummaryNodes(SAMPLE)
        expect(nodes).toHaveLength(1)
        expect(nodes[0]).toMatchObject({
            id: 'todo',
            contextId: 'todo',
            label: 'Todo',
            kind: 'feature',
        })
    })

    it('そのcontext配下の全ノードのcriteriaを、ノード名を添えて1つのchecklistに集約する', () => {
        const nodes = toContextSummaryNodes(SAMPLE)
        expect(nodes[0].checklist).toEqual([
            { label: 'AddTodoForm: 空文字では追加ボタンが disabled になる', done: false },
            { label: 'AddTodoForm: Enterキーで追加できる', done: true },
        ])
    })

    it('criteriaを持たないノード（use-todo-store等）は空扱いで、他ノード分のcriteriaに影響しない', () => {
        const nodes = toContextSummaryNodes(SAMPLE)
        // SAMPLE中、criteriaを持つのは add-todo-form のみ（2件）。他は[]や未指定。
        expect(nodes[0].checklist).toHaveLength(2)
    })

    it('全ノードに有限のposition（dagre不要、単純配置）が設定される', () => {
        const nodes = toContextSummaryNodes(SAMPLE)
        for (const node of nodes) {
            expect(Number.isFinite(node.position.x)).toBe(true)
            expect(Number.isFinite(node.position.y)).toBe(true)
        }
    })
})

describe('Extractorの出力からサイドバー項目を導出する', () => {
    // UI（依存関係グラフ全体）は data-context の値を問わず常に1件。
    // 「1 data-context = 1管理単位（Contexts）」という単位と、
    // 「アプリ全体のつながり（UI）」は別の軸であり、UIはグラフ全体を指す1つの入り口でしかない。
    it('UIは常に1件（プロジェクト全体を指す入り口。data-contextの数によらない）', () => {
        const items = sidebarItemsFromExtracted(SAMPLE)
        const ui = items.filter((i) => i.section === 'ui')
        expect(ui).toHaveLength(1)
    })

    it('UIのidはWHOLE_PROJECT_ID固定、ラベルは最頻出のsourceContextMapから導出する', () => {
        const items = sidebarItemsFromExtracted(SAMPLE)
        const ui = items.find((i) => i.section === 'ui')
        expect(ui).toEqual({ id: UI_WHOLE_PROJECT_ID, section: 'ui', label: 'Todo' })
    })

    it('ユニークなcontextごとにContextsセクションの項目を1つずつ作る', () => {
        const items = sidebarItemsFromExtracted(SAMPLE)
        const contexts = items.filter((i) => i.section === 'contexts')
        expect(contexts).toEqual([{ id: 'todo:ctx', section: 'contexts', label: 'Todo' }])
    })

    it('ノードごとにdata-contextが異なる場合、Contextsはノードの数だけ増えるが、UIは1件のまま', () => {
        const items = sidebarItemsFromExtracted(MULTI_CONTEXT_SAMPLE)
        const ui = items.filter((i) => i.section === 'ui')
        const contexts = items.filter((i) => i.section === 'contexts')
        expect(ui).toHaveLength(1)
        expect(contexts).toHaveLength(4)
    })

    it('抽出結果が空のときは空配列を返す', () => {
        const items = sidebarItemsFromExtracted({ nodes: [], edges: [] })
        expect(items).toEqual([])
    })
})