import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '../../styles/theme';
import RootRouter from '../routing/rootRouter';

export default function PlatformBootstrap() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RootRouter />
      </ThemeProvider>
    </Router>
  );
}
