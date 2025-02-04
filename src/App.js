import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TableComponent from './Components/TableComponent.js';
import ModalForm from './Components/ModalForm.js';
import ColumnVisibilityModal from './Components/ColumnVisibilityModal.js';
import CreateForm from './Components/CreateForm.js';
import { Update1CField, fetchInitData, getCurrentUser } from './services/directus';
import getNewCardData from './constants/index.js';
import { GetUser1C } from './services/1c';
import AuthWrapper from './Components/AuthWrapper';


function App() {
    const [SelectedRowId, setSelectedRowId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [CurrentUser, setCurrentUser] = useState({});
    const [UserOption, setUserOption] = useState({});
    const [departament, setdepartament] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    const fetchCurrentUserData = async () => {
        try {
            const user = await getCurrentUser();
            setCurrentUser(user);
            await fetchTableData();
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

    const fetchTableData = async () => {
        try {
            const [Users, Department] = await fetchInitData();
            console.log('Users', Users);
            console.log('departament', Department);
            setdepartament(Department)
            setUserOption(Users.map(item => item.first_name))

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const rowId = searchParams.get('id');
        if (rowId) {
            fetchTableData();
            setSelectedRowId(rowId);
            setIsModalOpen(true);
        }
    }, [location.search]);

    useEffect(() => {
        fetchTableData();
    }, []);
    
    const handleRowSelect = (row) => {
        setSelectedRowId(row.id);
        setIsModalOpen(true);
        navigate(`?id=${row.id}`);
        fetchTableData();
    };

    const handleCreate = () => {
        setIsCreateOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsCreateOpen(false);
        setSelectedRowId(null);
        navigate('/');
    };

    const handleToggleColumnModal = () => {
        setIsColumnModalOpen(!isColumnModalOpen);
    };

    return (
        <AuthWrapper isLiginFunc = {fetchCurrentUserData}>
            <div className="App">
                <TableComponent
                    UserOption={UserOption}
                    departamentOption={departament}
                    CurrentUser={CurrentUser}
                    onRowSelect={handleRowSelect}
                    onCreate={handleCreate}
                />
                {isModalOpen && (
                    <ModalForm
                        rowid={SelectedRowId}
                        departament={departament}
                        onClose={handleCloseModal}
                        currentUser={CurrentUser}
                        onDataSaved={fetchTableData}
                    />
                )}
                {isCreateOpen && (
                    <CreateForm
                        row={getNewCardData(CurrentUser)}
                        departament={departament}
                        currentUser={CurrentUser}
                        onClose={handleCloseModal}
                        onDataSaved={fetchTableData}
                    />
                )}
                {isColumnModalOpen && (
                    <ColumnVisibilityModal
                        onClose={handleToggleColumnModal}
                    />
                )}
            </div>
        </AuthWrapper>
    );
}

export default App;