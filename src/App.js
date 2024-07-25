import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
//import './App.css';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import LoginForm from './Components/LoginForm.js';
import ResponsiveAppBar from './Components/ResponsiveAppBar.js';
import { login, logout, refreshlogin, fetchData } from './services/directus';


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
    const [CurrentUser, setCurrentUser] = useState(null);
    const [departament, setdepartament] = useState(null);

    useEffect(() => {
        const refreshtoken = async () => {
            const token = await refreshlogin();
            if (token) {
                console.log('refreshlogin', token);
                setToken(token);
                fetchTableData(token);
            }
        };
        refreshtoken();
    }, []);

    const fetchTableData = async (token) => {
        const [data, departament, user]= await fetchData(token);
        console.log('Data', data);
        console.log('departament', departament);
        console.log('user', user);
        setTableData(data);

        setCurrentUser(user);
        setdepartament(departament)
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
            <ResponsiveAppBar onLogout={handleLogout} />
            <div className="App">
                {token ? (
                    <TableComponent
                        data={tableData}
                        onRowSelect={handleRowSelect}
                    />
                ) : (
                    <LoginForm onLogin={handleLogin} />
                )}
                {isModalOpen && (
                    <ModalForm
                        row={selectedRow}
                        departament={departament}
                        onClose={handleCloseModal}
                        token={token}
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
