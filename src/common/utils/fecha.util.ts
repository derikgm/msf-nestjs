import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/** `YYYY-MM-DD`: la fecha de entrega es solo el día, sin hora ni zona horaria. */
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte "YYYY-MM-DD" a la medianoche del servidor, sin pasar por `Date.parse`:
 * eso interpretaría la cadena como UTC y en una zona como UTC-6 "2026-10-01"
 * sería el 30 de septiembre local, un día antes de lo que el cliente pidió.
 *
 * Devuelve `undefined` si el texto no tiene esa forma o si la fecha no existe en el
 * calendario: `new Date(2026, 1, 31)` no da error, se normaliza al 3 de marzo.
 */
function aMedianoche(fecha: string): Date | undefined {
  const partes = FORMATO_FECHA.exec(fecha.trim());

  if (!partes) return undefined;

  const [anio, mes, dia] = partes.slice(1).map(Number);
  const instante = new Date(anio, mes - 1, dia);

  const esLaFechaPida =
    instante.getFullYear() === anio &&
    instante.getMonth() === mes - 1 &&
    instante.getDate() === dia;

  return esLaFechaPida ? instante : undefined;
}

/** Hoy a las 00:00 en la hora del servidor, que es la que ve el cliente. */
function hoyAMedianoche(): Date {
  const ahora = new Date();

  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/**
 * Valida que una fecha de entrega sea de hoy en adelante: no se puede encargar para
 * ayer. Compara día local contra día local, sin horas, así que "hoy" siempre pasa
 * aunque ya sea tarde.
 */
export function IsFechaDeEntrega(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (objeto: object, nombre: string | symbol): void {
    registerDecorator({
      name: 'isFechaDeEntrega',
      target: objeto.constructor,
      propertyName: nombre as string,
      options: validationOptions,
      validator: {
        validate(valor: unknown) {
          if (typeof valor !== 'string') return false;

          const instante = aMedianoche(valor);

          if (!instante) return false;

          return instante.getTime() >= hoyAMedianoche().getTime();
        },
        defaultMessage(args: ValidationArguments) {
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