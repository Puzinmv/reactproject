import React from 'react';
import { Routes, Route } from 'react-router-dom';
import appRegistry from '../bootstrap/appRegistry';
import { withAuthPolicy } from '../auth/withAuthPolicy';

const getAppPaths = (appConfig) => {
  const additionalPaths = appConfig.additionalPaths || [];
  return [appConfig.basePath, ...additionalPaths];
};

export default function RootRouter() {
  return (
    <Routes>
      {appRegistry.flatMap((appConfig) =>
        getAppPaths(appConfig).map((path) => (
          <Route
            key={`${appConfig.id}:${path}`}
            path={path}
            element={withAuthPolicy(appConfig, appConfig.component)}
          />
        ))
      )}
    </Routes>
  );
}
