import React, { useState, useEffect } from 'react';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import LoginForm from './Components/LoginForm.js';
import { login, logout, refreshlogin } from './services/directus';
import { fetchData } from './services/directus'; // Импорт функции fetchData

const theme = createTheme({
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
});

function App() {
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [token, setToken] = useState(null);
    const [collection] = useState('Project_Card');

    useEffect(() => {
        refreshlogin().then((token) => {
            console.log(token)
            setToken(token);
            fetchTableData(token);
        });
    }, []);

    const fetchTableData = async (token) => {
        const data = await fetchData(token, collection);
        console.log('fetchTableData',data)
        setTableData(data);
    };

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
            fetchTableData(token);
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed');
        }
    };

    const handleToggleColumnModal = () => {
        setIsColumnModalOpen(!isColumnModalOpen);
    };

    const handleDataSaved = () => {
        fetchTableData(token);
    };

    return (
        <ThemeProvider theme={theme}>
            <div className="App">
                {token ? (
                    <div>
                        <button onClick={handleLogout}>Logout</button>
                        <TableComponent
                            data={tableData}
                            onRowSelect={handleRowSelect}
                            onToggleColumnModal={handleToggleColumnModal}
                            token={token}
                            collection={collection}
                        />
                    </div>
                ) : (
                    <LoginForm onLogin={handleLogin} />
                )}
                {isModalOpen && (
                    <ModalForm
                        row={selectedRow}
                        onClose={handleCloseModal}
                        token={token}
                        collection={collection}
                        onDataSaved={handleDataSaved}
                    />
                )}
                {isColumnModalOpen && (
                    <ColumnVisibilityModal
                        onClose={handleToggleColumnModal}
                    />
                )}
            </div>
        </ThemeProvider>
    );
}

export default App;
