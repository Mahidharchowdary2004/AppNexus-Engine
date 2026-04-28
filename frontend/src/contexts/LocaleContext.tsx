'use client';
// frontend/src/contexts/LocaleContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppConfig } from '@/types/config';

// Built-in translations for UI chrome
const builtInTranslations: Record<string, Record<string, string>> = {
  en: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.noData': 'No data yet',
    'common.error': 'An error occurred',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.prev': 'Previous',
    'table.page': 'Page',
    'table.of': 'of',
    'table.total': 'total records',
    'form.required': 'This field is required',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full Name',
  },
  es: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.loading': 'Cargando...',
    'common.noData': 'Sin datos',
    'common.error': 'Ocurrió un error',
    'common.confirm': 'Confirmar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.prev': 'Anterior',
    'table.page': 'Página',
    'table.of': 'de',
    'table.total': 'registros totales',
    'form.required': 'Este campo es obligatorio',
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.logout': 'Cerrar sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.name': 'Nombre completo',
  },
  fr: {
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.search': 'Rechercher',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée',
    'common.error': 'Une erreur est survenue',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.prev': 'Précédent',
    'table.page': 'Page',
    'table.of': 'sur',
    'table.total': 'enregistrements au total',
    'form.required': 'Ce champ est obligatoire',
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'auth.logout': 'Se déconnecter',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.name': 'Nom complet',
  },
};

interface LocaleContextValue {
  locale: string;
  supportedLocales: string[];
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  supportedLocales: ['en'],
  setLocale: () => {},
  t: (key) => key,
});

interface LocaleProviderProps {
  children: ReactNode;
  appConfig?: AppConfig;
}

export function LocaleProvider({ children, appConfig }: LocaleProviderProps) {
  const defaultLocale = appConfig?.locale?.default || 'en';
  const supportedLocales = appConfig?.locale?.supported || ['en'];
  const configMessages = appConfig?.locale?.messages || {};

  const [locale, setLocaleState] = useState(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem('locale');
    if (saved && supportedLocales.includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    if (supportedLocales.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  }, [supportedLocales]);

  const t = useCallback((key: string, fallback?: string): string => {
    // Check config-provided translations first
    const configTrans = configMessages[locale]?.[key];
    if (configTrans) return configTrans;

    // Fall back to built-in translations
    const builtIn = builtInTranslations[locale]?.[key];
    if (builtIn) return builtIn;

    // Fall back to English
    const englishBuiltin = builtInTranslations['en']?.[key];
    if (englishBuiltin) return englishBuiltin;

    // Fall back to provided fallback or the key itself
    return fallback || key;
  }, [locale, configMessages]);

  return (
    <LocaleContext.Provider value={{ locale, supportedLocales, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
