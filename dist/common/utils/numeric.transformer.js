export const numericTransformer = {
    to: (value) => value,
    from: (value) => value === null || value === undefined ? null : Number(value),
};
//# sourceMappingURL=numeric.transformer.js.map