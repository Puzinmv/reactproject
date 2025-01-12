import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import LoginForm from './Components/LoginForm.js';
import CreateForm from './Components/CreateForm.js';
import ResponsiveAppBar from './Components/ResponsiveAppBar.js';
import { loginEmail, loginAD, logout, Update1CField, fetchInitData } from './services/directus';
import getNewCardData from './constants/index.js';
import { GetUser1C } from './services/1c';
import { CircularProgress } from '@mui/material';

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
    const [SelectedRowId, setSelectedRowId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    //const [tableData, setTableData] = useState([]);
    const [CurrentUser, setCurrentUser] = useState({});
    const [UserOption, setUserOption] = useState({});
    const [departament, setdepartament] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const rowId = searchParams.get('id');
        if (rowId) {
            setSelectedRowId(rowId);
            setIsModalOpen(true);
        }
    }, [location.search]);

    const fetchTableData = async () => {
        try {
            const [Users, Department, user] = await fetchInitData();
            console.log('Users', Users);
            console.log('departament', Department);
            console.log('user', user);
            //console.log('limitationTemplate', limitationTemplate);
            //setTableData(data);
            //setTableData([]);
            setCurrentUser(user);
            setdepartament(Department)
            setUserOption(Users.map(item => item.first_name))
            //setLimitation(limitationTemplate)
            if (user?.first_name) {
                const user1C = await GetUser1C(user.first_name)
                if (user1C && user1C !== user?.RefKey_1C) {
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
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await getToken();
                if (token?.data?.access_token) {
                    await fetchTableData();
                }
            } catch (e) {
                console.error(e);
                setCurrentUser({});
            } finally {
                setIsLoading(false);
            }
        };
        
        checkAuth();
    }, []);

    const handleLogout = async () => {
        await logout();
        setCurrentUser({});
    };

    const handleRowSelect = (row) => {
        setSelectedRowId(row.id);
        setIsModalOpen(true);
        navigate(`?id=${row.id}`);
        fetchTableData();
    };

    const handleCreate = () => {
        //setSelectedRow(getNewCardData(CurrentUser));
        setIsCreateOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setSelectedRowId(null);
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
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                        <CircularProgress />
                    </div>
                ) : Object.keys(CurrentUser).length ? (
                    <TableComponent
                        UserOption={UserOption}
                        departamentOption={departament}
                        CurrentUser={CurrentUser}
                        onRowSelect={handleRowSelect}
                        onCreate={handleCreate}
                    />
                ) : (
                    <LoginForm onLogin={handleLogin} />
                )}
                {isModalOpen && (
                    <ModalForm
                        rowid={SelectedRowId}
                        departament={departament}
                        onClose={handleCloseModal}
                        currentUser={CurrentUser}
                        onDataSaved={handleDataSaved}
                    />
                )}
                {isCreateOpen && (
                    <CreateForm
                        row={getNewCardData(CurrentUser)}
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