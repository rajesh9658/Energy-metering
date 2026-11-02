import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ENERGY_UNIT_STORAGE_KEY = "energy_unit_mode";

export type EnergyUnitMode = "kwh" | "kvah" | "both";

type EnergyUnitContextValue = {
  energyUnitMode: EnergyUnitMode;
  setEnergyUnitMode: (mode: EnergyUnitMode) => Promise<void>;
  energyUnitLoading: boolean;
  showsKwh: boolean;
  showsKvah: boolean;
};

const EnergyUnitContext = createContext<EnergyUnitContextValue | undefined>(undefined);

export function EnergyUnitProvider({ children }: { children: React.ReactNode }) {
  const [energyUnitMode, setEnergyUnitModeState] = useState<EnergyUnitMode>("both");
  const [energyUnitLoading, setEnergyUnitLoading] = useState(true);

  useEffect(() => {
    const loadEnergyUnitMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(ENERGY_UNIT_STORAGE_KEY);
        if (storedMode === "kwh" || storedMode === "kvah" || storedMode === "both") {
          setEnergyUnitModeState(storedMode);
        }
      } catch (error) {
        console.error("Error loading energy unit mode:", error);
      } finally {
        setEnergyUnitLoading(false);
      }
    };

    loadEnergyUnitMode();
  }, []);

  const setEnergyUnitMode = async (mode: EnergyUnitMode) => {
    setEnergyUnitModeState(mode);
    try {
      await AsyncStorage.setItem(ENERGY_UNIT_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Error saving energy unit mode:", error);
    }
  };

  const value = useMemo(
    () => ({
      energyUnitMode,
      setEnergyUnitMode,
      energyUnitLoading,
      showsKwh: energyUnitMode === "kwh" || energyUnitMode === "both",
      showsKvah: energyUnitMode === "kvah" || energyUnitMode === "both",
    }),
    [energyUnitMode, energyUnitLoading]
  );

  return <EnergyUnitContext.Provider value={value}>{children}</EnergyUnitContext.Provider>;
}

export function useEnergyUnit() {
  const context = useContext(EnergyUnitContext);

  if (!context) {
    throw new Error("useEnergyUnit must be used within an EnergyUnitProvider");
  }

  return context;
}
