export const IS_MAC =
    typeof navigator !== "undefined"
        ? /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
        : null;
