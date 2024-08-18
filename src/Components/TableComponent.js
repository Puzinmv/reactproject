import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
    TableSortLabel, TablePagination, Paper, Checkbox, IconButton, Menu, MenuItem,
    TextField, Tooltip, Switch, Typography, FormControlLabel
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add'; 
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { FIELD_NAMES } from '../constants/index.js';

const formatDate = (dateString) => {
  if (!dateString) return ''
  const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const statusStyles = {
    'Новая карта': { color: 'blue' },
    'Оценка трудозатрат проведена': { color: 'orange' },
    'Экономика согласована': { color: 'green' },
    'Проект стартован': { color: 'red' },
};

const formatField = (field, value) => {
    if (field === 'status') {
        const style = statusStyles[value.trim()] || {};
        return <span style={style}>{value}</span>;
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
    if (value.first_name && value.last_name) {
        return `${value.first_name} ${value.last_name}`;
    }
    return JSON.stringify(value);
    }
    return value;
};

const TableComponent = ({ data, CurrentUser, onRowSelect, onCreate }) => {
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

    useEffect(() => {

        let savedColumns = FIELD_NAMES;
        const LocalStorageColumns = JSON.parse(localStorage.getItem('columns'));
        if (Array.isArray(LocalStorageColumns)) {
            if (LocalStorageColumns.length > 0) {
                savedColumns = JSON.parse(localStorage.getItem('columns'));
            }
        }
        setinitiatorOptions(['---', ...new Set(data.map(item => item.initiator.first_name + ' ' + item.initiator.last_name))]);
        setdepartmentOptions(['---', ...new Set(data.map(item => item.Department.Name))]);
        setstatusOptions(['---', ...new Set(data.map(item => item.status))]);
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

    const handleChangeRowsPerPage = (event) => {
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
    };

    const handleColumnSearchChange = (event, columnId) => {
        const value = event.target.value === '---' ? '' : event.target.value
        setColumnSearch({
            ...columnSearch,
            [columnId]: value
        });
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
    };

    const formatValue = (value) => {
        if (typeof value === 'object' && value !== null && 'first_name' in value && 'last_name' in value) {
            return value.first_name + ' ' + value.last_name;
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

    const filteredData = data.filter(row => {
        const globalMatch = Object.keys(row).some(key =>
            formatValue(row[key]).includes(globalSearch.toLowerCase())
        );

        const columnMatches = Object.keys(columnSearch).every(columnId => {
            if (columnId === 'initiator' && showMyCards) {

                return row[columnId] && formatValue(row[columnId]).toLowerCase().includes(CurrentUser.first_name.toLowerCase());
            }
            return formatValue(row[columnId]).toLowerCase().includes(columnSearch[columnId].toLowerCase());
        });

        return globalMatch && columnMatches;
    });

    const sortedData = filteredData.sort((a, b) => {
        if (orderBy) {
            if (order === 'asc') {
                return a[orderBy] > b[orderBy] ? 1 : -1;
            }
            return a[orderBy] < b[orderBy] ? 1 : -1;
        }
        return 0;
    });

    const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            <TableContainer>
                <Table>
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
                        {paginatedData.map((row) => (
                            <TableRow key={row.id} hover onClick={() => handleRowClick(row)}>
                                {columns.map((column) => (
                                    column.visible && (
                                        <TableCell key={column.columnId}>
                                            {formatField(column.columnId, row[column.columnId])}
                                        </TableCell>
                                    )
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 50, 100]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
};

export default TableComponent;