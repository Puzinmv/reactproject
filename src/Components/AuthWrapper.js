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

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await getToken();
                if (token?.data) {
                    setCurrentUser(token.data);
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

    const handleLogin = async (email, password, isAD) => {
        try {
            if (isAD) {
                const token = await loginAD(email, password);
                if (token) {
                    setCurrentUser(token);
                    isLiginFunc()
                    return true;
                }
                return false;
            } else {
                const token = await loginEmail(email, password);
                if (token) {
                    setCurrentUser(token);
                    isLiginFunc()
                    return true;
                }
                return false;
            }
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