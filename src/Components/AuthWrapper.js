import React, { useState, useEffect } from 'react';
import { getToken, loginEmail, loginAD, logout, getCurrentUser } from '../services/directus';
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
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savedSearchParams, setSavedSearchParams] = useState('');

    const checkAuthAndGetUser = async () => {
        try {
            // Проверяем токен
            const token = await getToken();
            if (!token?.data) {
                throw new Error('No valid token');
            }

            // Получаем данные пользователя
            const userData = await getCurrentUser();
            if (userData) {
                setCurrentUser(userData);
                // Восстанавливаем параметры URL после успешной авторизации
                if (savedSearchParams && window.location.search === '') {
                    window.history.replaceState({}, '', savedSearchParams);
                }
                return true;
            }
        } catch (e) {
            console.error(e);
            setCurrentUser(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setSavedSearchParams(window.location.search);
        checkAuthAndGetUser();
    }, [savedSearchParams]);

    const handleLogout = async () => {
        await logout();
        setCurrentUser(null);
    };

    const handleLogin = async (email, password, isAD) => {
        try {
            let loginResult;
            if (isAD) {
                loginResult = await loginAD(email, password);
            } else {
                loginResult = await loginEmail(email, password);
            }
            
            if (loginResult) {
                const userData = await getCurrentUser();
                if (userData) {
                    setCurrentUser(userData);
                    if (savedSearchParams) {
                        window.history.replaceState({}, '', savedSearchParams);
                    }
                    isLiginFunc();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(error);
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
            ) : currentUser ? (
                children
            ) : (
                <LoginForm onLogin={handleLogin} />
            )}
        </ThemeProvider>
    );
}

export default AuthWrapper; 