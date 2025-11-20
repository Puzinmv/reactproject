import React, { useCallback, useMemo, useState } from 'react';
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
    Paper,
    Chip
} from '@mui/material';
import { fetchListsKIIMatchingCodes, fetchOfDataByInn, saveOfDataRecord } from '../services/directus';

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
    const [companyCodes, setCompanyCodes] = useState([]);

    const normalizeCode = (code) => {
        if (code === null || code === undefined) {
            return '';
        }
        return String(code).trim();
    };

    const handleChange = (event) => {
        const value = event.target.value.replace(/\D/g, '').slice(0, 10);
        setInn(value);
        if (error) {
            setError('');
        }
    };

    const extractCodes = (companyInfo) => {
        if (!companyInfo) return [];
        const codes = [];
        const mainCode = normalizeCode(companyInfo?.['ОКВЭД']?.['Код']);
        if (mainCode) {
            codes.push(mainCode);
        }
        const extraCodes = companyInfo?.['ОКВЭДДоп'];
        if (Array.isArray(extraCodes)) {
            extraCodes.forEach((item) => {
                const code = normalizeCode(item?.['Код']);
                if (code) {
                    codes.push(code);
                }
            });
        }
        return Array.from(new Set(codes));
    };

    const getListCodes = useCallback((okvedArray = []) => {
        if (!Array.isArray(okvedArray)) {
            return [];
        }
        return okvedArray
            .map((item) => normalizeCode(item?.ListsKIIokved_code))
            .filter(Boolean);
    }, []);

    const findMatchingLists = async (company) => {
        if (!company) {
            setMatchedLists([]);
            setListsLoading(false);
            return;
        }

        const uniqueCodes = extractCodes(company);
        if (!uniqueCodes.length) {
            setMatchedLists([]);
            setListsLoading(false);
            return;
        }

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
    };

    const handleSearch = async () => {
        if (inn.length !== 10) {
            setError('ИНН должен состоять из 10 цифр');
            return;
        }

        setLoading(true);
        setError('');
        setListsError('');
        setListsLoading(false);
        setMatchedLists([]);
        setCompanyData(null);
        setCompanyCodes([]);

        try {
            let company = null;
            try {
                const cached = await fetchOfDataByInn(inn);
                if (cached?.object) {
                    company = cached.object;
                    console.log('Данные компании из кэша Directus:', cached);
                }
            } catch (cacheErr) {
                console.error('Не удалось получить данные из Directus ofdata:', cacheErr);
            }

            if (!company) {
                const response = await fetch(`${API_URL}?key=${API_KEY}&inn=${inn}`);

                if (!response.ok) {
                    throw new Error('Не удалось получить данные компании');
                }

                const data = await response.json();
                company = data?.data;
                console.log('Данные компании из внешнего API:', data);

                if (company) {
                    try {
                        await saveOfDataRecord(inn, company);
                    } catch (saveErr) {
                        console.error('Не удалось сохранить данные в Directus ofdata:', saveErr);
                    }
                }
            }

            setCompanyData(company);
            const codes = extractCodes(company);
            setCompanyCodes(codes);
            if (!company) {
                setMatchedLists([]);
                setCompanyCodes([]);
                setError('Данные компании не найдены');
                return;
            }

            await findMatchingLists(company);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Произошла ошибка при запросе');
        } finally {
            setLoading(false);
        }
    };

    const matchedCompanyCodes = useMemo(() => {
        if (!companyCodes.length || !matchedLists.length) {
            return new Set();
        }
        const overlaps = new Set();
        matchedLists.forEach((item) => {
            getListCodes(item?.okved).forEach((code) => {
                if (companyCodes.includes(code)) {
                    overlaps.add(code);
                }
            });
        });
        return overlaps;
    }, [companyCodes, matchedLists, getListCodes]);

    return (
        <Container maxWidth={false} sx={{ mt: 8, px: { xs: 2, sm: 3 } }}>
            <Box display="flex" flexDirection="column" gap={3} sx={{ width: '100%' }}>
                <Typography variant="h4" component="h1" align="center">
                    Анкета КИИ
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        gap: 2,
                        alignItems: 'center'
                    }}
                >
                    <TextField
                        label="ИНН организации"
                        value={inn}
                        onChange={handleChange}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }}
                        sx={{ width: 220 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSearch}
                        disabled={loading}
                        sx={{ minWidth: 120, height: 40 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Найти'}
                    </Button>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Введите 10 цифр ИНН
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {listsLoading && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {listsError && <Alert severity="error">{listsError}</Alert>}
                {!!companyCodes.length && (
                    <Box>
                        <Typography variant="h6">ОКВЭД заказчика</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {companyCodes.map((code) => {
                                const isMatched = matchedCompanyCodes.has(code);
                                return (
                                    <Chip
                                        key={code}
                                        label={code}
                                        color={isMatched ? 'success' : 'default'}
                                        variant={isMatched ? 'filled' : 'outlined'}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                )}
                {!listsLoading && companyData && (
                    <TableContainer
                        component={Paper}
                        sx={{
                            width: '100%',
                            maxHeight: '65vh',
                            overflowY: 'auto',
                            px: { xs: 1, sm: 2 },
                            py: 1
                        }}
                    >
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>№</TableCell>
                                    <TableCell>Наименование объекта</TableCell>
                                    <TableCell>Процесс</TableCell>
                                    <TableCell>ОКВЭД</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {matchedLists.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            Совпадений по ОКВЭД не найдено
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    matchedLists.map((item) => {
                                        const rowCodes = getListCodes(item.okved);
                                        return (
                                            <TableRow key={item.id || `${item.NameObject}-${item.number}`}>
                                                <TableCell>{item.number}</TableCell>
                                                <TableCell>{item.NameObject}</TableCell>
                                                <TableCell>{item.Process}</TableCell>
                                                <TableCell>
                                                    {rowCodes.length ? (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {rowCodes.map((code) => {
                                                                const isMatch = companyCodes.includes(code);
                                                                return (
                                                                    <Chip
                                                                        key={`${item.id || item.number}-${code}`}
                                                                        label={code}
                                                                        size="small"
                                                                        color={isMatch ? 'success' : 'default'}
                                                                        variant={isMatch ? 'filled' : 'outlined'}
                                                                    />
                                                                );
                                                            })}
                                                        </Box>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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

