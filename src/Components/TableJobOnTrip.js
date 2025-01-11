import React, { useState } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableRow, TableHead, IconButton, Tooltip,
    Typography, Toolbar, Snackbar, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';


export default function TableJobOnTrip({ data, projectCardRole, handleChange, disabled }) {
    const [rows, setRows] = useState(data || []);
    const [openSnackbar, setOpenSnackbar] = useState(false);

   
    const handleAddRow = () => {
        const newRows = [...rows, { id: rows.length + 1, Address: '', DayOnTrip: 0, JobDecription: '' }];
        if (handleChange(newRows)) {
            setRows(newRows)
            triggerSnackbar();
        } 
    };

    const handleCellEdit = (id, key, value) => {
        const newRows = rows.map(row => (row.id === id ? { ...row, [key]: value } : row))
        if (handleChange(newRows)) {
            setRows(newRows)
            triggerSnackbar();
        } 
    };

    const handleDeleteRow = (id) => {
        const newRows = rows.filter((row) => row.id !== id)
        if (handleChange(newRows)) {
            setRows(newRows)
            triggerSnackbar();
        } 
    };

    const triggerSnackbar = () => {
        if (rows.length > 0) {
            setOpenSnackbar(true);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnackbar(false);
    };


    return (
        <div style={{ position: 'relative' }}>
            <Paper sx={{ width: '100%' }}>
                <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                    }}
                >
                    <Typography
                        sx={{ flex: '1 1 100%' }}
                        variant="h6"
                        id="tableTitle"
                        component="div"
                    >
                        Работы на выезде
                    </Typography>
                </Toolbar>
                <TableContainer>
                    <Table
                        sx={{ minWidth: 750, border: 1, borderColor: 'grey.500' }}
                        aria-labelledby="tableTitle"
                        size='small'
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                                <TableCell sx={{ width: '40%', fontWeight: 'bold', textAlign: 'center' }}>Адрес проведения работ</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Количество дней</TableCell>
                                <TableCell sx={{ width: '40%', fontWeight: 'bold', textAlign: 'center' }}>Какие работы проводятся по указанным адресам</TableCell>
                                <TableCell sx={{ width: 20, textAlign: 'center' }}>
                                    <Tooltip title="Добавить строку">
                                        <IconButton disabled={disabled} onClick={handleAddRow}>
                                            <AddCircleIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => {
                                return (
                                    <TableRow
                                        hover
                                        key={index}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell
                                            sx={{ width: 20, textAlign: 'center' }}
                                            suppressContentEditableWarning
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent)}
                                        >
                                            {row.id}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: '40%', whiteSpace: 'pre-line' }}
                                            component="th"
                                            scope="row"
                                            padding="none"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'Address', e.target.textContent)}
                                        >
                                            {row.Address}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'DayOnTrip', e.target.textContent)}
                                        >
                                            {row.DayOnTrip}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: '40%' }}
                                            align="right"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'JobDecription', e.target.textContent)}
                                        >
                                            {row.JobDecription}
                                        </TableCell>
                                        {!disabled && (
                                            <TableCell align="center">
                                                <Tooltip title="Удалить">
                                                    <IconButton onClick={() => handleDeleteRow(row.id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                style={{ position: 'absolute', top: 0, right: 0 }}
            >
                <Alert  severity="info" color="warning" sx={{ width: '100%' }}>
                    Не забудьте оценить накладные расходы на вкладке Коммерческая часть
                </Alert>
            </Snackbar>
        </div>
    );
}
