import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import './App.css'

/**
 * App
 * TanStack Router の RouterProvider をマウントするだけのエントリーポイント。
 * Hydration・レイアウト・ダイアログ制御は各ルートコンポーネントに委譲する。
 *
 * @see src/router.tsx       ルートツリー定義
 * @see src/routes/index.tsx "/" ルート（旧 App.tsx の責務）
 */
function App() {
  return <RouterProvider router={router} />
}

export default App