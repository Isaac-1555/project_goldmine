import { useState, useEffect } from 'react';
import type { SummaryConfig } from '../types/summaryTypes';

export interface UserSummarySettings {
  includeInfographics: boolean;
  autoGenerateInfographic?: boolean;
  preferredInfographicType?: 'mindmap' | 'cycle' | 'pyramid' | 'timeline' | 'comparison' | 'process' | 'hierarchy' | 'auto';
  autoTags: boolean;
  llmProvider: 'gemini' | 'openai' | 'claude' | 'anthropic';
  subjectArea: SummaryConfig['subjectArea'];
  academicLevel: SummaryConfig['academicLevel'];
  lengthPreference: SummaryConfig['lengthPreference'];
}

const SETTINGS_KEY = 'sat-brain_summary_settings';

const defaultSettings: UserSummarySettings = {
  includeInfographics: false,
  autoGenerateInfographic: true,
  preferredInfographicType: 'auto',
  autoTags: true,
  llmProvider: 'gemini',
  subjectArea: 'General',
  academicLevel: 'Undergraduate',
  lengthPreference: 'standard'
};

export function useSettingsConfig() {
  const [settings, setSettings] = useState<UserSummarySettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const updateSetting = <K extends keyof UserSummarySettings>(
    key: K,
    value: UserSummarySettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  // Convert to SummaryConfig partial for use in summary generation
  const getSummaryConfig = (): Partial<SummaryConfig> => {
    return {
      subjectArea: settings.subjectArea,
      academicLevel: settings.academicLevel,
      lengthPreference: settings.lengthPreference,
      includeInfographics: settings.includeInfographics,
      autoGenerateInfographic: settings.autoGenerateInfographic,
      preferredInfographicType: settings.preferredInfographicType,
      autoTags: settings.autoTags,
      llmProvider: settings.llmProvider,
      includeCodeExamples: true, // Default true for now
      includeMathDerivations: true, // Default true for now
    };
  };

  return {
    settings,
    updateSetting,
    resetSettings,
    getSummaryConfig
  };
}