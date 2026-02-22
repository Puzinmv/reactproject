import React from 'react';
import MainAppEntry from './index';

const mainAppConfig = {
  id: 'main',
  title: 'Main App',
  basePath: '/',
  authPolicy: 'required',
  component: <MainAppEntry />
};

export default mainAppConfig;
