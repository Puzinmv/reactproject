import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  TableSortLabel, TablePagination, Paper, Checkbox, IconButton, Menu, MenuItem, TextField
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add'; 

const fieldNames = [
  { columnId: 'id', label: 'ID', visible: true },
  { columnId: 'initiator', label: 'Инициатор', visible: true },
  { columnId: 'title', label: 'Название', visible: true },
  { columnId: 'Customer', label: 'Заказчик', visible: true },
  { columnId: 'Department', label: 'Отдел', visible: true },
  { columnId: 'status', label: 'Статус', visible: true },
  { columnId: 'resourceSumm', label: 'Длительность', visible: true },
  { columnId: 'frameSumm', label: 'Трудозатраты', visible: true },
  { columnId: 'Price', label: 'Цена', visible: false },
  { columnId: 'Cost', label: 'Себестоимость', visible: false },
  { columnId: 'Description', label: 'Описание', visible: false },
  { columnId: 'CustomerCRMID', label: 'ID Заказчика CRM', visible: false },
  { columnId: 'CustomerContact', label: 'Контактное лицо', visible: false },
  { columnId: 'CustomerContactCRMID', label: 'ID Контактного лица CRM', visible: false },
  { columnId: 'CustomerContactTel', label: 'Телефон контактного лица', visible: false },
  { columnId: 'CustomerContactEmail', label: 'Email контактного лица', visible: false },
  { columnId: 'CustomerContactJobTitle', label: 'Должность контактного лица', visible: false },
  { columnId: 'ProjectScope', label: 'Ограничения от клиента', visible: false },
  { columnId: 'JobDescription', label: 'Описание работы', visible: false },
  { columnId: 'jobOnTrip', label: 'Работа в поездке', visible: false },
  { columnId: 'Limitations', label: 'Ограничения от исполнителей', visible: false },
  { columnId: 'tiketsCost', label: 'Стоимость билетов', visible: false },
  { columnId: 'tiketsCostDescription', label: 'Описание стоимости билетов', visible: false },
  { columnId: 'HotelCost', label: 'Стоимость отеля', visible: false },
  { columnId: 'HotelCostDescription', label: 'Описание стоимости отеля', visible: false },
  { columnId: 'dailyCost', label: 'Суточные расходы', visible: false },
  { columnId: 'dailyCostDescription', label: 'Описание суточных расходов', visible: false },
  { columnId: 'otherPayments', label: 'Другие платежи', visible: false },
  { columnId: 'otherPaymentsDescription', label: 'Описание других платежей', visible: false },
  { columnId: 'company', label: 'Компания', visible: false },
  { columnId: 'contract', label: 'Договор', visible: false },
  { columnId: 'dateStart', label: 'Дата начала', visible: false },
  { columnId: 'deadline', label: 'Срок сдачи', visible: false },
  { columnId: 'Files', label: 'Файлы', visible: false },
  { columnId: 'user_created', label: 'Создал', visible: false },
  { columnId: 'date_created', label: 'Дата создания', visible: false },
  { columnId: 'user_updated', label: 'Изменил', visible: false },
  { columnId: 'date_updated', label: 'Дата обновления', visible: false },
];

const formatDate = (dateString) => {
  const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const formatField = (field, value) => {
  if (field === 'date_created' || field === 'date_updated' || field === 'dateStart' || field === 'deadline') {
    return formatDate(value);
  }
    if (field === 'Department') {
      if (value === null) return '';
      return value.hasOwnProperty('Name') ? value.Name : '';
  }
  if (field === 'Description' || field === 'jobOnTrip') {
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
  }
  if (typeof value === 'object' && value !== null) {
    if (value.first_name && value.last_name) {
      return `${value.first_name} ${value.last_name}`;
    }
    return JSON.stringify(value);
  }
  return value;
};

const TableComponent = ({ data, onRowSelect }) => {
    const [columns, setColumns] = useState([]);
    const [order, setOrder] = useState('');
    const [orderBy, setOrderBy] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [columnSearch, setColumnSearch] = useState({});

    useEffect(() => {
        let savedColumns = fieldNames;
        if (JSON.parse(localStorage.getItem('columns')).length > 0) {
            savedColumns = JSON.parse(localStorage.getItem('columns'));
        }
        setColumns(savedColumns);
    }, [data]);

    useEffect(() => {
        if (JSON.stringify(columns) !== JSON.stringify(fieldNames) && columns.length>0) {
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
        setColumnSearch({
            ...columnSearch,
            [columnId]: event.target.value
        });
    };

    const formatValue = (value) => {
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

        const columnMatches = Object.keys(columnSearch).every(columnId =>
            formatValue(row[columnId]).includes(columnSearch[columnId].toLowerCase())
        );

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
                    onClick={() => console.log('Создать новую карту проекта')}
                >
                    Создать новую карту проекта
                </Button>
                <TextField
                    label="Global Search"
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
                                        <TableSortLabel
                                            active={orderBy === column.columnId}
                                            direction={orderBy === column.columnId ? order : 'asc'}
                                            onClick={() => handleRequestSort(column.columnId)}
                                        >
                                            {column.label}
                                        </TableSortLabel>
                                        <TextField
                                            hiddenLabel
                                            value={columnSearch[column.columnId] || ''}
                                            onChange={(event) => handleColumnSearchChange(event, column.columnId)}
                                            variant="standard"
                                            size="small"
                                            margin="normal"
                                            fullWidth
                                        />
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
                rowsPerPageOptions={[5, 10, 25]}
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