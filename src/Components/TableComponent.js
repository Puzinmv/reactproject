import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
    TableSortLabel, TablePagination, Paper, Checkbox, IconButton, Menu, MenuItem,
    TextField, Tooltip, Switch, Typography, FormControlLabel, Box, CircularProgress
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add'; 
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { FIELD_NAMES, STATUS, STATUS_COLORS} from '../constants/index.js';
import { fetchDatanew } from '../services/directus.js';

const formatDate = (dateString) => {
  if (!dateString) return ''
  const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const statusStyles =  Object.entries(STATUS).reduce((acc, [key, value]) => {
    acc[value] = { color: STATUS_COLORS[value] };
    return acc;
  }, {});

const formatField = (field, value) => {
    if (field === 'status') {
        const style = statusStyles[value.trim()] || {};
        return (<Box sx={style}>{value}</Box>);;
    }
    if (field === 'date_created' || field === 'date_updated' || field === 'dateStart' || field === 'deadline') {
    return formatDate(value);
    }
    if (field === 'Department') {
        if (value === null) return '';
        return value.hasOwnProperty('Name') ? value.Department : '';
    }
    if (field === 'Description' || field === 'jobOnTrip') {
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
    }
    if (field === 'Price' || field === 'Cost' || field === 'tiketsCost'
        || field === 'HotelCost' || field === 'dailyCost' || field === 'otherPayments') {
        const number = value || 0
        const parts = number.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join(',') + ' ₽';
    }
    if (typeof value === 'object' && value !== null) {
    if (value.first_name) {
        return `${value.first_name} ${value.last_name || ''}`;
    }
    return JSON.stringify(value);
    }
    return value;
};

const searchInObject = (obj, searchTerm) => {
    if (typeof obj !== 'object' || obj === null) {
        return String(obj).toLowerCase().includes(searchTerm);
    }

    return Object.values(obj).some(value => searchInObject(value, searchTerm));
};


const TableComponent = ({ data, setTableData, CurrentUser, onRowSelect, onCreate }) => {
    const [columns, setColumns] = useState([]);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('id');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [anchorEl, setAnchorEl] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [columnSearch, setColumnSearch] = useState({});
    const [searchingColumn, setSearchingColumn] = useState(null);   // колонка в поиске
    const [initiatorOptions, setinitiatorOptions] = useState([]);   // перечень инициаторов в картах
    const [departmentOptions, setdepartmentOptions] = useState([]); // перечень отделов исполнителей в картах
    const [statusOptions, setstatusOptions] = useState([]);         // перечень статусов в картах
    const [showMyCards, setShowMyCards] = useState(true);           // показать только мои карты
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tableData, setLocalTableData] = useState([]); // добавляем локальное состояние для данных

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchDatanew({
                page: page + 1,
                limit: rowsPerPage,
                sort: `${order === 'desc' ? '-' : ''}${orderBy}`,
                search: globalSearch,
                filters: columnSearch,
                columns: columns.filter(col => col.visible).map(col => col.columnId),
                currentUser: showMyCards ? CurrentUser : null
            });

            setLocalTableData(response.data); // устанавливаем данные в локальное состояние
            setTableData(response.data);      // обновляем родительское состояние
            setTotalRows(response.meta.total);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, order, orderBy, globalSearch, columnSearch, columns, showMyCards, CurrentUser]);

    useEffect(() => {
        console.log("callback")
        loadData();
    }, [loadData]);

    useEffect(() => {
        let savedColumns = FIELD_NAMES;
        const LocalStorageColumns = JSON.parse(localStorage.getItem('columns'));
        if (Array.isArray(LocalStorageColumns)) {
            if (LocalStorageColumns.length > 0) {
                savedColumns = JSON.parse(localStorage.getItem('columns'));
            }
        }
        const SetSelect = localStorage.getItem('ShowMyCard');
        if (SetSelect) setShowMyCards(JSON.parse(SetSelect))
        if (Array.isArray(data)) setinitiatorOptions(['---', ...new Set(data.map(item => item?.initiator?.first_name || ''
            //+ ' ' + item.initiator.last_name || ''
        ))]);
        if (Array.isArray(data)) setdepartmentOptions(['---', ...new Set(data.map(item => item.Department.Department))]);
        if (Array.isArray(data)) setstatusOptions(['---', ...new Set(data.map(item => item.status))]);
        setColumns(savedColumns);
    }, [data]);

    useEffect(() => {
        if (JSON.stringify(columns) !== JSON.stringify(FIELD_NAMES) && columns.length>0) {
            localStorage.setItem('columns', JSON.stringify(columns));
        }
        
    }, [columns]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event, newPage) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRowClick = (row) => {
        if (onRowSelect) {
            onRowSelect(row);
        }
    };

    const handleColumnVisibilityChange = (id) => {
        setColumns(columns.map(column => column.columnId === id ? { ...column, visible: !column.visible } : column));
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleGlobalSearchChange = (event) => {
        setGlobalSearch(event.target.value);
        setPage(0);
    };

    const handleColumnSearchChange = (event, columnId) => {
        const value = event.target.value === '---' ? '' : event.target.value;
        setColumnSearch(prev => ({
            ...prev,
            [columnId]: value
        }));
        setPage(0);
    };

    const handleSearchIconClick = (columnId) => {
        setSearchingColumn(columnId);
    };

    const handleSearchBlur = (columnId) => {
        if (!columnSearch[columnId]) {
            setSearchingColumn(null);
        }
    };

    const handleSwitchChange = (event) => {
        setShowMyCards(event.target.checked);
        localStorage.setItem('ShowMyCard', JSON.stringify(event.target.checked));
    };

    const formatValue = (value) => {
        if (typeof value === 'object' && value !== null && 'first_name' in value && 'last_name' in value) {
            return value.first_name
               // + ' ' + value.last_name || '';
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value).toLowerCase();
        } else if (typeof value === 'string') {
            return value.toLowerCase();
        } else if (typeof value === 'number') {
            return value.toString().toLowerCase();
        } else if (value instanceof Date) {
            return value.toISOString().toLowerCase();
        }
        return '';
    };
    const sortedData = data;
    console.log(sortedData, data);
    // const filteredData = data.filter(row => {
    //     const globalMatch = searchInObject(row, globalSearch.toLowerCase());

    //     const columnMatches = Object.keys(columnSearch).every(columnId => {
    //         if (columnId === 'initiator' && showMyCards) {
    //             if (CurrentUser?.email === row?.Department?.email) return  formatValue(row[columnId]).toLowerCase().includes(columnSearch[columnId].toLowerCase());
    //             return row[columnId] && formatValue(row[columnId]).toLowerCase().includes(CurrentUser.first_name.toLowerCase());
    //         }
    //         return formatValue(row[columnId]).toLowerCase().includes(columnSearch[columnId].toLowerCase());
    //     });
    //     const showMyCadrMatches = !showMyCards || formatValue(row?.initiator).toLowerCase().includes(CurrentUser.first_name.toLowerCase()) || CurrentUser?.email === row?.Department?.email;
    //     return globalMatch && columnMatches && showMyCadrMatches;
    // });

    // const sortedData = filteredData.sort((a, b) => {
    //     if (orderBy) {
    //         if (order === 'asc') {
    //             return a[orderBy] > b[orderBy] ? 1 : -1;
    //         }
    //         return a[orderBy] < b[orderBy] ? 1 : -1;
    //     }
    //     return 0;
    // });

    return (

            <Paper>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        style={{ marginRight: '16px' }}
                        onClick={onCreate}
                    >
                        Новая карта проекта
                    </Button>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showMyCards}
                                onChange={handleSwitchChange}
                                color="primary"
                                style={{ marginRight: '16px' }}
                            />
                        }
                        label={
                            <Typography variant="body1" color="textPrimary">
                                Мои карты
                            </Typography>
                        }
                        labelPlacement="end"
                    />
                    <TextField
                        label="Поиск..."
                        value={globalSearch}
                        onChange={handleGlobalSearchChange}
                        variant="outlined"
                        margin="normal"
                        size="small"
                        style={{ marginLeft: 'auto' }}  
                    />
                </div>
                <TableContainer
                    component={Paper}
                    style={{
                        maxHeight: '76vh',
                        overflowY: 'auto' 
                    }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    column.visible && (
                                        <TableCell key={column.columnId}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {searchingColumn === column.columnId || columnSearch[column.columnId] ? (
                                                    (column.columnId === 'initiator' || column.columnId === 'Department' || column.columnId === 'status') ? (
                                                        <TextField
                                                            select
                                                            hiddenLabel
                                                            value={columnSearch[column.columnId] || ''}
                                                            onChange={(event) => handleColumnSearchChange(event, column.columnId)}
                                                            onBlur={() => handleSearchBlur(column.columnId)}
                                                            variant="standard"
                                                            size="small"
                                                            margin="none"
                                                            autoFocus
                                                            style={{ width: `${column.label.length + 7}ch` }}
                                                            InputProps={{
                                                                style: { fontSize: '0.875rem' } 
                                                            }}
                                                        >
                                                            {(column.columnId === 'initiator' ? initiatorOptions :
                                                                column.columnId === 'Department' ? departmentOptions : statusOptions)
                                                                .map(option => (
                                                                    <MenuItem
                                                                        key={option}
                                                                        value={option}
                                                                        style={{ fontSize: '0.875rem', padding: '6px 16px' }}
                                                                    >
                                                                        {option}
                                                                    </MenuItem>
                                                                ))}
                                                        </TextField>
                                                    ) : (
                                                            <TextField
                                                                hiddenLabel
                                                                value={columnSearch[column.columnId] || ''}
                                                                onChange={(event) => handleColumnSearchChange(event, column.columnId)}
                                                                onBlur={() => handleSearchBlur(column.columnId)}
                                                                variant="standard"
                                                                size="small"
                                                                margin="none"
                                                                autoFocus
                                                                InputProps={{
                                                                    style: { fontSize: '0.875rem' } 
                                                                }}
                                                                style={{ width: `${column.label.length + 7}ch` }}
                                                            />
                                                    )
                                                ) : (
                                                    <TableSortLabel
                                                        active={orderBy === column.columnId}
                                                        direction={orderBy === column.columnId ? order : 'asc'}
                                                        onClick={(event) => {
                                                            if (event.target.closest('.MuiTableSortLabel-icon')) {
                                                                handleRequestSort(column.columnId);
                                                            }
                                                        }}
                                                    >
                                                        {column.label}
                                                        <Tooltip title="Поиск">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleSearchIconClick(column.columnId)}
                                                                    style={{ marginLeft: 4 }}
                                                                >
                                                                    {(column.columnId === 'initiator' || column.columnId === 'Department' || column.columnId === 'status') ? (
                                                                        <FilterListIcon fontSize="small" />
                                                                    ) : (
                                                                        <SearchIcon fontSize="small" />
                                                                    )}
                                                                </IconButton>
                                                        </Tooltip>
                                                    </TableSortLabel>
                                                )}
                                            </div>
                                        </TableCell>
                                    )
                                ))}
                                <TableCell style={{ padding: 0, width: 'auto' }}>
                                    <IconButton onClick={handleMenuOpen} style={{ float: 'right' }}>
                                        <MoreVertIcon />
                                    </IconButton>
                                    <Menu
                                        anchorEl={anchorEl}
                                        open={Boolean(anchorEl)}
                                        onClose={handleMenuClose}
                                    >
                                        {columns.map((column) => (
                                            <MenuItem key={column.columnId} onClick={() => handleColumnVisibilityChange(column.columnId)}>
                                                <Checkbox checked={column.visible} />
                                                {column.label}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.filter(col => col.visible).length + 1}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : !tableData || tableData.length === 0 ? (
                                <TableRow>
                                    <TableCell 
                                        colSpan={columns.filter(col => col.visible).length + 1}
                                        style={{ textAlign: 'center', padding: '20px' }}
                                    >
                                        <Typography variant="h6">
                                            Данные не найдены
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tableData.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        onClick={() => handleRowClick(row)}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'background-color 0.3s',
                                        }}
                                        hover={true}
                                    >
                                        {columns.map((column) => (
                                            column.visible && (
                                            <TableCell key={column.columnId}>
                                                {formatField(column.columnId, row[column.columnId])}
                                            </TableCell>
                                        )
                                    ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 50, 100, { value: -1, label: 'Все' }]}
                    component="div"
                    count={totalRows}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Показать строк на странице:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`} 
                />
            </Paper>

    );
};

export default TableComponent;