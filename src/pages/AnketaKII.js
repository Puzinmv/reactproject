import React, { useState } from 'react';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { fetchListsKIIMatchingCodes } from '../services/directus';

const API_URL = 'https://api.ofdata.ru/v2/company';
const API_KEY = 'GL65hDdeKXQQ139j';

const AnketaKII = () => {
    const [inn, setInn] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [matchedLists, setMatchedLists] = useState([]);
    const [listsError, setListsError] = useState('');
    const [listsLoading, setListsLoading] = useState(false);
    const [companyData, setCompanyData] = useState(null);

    const handleChange = (event) => {
        const value = event.target.value.replace(/\D/g, '').slice(0, 10);
        setInn(value);
        if (error) {
            setError('');
        }
    };

    const handleSearch = async () => {
        if (inn.length !== 10) {
            setError('ИНН должен состоять из 10 цифр');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}&inn=${inn}`);

            if (!response.ok) {
                throw new Error('Не удалось получить данные компании');
            }

            const data = await response.json();
            const company = data?.data;
            setCompanyData(company);
            console.log('Данные компании:', data);

            const extractCodes = (companyInfo) => {
                if (!companyInfo) return [];
                const codes = [];
                const mainCode = companyInfo?.['ОКВЭД']?.['Код'];
                if (mainCode) {
                    codes.push(mainCode);
                }
                const extraCodes = companyInfo?.['ОКВЭДДоп'];
                if (Array.isArray(extraCodes)) {
                    extraCodes.forEach((item) => {
                        const code = item?.['Код'];
                        if (code) {
                            codes.push(code);
                        }
                    });
                }
                return Array.from(new Set(codes));
            };

            if (company) {
                const uniqueCodes = extractCodes(company);
                if (uniqueCodes.length > 0) {
                    setListsLoading(true);
                    setListsError('');
                    try {
                        const matched = await fetchListsKIIMatchingCodes(uniqueCodes);
                        setMatchedLists(matched ?? []);
                    } catch (listErr) {
                        console.error(listErr);
                        setListsError('Не удалось получить совпадения из ListsKII');
                        setMatchedLists([]);
                    } finally {
                        setListsLoading(false);
                    }
                } else {
                    setMatchedLists([]);
                }
            } else {
                setMatchedLists([]);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Произошла ошибка при запросе');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Box display="flex" flexDirection="column" gap={3}>
                <Typography variant="h4" component="h1" align="center">
                    Анкета КИИ
                </Typography>
                <TextField
                    label="ИНН организации"
                    value={inn}
                    onChange={handleChange}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }}
                    helperText="Введите 10 цифр ИНН"
                />
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Найти'}
                </Button>
                {error && <Alert severity="error">{error}</Alert>}
                {listsLoading && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {listsError && <Alert severity="error">{listsError}</Alert>}
                {!listsLoading && companyData && (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Наименование объекта</TableCell>
                                    <TableCell>Процесс</TableCell>
                                    <TableCell>Номер</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {matchedLists.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">
                                            Совпадений по ОКВЭД не найдено
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    matchedLists.map((item) => (
                                        <TableRow key={item.id || `${item.NameObject}-${item.number}`}>
                                            <TableCell>{item.NameObject}</TableCell>
                                            <TableCell>{item.Process}</TableCell>
                                            <TableCell>{item.number}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Container>
    );
};

export default AnketaKII;

