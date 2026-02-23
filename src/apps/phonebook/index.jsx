import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PhonebookHome from '../../pages/Phonebook/PhonebookHome';
import DepartmentUsers from '../../pages/Phonebook/DepartmentUsers';
import UserCard from '../../pages/Phonebook/UserCard';

export default function PhonebookAppEntry() {
  return (
    <Routes>
      <Route path="/" element={<PhonebookHome />} />
      <Route path="/department/:id" element={<DepartmentUsers />} />
      <Route path="/user/:id" element={<UserCard />} />
    </Routes>
  );
}
