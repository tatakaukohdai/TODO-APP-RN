// AsyncStorageは、ユーザーのデバイスにデータを永続的に保存するための仕組みです。
// これを使うことで、アプリを閉じても設定（この場合はダークモード設定）が消えずに残ります。
import AsyncStorage from "@react-native-async-storage/async-storage";

// Reactから必要な機能をインポートします。
// createContext: アプリ全体で共有したいデータ（テーマ情報など）を入れる「Context」を作成します。
// ReactNode: Reactコンポーネントが子要素として受け取れる全ての型（文字列、数値、他のコンポーネントなど）を表します。
// useContext: createContextで作ったContextから値を取り出すために使います。
// useEffect: コンポーネントが画面に表示された後や、特定のデータが変更された後に特定の処理（副作用）を行いたいときに使います。
// useState: コンポーネント内で状態（データ）を管理するために使います。状態が変化すると、コンポーネントは再描画されます。
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// ColorSchemeは、アプリ内で使用する色の種類を定義する「設計図」のようなものです。（TypeScriptのinterface機能）
// これにより、どんな色がどこで使われるかが明確になり、コードの可読性や保守性が向上します。
// 例えば、`bg`は背景色、`text`は文字色、といった具体的な役割を名前で示しています。
export interface ColorScheme {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    success: string;
    warning: string;
    danger: string;
    shadow: string;
    gradients: {
        background: [string, string];
        surface: [string, string];
        primary: [string, string];
        success: [string, string];
        warning: [string, string];
        danger: [string, string];
        muted: [string, string];
        empty: [string, string];
    };
    backgrounds: {
        input: string;
        editInput: string;
    };
    // ステータスバーの文字色を`light-content`(白)か`dark-content`(黒)に限定します。
    statusBarStyle: "light-content" | "dark-content";
}

// `lightColors`は、ライトモードの時の具体的なカラーパレットです。
// `ColorScheme`という設計図（interface）に基づいて作られているため、必要な色が全て揃っていることが保証されます。
const lightColors: ColorScheme = {
    bg: "#f8fafc",
    surface: "#ffffff",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e2e8f0",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    shadow: "#000000",
    gradients: {
        background: ["#f8fafc", "#e2e8f0"],
        surface: ["#ffffff", "#f8fafc"],
        primary: ["#3b82f6", "#1d4ed8"],
        success: ["#10b981", "#059669"],
        warning: ["#f59e0b", "#d97706"],
        danger: ["#ef4444", "#dc2626"],
        muted: ["#9ca3af", "#6b7280"],
        empty: ["#f3f4f6", "#e5e7eb"],
    },
    backgrounds: {
        input: "#ffffff",
        editInput: "#ffffff",
    },
    // `as const` をつけることで、この値が "dark-content" という文字列リテラル型であることをTypeScriptに伝えます。
    // これにより、より厳密な型チェックが可能になります。
    statusBarStyle: "dark-content" as const,
};

// `darkColors`は、ダークモードの時の具体的なカラーパレットです。
const darkColors: ColorScheme = {
    bg: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    border: "#334155",
    primary: "#60a5fa",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
    shadow: "#000000",
    gradients: {
        background: ["#0f172a", "#1e293b"],
        surface: ["#1e293b", "#334155"],
        primary: ["#3b82f6", "#1d4ed8"],
        success: ["#10b981", "#059669"],
        warning: ["#f59e0b", "#d97706"],
        danger: ["#ef4444", "#dc2626"],
        muted: ["#374151", "#4b5563"],
        empty: ["#374151", "#4b5563"],
    },
    backgrounds: {
        input: "#1e293b",
        editInput: "#0f172a",
    },
    statusBarStyle: "light-content" as const,
};

// `ThemeContext`で提供するデータの型を定義します。
// これにより、Contextから受け取るデータの構造が明確になります。
interface ThemeContextType {
    isDarkMode: boolean; // 現在ダークモードかどうか (true/false)
    toggleDarkMode: () => void; // ダークモードを切り替えるための関数
    colors: ColorScheme; // 現在のモード（ライト/ダーク）に応じたカラーパレット
}

// `ThemeContext`を作成します。これがテーマ情報をアプリ全体で共有するための箱になります。
// `createContext`の引数には初期値を設定しますが、ここでは`undefined`を入れています。
// なぜなら、このContextは必ず`ThemeProvider`内で使われるため、実際の値は`ThemeProvider`から提供されるからです。
// `<undefined | ThemeContextType>`という型定義は、「このContextの値は未定義(undefined)か、ThemeContextTypeのどちらかです」という意味です。
const ThemeContext = createContext<undefined | ThemeContextType>(undefined)

// `ThemeProvider`は、アプリのテーマ（ダークモード設定や色情報）を管理し、
// 子コンポーネント（アプリ全体）に提供する役割を持つコンポーネントです。
// `{ children }`という書き方は、分割束縛代入といい、propsオブジェクトから`children`プロパティを直接取り出しています。
// `children`には、この`ThemeProvider`で囲まれた他のコンポーネントが入ります。
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // `useState`を使って、ダークモードの状態(`isDarkMode`)を管理します。
    // `isDarkMode`が現在の状態、`setIsDarkMode`が状態を更新するための関数です。
    // 初期値は`false`（ライトモード）に設定しています。
    const [isDarkMode, setIsDarkMode] = useState(false);

    // `useEffect`は、特定のタイミングで処理を実行するためのフックです。
    // 第2引数に空の配列`[]`を渡すと、コンポーネントが最初にマウントされた（画面に表示された）時に一度だけ実行されます。
    useEffect(() => {
        // AsyncStorageから"darkMode"というキーで保存された値を取得します。
        // これは非同期処理なので、`.then()`を使って値が取得できた後の処理を記述します。
        AsyncStorage.getItem("darkMode").then((value) => {
            // `value`が存在すれば（つまり、以前に設定が保存されていれば）
            if (value) {
                // 保存されている値は文字列なので、`JSON.parse()`で元のJavaScriptの値（この場合はboolean）に戻し、
                // `setIsDarkMode`でダークモードの状態を更新します。
                setIsDarkMode(JSON.parse(value));
            }
        });
    }, []); // 空の配列なので、この処理は初回レンダリング時に一度だけ実行されます。

    // ダークモードのオン/オフを切り替える関数です。
    // `async`キーワードは、この関数が非同期処理を含むことを示します。
    const toggleDarkMode = async () => {
        // 現在の状態を反転させた新しいモードを`newMode`に保存します。
        const newMode = !isDarkMode;
        // `setIsDarkMode`で状態を更新します。これによりUIが新しいモードに合わせて再描画されます。
        setIsDarkMode(newMode);
        // `await`キーワードは、`AsyncStorage.setItem`の処理（非同期処理）が終わるまで待つことを意味します。
        // 新しいモード(`newMode`)を`JSON.stringify()`で文字列に変換し、"darkMode"というキーでAsyncStorageに保存します。
        await AsyncStorage.setItem("darkMode", JSON.stringify(newMode));
    };

    // `isDarkMode`の状態に応じて、`darkColors`か`lightColors`のどちらかを選択します。
    // これは三項演算子という書き方で、 `条件 ? trueの場合の値 : falseの場合の値` という形式です。
    const colors = isDarkMode ? darkColors : lightColors;

    // `ThemeContext.Provider`は、Contextに値を設定し、子コンポーネントに提供する役割を持ちます。
    // `value`プロパティに、子コンポーネントで使いたい値（`isDarkMode`, `toggleDarkMode`, `colors`）をオブジェクトとして渡します。
    // これにより、`ThemeProvider`で囲まれた全ての子コンポーネントは、`useTheme`フックを通じてこれらの値にアクセスできるようになります。
    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

// `useTheme`は、`ThemeProvider`から提供されたテーマ情報（状態や関数）を、
// どのコンポーネントからでも簡単に取り出せるようにするためのカスタムフックです。
const useTheme = () => {
    // `useContext`フックを使い、`ThemeContext`から現在の値（`value`プロパティに渡されたオブジェクト）を取得します。
    const context = useContext(ThemeContext);
    // もし`context`が`undefined`の場合、それは`useTheme`フックが`ThemeProvider`の外で使われていることを意味します。
    // この場合は、開発者に間違いを知らせるためにエラーを発生させます。
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    // `context`が正常に取得できた場合は、その値を返します。
    return context;
}

// `useTheme`フックをこのファイルのデフォルトエクスポートとして設定します。
// これにより、他のファイルから`import useTheme from './hooks/useTheme'`のように簡単にインポートして使えるようになります。
export default useTheme;
