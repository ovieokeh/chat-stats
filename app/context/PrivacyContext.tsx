"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chat-analyzer-privacy-mode");
    if (saved === "true") {
      setIsPrivacyMode(true);
    }
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const newVal = !prev;
      localStorage.setItem("chat-analyzer-privacy-mode", String(newVal));
      return newVal;
    });
  };

  return <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>{children}</PrivacyContext.Provider>;
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
};
