import { createContext, useContext } from "react";

export interface ExternalSystem {
  name: string;
  url: string;
}

interface ExternalSystemContextType {
  openExternalSystem: (system: ExternalSystem) => void;
}

export const ExternalSystemContext = createContext<ExternalSystemContextType>({
  openExternalSystem: () => {},
});

export const useExternalSystem = () => useContext(ExternalSystemContext);
