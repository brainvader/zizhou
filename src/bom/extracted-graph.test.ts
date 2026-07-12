/**
 * toContextGraph / sidebarItemsFromExtracted — Extractorの出力を
 * ContextGraphNode[]/ContextGraphEdge[]、およびサイドバー項目に変換する
 *
 * @see src/bom/extracted-graph.ts
 * @see src/bom/graph-layout.ts
 */
import { describe, it, expect } from 'vitest'

import { toContextGraph, sidebarItemsFromExtracted, type ExtractResult } from './extracted-graph'

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

describe('Extractorの出力からサイドバー項目を導出する', () => {
    it('ユニークなcontextごとに UI と Contexts 両方の項目を作る（同じデータの2つの見せ方のため）', () => {
        const items = sidebarItemsFromExtracted(SAMPLE)
        expect(items).toEqual([
            { id: 'todo', section: 'ui', label: 'Todo' },
            { id: 'todo:ctx', section: 'contexts', label: 'Todo' },
        ])
    })

    it('全ノードが同一contextのとき、UI/Contexts合わせて2件だけ返す（重複しない）', () => {
        const items = sidebarItemsFromExtracted(SAMPLE)
        expect(items).toHaveLength(2)
    })
})