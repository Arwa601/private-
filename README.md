# APIsTestAutomationFront

A modern Angular dashboard application for API testing automation with a responsive layout, user management, and theme customization features.

## Features

- Modern dashboard layout with responsive design
- User management (list and add users)
- Theme customization (Blue, Pink, Green themes)
- Dark mode support
- Mobile-friendly sidebar with auto-collapse on smaller screens
- Settings and Profile pages
- Standalone Angular components architecture
- Material Design UI components
- Animation effects for UI transitions
- Responsive data visualization
- Test Results Dashboard with status visualization and detailed test reporting

## Prerequisites

- Node.js (v18+)
- npm or yarn package manager
- Angular CLI

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/your-repo/APIsTestAutomationFront.git
   cd APIsTestAutomationFront
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:4200`

## Development

### Development server

Run `npm start` for a dev server with auto-reload on file changes.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Running tests

Run `npm test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Production Build

To create a production build, run:
```bash
npm run build --prod
```

The build artifacts will be stored in the `dist/` directory and can be deployed to any static hosting service.

## Technology Stack

- Angular 17+ (standalone components architecture)
- Angular Material UI components
- TypeScript
- CSS Grid and Flexbox for responsive layouts
- RxJS for state management
- SCSS with theme variables

## Theme System

The application includes a comprehensive theming system:

### Color Themes
- **Blue Theme**: Professional, default appearance
- **Pink Theme**: Alternative vibrant appearance
- **Green Theme**: Fresh, nature-inspired appearance

### Dark Mode
The dark mode can be toggled independently of the color theme and applies across the entire application.

### How It Works
- Themes are managed via CSS variables and Angular's class binding
- The `SharedService` maintains the current theme state
- Theme preferences are accessible throughout the application

## Navigation

The application features two navigation options:

1. **Main Sidebar**: Primary navigation with links to all main sections
2. **Header Menu**: Quick access to settings and user profile

The sidebar automatically adapts to screen size:
- On desktop: Full sidebar is visible
- On mobile: Sidebar collapses and can be toggled via the menu button

## Extending the Dashboard

To add new visualization components to the dashboard:

1. Create a new component in the `dashboard` directory
2. Import chart libraries as needed (ngx-echarts is pre-configured)
3. Add the component to the SimpleDashboardComponent template
4. Register it in the imports array

## Performance Optimization

The application is optimized for production with:
- Lazy-loaded routes
- Standalone components
- Tree-shakable services
- Minimal CSS through targeted styles

## Project Structure

```
src/
├── app/
│   ├── components/        # All standalone components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── header/        # App header
│   │   ├── footer/        # App footer
│   │   ├── layout/        # Main layout wrapper
│   │   ├── sidebar/       # Navigation sidebar
│   │   ├── settings/      # Settings page
│   │   ├── profile/       # User profile
│   │   ├── users-list/    # Users management
│   │   └── services/      # Component-specific services
│   ├── consts/            # Constants and enums
│   ├── models/            # TypeScript interfaces/models
│   ├── services/          # Application-wide services
│   └── styles/            # Global styles and themes
└── assets/                # Static assets
```
