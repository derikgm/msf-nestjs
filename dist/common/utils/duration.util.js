const UNIDADES = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
};
export function parseDurationToSeconds(input) {
    const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
    if (!match) {
        throw new Error(`Duración inválida: "${input}". Usa el formato 30m, 8h o 7d`);
    }
    return Number(match[1]) * UNIDADES[match[2]];
}
//# sourceMappingURL=duration.util.js.map