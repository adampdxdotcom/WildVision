import { SubArea, MeasurementUnit } from '../../../types';

export interface AccentSubPanelProps {
  activeSa: SubArea;
  updateActiveSubArea: (fields: Partial<SubArea>) => void;
  unit: MeasurementUnit;
}
