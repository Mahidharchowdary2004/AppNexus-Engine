import { EntityConfig, ValidationError as FieldError } from '../types/config';

export function validateRecord(
  data: Record<string, unknown> | null | undefined,
  entity: EntityConfig
): { data: Record<string, unknown>; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const cleaned: Record<string, unknown> = {};

  if (!entity || !entity.fields) {
    return { data: {}, errors: [{ field: 'entity', message: 'Invalid entity configuration', code: 'INVALID_CONFIG' }] };
  }

  const inputData = data || {};

  for (const field of entity.fields) {
    if (field.hidden || field.readOnly) {
      continue;
    }

    let value = inputData[field.id];

    // Handle missing/undefined values
    if (value === undefined || value === null || value === '') {
      if (field.required && field.defaultValue === undefined) {
        errors.push({ field: field.id, message: `${field.label} is required`, code: 'REQUIRED' });
      } else if (field.defaultValue !== undefined) {
        cleaned[field.id] = field.defaultValue;
      }
      continue;
    }

    // Type coercion and validation
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'rich_text':
        value = String(value).trim();
        break;

      case 'url':
        value = String(value).trim();
        if (value && !/^https?:\/\/.+/.test(value as string)) {
          errors.push({ field: field.id, message: `${field.label} must be a valid URL`, code: 'INVALID_URL' });
        }
        break;

      case 'phone':
        value = String(value).trim().replace(/[^0-9]/g, '');
        if (value && !/^[0-9]{10}$/.test(value as string)) {
          errors.push({ field: field.id, message: `${field.label} must be exactly 10 digits`, code: 'INVALID_PHONE' });
        }
        break;

      case 'email':
        value = String(value).toLowerCase().trim();
        // Robust email regex: allows ma@gmail.com, me@mac.com, etc.
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value as string)) {
          errors.push({ field: field.id, message: `${field.label} must be a valid email address`, code: 'INVALID_EMAIL' });
        }
        break;

      case 'number':
        value = Number(value);
        if (isNaN(value as number)) {
          errors.push({ field: field.id, message: `${field.label} must be a number`, code: 'INVALID_NUMBER' });
        } else {
          const num = value as number;
          if (field.validation?.min !== undefined && num < field.validation.min) {
            errors.push({ field: field.id, message: `${field.label} min value is ${field.validation.min}`, code: 'MIN_VALUE' });
          }
          if (field.validation?.max !== undefined && num > field.validation.max) {
            errors.push({ field: field.id, message: `${field.label} max value is ${field.validation.max}`, code: 'MAX_VALUE' });
          }
        }
        break;

      case 'boolean':
        value = value === true || value === 'true' || value === '1' || value === 1;
        break;

      case 'date':
      case 'datetime':
        const d = new Date(value as string);
        if (isNaN(d.getTime())) {
          errors.push({ field: field.id, message: `${field.label} must be a valid date`, code: 'INVALID_DATE' });
        } else {
          value = d.toISOString();
        }
        break;

      case 'select':
        if (field.options && Array.isArray(field.options)) {
          const validOptions = field.options.map(o => typeof o === 'string' ? o : o.value);
          if (!validOptions.includes(value as string)) {
            errors.push({ field: field.id, message: `${field.label} invalid option`, code: 'INVALID_OPTION' });
          }
        }
        break;

      case 'multiselect':
        const values = Array.isArray(value) ? (value as any[]) : [value];
        if (field.options && Array.isArray(field.options)) {
          const validOptions = field.options.map(o => typeof o === 'string' ? o : o.value);
          const invalid = values.filter(v => !validOptions.includes(v as string));
          if (invalid.length > 0) {
            errors.push({ field: field.id, message: `${field.label} invalid options`, code: 'INVALID_OPTIONS' });
          }
        }
        value = values;
        break;

      case 'relation':
        value = String(value);
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            errors.push({ field: field.id, message: `${field.label} must be valid JSON`, code: 'INVALID_JSON' });
          }
        }
        break;

      case 'file':
      case 'image':
        value = String(value);
        break;

      default:
        break;
    }

    cleaned[field.id] = value;
  }

  return { data: cleaned, errors };
}
