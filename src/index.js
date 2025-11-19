import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import GradeApp from './GradeApp'
import AnalyticsApp from './AnalyticsApp'
import AIChat from './pages/AIChat';
import AnketaKII from './pages/AnketaKII';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './styles/theme';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/grade" element={<GradeApp />} />
          <Route path="/analytics" element={<AnalyticsApp />} />
          <Route path="/AI" element={<AIChat />} />
          <Route path="/AI/:chatId" element={<AIChat />} />
          <Route path="/AnketaKII" element={<AnketaKII />} />
        </Routes>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
