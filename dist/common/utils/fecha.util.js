import { registerDecorator } from 'class-validator';
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
function aMedianoche(fecha) {
    const partes = FORMATO_FECHA.exec(fecha.trim());
    if (!partes)
        return undefined;
    const [anio, mes, dia] = partes.slice(1).map(Number);
    const instante = new Date(anio, mes - 1, dia);
    const esLaFechaPida = instante.getFullYear() === anio &&
        instante.getMonth() === mes - 1 &&
        instante.getDate() === dia;
    return esLaFechaPida ? instante : undefined;
}
function hoyAMedianoche() {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}
export function IsFechaDeEntrega(validationOptions) {
    return function (objeto, nombre) {
        registerDecorator({
            name: 'isFechaDeEntrega',
            target: objeto.constructor,
            propertyName: nombre,
            options: validationOptions,
            validator: {
                validate(valor) {
                    if (typeof valor !== 'string')
                        return false;
                    const instante = aMedianoche(valor);
                    if (!instante)
                        return false;
                    return instante.getTime() >= hoyAMedianoche().getTime();
                },
                defaultMessage(args) {
                    const valor = typeof args.value === 'string' ? args.value : String(args.value);
                    if (aMedianoche(valor)) {
                        return `${args.property} no puede ser una fecha pasada; usa hoy o una posterior`;
                    }
                    return `${args.property} debe ser una fecha de la forma YYYY-MM-DD`;
                },
            },
        });
    };
}
//# sourceMappingURL=fecha.util.js.map