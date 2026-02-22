import React from 'react';
import AnalyticsAppEntry from './index';

const analyticsAppConfig = {
  id: 'analytics',
  title: 'Analytics App',
  basePath: '/analytics',
  authPolicy: 'none',
  component: <AnalyticsAppEntry />
};

export default analyticsAppConfig;
