// backend/src/services/configValidator.ts
// Validates and normalizes AppConfig — handles missing, inconsistent, partial inputs

import { AppConfig, ConfigValidationResult, FieldConfig, EntityConfig, PageConfig, NavigationItem } from '../types/config';

const DEFAULT_FIELD_TYPES = ['text', 'email', 'password', 'number', 'boolean', 'date', 'datetime', 'select', 'multiselect', 'textarea', 'rich_text', 'file', 'image', 'relation', 'json', 'color', 'url', 'phone'];

export function validateAndNormalizeConfig(raw: unknown): ConfigValidationResult {
  const errors: ConfigValidationResult['errors'] = [];
  const warnings: ConfigValidationResult['warnings'] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Config must be a JSON object', code: 'INVALID_ROOT' }],
      warnings: [],
      normalized: createMinimalConfig(),
    };
  }

  const config = preprocessLegacyGeneratorConfig(raw as Record<string, unknown>, warnings);

  // --- Normalize ID ---
  const id = typeof config.id === 'string' && config.id.trim()
    ? config.id.trim()
    : generateId(config.name as string);

  if (!config.id) {
    warnings.push({ field: 'id', message: 'Missing id — auto-generated from name' });
  }

  // --- Normalize name ---
  const name = typeof config.name === 'string' && config.name.trim()
    ? config.name.trim()
    : 'Untitled App';

  if (!config.name) {
    warnings.push({ field: 'name', message: 'Missing name — defaulted to "Untitled App"' });
  }

  // --- Normalize version ---
  const version = typeof config.version === 'string' ? config.version : '1.0.0';

  // --- Normalize entities ---
  const rawEntities = Array.isArray(config.entities) ? config.entities : [];
  if (!Array.isArray(config.entities)) {
    warnings.push({ field: 'entities', message: 'No entities defined — app will have no data models' });
  }

  const entities: EntityConfig[] = rawEntities
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e, i) => normalizeEntity(e, i, errors, warnings));

  // --- Normalize pages ---
  const rawPages = Array.isArray(config.pages) ? config.pages : [];
  const pages: PageConfig[] = rawPages
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p, i) => normalizePage(p, i, entities, errors, warnings));

  // Ensure every entity has at least one page
  const entitiesWithPages = new Set(pages.flatMap(p => p.components.map(c => c.entity).filter(Boolean)));
  const missingEntities = entities.filter(e => !entitiesWithPages.has(e.id));

  if (missingEntities.length > 0) {
    warnings.push({ 
      field: 'pages', 
      message: `Auto-generating CRUD pages for ${missingEntities.length} entities that didn't have pages defined.` 
    });
    missingEntities.forEach(entity => {
      pages.push(autoGeneratePage(entity));
    });
  }

  // --- Normalize auth ---
  const rawAuth = config.auth as Record<string, unknown> | undefined;
  const auth = normalizeAuth(rawAuth, warnings);

  // --- Normalize locale ---
  const rawLocale = config.locale as Record<string, unknown> | undefined;
  const locale = normalizeLocale(rawLocale, warnings);

  // --- Normalize theme ---
  const theme = (typeof config.theme === 'object' && config.theme !== null)
    ? config.theme as AppConfig['theme']
    : {};

  // --- Normalize navigation ---
  let navigation: NavigationItem[] = Array.isArray(config.navigation)
    ? [...(config.navigation as NavigationItem[])]
    : generateNavigation(pages);

  // Ensure all pages are accessible in navigation
  const pagesInNav = new Set(navigation.map((n: any) => n.page || n.id));
  const missingPages = pages.filter(p => !pagesInNav.has(p.id));
  
  if (missingPages.length > 0) {
    // Append missing pages to navigation
    missingPages.forEach(p => {
      navigation.push({
        id: p.id,
        label: p.title,
        icon: p.icon || 'database',
        page: p.id,
        path: p.path
      });
    });
  }

  // Sort navigation: Always put Dashboard at the top
  navigation.sort((a: any, b: any) => {
    const isADashboard = a.id === 'dashboard' || a.label?.toLowerCase() === 'dashboard' || a.page === 'dashboard';
    const isBDashboard = b.id === 'dashboard' || b.label?.toLowerCase() === 'dashboard' || b.page === 'dashboard';
    if (isADashboard) return -1;
    if (isBDashboard) return 1;
    return 0;
  });

  // --- Normalize notifications ---
  const notifications = normalizeNotifications(config.notifications, warnings);

  // --- Normalize integrations ---
  const integrations: AppConfig['integrations'] = (typeof config.integrations === 'object' && config.integrations !== null)
    ? config.integrations as AppConfig['integrations']
    : {
      csvImport: { enabled: true, entities: entities.map(e => e.id) },
      export: { enabled: true, formats: ['csv', 'json'] as const },
    };

  // --- Post-normalization ID deduplication ---
  const entityIds = new Set<string>();
  entities.forEach(e => {
    let originalId = e.id;
    let counter = 1;
    while (entityIds.has(e.id)) {
      e.id = `${originalId}_${counter++}`;
    }
    entityIds.add(e.id);
  });

  const pageIds = new Set<string>();
  pages.forEach(p => {
    let originalId = p.id;
    let counter = 1;
    while (pageIds.has(p.id)) {
      p.id = `${originalId}_${counter++}`;
    }
    pageIds.add(p.id);
  });

  const normalized: AppConfig = {
    id,
    name,
    version,
    description: typeof config.description === 'string' ? config.description : undefined,
    locale,
    theme,
    auth,
    entities,
    pages,
    navigation,
    notifications,
    integrations,
    settings: typeof config.settings === 'object' ? config.settings as Record<string, unknown> : {},
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  };
}

function normalizeEntity(
  raw: Record<string, unknown>,
  index: number,
  errors: ConfigValidationResult['errors'],
  warnings: ConfigValidationResult['warnings']
): EntityConfig {
  const id = typeof raw.id === 'string' && raw.id.trim()
    ? raw.id.trim()
    : `entity_${index}`;

  if (!raw.id) {
    warnings.push({ field: `entities[${index}].id`, message: `Missing entity id — defaulted to "${id}"` });
  }

  const label = typeof raw.label === 'string' ? raw.label : id;
  const rawFields = Array.isArray(raw.fields) ? raw.fields : [];

  if (rawFields.length === 0) {
    warnings.push({ field: `entities[${index}].fields`, message: `Entity "${id}" has no fields — adding default "name" field` });
    rawFields.push({ id: 'name', label: 'Name', type: 'text', required: true });
  }

  // Always ensure id field is tracked (virtual)
  const fields: FieldConfig[] = rawFields
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f, fi) => normalizeField(f, fi, id, warnings));

  return {
    id,
    label,
    labelPlural: typeof raw.labelPlural === 'string' ? raw.labelPlural : `${label}s`,
    icon: typeof raw.icon === 'string' ? raw.icon : 'database',
    fields,
    permissions: raw.permissions as EntityConfig['permissions'],
    softDelete: raw.softDelete !== false,
    timestamps: raw.timestamps !== false,
    userScoped: raw.userScoped === true,
  };
}

function normalizeField(
  raw: Record<string, unknown>,
  index: number,
  entityId: string,
  warnings: ConfigValidationResult['warnings']
): FieldConfig {
  const id = typeof raw.id === 'string' && raw.id.trim()
    ? raw.id.trim()
    : `field_${index}`;

  if (!raw.id) {
    warnings.push({ field: `${entityId}.fields[${index}].id`, message: `Missing field id — defaulted to "${id}"` });
  }

  // Validate and coerce field type
  let type = raw.type as string;
  if (!DEFAULT_FIELD_TYPES.includes(type)) {
    warnings.push({ field: `${entityId}.${id}.type`, message: `Unknown field type "${type}" — defaulted to "text"` });
    type = 'text';
  }

  // Normalize options for select types
  let options = raw.options;
  if ((type === 'select' || type === 'multiselect') && !Array.isArray(options)) {
    warnings.push({ field: `${entityId}.${id}.options`, message: 'Select field missing options — defaulted to empty' });
    options = [];
  }

  return {
    id,
    label: typeof raw.label === 'string' ? raw.label : id,
    type: type as FieldConfig['type'],
    required: raw.required === true,
    defaultValue: raw.defaultValue,
    placeholder: typeof raw.placeholder === 'string' ? raw.placeholder : undefined,
    hint: typeof raw.hint === 'string' ? raw.hint : undefined,
    options: options as FieldConfig['options'],
    validation: typeof raw.validation === 'object' ? raw.validation as FieldConfig['validation'] : undefined,
    relation: typeof raw.relation === 'object' ? raw.relation as FieldConfig['relation'] : undefined,
    hidden: raw.hidden === true,
    readOnly: raw.readOnly === true,
  };
}

function normalizePage(
  raw: Record<string, unknown>,
  index: number,
  entities: EntityConfig[],
  errors: ConfigValidationResult['errors'],
  warnings: ConfigValidationResult['warnings']
): PageConfig {
  const id = typeof raw.id === 'string' ? raw.id : `page_${index}`;
  const path = typeof raw.path === 'string' ? raw.path : `/${id}`;
  const title = typeof raw.title === 'string' ? raw.title : id;

  const rawComponents = Array.isArray(raw.components) ? raw.components : [];
  const components = rawComponents
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map(c => {
      const type = typeof c.type === 'string' ? c.type : 'table';
      const entity = typeof c.entity === 'string' ? c.entity : undefined;

      // Validate entity reference
      if (entity && !entities.find(e => e.id === entity)) {
        warnings.push({ field: `pages.${id}.components`, message: `Component references unknown entity "${entity}"` });
      }

      const validTypes = ['table', 'form', 'detail', 'card_grid', 'kanban', 'chart', 'stat_card', 'calendar', 'timeline', 'markdown', 'embed', 'custom'];
      return {
        type: validTypes.includes(type) ? type : 'table',
        id: typeof c.id === 'string' ? c.id : undefined,
        entity,
        title: typeof c.title === 'string' ? c.title : undefined,
        actions: Array.isArray(c.actions) ? c.actions : ['create', 'edit', 'delete'],
        fields: Array.isArray(c.fields) ? c.fields : undefined,
        filters: Array.isArray(c.filters) ? c.filters : [],
        pagination: typeof c.pagination === 'object' ? c.pagination : { pageSize: 20 },
        chart: c.chart as PageConfig['components'][0]['chart'],
        content: typeof c.content === 'string' ? c.content : undefined,
        props: typeof c.props === 'object' ? c.props as Record<string, unknown> : {},
      };
    }) as PageConfig['components'];

  return {
    id,
    path,
    title,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    layout: (['full', 'sidebar', 'centered'].includes(raw.layout as string) ? raw.layout : 'sidebar') as PageConfig['layout'],
    requireAuth: raw.requireAuth !== false,
    components,
  };
}

function normalizeAuth(
  raw: Record<string, unknown> | undefined,
  warnings: ConfigValidationResult['warnings']
): AppConfig['auth'] {
  if (!raw) {
    warnings.push({ field: 'auth', message: 'No auth config — defaulting to email/password auth' });
  }
  const methods = Array.isArray(raw?.methods)
    ? raw.methods as NonNullable<AppConfig['auth']>['methods']
    : ['email'] as NonNullable<AppConfig['auth']>['methods'];
  return {
    enabled: raw?.enabled !== false,
    methods,
    userScoped: raw?.userScoped === true,
    roles: Array.isArray(raw?.roles) ? raw.roles as NonNullable<AppConfig['auth']>['roles'] : [
      { id: 'admin', label: 'Admin' },
      { id: 'user', label: 'User' },
    ],
  };
}

function normalizeLocale(
  raw: Record<string, unknown> | undefined,
  warnings: ConfigValidationResult['warnings']
): AppConfig['locale'] {
  return {
    default: typeof raw?.default === 'string' ? raw.default : 'en',
    supported: Array.isArray(raw?.supported) ? raw!.supported as string[] : ['en'],
  };
}

function normalizeNotifications(
  raw: unknown,
  warnings: ConfigValidationResult['warnings']
): AppConfig['notifications'] {
  if (!raw || typeof raw !== 'object') return { events: [] };
  const r = raw as Record<string, unknown>;
  return {
    events: Array.isArray(r.events) ? r.events as NonNullable<AppConfig['notifications']>['events'] : [],
  };
}

function autoGeneratePage(entity: EntityConfig): PageConfig {
  return {
    id: `${entity.id}-list`,
    path: `/${entity.id}`,
    title: entity.labelPlural || `${entity.label}s`,
    icon: entity.icon,
    layout: 'sidebar',
    requireAuth: true,
    components: [{
      type: 'table',
      entity: entity.id,
      actions: ['create', 'edit', 'delete', 'export'],
      pagination: { pageSize: 20 },
    }],
  };
}

function generateNavigation(pages: PageConfig[]): NavigationItem[] {
  return pages.map(p => ({
    id: p.id,
    label: p.title,
    icon: p.icon,
    page: p.id,
    path: p.path,
  }));
}

function generateId(name: unknown): string {
  if (typeof name === 'string') {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  return `app-${Date.now()}`;
}

function createMinimalConfig(): AppConfig {
  return {
    id: 'minimal',
    name: 'Untitled App',
    version: '1.0.0',
    entities: [],
    pages: [],
  };
}

function preprocessLegacyGeneratorConfig(
  raw: Record<string, unknown>,
  warnings: ConfigValidationResult['warnings']
): Record<string, unknown> {
  const hasLegacyShape =
    typeof raw.appName === 'string' ||
    Array.isArray(raw.models) ||
    (Array.isArray(raw.pages) && raw.pages.some(page =>
      typeof page === 'object' &&
      page !== null &&
      ('route' in page || 'name' in page)
    ));

  if (!hasLegacyShape) return raw;

  warnings.push({
    field: 'root',
    message: 'Converted legacy AI Generator JSON to the supported app config schema',
  });

  const normalizedEntities = Array.isArray(raw.models)
    ? raw.models
      .filter((model): model is Record<string, unknown> => typeof model === 'object' && model !== null)
      .map((model, index) => {
        const modelName = typeof model.name === 'string' && model.name.trim()
          ? model.name.trim()
          : `entity_${index}`;

        const label = toTitleCase(singularize(modelName));
        const labelPlural = toTitleCase(modelName);
        const rawFields = Array.isArray(model.fields) ? model.fields : [];

        return {
          id: modelName,
          label,
          labelPlural,
          fields: rawFields
            .filter((field): field is Record<string, unknown> => typeof field === 'object' && field !== null)
            .map((field, fieldIndex) => ({
              id: typeof field.name === 'string' && field.name.trim()
                ? field.name.trim()
                : `field_${fieldIndex}`,
              label: typeof field.label === 'string' && field.label.trim()
                ? field.label.trim()
                : toTitleCase(typeof field.name === 'string' ? field.name : `field_${fieldIndex}`),
              type: mapLegacyFieldType(field.type),
              required: field.required === true,
              defaultValue: field.default,
              options: Array.isArray(field.options) ? field.options : undefined,
            })),
        };
      })
    : raw.entities;

  const normalizedPages = Array.isArray(raw.pages)
    ? raw.pages
      .filter((page): page is Record<string, unknown> => typeof page === 'object' && page !== null)
      .map((page, index) => {
        const title = typeof page.title === 'string' && page.title.trim()
          ? page.title.trim()
          : typeof page.name === 'string' && page.name.trim()
            ? page.name.trim()
            : `Page ${index + 1}`;
        const path = typeof page.path === 'string' && page.path.trim()
          ? page.path.trim()
          : typeof page.route === 'string' && page.route.trim()
            ? page.route.trim()
            : `/${generateId(title)}`;

        const components = Array.isArray(page.components)
          ? page.components
            .filter((component): component is Record<string, unknown> => typeof component === 'object' && component !== null)
            .map(component => ({
              ...component,
              type: mapLegacyComponentType(component.type),
              entity: typeof component.entity === 'string' ? component.entity : component.model,
            }))
          : [];

        return {
          id: typeof page.id === 'string' && page.id.trim() ? page.id.trim() : generateId(title),
          title,
          path,
          components,
        };
      })
    : raw.pages;

  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : generateId(typeof raw.appName === 'string' ? raw.appName : raw.name),
    name: typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : typeof raw.appName === 'string' && raw.appName.trim()
        ? raw.appName.trim()
        : raw.name,
    entities: normalizedEntities,
    pages: normalizedPages,
  };
}

function mapLegacyFieldType(type: unknown): string {
  switch (type) {
    case 'string':
      return 'text';
    default:
      return typeof type === 'string' ? type : 'text';
  }
}

function mapLegacyComponentType(type: unknown): string {
  switch (type) {
    case 'card':
      return 'stat_card';
    default:
      return typeof type === 'string' ? type : 'table';
  }
}

function singularize(value: string): string {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
