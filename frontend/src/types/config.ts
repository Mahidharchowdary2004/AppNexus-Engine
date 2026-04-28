// shared/types/config.ts
// Full type definitions for the config-driven app system

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'rich_text'
  | 'file'
  | 'image'
  | 'relation'
  | 'json'
  | 'color'
  | 'url'
  | 'phone';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  hint?: string;
  options?: string[] | { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: string; // JS expression
  };
  relation?: {
    entity: string;
    displayField: string;
    multiple?: boolean;
  };
  computed?: string; // JS expression
  hidden?: boolean;
  readOnly?: boolean;
  localized?: boolean;
}

export interface EntityConfig {
  id: string;
  label: string;
  labelPlural?: string;
  icon?: string;
  fields: FieldConfig[];
  permissions?: {
    create?: string[]; // role ids
    read?: string[];
    update?: string[];
    delete?: string[];
  };
  hooks?: {
    beforeCreate?: string;
    afterCreate?: string;
    beforeUpdate?: string;
    afterUpdate?: string;
    beforeDelete?: string;
    afterDelete?: string;
  };
  indexes?: string[];
  softDelete?: boolean;
  timestamps?: boolean;
  userScoped?: boolean;
}

export type ComponentType =
  | 'table'
  | 'form'
  | 'detail'
  | 'card_grid'
  | 'kanban'
  | 'chart'
  | 'stat_card'
  | 'calendar'
  | 'timeline'
  | 'markdown'
  | 'embed'
  | 'custom';

export interface ComponentConfig {
  type: ComponentType;
  id?: string;
  entity?: string;
  title?: string;
  description?: string;
  fields?: string[]; // subset of entity fields to show
  actions?: ('create' | 'edit' | 'delete' | 'export' | 'import' | string)[];
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
    value?: unknown;
    userInput?: boolean; // show as filter UI
  }[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  pagination?: { pageSize: number };
  columns?: { field: string; width?: string; sortable?: boolean }[];
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'donut' | 'area';
    xField: string;
    yField: string;
    groupBy?: string;
  };
  content?: string; // for markdown component
  src?: string; // for embed component
  customComponent?: string; // registered component name
  props?: Record<string, unknown>;
}

export interface PageConfig {
  id: string;
  path: string;
  title: string;
  icon?: string;
  layout?: 'full' | 'sidebar' | 'centered';
  requireAuth?: boolean;
  roles?: string[];
  components: ComponentConfig[];
  meta?: {
    title?: string;
    description?: string;
  };
}

export interface AuthConfig {
  enabled: boolean;
  methods: ('email' | 'google' | 'github' | 'magic_link')[];
  userScoped?: boolean;
  roles?: {
    id: string;
    label: string;
    permissions?: string[];
  }[];
  customFields?: FieldConfig[]; // extra user profile fields
  ui?: {
    logo?: string;
    primaryColor?: string;
    welcomeMessage?: string;
  };
}

export interface LocaleConfig {
  default: string;
  supported: string[];
  messages?: Record<string, Record<string, string>>;
}

export interface NotificationEvent {
  trigger: string; // e.g. "record.created", "record.updated", "custom.event"
  entity?: string;
  condition?: string; // JS expression
  email?: {
    to: string | string[];
    subject: string;
    template?: string;
    body?: string;
  };
  webhook?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
}

export interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  darkMode?: boolean | 'system';
  logo?: string;
  favicon?: string;
  customCSS?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  page?: string;
  children?: NavigationItem[];
  roles?: string[];
}

export interface AppConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  locale?: LocaleConfig;
  theme?: ThemeConfig;
  auth?: AuthConfig;
  entities: EntityConfig[];
  pages: PageConfig[];
  navigation?: NavigationItem[];
  notifications?: {
    events: NotificationEvent[];
  };
  integrations?: {
    csvImport?: {
      enabled: boolean;
      entities: string[];
    };
    export?: {
      enabled: boolean;
      formats: ('csv' | 'json' | 'xlsx')[];
    };
  };
  settings?: Record<string, unknown>;
}

// Runtime types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: { field: string; message: string }[];
  normalized: AppConfig;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}
