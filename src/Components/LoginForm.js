import React, { useState } from 'react';
import { TextField, Button, Box, Container, Typography, Alert, FormControlLabel, Switch } from '@mui/material';
import './LoginForm.css';

const LoginForm = ({ onLogin, isPhonebookTheme = false }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [login, setLogin] = useState('');
    const [isADLogin, setisADLogin] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isSuccess = await onLogin(`${email}@asterit.ru`, password, false);
        if (!isSuccess) {
            setError('Неверный логин или пароль');
        } else {
            setError('');
        }
    };

    const handleSubmitAD = async (e) => {
        e.preventDefault();
        const isSuccess = await onLogin(login, password, true);
        if (!isSuccess) {
            setError('Неверный логин или пароль');
        } else {
            setError('');
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value.replace('@asterit.ru', '');
        setEmail(value);
    };

    return (
        <Container
            maxWidth="xs"
            className={isPhonebookTheme ? 'login-form-root login-form-root-phonebook' : 'login-form-root'}
            sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: isPhonebookTheme ? '100dvh' : '80vh' }}
        >
            {isADLogin ? (
                <Box
                    className={isPhonebookTheme ? 'login-form-card-phonebook' : ''}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <Typography component="h1" variant="h5" sx={{ mb: 2 }} className={isPhonebookTheme ? 'login-form-title-phonebook' : ''}>
                        Авторизация AD
                    </Typography>
                    {error && (
                        <Alert
                            severity="error"
                            className={isPhonebookTheme ? 'login-form-alert-phonebook' : ''}
                            sx={{ width: '100%', mb: 2 }}
                        >
                            {error}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        onSubmit={handleSubmitAD}
                        sx={{ mt: 1, width: '100%' }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="AD login"
                            label="AD login"
                            name="AD login"
                            autoComplete="AD логин"
                            autoFocus
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className={isPhonebookTheme ? 'login-form-input-phonebook' : ''}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={isPhonebookTheme ? 'login-form-input-phonebook' : ''}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            className={isPhonebookTheme ? 'login-form-button-phonebook' : ''}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Вход через AD
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Box
                    className={isPhonebookTheme ? 'login-form-card-phonebook' : ''}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <Typography component="h1" variant="h5" sx={{ mb: 2 }} className={isPhonebookTheme ? 'login-form-title-phonebook' : ''}>
                        Авторизация
                    </Typography>
                    {error && (
                        <Alert
                            severity="error"
                            className={isPhonebookTheme ? 'login-form-alert-phonebook' : ''}
                            sx={{ width: '100%', mb: 2 }}
                        >
                            {error}
                        </Alert>
                    )}
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ mt: 1, width: '100%' }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email адрес"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={handleEmailChange}
                            className={isPhonebookTheme ? 'login-form-input-phonebook' : ''}
                            InputProps={{
                                endAdornment: (
                                    <Typography variant="body2">@asterit.ru</Typography>
                                )
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={isPhonebookTheme ? 'login-form-input-phonebook' : ''}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            className={isPhonebookTheme ? 'login-form-button-phonebook' : ''}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Вход
                        </Button>
                    </Box>
                </Box>
            )}
            <FormControlLabel
                className={isPhonebookTheme ? 'login-form-switch-phonebook' : ''}
                control={
                    <Switch
                        checked={isADLogin}
                        name="isADLogin"
                        onChange={(e) => {
                            setisADLogin(e.target.checked)
                        }}
                    />
                }
                label={
                    <Typography variant="body1" color={isPhonebookTheme ? 'inherit' : 'textPrimary'}>
                        Авторизация через Active Directory
                    </Typography>
                }
                labelPlacement="end"
            />
        </Container>

    );
};

export default LoginForm;
