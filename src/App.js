import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import LoginForm from './Components/LoginForm.js';
import CreateForm from './Components/CreateForm.js';
import ResponsiveAppBar from './Components/ResponsiveAppBar.js';
import { login, logout, fetchData } from './services/directus';
import { useNavigate, useLocation } from 'react-router-dom';

const theme = createTheme({
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
});

function App() {
    const [selectedRow, setSelectedRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [token, setToken] = useState(null);
    const [CurrentUser, setCurrentUser] = useState({});
    const [departament, setdepartament] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();


    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken')
        try {
            if (accessToken !== null) {
                setToken(accessToken);
                fetchTableData(accessToken)
            }
        } catch (e) {
            setToken(null);
        }
        //if (accessToken) {
        //    const refreshtoken = async () => {
        //        const token = await refreshlogin();
        //        console.log(token)
        //        if (token !== null) {
        //            setToken(token);
        //            fetchTableData(token);
        //        } else {
        //            setToken(null);
        //        }
        //    };

        //    refreshtoken();
        //}

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

    const fetchTableData = async (token) => {
        try {
            const [data, departament, user] = await fetchData(token);
            console.log('Data', data);
            console.log('departament', departament);
            console.log('user', user);
            setTableData(data);
            setCurrentUser(user);
            setdepartament(departament)
        } catch (error) {
            const errors = error.errors || [];
            const hasInvalidCredentialsError = errors.some(err => (err.extensions?.code === 'INVALID_CREDENTIALS' || err.extensions?.code === 'TOKEN_EXPIRED'));

            if (hasInvalidCredentialsError) {
                await logout()
                setToken(null);
            } else {
                console.error(errors);
            }
        }
    };

    const handleLogout = async () => {
        await logout();
        setToken(null);
    };

    const handleRowSelect = (row) => {
        setSelectedRow(row);
        setIsModalOpen(true);
        navigate(`?id=${row.id}`);
    };

    const handleCreate = () => {
        setSelectedRow(
            {
            "status": "Новая карта",
            "title": "",
            "Description": "",
            "Customer": "",
            "CustomerCRMID": "",
            "CustomerContact": "",
            "CustomerContactCRMID": "",
            "CustomerContactTel": "",
            "CustomerContactEmail": "",
            "CustomerContactJobTitle": "",
            "ProjectScope": "",
            "JobDescription": [],
            "resourceSumm": 0,
            "frameSumm": 0,
            "jobOnTrip": '<figure><table style="width: 606px;"><tbody><tr><td style="width: 19px; text-align: center;"><p>№</p></td><td style="width: 251px;"><p style="text-align: center;">Адрес(а)для проведения работ:</p></td><td style="width: 93px;"><p style="text-align: center;">Количество дней</p></td><td style="width: 209px;"><p style="text-align: center;">Какие работы проводятся по указанным адресам:</p></td></tr><tr><td style="width: 19px; text-align: center;"><p>1.</p></td><td style="width: 251px;">&nbsp;</td><td style="width: 93px;">&nbsp;</td><td style="width: 209px;">&nbsp;</td></tr><tr><td style="width: 19px; text-align: center;"><p>2.</p></td><td style="width: 251px;">&nbsp;</td><td style="width: 93px;">&nbsp;</td><td style="width: 209px;">&nbsp;</td></tr></tbody></table ></figure > ',
            "Limitations": "",
            "Price": 0,
            "Cost": 0,
            "tiketsCost": 0,
            "tiketsCostDescription": "",
            "HotelCost": 0,
            "HotelCostDescription": "",
            "dailyCost": 0,
            "dailyCostDescription": "",
            "otherPayments": 0,
            "otherPaymentsDescription": "",
            "company": "",
            "contract": "",
            "dateStart": "",
            "deadline": "",
            "Files": [],
            "priceAproved": false,
            "jobCalculated": false,
            "CommentJob": "",
            "initiator": {
                "id": CurrentUser.id,
                "first_name": CurrentUser.first_name,
                "last_name": CurrentUser.last_name,
            },
            "Department": { id: '', Department: '' }
            });
        setIsCreateOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setSelectedRow(null);
        navigate('/');
    };

    const handleLogin = async (email, password) => {
        try {
            const token = await login(email, password);
            if (token) {
                setToken(token);
                fetchTableData(token);
                return true;
            }
            return false;
        } catch (error) {
            return false;
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
            <ResponsiveAppBar handleLogout={handleLogout} current={CurrentUser} />
            <div className="App">
                {token ? (
                    <TableComponent
                        data={tableData}
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
                        token={token}
                        currentUser={CurrentUser}
                        onDataSaved={handleDataSaved}
                    />
                )}
                {isCreateOpen && (
                    <CreateForm
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