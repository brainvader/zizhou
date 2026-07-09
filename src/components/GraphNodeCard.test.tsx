/**
 * GraphNodeCard — CustomNode 共通のカード外観を描画する
 *
 * @see src/bom/context-graph.ts
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { GraphNodeCard } from './GraphNodeCard'
import type { CustomNodeData } from '@/bom/context-graph'

describe('CustomNode共通のカード外観を描画する', () => {
    it('component kind のときラベルと種別テキストが表示される', () => {
        const data: CustomNodeData = {
            id: 'add-todo-form',
            contextId: 'todo',
            label: 'AddTodoForm',
            kind: 'component',
        }
        render(<GraphNodeCard data={data} />)

        expect(screen.getByText('AddTodoForm')).toBeInTheDocument()
        expect(screen.getByText('component')).toBeInTheDocument()
        expect(screen.getByTestId('graph-node-add-todo-form')).toHaveAttribute(
            'data-node',
            'todo',
        )
    })

    it('feature kind のとき checklist が表示され、種別テキストは表示されない', () => {
        const data: CustomNodeData = {
            id: 'foundation',
            contextId: 'foundation',
            label: 'グラフ基盤',
            kind: 'feature',
            checklist: [
                { label: 'SurrealDBのnode/edgeスキーマを定義する', done: true },
                { label: 'React Flowでグラフを描画する', done: false },
            ],
        }
        render(<GraphNodeCard data={data} />)

        expect(screen.getByText('グラフ基盤')).toBeInTheDocument()
        expect(screen.queryByText('feature')).not.toBeInTheDocument()

        const doneItem = screen.getByText('SurrealDBのnode/edgeスキーマを定義する')
        const todoItem = screen.getByText('React Flowでグラフを描画する')
        expect(
            doneItem.parentElement?.querySelector('input[type="checkbox"]'),
        ).toBeChecked()
        expect(
            todoItem.parentElement?.querySelector('input[type="checkbox"]'),
        ).not.toBeChecked()
    })

    it('feature kind で checklist が空でもエラーにならない', () => {
        const data: CustomNodeData = {
            id: 'empty-feature',
            contextId: 'foundation',
            label: 'empty',
            kind: 'feature',
            checklist: [],
        }
        render(<GraphNodeCard data={data} />)
        expect(screen.getByText('empty')).toBeInTheDocument()
    })

    it('accent が primary のとき強調用の枠線クラスが付く', () => {
        const data: CustomNodeData = {
            id: 'use-todo-store',
            contextId: 'todo',
            label: 'useTodoStore',
            kind: 'hook',
            accent: 'primary',
        }
        render(<GraphNodeCard data={data} />)
        expect(screen.getByTestId('graph-node-use-todo-store')).toHaveClass(
            'border-primary',
        )
    })

    it('accent が dashed のとき破線・暗背景のクラスが付く', () => {
        const data: CustomNodeData = {
            id: 'zustand',
            contextId: 'todo',
            label: 'zustand',
            kind: 'external',
            accent: 'dashed',
        }
        render(<GraphNodeCard data={data} />)
        const card = screen.getByTestId('graph-node-zustand')
        expect(card).toHaveClass('border-dashed')
        expect(card).toHaveClass('bg-[#101317]')
    })

    it('accent が未指定のとき通常の枠線クラスになる', () => {
        const data: CustomNodeData = {
            id: 'filter-tabs',
            contextId: 'todo',
            label: 'FilterTabs',
            kind: 'component',
        }
        render(<GraphNodeCard data={data} />)
        const card = screen.getByTestId('graph-node-filter-tabs')
        expect(card).toHaveClass('border-border')
        expect(card).not.toHaveClass('border-dashed')
    })
})
