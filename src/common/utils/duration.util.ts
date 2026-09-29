const UNIDADES: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * Convierte una duración simple ("30m", "8h", "7d") a segundos.
 * Evita depender de la forma que espera jsonwebtoken para `expiresIn`.
 */
export function parseDurationToSeconds(input: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(input.trim());

  if (!match) {
    throw new Error(`Duración inválida: "${input}". Usa el formato 30m, 8h o 7d`);
  }

  return Number(match[1]) * UNIDADES[match[2]];
}
