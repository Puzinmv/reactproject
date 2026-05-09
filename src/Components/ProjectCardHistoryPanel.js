import React, { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, IconButton,
    Paper, Stack, Tooltip, Typography
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { STATUS_COLORS, FIELD_NAMES } from '../constants/index.js';
import { fetchProjectCardHistory } from '../services/directus';

const getStatusColor = (status) => STATUS_COLORS[status] || '#e0e0e0';

const HISTORY_FIELD_LABEL_OVERRIDES = {
    Description: 'Описание проекта',
    ProjectScope: 'Особые пожелания заказчика или инициатора',
    CommentJob: 'Комментарии к оценке работ',
    need_system_requirements: 'Требуются доп. ПО или оборудование',
    system_requirements: 'Системные требования',
    jobCalculated: 'Расчет трудозатрат произведен',
    priceAproved: 'Цена согласована',
    resourceSumm: 'Трудозатраты',
    frameSumm: 'Длительность',
    JobOnTripTable: 'Работа на выезд',
    HiredCost: 'Стоимость субподряда',
    Hired: 'Субподряд',
    OpenProject_Template_id: 'Шаблон проекта',
    Project_created: 'Проект создан',
    projectRedirect: 'Ссылка на проект',
};

const HISTORY_VISIBLE_FIELDS = new Set([
    'status',
    'initiator',
    'title',
    'Customer',
    'inn',
    'CustomerCRMID',
    'CustomerContact',
    'CustomerContactCRMID',
    'CustomerContactTel',
    'CustomerContactEmail',
    'CustomerContactJobTitle',
    'Department',
    'Description',
    'ProjectScope',
    'JobDescription',
    'CommentJob',
    'need_system_requirements',
    'resourceSumm',
    'frameSumm',
    'jobCalculated',
    'HiredCost',
    'Hired',
    'JobOnTripTable',
    'OpenProject_Template_id',
    'Limitations',
    'system_requirements',
    'Price',
    'priceAproved',
    'Cost',
    'tiketsCost',
    'tiketsCostDescription',
    'HotelCost',
    'HotelCostDescription',
    'dailyCost',
    'dailyCostDescription',
    'otherPayments',
    'otherPaymentsDescription',
    'company',
    'Project_created',
    'projectRedirect',
    'contract',
    'dateStart',
    'deadline',
    'Files',
]);

const HISTORY_JSON_FIELD_LABELS = {
    id: '№',
    jobName: 'Наименование работ',
    resourceDay: 'Ресурсная',
    frameDay: 'Рамочная',
    requirement: 'Системные требования',
    approved: 'Требования согласованы',
    Address: 'Адрес проведения работ',
    DayOnTrip: 'Количество дней',
    JobDecription: 'Какие работы проводятся по указанным адресам',
    JobDescription: 'Описание работ',
    system_requirements: 'Системные требования',
    JobOnTripTable: 'Работы на выезд',
};

const HISTORY_JSON_FIELD_ORDER = [
    'id',
    'jobName',
    'resourceDay',
    'frameDay',
    'requirement',
    'approved',
    'Address',
    'DayOnTrip',
    'JobDecription',
];

const HISTORY_JSON_FIELD_WIDTHS = {
    id: '56px',
    jobName: '55%',
    resourceDay: '110px',
    frameDay: '110px',
    requirement: '70%',
    approved: '220px',
    Address: '40%',
    DayOnTrip: '120px',
    JobDecription: '40%',
};

const HISTORY_COLLAPSED_CHANGE_HEIGHT = 180;

const HISTORY_FIELD_LABELS = FIELD_NAMES.reduce((acc, field) => {
    acc[field.columnId] = field.label;
    return acc;
}, { ...HISTORY_FIELD_LABEL_OVERRIDES });

const HISTORY_SYSTEM_FIELDS = new Set([
    'id',
    'sort',
    'date_created',
    'date_updated',
    'user_created',
    'user_updated',
]);

const getHistoryFieldLabel = (field) => HISTORY_FIELD_LABELS[field] || field;

const parseHistoryObject = (value) => {
    if (!value || typeof value !== 'string') {
        return value && typeof value === 'object' ? value : {};
    }

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const parseHistoryJsonValue = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue || !['{', '['].includes(trimmedValue[0])) {
        return value;
    }

    try {
        return JSON.parse(trimmedValue);
    } catch (error) {
        return value;
    }
};

const isHistoryStructuredValue = (value) => {
    const parsedValue = parseHistoryJsonValue(value);
    return parsedValue !== null && typeof parsedValue === 'object';
};

const isHistoryEmptyStructuredValue = (value) => {
    const parsedValue = parseHistoryJsonValue(value);

    if (parsedValue === null || parsedValue === undefined || parsedValue === '') {
        return true;
    }

    if (Array.isArray(parsedValue)) {
        return parsedValue.length === 0;
    }

    if (typeof parsedValue === 'object') {
        return Object.keys(parsedValue).length === 0;
    }

    return false;
};

const getHistoryJsonPathLabel = (path) => (
    String(path || 'Значение')
        .split('.')
        .filter(Boolean)
        .map((part) => {
            if (/^\d+$/.test(part)) {
                return `Строка ${part}`;
            }

            return HISTORY_JSON_FIELD_LABELS[part] || getHistoryFieldLabel(part);
        })
        .join(' / ')
);

const isHistoryHtmlValue = (value) => (
    typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)
);

const sanitizeHistoryHtml = (html) => {
    if (typeof document === 'undefined') {
        return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    template.content
        .querySelectorAll('script, style, iframe, object, embed, link, meta')
        .forEach((node) => node.remove());

    template.content.querySelectorAll('*').forEach((node) => {
        Array.from(node.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = String(attribute.value || '').trim().toLowerCase();
            const unsafeScriptProtocol = ['java', 'script:'].join('');

            if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith(unsafeScriptProtocol))) {
                node.removeAttribute(attribute.name);
            }
        });
    });

    return template.innerHTML;
};

const formatHistoryUser = (user) => {
    if (!user) {
        return 'Внешняя система';
    }

    if (typeof user === 'string') {
        return user;
    }

    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || 'Внешняя система';
};

const formatHistoryValue = (value) => {
    const normalizedValue = parseHistoryJsonValue(value);

    if (value === null || value === undefined || value === '') {
        return 'Нет';
    }

    if (typeof normalizedValue === 'boolean') {
        return normalizedValue ? 'Да' : 'Нет';
    }

    if (Array.isArray(normalizedValue)) {
        if (!normalizedValue.length) {
            return 'Нет';
        }

        return normalizedValue.map((item) => formatHistoryValue(item)).join(', ');
    }

    if (normalizedValue && typeof normalizedValue === 'object') {
        const readableValue = normalizedValue.name
            || normalizedValue.title
            || normalizedValue.Department
            || normalizedValue.filename_download
            || `${normalizedValue.first_name || ''} ${normalizedValue.last_name || ''}`.trim();

        if (readableValue) {
            return readableValue;
        }

        return JSON.stringify(normalizedValue);
    }

    return String(normalizedValue);
};

const flattenHistoryValue = (value, prefix = '') => {
    const normalizedValue = parseHistoryJsonValue(value);

    if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') {
        return [{ path: prefix || 'Значение', value: 'Нет' }];
    }

    if (typeof normalizedValue !== 'object') {
        return [{ path: prefix || 'Значение', value: formatHistoryValue(normalizedValue) }];
    }

    if (Array.isArray(normalizedValue)) {
        if (!normalizedValue.length) {
            return [{ path: prefix || 'Значение', value: 'Нет' }];
        }

        return normalizedValue.flatMap((item, index) => (
            flattenHistoryValue(item, prefix ? `${prefix}.${index + 1}` : String(index + 1))
        ));
    }

    const entries = Object.entries(normalizedValue);
    if (!entries.length) {
        return [{ path: prefix || 'Значение', value: 'Нет' }];
    }

    return entries.flatMap(([key, entryValue]) => (
        flattenHistoryValue(entryValue, prefix ? `${prefix}.${key}` : key)
    ));
};

const buildInitialHistoryTable = (value) => {
    const normalizedValue = parseHistoryJsonValue(value);
    const sourceRows = Array.isArray(normalizedValue)
        ? normalizedValue
        : [normalizedValue];
    const rowObjects = sourceRows
        .filter((row) => row !== null && row !== undefined && row !== '')
        .map((row) => (row && typeof row === 'object' && !Array.isArray(row)
            ? row
            : { value: row }));
    const columnKeys = Array.from(new Set(
        rowObjects.flatMap((row) => Object.keys(row))
    )).sort((firstKey, secondKey) => {
        const firstIndex = HISTORY_JSON_FIELD_ORDER.indexOf(firstKey);
        const secondIndex = HISTORY_JSON_FIELD_ORDER.indexOf(secondKey);

        if (firstIndex === -1 && secondIndex === -1) {
            return 0;
        }

        if (firstIndex === -1) {
            return 1;
        }

        if (secondIndex === -1) {
            return -1;
        }

        return firstIndex - secondIndex;
    });

    if (!columnKeys.length) {
        return {
            columns: [{ key: 'value', label: 'Значение' }],
            rows: [],
        };
    }

    return {
        columns: columnKeys.map((key) => ({
            key,
            label: HISTORY_JSON_FIELD_LABELS[key] || getHistoryFieldLabel(key),
            width: HISTORY_JSON_FIELD_WIDTHS[key] || 'auto',
        })),
        rows: rowObjects.map((row) => (
            columnKeys.reduce((acc, key) => ({
                ...acc,
                [key]: formatHistoryValue(row[key]),
            }), {})
        )),
    };
};

const buildHistoryTableRows = (beforeValue, afterValue) => {
    const beforeRows = flattenHistoryValue(beforeValue);
    const afterRows = flattenHistoryValue(afterValue);
    const isInitialValueEmpty = isHistoryEmptyStructuredValue(beforeValue);

    if (isInitialValueEmpty) {
        const initialTable = buildInitialHistoryTable(afterValue);

        return {
            isInitialValueEmpty,
            rows: initialTable.rows,
            columns: initialTable.columns,
        };
    }

    const beforeMap = new Map(beforeRows.map((row) => [row.path, row.value]));
    const afterMap = new Map(afterRows.map((row) => [row.path, row.value]));
    const paths = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));

    return {
        isInitialValueEmpty,
        rows: paths.map((path) => ({
            path: getHistoryJsonPathLabel(path),
            before: beforeMap.get(path) || 'Нет',
            after: afterMap.get(path) || 'Нет',
        })).filter((row) => row.before !== row.after),
    };
};

const formatHistoryDate = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return 'Без даты';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date).replace(' г.', '');
};

const formatHistoryTime = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const getHistoryActionTitle = (action, changes) => {
    if (action === 'create') {
        return 'Карта создана';
    }

    if (action === 'delete') {
        return 'Карта удалена';
    }

    if (changes.length === 1) {
        return `Изменено поле "${changes[0].label}"`;
    }

    if (changes.some((change) => change.field === 'status')) {
        return 'Изменен статус карты';
    }

    return 'Изменения сохранены';
};

const buildProjectCardHistoryItems = (revisions = []) => (
    revisions.map((revision, index) => {
        const activity = revision.activity || {};
        const action = activity.action || 'update';
        const data = parseHistoryObject(revision.data);
        const previousRevisionData = parseHistoryObject(revisions[index + 1]?.data);
        const delta = parseHistoryObject(revision.delta);
        const changedFields = Object.keys(delta).filter((field) => (
            !HISTORY_SYSTEM_FIELDS.has(field) && HISTORY_VISIBLE_FIELDS.has(field)
        ));
        const timestamp = activity.timestamp || revision.date_created || revision.date_updated;
        const statusAfterChanges = data.status || delta.status || '';

        const changes = changedFields.map((field) => {
            const beforeValue = Object.prototype.hasOwnProperty.call(previousRevisionData, field)
                ? previousRevisionData[field]
                : undefined;
            const afterValue = Object.prototype.hasOwnProperty.call(data, field)
                ? data[field]
                : delta[field];

            return {
                field,
                label: getHistoryFieldLabel(field),
                rawBefore: beforeValue,
                rawAfter: afterValue,
                before: formatHistoryValue(beforeValue),
                after: formatHistoryValue(afterValue),
                isStructured: isHistoryStructuredValue(beforeValue) || isHistoryStructuredValue(afterValue),
            };
        });

        if (!changes.length && action === 'create') {
            changes.push({
                field: 'created',
                label: 'Карта',
                rawBefore: null,
                rawAfter: 'Создана',
                before: 'Нет',
                after: 'Создана',
                isStructured: false,
            });
        }

        return {
            id: revision.id || activity.id || `${timestamp}-${revision.item}`,
            action,
            actor: formatHistoryUser(activity.user),
            timestamp,
            dateLabel: formatHistoryDate(timestamp),
            timeLabel: formatHistoryTime(timestamp),
            changes,
            title: getHistoryActionTitle(action, changes),
            statusAfterChanges,
            statusColor: getStatusColor(statusAfterChanges),
        };
    }).filter((item) => item.changes.length > 0)
);

const ProjectCardHistoryPanel = ({ open, rowid, cardId, onClose }) => {
    const [historyItems, setHistoryItems] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [expandedHistoryItems, setExpandedHistoryItems] = useState({});
    const [expandedHistoryValues, setExpandedHistoryValues] = useState({});

    useEffect(() => {
        if (!open || !rowid) {
            return;
        }

        let isCancelled = false;

        const loadHistory = async () => {
            setHistoryLoading(true);
            setHistoryError('');

            try {
                const revisions = await fetchProjectCardHistory(rowid);
                const items = buildProjectCardHistoryItems(revisions);

                if (isCancelled) {
                    return;
                }

                setHistoryItems(items);
                setExpandedHistoryItems(items[0]?.id ? { [items[0].id]: true } : {});
                setExpandedHistoryValues({});
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                console.error('Error loading project card history:', error);
                setHistoryError('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439');
                setHistoryItems([]);
            } finally {
                if (!isCancelled) {
                    setHistoryLoading(false);
                }
            }
        };

        loadHistory();

        return () => {
            isCancelled = true;
        };
    }, [open, rowid]);

    const groupedHistoryItems = historyItems.reduce((groups, item) => {
        const existingGroup = groups.find((group) => group.dateLabel === item.dateLabel);

        if (existingGroup) {
            existingGroup.items.push(item);
        } else {
            groups.push({ dateLabel: item.dateLabel, items: [item] });
        }

        return groups;
    }, []);

    const handleToggleHistoryItem = (itemId) => {
        setExpandedHistoryItems((prevItems) => ({
            ...prevItems,
            [itemId]: !prevItems[itemId],
        }));
    };

    const handleToggleHistoryValue = (changeId) => {
        setExpandedHistoryValues((prevItems) => ({
            ...prevItems,
            [changeId]: !prevItems[changeId],
        }));
    };

    const renderHistoryValueContent = (value) => {
        const normalizedValue = String(value ?? '');

        if (!isHistoryHtmlValue(normalizedValue)) {
            return normalizedValue;
        }

        return (
            <Box
                component="div"
                sx={{
                    '& p': { my: 0.25 },
                    '& ul, & ol': { my: 0.25, pl: 2.5 },
                    '& li': { my: 0.25 },
                    '& table': { borderCollapse: 'collapse', width: '100%' },
                    '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.5 },
                }}
                dangerouslySetInnerHTML={{ __html: sanitizeHistoryHtml(normalizedValue) }}
            />
        );
    };

    const renderHistoryChangeValue = (change, changeId) => {
        const isValueExpanded = Boolean(expandedHistoryValues[changeId]);
        const canToggleValue = change.isStructured
            || change.before.length > 160
            || change.after.length > 160
            || change.before.includes('\n')
            || change.after.includes('\n');

        if (change.isStructured) {
            const tableData = buildHistoryTableRows(change.rawBefore, change.rawAfter);
            const visibleRows = isValueExpanded ? tableData.rows : tableData.rows.slice(0, 5);

            return (
                <Box>
                    <Box
                        sx={{
                            maxHeight: isValueExpanded ? 'none' : HISTORY_COLLAPSED_CHANGE_HEIGHT,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            component="table"
                            sx={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                '& th, & td': {
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    px: 1,
                                    py: 0.75,
                                    verticalAlign: 'top',
                                    wordBreak: 'break-word',
                                },
                                '& th': {
                                    bgcolor: 'grey.50',
                                    color: 'text.secondary',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                },
                                '& td': {
                                    fontSize: '0.8125rem',
                                },
                            }}
                        >
                            {tableData.isInitialValueEmpty ? (
                                <>
                                    <Box component="thead">
                                        <Box component="tr">
                                            {tableData.columns.map((column) => (
                                                <Box
                                                    component="th"
                                                    key={`${changeId}-${column.key}`}
                                                    sx={{
                                                        width: column.width,
                                                        textAlign: ['id', 'resourceDay', 'frameDay', 'DayOnTrip', 'approved'].includes(column.key)
                                                            ? 'center'
                                                            : 'left',
                                                    }}
                                                >
                                                    {column.label}
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                    <Box component="tbody">
                                        {visibleRows.map((row, rowIndex) => (
                                            <Box component="tr" key={`${changeId}-${rowIndex}`}>
                                                {tableData.columns.map((column) => (
                                                    <Box
                                                        component="td"
                                                        key={`${changeId}-${rowIndex}-${column.key}`}
                                                        sx={{
                                                            width: column.width,
                                                            textAlign: ['id', 'resourceDay', 'frameDay', 'DayOnTrip', 'approved'].includes(column.key)
                                                                ? 'center'
                                                                : 'left',
                                                    }}
                                                >
                                                    {renderHistoryValueContent(row[column.key] || 'Нет')}
                                                </Box>
                                            ))}
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <Box component="thead">
                                        <Box component="tr">
                                            <Box component="th" sx={{ width: '30%' }}>Поле</Box>
                                            <Box component="th" sx={{ width: '35%' }}>Было</Box>
                                            <Box component="th" sx={{ width: '35%' }}>Стало</Box>
                                        </Box>
                                    </Box>
                                    <Box component="tbody">
                                        {visibleRows.map((row) => (
                                            <Box component="tr" key={`${changeId}-${row.path}`}>
                                                <Box component="td" sx={{ color: 'text.secondary', fontWeight: 600 }}>{row.path}</Box>
                                                <Box component="td">{renderHistoryValueContent(row.before)}</Box>
                                                <Box component="td">{renderHistoryValueContent(row.after)}</Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Box>
                    {(tableData.rows.length > visibleRows.length || canToggleValue) && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => handleToggleHistoryValue(changeId)}
                            sx={{ mt: 0.5, px: 0, textTransform: 'none', minWidth: 0 }}
                        >
                            {isValueExpanded ? 'Сузить' : `Увеличить${tableData.rows.length > visibleRows.length ? ` (${tableData.rows.length - visibleRows.length})` : ''}`}
                        </Button>
                    )}
                </Box>
            );
        }

        return (
            <Box>
                <Box
                    sx={{
                        fontWeight: 600,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.875rem',
                        ...(!isValueExpanded && canToggleValue ? {
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        } : {}),
                    }}
                >
                    {renderHistoryValueContent(change.before)}
                    <Typography component="span" color="text.secondary" sx={{ mx: 0.75 }}>→</Typography>
                    {renderHistoryValueContent(change.after)}
                </Box>
                {canToggleValue && (
                    <Button
                        variant="text"
                        size="small"
                        onClick={() => handleToggleHistoryValue(changeId)}
                        sx={{ mt: 0.25, px: 0, textTransform: 'none', minWidth: 0 }}
                    >
                        {isValueExpanded ? 'Сузить' : 'Увеличить'}
                    </Button>
                )}
            </Box>
        );
    };

    if (!open) {
        return null;
    }

    return (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            width: { xs: '100vw', md: '75vw' },
                            maxWidth: 'none',
                            minWidth: { md: '760px' },
                            height: '100vh',
                            bgcolor: 'background.paper',
                            boxShadow: 6,
                            zIndex: 1300,
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Paper sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <HistoryIcon color="primary" />
                                    <Box>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                                            История изменений
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Карта №{cardId || rowid}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Tooltip title="Закрыть">
                                    <IconButton onClick={() => onClose()} aria-label="Закрыть историю изменений">
                                        <CloseIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {historyLoading ? (
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CircularProgress />
                                </Box>
                            ) : historyError ? (
                                <Alert severity="error" sx={{ m: 2 }}>
                                    {historyError}
                                </Alert>
                            ) : groupedHistoryItems.length === 0 ? (
                                <Alert severity="info" variant="outlined" sx={{ m: 2 }}>
                                    История изменений пуста
                                </Alert>
                            ) : (
                                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
                                    {groupedHistoryItems.map((group) => (
                                        <Box key={group.dateLabel} sx={{ mb: 2.5 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                                                {group.dateLabel}
                                            </Typography>
                                            {group.items.map((item) => {
                                                const isExpanded = Boolean(expandedHistoryItems[item.id]);
                                                const visibleChanges = isExpanded ? item.changes : item.changes.slice(0, 2);

                                                return (
                                                    <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 1.5, mb: 1.5 }}>
                                                        <Box sx={{ position: 'relative', pt: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', pr: 1 }}>
                                                                {item.timeLabel}
                                                            </Typography>
                                                            <Box sx={{ position: 'absolute', top: 15, right: -10, width: 9, height: 9, borderRadius: '50%', bgcolor: item.statusColor, border: '2px solid white', boxShadow: 1 }} />
                                                        </Box>
                                                        <Paper
                                                            variant="outlined"
                                                            sx={{
                                                                p: 1.5,
                                                                borderColor: isExpanded ? item.statusColor : 'divider',
                                                                bgcolor: isExpanded ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                                                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                                            {item.actor}
                                                                        </Typography>
                                                                        <Tooltip title={item.statusAfterChanges ? `Статус после изменения: ${item.statusAfterChanges}` : ''}>
                                                                            <Chip
                                                                                label={item.action === 'create' ? 'Создание' : 'Изменение'}
                                                                                size="small"
                                                                                sx={{
                                                                                    height: 22,
                                                                                    bgcolor: item.statusColor,
                                                                                    color: 'white',
                                                                                    fontWeight: 600,
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    </Stack>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                                        {item.title}
                                                                    </Typography>
                                                                </Box>
                                                                <Tooltip title={isExpanded ? 'Свернуть' : 'Развернуть'}>
                                                                    <IconButton size="small" onClick={() => handleToggleHistoryItem(item.id)}>
                                                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>

                                                            <Box sx={{ mt: 1 }}>
                                                                {visibleChanges.map((change) => {
                                                                    const changeId = `${item.id}-${change.field}`;

                                                                    return (
                                                                    <Box key={changeId} sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.45fr) 1fr', gap: 1.5, py: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {change.label}
                                                                        </Typography>
                                                                        {renderHistoryChangeValue(change, changeId)}
                                                                    </Box>
                                                                    );
                                                                })}
                                                                {!isExpanded && item.changes.length > visibleChanges.length && (
                                                                    <Button
                                                                        variant="text"
                                                                        size="small"
                                                                        onClick={() => handleToggleHistoryItem(item.id)}
                                                                        sx={{ mt: 0.5, px: 0, textTransform: 'none', minWidth: 0 }}
                                                                    >
                                                                        Еще изменений: {item.changes.length - visibleChanges.length}
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        </Paper>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    </Box>
    );
};

export default ProjectCardHistoryPanel;
