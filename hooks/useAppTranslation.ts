import { useTranslation } from 'react-i18next';
import { setLanguage, getLanguage } from '@/services/i18n';

export const useAppTranslation = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = async (lang: 'es' | 'en') => {
    await setLanguage(lang);
  };

  const getCurrentLanguage = async (): Promise<'es' | 'en'> => {
    return await getLanguage();
  };

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    currentLanguage: (i18n.language as 'es' | 'en') || 'es',
  };
};
