import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import LoginForm from './Components/LoginForm.js';
import CreateForm from './Components/CreateForm.js';
import ResponsiveAppBar from './Components/ResponsiveAppBar.js';
import { loginEmail, loginAD, logout, fetchData, getToken, Update1CField } from './services/directus';
import getNewCardData from './constants/index.js';
import { GetUser1C } from './services/1c';

const theme = createTheme({
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
    components: {
        MuiTableRow: {
            styleOverrides: {
                root: {
                    "&.MuiTableRow-hover:hover": {
                        backgroundColor: '#cfe2f3',
                    },
                },
            },
        },
    },
});

function App() {
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [CurrentUser, setCurrentUser] = useState({});
    const [departament, setdepartament] = useState([]);
    const [limitation, setLimitation] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();


    useEffect(() => {
        try {
            const token = async () => await getToken();
            token().then((token) => {
                if (token) {
                    fetchTableData()
                }
            })

        } catch (e) {
            setCurrentUser({});
        }
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const rowId = searchParams.get('id');
        if (rowId) {
            const row = tableData.find(item => item.id === parseInt(rowId));
            if (row) {
                setSelectedRow(row);
                setIsModalOpen(true);
            }
        }
    }, [location.search, tableData]);

    const fetchTableData = async () => {
        try {
            const [data, departament, limitationTemplate, user] = await fetchData();
            console.log('Data', data);
            console.log('departament', departament);
            console.log('user', user);
            console.log('limitationTemplate', limitationTemplate);
            setTableData(data);
            setCurrentUser(user);
            setdepartament(departament)
            setLimitation(limitationTemplate)
            if (user?.first_name) {
                const user1C = await GetUser1C(user.first_name)
                if (user1C) {
                    const upduser = await Update1CField(user1C)
                    if (upduser) {
                        setCurrentUser(upduser)
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleLogout = async () => {
        await logout();
        setCurrentUser({});
    };

    const handleRowSelect = (row) => {
        setSelectedRow(row);
        setIsModalOpen(true);
        navigate(`?id=${row.id}`);
        fetchTableData();
    };

    const handleCreate = () => {
        setSelectedRow(getNewCardData(CurrentUser));
        setIsCreateOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setSelectedRow(null);
        navigate('/');
    };

    const handleLogin = async (email, password, isAD) => {
        try {
            if (isAD) {
                const token = await loginAD(email, password);
                if (token) {
                    fetchTableData();
                    return true;
                }
                return false;
            } else {
                const token = await loginEmail(email, password);
                if (token) {
                    fetchTableData();
                    return true;
                }
                return false;
            }

        } catch (error) {
            return false;
        }
    };

    const handleToggleColumnModal = () => {
        setIsColumnModalOpen(!isColumnModalOpen);
    };

    const handleDataSaved = () => {
        fetchTableData();
    };

    return (
        <ThemeProvider theme={theme}>
            <ResponsiveAppBar handleLogout={handleLogout} current={CurrentUser} />
            <div className="App">
                {Object.keys(CurrentUser).length ? (
                    <TableComponent
                        data={tableData}
                        CurrentUser={CurrentUser}
                        onRowSelect={handleRowSelect}
                        onCreate={handleCreate}
                    />
                ) : (
                    <LoginForm onLogin={handleLogin} />
                )}
                {isModalOpen && (
                    <ModalForm
                        row={selectedRow}
                        departament={departament}
                        onClose={handleCloseModal}
                        currentUser={CurrentUser}
                        onDataSaved={handleDataSaved}
                        limitation={limitation}
                    />
                )}
                {isCreateOpen && (
                    <CreateForm
                        row={selectedRow}
                        departament={departament}
                        currentUser={CurrentUser}
                        onClose={handleCloseModal}
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