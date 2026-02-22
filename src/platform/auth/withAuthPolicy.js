import React from 'react';
import AuthWrapper from '../../Components/AuthWrapper';

const authPolicies = {
  none: (content) => content,
  required: (content, appConfig) => (
    <AuthWrapper isLoginFunc={appConfig?.isLoginFunc}>
      {content}
    </AuthWrapper>
  ),
  custom: (content, appConfig) => {
    if (typeof appConfig?.authRenderer === 'function') {
      return appConfig.authRenderer(content);
    }

    return (
      <AuthWrapper isLoginFunc={appConfig?.isLoginFunc}>
        {content}
      </AuthWrapper>
    );
  }
};

export const withAuthPolicy = (appConfig, content) => {
  const policy = appConfig?.authPolicy || 'none';
  const renderByPolicy = authPolicies[policy] || authPolicies.none;
  return renderByPolicy(content, appConfig);
};
