export function toPlainArray(rowset) {
    if (!rowset)
        return [];
    return Array.from(rowset).map((row) => ({ ...row }));
}
export function toPlainOne(rowset) {
    const arr = toPlainArray(rowset);
    return arr.length > 0 ? arr[0] : null;
}
//# sourceMappingURL=rowset.util.js.map