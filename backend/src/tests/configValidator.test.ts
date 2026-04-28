// backend/src/tests/configValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateAndNormalizeConfig } from '../services/configValidator';

describe('configValidator', () => {
  it('handles null/undefined input', () => {
    const result = validateAndNormalizeConfig(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_ROOT');
  });

  it('handles completely empty object', () => {
    const result = validateAndNormalizeConfig({});
    expect(result.warnings.some(w => w.field === 'name')).toBe(true);
    expect(result.normalized.name).toBe('Untitled App');
  });

  it('auto-generates id from name', () => {
    const result = validateAndNormalizeConfig({ name: 'My Cool App', entities: [], pages: [] });
    expect(result.normalized.id).toBe('my-cool-app');
  });

  it('normalizes unknown field types to text', () => {
    const result = validateAndNormalizeConfig({
      id: 'test', name: 'Test',
      entities: [{ id: 'items', label: 'Items', fields: [{ id: 'x', label: 'X', type: 'unknowntype' }] }],
      pages: [],
    });
    expect(result.normalized.entities[0].fields[0].type).toBe('text');
    expect(result.warnings.some(w => w.message.includes('unknowntype'))).toBe(true);
  });

  it('auto-generates pages for entities when none defined', () => {
    const result = validateAndNormalizeConfig({
      id: 'test', name: 'Test',
      entities: [{ id: 'products', label: 'Product', fields: [{ id: 'name', label: 'Name', type: 'text' }] }],
    });
    expect(result.normalized.pages.length).toBeGreaterThan(0);
    expect(result.normalized.pages[0].components[0].entity).toBe('products');
  });

  it('warns when component references unknown entity', () => {
    const result = validateAndNormalizeConfig({
      id: 'test', name: 'Test',
      entities: [],
      pages: [{ id: 'p', path: '/p', title: 'P', components: [{ type: 'table', entity: 'nonexistent' }] }],
    });
    expect(result.warnings.some(w => w.message.includes('nonexistent'))).toBe(true);
  });

  it('adds default name field to entity with no fields', () => {
    const result = validateAndNormalizeConfig({
      id: 'test', name: 'Test',
      entities: [{ id: 'items', label: 'Items', fields: [] }],
      pages: [],
    });
    expect(result.normalized.entities[0].fields.length).toBe(1);
    expect(result.normalized.entities[0].fields[0].id).toBe('name');
  });

  it('normalizes auth config defaults', () => {
    const result = validateAndNormalizeConfig({ id: 'test', name: 'Test', entities: [], pages: [] });
    expect(result.normalized.auth?.methods).toContain('email');
  });

  it('handles a complete valid config', () => {
    const result = validateAndNormalizeConfig({
      id: 'crm', name: 'CRM', version: '1.0.0',
      entities: [{
        id: 'contacts', label: 'Contact',
        fields: [{ id: 'name', label: 'Name', type: 'text', required: true }],
      }],
      pages: [{ id: 'contacts', path: '/contacts', title: 'Contacts', components: [{ type: 'table', entity: 'contacts' }] }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('generates navigation from pages', () => {
    const result = validateAndNormalizeConfig({
      id: 'test', name: 'Test',
      entities: [],
      pages: [{ id: 'home', path: '/home', title: 'Home', components: [] }],
    });
    expect(result.normalized.navigation?.length).toBe(1);
    expect(result.normalized.navigation?.[0].label).toBe('Home');
  });

  it('converts legacy AI generator schema into supported config', () => {
    const result = validateAndNormalizeConfig({
      appName: 'Inventory Management System',
      models: [
        {
          name: 'products',
          fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
          ],
        },
        {
          name: 'orders',
          fields: [
            { name: 'product_id', type: 'number', required: true },
            { name: 'status', type: 'string', default: 'pending' },
          ],
        },
      ],
      pages: [
        {
          name: 'Products',
          route: '/products',
          components: [
            { type: 'form', model: 'products' },
            { type: 'table', model: 'products' },
          ],
        },
        {
          name: 'Dashboard',
          route: '/dashboard',
          components: [
            { type: 'card', model: 'products' },
          ],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.normalized.name).toBe('Inventory Management System');
    expect(result.normalized.id).toBe('inventory-management-system');
    expect(result.normalized.entities[0].id).toBe('products');
    expect(result.normalized.entities[0].fields[0].id).toBe('name');
    expect(result.normalized.entities[0].fields[0].type).toBe('text');
    expect(result.normalized.pages[0].path).toBe('/products');
    expect(result.normalized.pages[0].components[0].entity).toBe('products');
    expect(result.normalized.pages[1].components[0].type).toBe('stat_card');
    expect(result.warnings.some(w => w.message.includes('legacy AI Generator'))).toBe(true);
  });
});
