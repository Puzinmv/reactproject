import React from 'react';
import AIChatAppEntry from './index';

const aiChatAppConfig = {
  id: 'ai-chat',
  title: 'AI Chat',
  basePath: '/AI',
  authPolicy: 'required',
  component: <AIChatAppEntry />,
  additionalPaths: ['/AI/:chatId']
};

export default aiChatAppConfig;
