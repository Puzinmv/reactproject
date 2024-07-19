import React, { useState, useEffect } from 'react';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js'; // Добавляем новый компонент
import './App.css';
import LoginForm from './Components/LoginForm.js'
import { login, logout } from './services/directus';
import { getSessionToken } from './services/cookies';

function App() {
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false); // Для управления модальным окном колонок
    const [tableInstance, setTableInstance] = useState(null); // Сохраняем инстанс таблицы
    const [token, setToken] = useState(null);
    const [collection] = useState('Project_Card');

    useEffect(() => {
        const token = getSessionToken();
        if (token) {
            setToken(token);
        }
    }, []);

    const handleLogout = async () => {
        await logout();
        setToken(null);
    };

    const handleRowSelect = (row) => {
    setSelectedRow(row);
    setIsModalOpen(true);
    };

    const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
    };

    const handleLogin = async (email, password) => {
        try {
            const token = await login(email, password);
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
          {token ? (
              <div>
                <button onClick={handleLogout}>Logout</button>
                  <TableComponent
                      onRowSelect={handleRowSelect}
                      onToggleColumnModal={handleToggleColumnModal}
                      setTableInstance={setTableInstance} // Передаем функцию для установки инстанса таблицы
                      token={token} collection={collection}
                  />
              </div>
        ) : (
            <LoginForm onLogin={handleLogin} />
        )}
        {isModalOpen && (
            <ModalForm row={selectedRow} onClose={handleCloseModal} />
            )}
            {isColumnModalOpen && tableInstance && (
            <ColumnVisibilityModal
                onClose={handleToggleColumnModal}
                tableInstance={tableInstance} // Передаем инстанс таблицы
            />
        )}
    </div>
  );
}

export default App;
