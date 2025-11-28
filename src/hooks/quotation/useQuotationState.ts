import { useState } from 'react';
import { Assembly } from '../../types';

export interface QuotationState {
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  showComponentSelector: boolean;
  setShowComponentSelector: (show: boolean) => void;
  selectedSystemId: string;
  setSelectedSystemId: (id: string) => void;
  componentSearchText: string;
  setComponentSearchText: (text: string) => void;
  showProjectPicker: boolean;
  setShowProjectPicker: (show: boolean) => void;
  selectorTab: 'components' | 'assemblies' | 'custom';
  setSelectorTab: (tab: 'components' | 'assemblies' | 'custom') => void;
  showAssemblyDetail: boolean;
  setShowAssemblyDetail: (show: boolean) => void;
  selectedAssemblyForDetail: Assembly | null;
  setSelectedAssemblyForDetail: (assembly: Assembly | null) => void;
}

export function useQuotationState(): QuotationState {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [componentSearchText, setComponentSearchText] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectorTab, setSelectorTab] = useState<
    'components' | 'assemblies' | 'custom'
  >('components');
  const [showAssemblyDetail, setShowAssemblyDetail] = useState(false);
  const [selectedAssemblyForDetail, setSelectedAssemblyForDetail] =
    useState<Assembly | null>(null);

  return {
    selectedItems,
    setSelectedItems,
    showColumnManager,
    setShowColumnManager,
    showComponentSelector,
    setShowComponentSelector,
    selectedSystemId,
    setSelectedSystemId,
    componentSearchText,
    setComponentSearchText,
    showProjectPicker,
    setShowProjectPicker,
    selectorTab,
    setSelectorTab,
    showAssemblyDetail,
    setShowAssemblyDetail,
    selectedAssemblyForDetail,
    setSelectedAssemblyForDetail,
  };
}
