const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent);

export const SWAP_HINT = isApple ? "⌘↵" : "Ctrl+↵";
