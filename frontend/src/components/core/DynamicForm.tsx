'use client';
// frontend/src/components/core/DynamicForm.tsx
// Renders a form for any entity based on FieldConfig[]

import { useForm, Controller } from 'react-hook-form';
import { FieldConfig, EntityConfig } from '@/types/config';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

interface DynamicFormProps {
  entity: EntityConfig;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  visibleFields?: string[];
}

export function DynamicForm({
  entity,
  defaultValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
  visibleFields,
}: DynamicFormProps) {
  const { t } = useLocale();

  const fields = entity.fields.filter(f => {
    if (f.hidden) return false;
    if (visibleFields && !visibleFields.includes(f.id)) return false;
    return true;
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: fields.reduce((acc, f) => {
      acc[f.id] = defaultValues[f.id] ?? f.defaultValue ?? '';
      return acc;
    }, {} as Record<string, unknown>),
  });

  if (fields.length === 0) {
    return (
      <div className="p-10 text-center text-slate-400 font-bold italic border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
        No visible fields configured for this form.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {fields.map(field => {
          const isFullWidth = ['textarea', 'rich_text', 'markdown', 'embed'].includes(field.type);
          return (
            <div key={field.id} className={cn(isFullWidth ? "md:col-span-2" : "md:col-span-1")}>
              <FieldRenderer
                field={field}
                register={register}
                control={control}
                error={errors[field.id]?.message as string}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('common.loading')}
            </div>
          ) : (submitLabel || t('common.save'))}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

interface FieldRendererProps {
  field: FieldConfig;
  register: any;
  control: any;
  error?: string;
}

function FieldRenderer({ field, register, control, error }: FieldRendererProps) {
  const { t } = useLocale();

  const labelEl = (
    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
      {t(field.label)}
      {field.required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );

  const errorEl = error && (
    <div className="flex items-center gap-1.5 text-rose-600 mt-2 font-bold text-[11px] px-1 animate-in slide-in-from-top-1 duration-200">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </div>
  );

  const hintEl = field.hint && !error && (
    <p className="text-[11px] text-slate-400 mt-2 font-semibold leading-tight px-1">{field.hint}</p>
  );

  const baseInputClass = cn(
    'w-full px-5 py-4 rounded-2xl text-base font-semibold transition-all duration-200 outline-none border-2',
    'hover:border-slate-200',
    error 
      ? 'border-rose-100 bg-rose-50/50 text-rose-900 focus:border-rose-300 focus:bg-white' 
      : 'border-slate-100 bg-slate-50/50 text-slate-900 focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10',
    field.readOnly ? 'bg-slate-100/50 cursor-not-allowed border-slate-100 text-slate-400' : ''
  );

  const validation: Record<string, unknown> = {};
  if (field.required) validation.required = field.label + ' is required';
  if (field.validation?.minLength) validation.minLength = { value: field.validation.minLength, message: `Min ${field.validation.minLength} chars` };
  if (field.validation?.maxLength) validation.maxLength = { value: field.validation.maxLength, message: `Max ${field.validation.maxLength} chars` };
  if (field.validation?.min) validation.min = { value: field.validation.min, message: `Min value ${field.validation.min}` };
  if (field.validation?.max) validation.max = { value: field.validation.max, message: `Max value ${field.validation.max}` };
  if (field.type === 'email') validation.pattern = { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' };

  switch (field.type) {
    case 'textarea':
    case 'rich_text':
      return (
        <div>
          {labelEl}
          <textarea
            {...register(field.id, validation)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            rows={4}
            className={baseInputClass + ' resize-none'}
          />
          {errorEl}{hintEl}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border-2 border-slate-100 hover:border-blue-100 transition-colors">
          <div className="flex flex-col">
             <label className="text-sm font-bold text-slate-700">{field.label}</label>
             {field.hint && <p className="text-[11px] text-slate-400 font-medium">{field.hint}</p>}
          </div>
          <Controller
            name={field.id}
            control={control}
            rules={validation as any}
            render={({ field: f }) => (
              <button
                type="button"
                role="switch"
                aria-checked={!!f.value}
                onClick={() => !field.readOnly && f.onChange(!f.value)}
                className={cn(
                  'relative inline-flex h-7 w-12 items-center rounded-full transition-all',
                  f.value ? 'bg-blue-600' : 'bg-slate-200',
                  field.readOnly && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm',
                  f.value ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            )}
          />
          {errorEl}
        </div>
      );

    case 'select':
      return (
        <div>
          {labelEl}
          <select
            {...register(field.id, validation)}
            disabled={field.readOnly}
            className={baseInputClass}
          >
            <option value="">{field.placeholder || `Select ${field.label}...`}</option>
            {(field.options || []).map(opt => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt : opt.label;
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
          {errorEl}{hintEl}
        </div>
      );

    case 'multiselect':
      return (
        <div>
          {labelEl}
          <Controller
            name={field.id}
            control={control}
            rules={validation as any}
            render={({ field: f }) => {
              const selected: string[] = Array.isArray(f.value) ? f.value : [];
              const options = (field.options || []).map(opt =>
                typeof opt === 'string' ? { value: opt, label: opt } : opt
              );
              return (
                <div className={cn(baseInputClass, "flex flex-wrap gap-2 min-h-[58px] items-center")}>
                  {selected.map(v => (
                    <span key={v} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-100">
                      {v}
                      {!field.readOnly && (
                        <button type="button" onClick={() => f.onChange(selected.filter(s => s !== v))} className="hover:text-rose-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} strokeLinecap="round"/></svg>
                        </button>
                      )}
                    </span>
                  ))}
                  {!field.readOnly && (
                    <select
                      className="border-none outline-none text-sm bg-transparent flex-1 min-w-[120px] font-bold text-slate-400"
                      value=""
                      onChange={e => {
                        if (e.target.value && !selected.includes(e.target.value)) {
                          f.onChange([...selected, e.target.value]);
                        }
                      }}
                    >
                      <option value="">+ Add item</option>
                      {options.filter(o => !selected.includes(o.value)).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            }}
          />
          {errorEl}{hintEl}
        </div>
      );

    case 'date':
    case 'datetime':
      return (
        <div>
          {labelEl}
          <input 
            type={field.type === 'date' ? 'date' : 'datetime-local'} 
            {...register(field.id, validation)} 
            readOnly={field.readOnly} 
            className={baseInputClass} 
          />
          {errorEl}{hintEl}
        </div>
      );

    case 'number':
      return (
        <div>
          {labelEl}
          <input
            type="number"
            {...register(field.id, { ...validation, valueAsNumber: true })}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
          {errorEl}{hintEl}
        </div>
      );

    case 'color':
      return (
        <div>
          {labelEl}
          <div className="flex gap-3">
            <input type="color" {...register(field.id, validation)} className="h-[58px] w-20 rounded-2xl border-2 border-slate-100 cursor-pointer bg-white p-1" />
            <input type="text" {...register(field.id, validation)} placeholder="#000000" className={baseInputClass + ' flex-1'} />
          </div>
          {errorEl}{hintEl}
        </div>
      );

    case 'password':
      return (
        <div>
          {labelEl}
          <input
            type="password"
            {...register(field.id, validation)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
          {errorEl}{hintEl}
        </div>
      );

    default:
      const knownTypes = ['text', 'email', 'url', 'phone', 'password', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'textarea', 'rich_text', 'color'];
      if (!knownTypes.includes(field.type)) {
        return (
          <div className="p-5 bg-rose-50/50 rounded-3xl border-2 border-dashed border-rose-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-12 h-12 text-rose-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
            </div>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Incompatible Field Type</p>
            <p className="text-sm font-bold text-rose-900">{field.label}</p>
            <p className="text-[11px] text-rose-600/70 mt-1 font-medium italic">"The type <code className="bg-rose-100 px-1.5 py-0.5 rounded text-rose-900 font-mono">{field.type}</code> is not supported by the current renderer."</p>
          </div>
        );
      }
      return (
        <div>
          {labelEl}
          <input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            {...register(field.id, validation)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
          {errorEl}{hintEl}
        </div>
      );
  }
}
