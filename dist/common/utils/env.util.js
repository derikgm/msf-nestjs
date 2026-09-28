export function requireEnv(config, key) {
    const value = config.get(key);
    if (!value) {
        throw new Error(`Falta la variable de entorno ${key}. Revisa tu archivo .env`);
    }
    return value;
}
//# sourceMappingURL=env.util.js.map