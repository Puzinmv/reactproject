import React from 'react';
import PhonebookAppEntry from './index';

const phonebookAppConfig = {
  id: 'phonebook',
  title: 'Phonebook',
  basePath: '/phonebook',
  authPolicy: 'required',
  component: <PhonebookAppEntry />,
  additionalPaths: ['/phonebook/department/:id', '/phonebook/user/:id']
};

export default phonebookAppConfig;
