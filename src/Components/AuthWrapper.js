import React, { useState, useEffect } from 'react';
import { getToken, loginEmail, loginAD, logout } from '../services/directus';
import LoginForm from './LoginForm';
import { CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ResponsiveAppBar from './ResponsiveAppBar';

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

function AuthWrapper({ children, isLiginFunc }) {
    const [currentUser, setCurrentUser] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [savedSearchParams, setSavedSearchParams] = useState('');

    useEffect(() => {
        // Сохраняем параметры URL при первой загрузке
        setSavedSearchParams(window.location.search);
        
        const checkAuth = async () => {
            try {
                const token = await getToken();
                if (token?.data) {
                    setCurrentUser(token.data);
                    // Восстанавливаем параметры URL после успешной авторизации
                    if (savedSearchParams && window.location.search === '') {
                        window.history.replaceState({}, '', savedSearchParams);
                    }
                }
            } catch (e) {
                console.error(e);
                setCurrentUser({});
            } finally {
                setIsLoading(false);
            }
        };
        
        checkAuth();
    }, [savedSearchParams]);

    const handleLogout = async () => {
        await logout();
        setCurrentUser({});
    };

    const handleLogin = async (email, password, isAD) => {
        try {
            let token;
            if (isAD) {
                token = await loginAD(email, password);
            } else {
                token = await loginEmail(email, password);
            }
            
            if (token) {
                setCurrentUser(token);
                // Восстанавливаем параметры URL после успешного входа
                if (savedSearchParams) {
                    window.history.replaceState({}, '', savedSearchParams);
                }
                isLiginFunc();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <ResponsiveAppBar handleLogout={handleLogout} current={currentUser} />
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                </div>
            ) : Object.keys(currentUser).length ? (
                children
            ) : (
                <LoginForm onLogin={handleLogin} />
            )}
        </ThemeProvider>
    );
}

export default AuthWrapper; 