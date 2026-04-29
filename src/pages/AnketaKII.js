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
    Chip,
    Tooltip,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { saveAs } from 'file-saver';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { fetchListsKIIMatchingCodes, fetchListsKIIByCode, fetchOfDataByInn, saveOfDataRecord } from '../services/directus';

const API_URL = 'https://api.ofdata.ru/v2/company';
const API_KEY = 'GL65hDdeKXQQ139j';

const normalizeCode = (code) => {
    if (code === null || code === undefined) {
        return '';
    }
    return String(code).trim();
};

const extractGroupNumber = (activityName) => {
    if (!activityName || typeof activityName !== 'string') {
        return 999; // Группы без номера идут в конец
    }
    const match = activityName.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : 999;
};


const isEmptyObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    return Object.keys(value).length === 0;
};

const splitOkvedGroups = (code) => {
    const normalized = normalizeCode(code);
    if (!normalized) {
        return [];
    }
    return normalized
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean);
};

const AnketaKII = () => {
    const [inn, setInn] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [matchedGroups, setMatchedGroups] = useState([]);
    const [listsError, setListsError] = useState('');
    const [listsLoading, setListsLoading] = useState(false);
    const [companyData, setCompanyData] = useState(null);
    const [companyCodes, setCompanyCodes] = useState([]);
    const [generateLoading, setGenerateLoading] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [isDefenseEnterprise, setIsDefenseEnterprise] = useState(false);
    const [defenseData, setDefenseData] = useState([]);
    const [defenseLoading, setDefenseLoading] = useState(false);
    const [defenseError, setDefenseError] = useState('');

    const isOkvedMatch = useCallback((listCode, companyCode) => {
        const listParts = splitOkvedGroups(listCode);
        const companyParts = splitOkvedGroups(companyCode);

        if (!listParts.length || !companyParts.length) {
            return false;
        }

        if (companyParts.length > listParts.length) {
            return false;
        }

        const listPrefix = listParts.slice(0, companyParts.length).join('.');
        const companyPrefix = companyParts.join('.');

        return listPrefix === companyPrefix;
    }, []);

    const getOkvedMatchInfo = useCallback((listCode) => {
        const listParts = splitOkvedGroups(listCode);
        if (!listParts.length || !companyCodes.length) {
            return { exact: false, matchedParts: 0 };
        }

        return companyCodes.reduce((bestMatch, companyCode) => {
            const companyParts = splitOkvedGroups(companyCode);
            let matchedParts = 0;

            while (
                matchedParts < listParts.length
                && matchedParts < companyParts.length
                && listParts[matchedParts] === companyParts[matchedParts]
            ) {
                matchedParts += 1;
            }

            const directedMatch = companyParts.length <= listParts.length
                && matchedParts === companyParts.length;
            const exact = directedMatch && matchedParts === listParts.length;
            const effectiveMatchedParts = directedMatch ? matchedParts : 0;

            if (
                effectiveMatchedParts > bestMatch.matchedParts
                || (effectiveMatchedParts === bestMatch.matchedParts && exact && !bestMatch.exact)
            ) {
                return { exact, matchedParts: effectiveMatchedParts };
            }

            return bestMatch;
        }, { exact: false, matchedParts: 0 });
    }, [companyCodes]);

    const renderOkvedCodeLabel = useCallback((code, matchInfo) => {
        const parts = splitOkvedGroups(code);
        const matchedParts = Math.min(matchInfo?.matchedParts || 0, parts.length);

        if (!matchedParts || matchInfo?.exact) {
            return code;
        }

        const matchedPrefix = parts.slice(0, matchedParts).join('.');
        const rest = parts.slice(matchedParts).join('.');

        return (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <Box
                    component="span"
                    sx={{
                        bgcolor: 'success.main',
                        borderRadius: 0.5,
                        color: 'success.contrastText',
                        fontWeight: 700,
                        px: 0.35
                    }}
                >
                    {matchedPrefix}
                </Box>
                {rest ? `.${rest}` : ''}
            </Box>
        );
    }, []);

    const handleChange = (event) => {
        const value = event.target.value.replace(/\D/g, '').slice(0, 10);
        setInn(value);
        if (error) {
            setError('');
        }
    };

    const extractCompanyName = (companyInfo) => {
        if (!companyInfo) {
            return '';
        }
        return (
            companyInfo?.['НаимСокр'] ||
            companyInfo?.['НаимПолн'] ||
            ''
        );
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
    const extractCodeDescriptions = (companyInfo) => {
        if (!companyInfo) return {};

        const descriptions = {};

        const pickName = (okvedItem) => {
            if (!okvedItem || typeof okvedItem !== 'object') {
                return '';
            }
            return normalizeCode(
                okvedItem?.['Наим'] ??
                okvedItem?.['Наименование'] ??
                okvedItem?.['OKVED']
            );
        };

        const appendDescription = (okvedItem) => {
            const code = normalizeCode(okvedItem?.['Код']);
            if (!code) {
                return;
            }
            const name = pickName(okvedItem);
            if (name && !descriptions[code]) {
                descriptions[code] = name;
            }
        };

        appendDescription(companyInfo?.['ОКВЭД']);

        const extraCodes = companyInfo?.['ОКВЭДДоп'];
        if (Array.isArray(extraCodes)) {
            extraCodes.forEach(appendDescription);
        }

        return descriptions;
    };

    const getListCodes = useCallback((okvedArray = []) => {
        if (!Array.isArray(okvedArray)) {
            return [];
        }
        return Array.from(
            new Set(
                okvedArray
                    .map((item) => {
                        const relation = item?.ListKIIokvedNew_id;
                        const code = typeof relation === 'string'
                            ? relation
                            : relation?.code ?? item?.code ?? item?.ListsKIIokved_code;
                        return normalizeCode(code);
                    })
                    .filter(Boolean)
            )
        );
    }, []);

    const filterMatchedGroupsByCompanyCodes = useCallback((groups = [], codes = []) => {
        if (!Array.isArray(groups) || !codes.length) {
            return [];
        }

        return groups
            .map((group) => {
                const items = Array.isArray(group?.items)
                    ? group.items.filter((item) => (
                        getListCodes(item?.okved).some((listCode) => (
                            codes.some((companyCode) => isOkvedMatch(listCode, companyCode))
                        ))
                    ))
                    : [];

                return {
                    ...group,
                    items
                };
            })
            .filter((group) => group.items.length > 0);
    }, [getListCodes, isOkvedMatch]);

    const findMatchingLists = async (company) => {
        if (!company) {
            setMatchedGroups([]);
            setListsLoading(false);
            return;
        }

        const uniqueCodes = extractCodes(company);
        if (!uniqueCodes.length) {
            setMatchedGroups([]);
            setListsLoading(false);
            return;
        }

        const codesForSearch = uniqueCodes;
        if (!codesForSearch.length) {
            setMatchedGroups([]);
            setListsLoading(false);
            return;
        }

        setListsLoading(true);
        setListsError('');
        try {
            const matched = await fetchListsKIIMatchingCodes(codesForSearch);
            setMatchedGroups(filterMatchedGroupsByCompanyCodes(matched ?? [], uniqueCodes));
            console.log(matched);
        } catch (listErr) {
            console.error(listErr);
            setListsError('Не удалось получить совпадения из ListsKII');
            setMatchedGroups([]);
        } finally {
            setListsLoading(false);
        }
    };

    const fetchDefenseData = async () => {
        setDefenseLoading(true);
        setDefenseError('');
        try {
            const defense = await fetchListsKIIByCode('ДО1');
            setDefenseData(defense ?? []);
            console.log('Оборонные данные:', defense);
        } catch (defErr) {
            console.error(defErr);
            setDefenseError('Не удалось получить данные оборонных предприятий');
            setDefenseData([]);
        } finally {
            setDefenseLoading(false);
        }
    };

    const handleDefenseCheckboxChange = async (event) => {
        const checked = event.target.checked;
        setIsDefenseEnterprise(checked);
        
        if (checked) {
            await fetchDefenseData();
        } else {
            setDefenseData([]);
            setDefenseError('');
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
        setMatchedGroups([]);
        setCompanyData(null);
        setCompanyCodes([]);
        setGenerateError('');
        setIsDefenseEnterprise(false);
        setDefenseData([]);
        setDefenseError('');

        try {
            let company = null;
            let apiMetaMessage = '';
            try {
                const cached = await fetchOfDataByInn(inn);
                if (cached?.object) {
                    company = isEmptyObject(cached.object) ? null : cached.object;
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
                apiMetaMessage = data?.meta?.message || '';
                const apiCompany = data?.data;
                if (apiCompany && !isEmptyObject(apiCompany)) {
                    company = apiCompany;
                }
                console.log('Данные компании из внешнего API:', data);

                if (company) {
                    try {
                        await saveOfDataRecord(inn, company);
                    } catch (saveErr) {
                        console.error('Не удалось сохранить данные в Directus ofdata:', saveErr);
                    }
                }
            }

            if (!company) {
                const message = apiMetaMessage || 'Данные компании не найдены';
                setCompanyData(null);
                setMatchedGroups([]);
                setCompanyCodes([]);
                setError(message);
                return;
            }

            setCompanyData(company);
            const codes = extractCodes(company);
            setCompanyCodes(codes);

            await findMatchingLists(company);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Произошла ошибка при запросе');
        } finally {
            setLoading(false);
        }
    };

    const companyName = useMemo(() => extractCompanyName(companyData), [companyData]);
    const companyCodeDescriptions = useMemo(() => extractCodeDescriptions(companyData), [companyData]);

    const flattenedMatchedLists = useMemo(() => {
        if (!matchedGroups.length) {
            return [];
        }
        return matchedGroups.flatMap((group) => Array.isArray(group?.items) ? group.items : []);
    }, [matchedGroups]);

    const combinedGroups = useMemo(() => {
        const combined = [...matchedGroups];
        if (isDefenseEnterprise && defenseData.length > 0) {
            combined.push(...defenseData);
        }
        // Сортировка объединенных групп по номерам
        return combined.sort((a, b) => {
            const groupNumA = extractGroupNumber(a.activity);
            const groupNumB = extractGroupNumber(b.activity);
            return groupNumA - groupNumB;
        });
    }, [matchedGroups, isDefenseEnterprise, defenseData]);

    const companyOkvedMatchMap = useMemo(() => {
        const matchMap = new Map();
        if (!companyCodes.length || !flattenedMatchedLists.length) {
            return matchMap;
        }

        const listCodes = [];
        flattenedMatchedLists.forEach((item) => {
            getListCodes(item?.okved).forEach((listCode) => {
                listCodes.push(listCode);
            });
        });

        companyCodes.forEach((companyCode) => {
            const companyParts = splitOkvedGroups(companyCode);
            const bestMatch = listCodes.reduce((currentBest, listCode) => {
                const listParts = splitOkvedGroups(listCode);
                let matchedParts = 0;

                while (
                    matchedParts < companyParts.length
                    && matchedParts < listParts.length
                    && companyParts[matchedParts] === listParts[matchedParts]
                ) {
                    matchedParts += 1;
                }

                const directedMatch = companyParts.length <= listParts.length
                    && matchedParts === companyParts.length;
                const exact = directedMatch && matchedParts === listParts.length;
                const effectiveMatchedParts = directedMatch ? matchedParts : 0;

                if (
                    effectiveMatchedParts > currentBest.matchedParts
                    || (effectiveMatchedParts === currentBest.matchedParts && exact && !currentBest.exact)
                ) {
                    return { exact, matchedParts: effectiveMatchedParts };
                }

                return currentBest;
            }, { exact: false, matchedParts: 0 });

            matchMap.set(companyCode, bestMatch);
        });

        return matchMap;
    }, [companyCodes, flattenedMatchedLists, getListCodes]);

    const hasMatchedRows = flattenedMatchedLists.length > 0 || (isDefenseEnterprise && defenseData.length > 0);

    const handleGenerateDocument = async () => {
        if (!hasMatchedRows) {
            return;
        }
        setGenerateError('');
        setGenerateLoading(true);
        try {
            const templatePath = encodeURI('/templates/Анкета КИИ.docx');
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error('Не удалось загрузить шаблон документа');
            }
            const arrayBuffer = await response.arrayBuffer();
            const zip = new PizZip(arrayBuffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '[[', end: ']]' }
            });

            const groupedRows = combinedGroups.map((group, groupIndex) => ({
                activity: group?.activity || `Группа ${groupIndex + 1}`,
                rows: (group?.items || []).map((item, itemIndex) => {
                    const rowCodes = getListCodes(item.okved);
                    return {
                        index: itemIndex + 1,
                        number: item.number ?? '',
                        name: item.NameObject ?? '',
                        process: item.Process ?? '',
                        okved: rowCodes.join(', ') || '—',
                        okvedList: rowCodes
                    };
                })
            }));

            const docData = {
                companyName: companyName || '—',
                inn: inn || '—',
                groupedRows
            };
            try {
                doc.render(docData);
            } catch (renderErr) {
                console.error(renderErr);
                throw new Error('Не удалось обработать шаблон. Проверьте плейсхолдеры документа.');
            }

            const blob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const safeCompanyName = (companyName || inn ).replace(/[\\/:*?"<>|]/g, '_');
            saveAs(blob, `Анкета_${safeCompanyName}.docx`);
        } catch (generateErr) {
            console.error(generateErr);
            setGenerateError(generateErr.message || 'Не удалось сформировать документ');
        } finally {
            setGenerateLoading(false);
        }
    };

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
                    {hasMatchedRows && (
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleGenerateDocument}
                            disabled={generateLoading}
                            startIcon={<DescriptionIcon />}
                            sx={{ minWidth: 200, height: 40 }}
                        >
                            {generateLoading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Сформировать анкету'
                            )}
                        </Button>
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Введите 10 цифр ИНН
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {listsLoading && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {listsError && <Alert severity="error">{listsError}</Alert>}
                {generateError && <Alert severity="error">{generateError}</Alert>}
                {companyData && (
                    <Box>
                        <Typography variant="h6">Заказчик</Typography>
                        <Typography variant="subtitle1" color="text.primary">
                            {companyName || 'Наименование не указано'}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isDefenseEnterprise}
                                        onChange={handleDefenseCheckboxChange}
                                        disabled={defenseLoading}
                                    />
                                }
                                label="Оборонное предприятие"
                            />
                            {defenseLoading && (
                                <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
                        </Box>
                        {defenseError && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                                {defenseError}
                            </Alert>
                        )}
                    </Box>
                )}
                {!!companyCodes.length && (
                    <Box>
                        <Typography variant="h6">ОКВЭД заказчика</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {companyCodes.map((code) => {
                                const matchInfo = companyOkvedMatchMap.get(code) || { exact: false, matchedParts: 0 };
                                const hasMatch = matchInfo.matchedParts > 0;
                                const description = companyCodeDescriptions[code] || 'Наименование ОКВЭД не найдено';
                                return (
                                    <Tooltip key={code} title={description} arrow>
                                        <Chip
                                            label={renderOkvedCodeLabel(code, matchInfo)}
                                            color={matchInfo.exact ? 'success' : 'default'}
                                            variant={hasMatch && matchInfo.exact ? 'filled' : 'outlined'}
                                        />
                                    </Tooltip>
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
                            maxHeight: '76vh',
                            overflowY: 'auto'
                        }}
                    >
                        <Table stickyHeader>
                            <TableHead
                                sx={{
                                    '& th': {
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                        backgroundColor: (theme) => theme.palette.background.paper
                                    }
                                }}
                            >
                                <TableRow>
                                    <TableCell>№</TableCell>
                                    <TableCell>Наименование типового объекта</TableCell>
                                    <TableCell>Типовые процессы (функции), выполняемые типовым объектом</TableCell>
                                    <TableCell>ОКВЭД</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {!hasMatchedRows ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            Совпадений по ОКВЭД не найдено
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    combinedGroups.map((group, groupIndex) => {
                                        const groupTitle = group?.activity || 'Без указания сферы';
                                        const groupRows = Array.isArray(group?.items) ? group.items : [];

                                        return (
                                            <React.Fragment key={`${groupTitle}-${groupIndex}`}>
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={4}
                                                        sx={{
                                                            backgroundColor: (theme) => theme.palette.action.hover,
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {groupTitle}
                                                    </TableCell>
                                                </TableRow>
                                                {groupRows.map((item, rowIdx) => {
                                                    const rowCodes = getListCodes(item.okved);
                                                    const rowKey = item.id ?? `${groupTitle}-${item.number ?? 'row'}-${rowIdx}`;
                                                    return (
                                                        <TableRow key={rowKey}>
                                                            <TableCell>{item.number}</TableCell>
                                                            <TableCell>{item.NameObject}</TableCell>
                                                            <TableCell>{item.Process}</TableCell>
                                                            <TableCell>
                                                                {rowCodes.length ? (
                                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                        {rowCodes.map((code, codeIdx) => {
                                                                            const codeKey = `${rowKey}-code-${code}-${codeIdx}`;
                                                                            const matchInfo = getOkvedMatchInfo(code);
                                                                            const hasMatch = matchInfo.matchedParts > 0;
                                                                            return (
                                                                                <Chip
                                                                                    key={codeKey}
                                                                                    label={renderOkvedCodeLabel(code, matchInfo)}
                                                                                    size="small"
                                                                                    color={matchInfo.exact ? 'success' : 'default'}
                                                                                    variant={hasMatch && matchInfo.exact ? 'filled' : 'outlined'}
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
                                                })}
                                            </React.Fragment>
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

