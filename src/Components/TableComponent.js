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

const TableComponent = ({ UserOption, departamentOption, CurrentUser, onRowSelect, onCreate }) => {
    const [columns, setColumns] = useState([]);
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('id');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const savedValue = localStorage.getItem('rowsPerPage');
        return savedValue ? parseInt(savedValue, 10) : 10;
    });
    const [anchorEl, setAnchorEl] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [columnSearch, setColumnSearch] = useState({});
    const [searchingColumn, setSearchingColumn] = useState(null);   // колонка в поиске
    const [initiatorOptions, setinitiatorOptions] = useState([]);   // перечень инициаторов в картах
    const [departmentOptions, setdepartmentOptions] = useState([]); // перечень отделов исполнителей в картах
    const [statusOptions, setstatusOptions] = useState([]);         // перечень статусов в картах
    const [showMyCards, setShowMyCards] = useState(() => {
        const savedValue = localStorage.getItem('ShowMyCard');
        return savedValue ? JSON.parse(savedValue) : true;
    });
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tableData, setLocalTableData] = useState([]); // добавляем локальное состояние для данных
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [selectedStatuses, setSelectedStatuses] = useState([]);

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

            setLocalTableData(response.data);
            setTotalRows(response.meta.total);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, order, orderBy, globalSearch, columnSearch, columns, showMyCards, CurrentUser]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);

        return () => clearTimeout(timer);
    }, [loadData]);

    const handleColumnVisibilityChange = useCallback((id) => {
        setColumns(prevColumns => {
            const newColumns = prevColumns.map(column => 
                column.columnId === id ? { ...column, visible: !column.visible } : column
            );
            localStorage.setItem('columns', JSON.stringify(newColumns));
            return newColumns;
        });
    }, []);

    useEffect(() => {
        let savedColumns = FIELD_NAMES;
        const LocalStorageColumns = JSON.parse(localStorage.getItem('columns'));
        if (Array.isArray(LocalStorageColumns) && LocalStorageColumns.length > 0) {
            savedColumns = LocalStorageColumns;
        }
        setColumns(savedColumns);
    }, []); 

    useEffect(() => {
        if (Array.isArray(UserOption)) setinitiatorOptions(['---', ...UserOption]);
        if (Array.isArray(departamentOption)) setdepartmentOptions(['---', ...new Set(departamentOption.map(item => item.Department))]);
        setstatusOptions(Object.values(STATUS));
    }, [departamentOption, UserOption]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        const newValue = parseInt(event.target.value, 10);
        setRowsPerPage(newValue);
        localStorage.setItem('rowsPerPage', newValue.toString());
        setPage(0);
    };

    const handleRowClick = (row) => {
        if (onRowSelect) {
            onRowSelect(row);
        }
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

    const handleFilterClick = (event, columnId) => {
        event.stopPropagation();
        setFilterAnchorEl(event.currentTarget);
        setActiveFilterColumn(columnId);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
        setActiveFilterColumn(null);
    };

    const getFilterOptions = (columnId) => {
        switch (columnId) {
            case 'initiator':
                return initiatorOptions;
            case 'Department':
                return departmentOptions;
            case 'status':
                return statusOptions;
            default:
                return [];
        }
    };

    const handleStatusFilterChange = (status) => {
        setSelectedStatuses(prev => {
            const newStatuses = prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status];
            
            // Обновляем фильтр
            if (newStatuses.length === 0) {
                const { status, ...restFilters } = columnSearch;
                setColumnSearch(restFilters);
            } else {
                setColumnSearch(prev => ({
                    ...prev,
                    status: newStatuses
                }));
            }
            
            return newStatuses;
        });
    };

    const renderFilterMenuItem = (option, columnId) => {
        if (columnId === 'status') {
            return (
                <MenuItem key={option} onClick={(e) => e.stopPropagation()}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedStatuses.includes(option)}
                                onChange={() => handleStatusFilterChange(option)}
                            />
                        }
                        label={option}
                    />
                </MenuItem>
            );
        }

        const isSelected = columnSearch[columnId] === option;
        return (
            <MenuItem 
                key={option} 
                onClick={() => {
                    handleColumnSearchChange({ target: { value: option }}, columnId);
                    handleFilterClose();
                }}
                selected={isSelected}
                sx={{
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        },
                    },
                }}
            >
                {option}
            </MenuItem>
        );
    };

    const isColumnFiltered = (columnId) => {
        if (columnId === 'status') {
            return selectedStatuses.length > 0;
        }
        return Boolean(columnSearch[columnId]);
    };

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
                                                {column.columnId === 'initiator' || column.columnId === 'Department' || column.columnId === 'status' ? (
                                                    <TableSortLabel
                                                        active={orderBy === column.columnId}
                                                        direction={orderBy === column.columnId ? order : 'asc'}
                                                        onClick={() => handleRequestSort(column.columnId)}
                                                    >
                                                        {column.label}
                                                        <Tooltip title="Фильтр">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => handleFilterClick(e, column.columnId)}
                                                                style={{ 
                                                                    marginLeft: 4,
                                                                    color: isColumnFiltered(column.columnId) ? '#1976d2' : 'inherit',
                                                                    backgroundColor: isColumnFiltered(column.columnId) ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                                                                }}
                                                            >
                                                                <FilterListIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableSortLabel>
                                                ) : (searchingColumn === column.columnId || columnSearch[column.columnId]) ? (
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
                    count={Number(totalRows)}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Показать строк на странице:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`} 
                />
                <Menu
                    anchorEl={filterAnchorEl}
                    open={Boolean(filterAnchorEl)}
                    onClose={handleFilterClose}
                >
                    {activeFilterColumn && getFilterOptions(activeFilterColumn).map((option) => 
                        renderFilterMenuItem(option, activeFilterColumn)
                    )}
                </Menu>
            </Paper>

    );
};

export default TableComponent;