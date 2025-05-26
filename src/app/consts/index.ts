export enum routes {
  DASHBOARD = '/dashboard',
  USERS = '/users',
  ADD_MEMBER = '/add-member',
  SETTINGS = '/settings',  PROFILE = '/profile',
  DOCUMENTATION = '/documentation',
  SUPPORT = '/support',
  E_COMMERCE = '/e-commerce',
  CORE = '/core',
  TABLES = '/tables',
  UI_ELEMENTS = '/ui-elements',
  FORMS = '/forms',
  CHARTS = '/charts',
  MAPS = '/maps'
}

/**
 * Application colors
 */
export const colors = {
  // Main colors
  primary: '#4568dc',
  secondary: '#3f51b5',
  success: '#2e7d32',
  warning: '#ed6c02',
  info: '#0288d1',
  error: '#d32f2f',

  // Top-level color constants for charts
  BLUE: '#4568dc',
  GREEN: '#2e7d32',
  PINK: '#e91e63',
  YELLOW: '#ffc107',

  // Chart colors
  chart: {
    blue: '#4568dc',
    green: '#2e7d32',
    orange: '#ed6c02',
    purple: '#9c27b0',
    red: '#d32f2f',
    yellow: '#ffc107',
    cyan: '#00bcd4',
    lightBlue: '#039be5'
  },
  
  // UI colors
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};

export const themes = {
  LIGHT: 'light',
  DARK: 'dark'
};

export const themeColors = {
  blue: 'blue',
  green: 'green',
  pink: 'pink'
};
