import React from 'react';
import GradeAppEntry from './index';

const gradeAppConfig = {
  id: 'grade',
  title: 'Grade App',
  basePath: '/grade',
  authPolicy: 'required',
  component: <GradeAppEntry />
};

export default gradeAppConfig;
