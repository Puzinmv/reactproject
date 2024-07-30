import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
//import './App.css';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import LoginForm from './Components/LoginForm.js';
import CreateForm from './Components/CreateForm.js';
import ResponsiveAppBar from './Components/ResponsiveAppBar.js';
import { login, logout, refreshlogin, fetchData } from './services/directus';
//import Cookies from 'js-cookie';


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


    useEffect(() => {
        //const CookiesRefreshToken = Cookies.get('directus_refresh_token');
        //const CookiesSessionToken = Cookies.get('directus_session_token');
        //console.log(CookiesRefreshToken, CookiesSessionToken)
        //if (CookiesRefreshToken && CookiesSessionToken) {
        //}
        const refreshtoken = async () => {
            try {
                const token = await refreshlogin();
                if (token !== null) {
                    setToken(token);
                    fetchTableData(token);
                } else {
                    setToken(null);
                }
            } catch (error) {
                setToken(null);
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

    const handleCreate = () => {
        setSelectedRow(
            {"status": "draft",
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
            "jobOnTrip": "<p>на выезде 1</p>",
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
            "initiator": {
                "id": CurrentUser.id,
                "first_name": CurrentUser.first_name,
                "last_name": CurrentUser.first_name,
            },
            "Department": { id: '', Department: '' }
            });
        setIsCreateOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setSelectedRow(null);
    };

    const handleLogin = async (email, password) => {
        try {
            const token = await login(email, password);
            setToken(token);
            fetchTableData(token);
            return true;
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
