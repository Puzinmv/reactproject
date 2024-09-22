import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, Table, TableContainer, TableBody, TableCell, TableRow, TableHead,
    Checkbox, IconButton, Tooltip, Button, Select, MenuItem, FormControl, InputLabel, Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { fetchTemplate } from '../services/directus';

function TemplatePanel({ depatmentid, onClose, onAdd }) {
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const panelRef = useRef(null); // Создание рефа для панели

    useEffect(() => {
        // Загрузка данных из базы данных
        fetchTemplate().then((data) => {
            const filter = data.filter((temp) => temp.Department === depatmentid)
            setRows(filter);
            // Получение уникальных категорий
            const uniqueCategories = [...new Set(filter.map((item) => item.category))];
            setCategories(uniqueCategories);
        });
    }, [depatmentid]);

    //useEffect(() => {
    //    const handleClickOutside = (event) => {
    //        if (panelRef.current && !panelRef.current.contains(event.target)) {
    //            onClose();
    //        }
    //    };

    //    document.addEventListener('mousedown', handleClickOutside);
    //    return () => {
    //        document.removeEventListener('mousedown', handleClickOutside);
    //    };
    //}, [onClose]);

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = filteredRows.map((row) => row.id);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

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

    const handleAdd = () => {
        const Addrows = selected.map((cel) => rows.filter((row) => cel === row.id)[0])
        onAdd(Addrows);
        onClose();
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value);
    };

    // Фильтрация строк по категории
    const filteredRows = selectedCategory ? rows.filter((row) => row.category === selectedCategory) : rows;


    return (
        <Box
            ref={panelRef}
            sx={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '50vw',
                height: '100vh',
                bgcolor: 'background.paper',
                boxShadow: 3,
                zIndex: 1200,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Paper sx={{ width: '100%', mb: 2, overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Link href='http://projectcard.asterit.ru:8055/admin/content/JobTemplate' target='_blank' rel="noreferrer">Изменить шаблоны</Link>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel id="category-select-label">Фильтр</InputLabel>
                        <Select
                            labelId="category-select-label"
                            value={selectedCategory}
                            label="Категория"
                            onChange={handleCategoryChange}
                        >
                            <MenuItem value=""><em>Все</em></MenuItem>
                            {categories.map((category) => (
                                <MenuItem key={category} value={category}>{category}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="Закрыть">
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <TableContainer>
                    <Table
                        sx={{ minWidth: 400 }}
                        aria-labelledby="template-table"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" align="center">
                                    <Checkbox
                                        color="primary"
                                        indeterminate={selected.length > 0 && selected.length < rows.length}
                                        checked={rows.length > 0 && selected.length === rows.length}
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            'aria-label': 'select all templates',
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="center" sx={{ width: 200, fontWeight: 'bold' }}>Название работы</TableCell>
                                <TableCell align="center" sx={{ width: 100, fontWeight: 'bold' }}>Дней ресурсов</TableCell>
                                <TableCell align="center" sx={{ width: 100, fontWeight: 'bold' }}>Дней кадров</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRows.map((row) => {
                                const isItemSelected = isSelected(row.id);
                                const labelId = `template-table-checkbox-${row.id}`;

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
                                        <TableCell sx={{ width: 20, textAlign: 'center', padding:'checkbox' }} >
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                inputProps={{
                                                    'aria-labelledby': labelId,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ width: '90%', whiteSpace: 'pre-line', textAlign: 'left' }}>{row.jobName}</TableCell>
                                        <TableCell sx={{ width: 80, textAlign: 'center' }}>{row.resourceDay}</TableCell>
                                        <TableCell sx={{ width: 80, textAlign: 'center' }}>{row.frameDay}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAdd}
                    >
                        Добавить
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default TemplatePanel;