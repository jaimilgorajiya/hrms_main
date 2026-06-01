import React, { createContext, useContext, useState, useEffect } from 'react';

const MobileThemeContext = createContext(null);

export const MobileThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('mobile_theme') === 'dark';
  });

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('mobile_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <MobileThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </MobileThemeContext.Provider>
  );
};

export const useMobileTheme = () => useContext(MobileThemeContext);
