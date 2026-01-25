import React from 'react';
import { VehicleFinanceSettingsBase } from './VehicleFinanceSettingsBase';

export function SinotruckFinanceSettings() {
  return (
    <VehicleFinanceSettingsBase
      module="sinotruck"
      title="Sinotruck Sales Finance Settings"
      description="Configure GL account mappings and automation settings for Sinotruck sales finance integration"
    />
  );
}
