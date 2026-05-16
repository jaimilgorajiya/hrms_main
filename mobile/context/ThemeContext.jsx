import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, LIGHT_COLORS, DARK_COLORS, LIGHT_GRADIENTS, DARK_GRADIENTS } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('dark'); // Default to dark as requested

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user-theme');
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme('dark'); // Keep dark as default as per user request "both dark (as now) and light"
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('user-theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  const gradients = theme === 'light' ? LIGHT_GRADIENTS : DARK_GRADIENTS;
  const isDarkMode = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, gradients, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
