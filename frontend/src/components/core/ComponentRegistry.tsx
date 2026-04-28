'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { ComponentConfig, EntityConfig, AppConfig } from '@/types/config';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi } from '@/lib/api';
import { ErrorState, UnknownComponentState, MissingFieldsState, TableSkeleton } from './StatusStates';

// Dynamic imports for code splitting
const DynamicTable = dynamic(() => import('./DynamicTable').then(mod => mod.DynamicTable), {
  loading: () => <TableSkeleton />,
  ssr: false
});

const DynamicChart = dynamic(() => import('./DynamicChart').then(mod => mod.DynamicChart), {
  loading: () => <div className="h-64 animate-pulse bg-slate-50 rounded-3xl" />,
  ssr: false
});

const DynamicStatCard = dynamic(() => import('./DynamicStatCard').then(mod => mod.DynamicStatCard), {
  loading: () => <div className="h-32 animate-pulse bg-slate-50 rounded-3xl" />,
  ssr: false
});

const DynamicCardGrid = dynamic(() => import('./DynamicCardGrid').then(mod => mod.DynamicCardGrid), {
  loading: () => <div className="grid grid-cols-3 gap-4"><div className="h-48 animate-pulse bg-slate-50 rounded-3xl" /></div>,
  ssr: false
});

const DynamicKanban = dynamic(() => import('./DynamicKanban').then(mod => mod.DynamicKanban), {
  loading: () => <div className="h-96 animate-pulse bg-slate-50 rounded-3xl" />,
  ssr: false
});

const DynamicForm = dynamic(() => import('./DynamicForm').then(mod => mod.DynamicForm), {
  loading: () => <div className="h-64 animate-pulse bg-slate-50 rounded-3xl" />,
  ssr: false
});

interface ComponentRendererProps {
  component: ComponentConfig;
  appSlug: string;
  appConfig: AppConfig;
}

// Registry maps component type → React component
type ComponentRegistryEntry = React.ComponentType<{
  component: ComponentConfig;
  entity?: EntityConfig;
  appSlug: string;
  appConfig: AppConfig;
}>;

const COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry> = {
  table: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="table" fields={['entity']} />;
    return <DynamicTable appSlug={appSlug} entity={entity} component={component} />;
  },

  form: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="form" fields={['entity']} />;
    return <StandaloneForm appSlug={appSlug} entity={entity} component={component} />;
  },

  card_grid: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="card_grid" fields={['entity']} />;
    return <DynamicCardGrid appSlug={appSlug} entity={entity} component={component} />;
  },

  kanban: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="kanban" fields={['entity']} />;
    return <DynamicKanban appSlug={appSlug} entity={entity} component={component} />;
  },

  chart: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="chart" fields={['entity']} />;
    const missing = [];
    if (!component.chart?.type) missing.push('chart.type');
    if (!component.chart?.xField) missing.push('chart.xField');
    if (!component.chart?.yField) missing.push('chart.yField');
    if (missing.length > 0) return <MissingFieldsState type="chart" fields={missing} />;
    
    return <DynamicChart appSlug={appSlug} entity={entity} component={component} />;
  },

  stat_card: ({ component, entity, appSlug }) => {
    if (!entity) return <MissingFieldsState type="stat_card" fields={['entity']} />;
    return <DynamicStatCard appSlug={appSlug} entity={entity} component={component} />;
  },

  markdown: ({ component }) => {
    if (!component.content) return <MissingFieldsState type="markdown" fields={['content']} />;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm shadow-slate-200/50 p-8 prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{component.content}</pre>
      </div>
    );
  },

  embed: ({ component }) => {
    if (!component.src) return <MissingFieldsState type="embed" fields={['src']} />;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
        <iframe 
          src={component.src} 
          className="w-full h-[500px]" 
          title={component.title || 'Embedded content'} 
          loading="lazy"
        />
      </div>
    );
  },

  custom: ({ component }) => {
    const customName = component.customComponent;
    if (!customName) return <MissingFieldsState type="custom" fields={['customComponent']} />;
    const CustomComp = CUSTOM_REGISTRY[customName];
    if (!CustomComp) {
      return (
        <ErrorState 
          title="Custom Component Not Found" 
          message={`Component "${customName}" is not registered in CUSTOM_REGISTRY.`} 
        />
      );
    }
    return <CustomComp props={component.props || {}} />;
  },
};

const CUSTOM_REGISTRY: Record<string, React.ComponentType<{ props: Record<string, unknown> }>> = {
  // Add custom components here
};

function StandaloneForm({
  component,
  entity,
  appSlug,
}: {
  component: ComponentConfig;
  entity: EntityConfig;
  appSlug: string;
}) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => dataApi.create(appSlug, entity.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', appSlug, entity.id] });
    },
  });

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm shadow-slate-200/50 p-8 md:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{component.title || `Create ${entity.label}`}</h2>
        {component.description && (
          <p className="text-lg text-slate-500 mt-2 leading-relaxed">{component.description}</p>
        )}
      </div>

      <DynamicForm
        entity={entity}
        visibleFields={component.fields}
        loading={createMutation.isPending}
        submitLabel={component.title ? `Save ${component.title}` : `Create ${entity.label}`}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
      />

      {createMutation.isSuccess && (
        <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3">
          <span className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold">✓</span>
          {entity.label} created successfully.
        </div>
      )}

      {createMutation.isError && (
        <div className="mt-6">
          <ErrorState 
            title="Form Submission Failed" 
            message={(createMutation.error as Error).message} 
          />
        </div>
      )}
    </div>
  );
}

export function ComponentRenderer({ component, appSlug, appConfig }: ComponentRendererProps) {
  const entity = component.entity
    ? appConfig.entities.find(e => e.id === component.entity)
    : undefined;

  const Renderer = COMPONENT_REGISTRY[component.type];

  if (!Renderer) {
    return <UnknownComponentState type={component.type} />;
  }

  return (
    <ErrorBoundary componentType={component.type}>
      <Renderer
        component={component}
        entity={entity}
        appSlug={appSlug}
        appConfig={appConfig}
      />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; componentType: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState 
          title={`Component "${this.props.componentType}" Crashed`}
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
