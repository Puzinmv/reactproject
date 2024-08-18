import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import React, { useState} from 'react';

export default function TableJobOnTrip({ data, handleChange }) {
    const [rows, setRows] = useState(data || []);
    const [selected, setSelected] = useState([]);

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };
    
    const isSelected = (id) => selected.indexOf(id) !== -1;

    const handleAddRow = () => {
        const newRows = [...rows, { id: rows.length + 1, Address: '', DayOnTrip: 0, JobDecription: '' }];
        setRows(newRows);
        handleChange(newRows)
    };

    const handleCellEdit = (id, key, value) => {
        const newrows = rows.map(row => (row.id === id ? { ...row, [key]: value } : row))
        setRows(newrows);
        handleChange(newrows)

    };

    const handleDeleteRow = (id) => {
        const newrows = rows.filter((row) => row.id !== id)
        setRows(newrows);
        setSelected(selected.filter((selectedId) => selectedId !== id));
        handleChange(newrows)
    };

    return (
        <Paper sx={{ width: '100%' }}>
            <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                        ...(selected.length > 0 && {
                            bgcolor: (theme) =>
                                theme.palette.action.activatedOpacity,
                        }),
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
                                    <IconButton onClick={handleAddRow}>
                                        <AddCircleIcon />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => {
                            const isItemSelected = isSelected(row.id);
                            const labelId = `custom-table-checkbox-${index}`;

                            return (
                                <TableRow
                                    hover
                                    onClick={(event) => handleClick(event, row.id)}
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    key={row.id}
                                    selected={isItemSelected}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell
                                        sx={{ width: 20, textAlign: 'center' }}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent)}
                                    >
                                        {row.id}
                                    </TableCell>
                                    <TableCell
                                        sx={{ width: '40%', whiteSpace: 'pre-line' }}
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        padding="none"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => handleCellEdit(row.id, 'Address', e.target.textContent)}
                                    >
                                        {row.Address}
                                    </TableCell>
                                    <TableCell
                                        sx={{ width: 80 }}
                                        align="right"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => handleCellEdit(row.id, 'DayOnTrip', e.target.textContent)}
                                    >
                                        {row.DayOnTrip}
                                    </TableCell>
                                    <TableCell
                                        sx={{ width: '40%' }}
                                        align="right"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => handleCellEdit(row.id, 'JobDecription', e.target.textContent)}
                                    >
                                        {row.JobDecription}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Удалить">
                                            <IconButton onClick={() => handleDeleteRow(row.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
             </TableContainer>
        </Paper>
    )
}
