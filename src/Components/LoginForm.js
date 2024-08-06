import React, { useState } from 'react';
import { TextField, Button, Box, Container, Typography, Alert } from '@mui/material';

const LoginForm = ({ onLogin }) => {
    const [email, setEmail] = useState('puzin.m.v');
    const [password, setPassword] = useState('123');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isSuccess = await onLogin(`${email}@asterit.ru`, password);
        console.log(isSuccess)
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
        <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                    Авторизация
                </Typography>
                {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
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
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={handleEmailChange}
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
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Вход
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginForm;