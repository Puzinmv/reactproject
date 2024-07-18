import React from 'react';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js'; // ��������� ����� ���������
import { useState } from 'react';
import './App.css';
import LoginForm from './Components/LoginForm.js'

function App() {
  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false); // ��� ���������� ��������� ����� �������
  const [tableInstance, setTableInstance] = useState(null); // ��������� ������� �������
  const [isLoginModalOpen, setisLoginModalOpen] = useState(true);

  const handleRowSelect = (row) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

    const handleLogin = async (username, password) => {
        try {
            const { token } = await login(username, password);
            setToken(token);
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed');
        }
    };

  const handleToggleColumnModal = () => {
    setIsColumnModalOpen(!isColumnModalOpen);
  };

  return (
    <div className="App">
      {isLoginModalOpen && (<LoginForm onLogin={handleLoginCloseModal} />)}
      <TableComponent
        onRowSelect={handleRowSelect}
        onToggleColumnModal={handleToggleColumnModal}
        setTableInstance={setTableInstance} // �������� ������� ��� ��������� �������� �������
      />
      {isModalOpen && (
        <ModalForm row={selectedRow} onClose={handleCloseModal} />
      )}
      {isColumnModalOpen && tableInstance && (
        <ColumnVisibilityModal
          onClose={handleToggleColumnModal}
          tableInstance={tableInstance} // �������� ������� �������
        />
      )}
    </div>
  );
}

export default App;
