/**
 * @tauri-apps/api/path のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 */

export const join = async (...paths: string[]): Promise<string> =>
    paths.join('/').replace(/\/+/g, '/')