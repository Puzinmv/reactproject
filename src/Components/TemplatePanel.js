import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { fetchTemplate } from '../services/directus'; // Импортируйте вашу функцию fetchTemplate

export default function TemplatePanel({ onClose, onAdd }) {
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const panelRef = useRef(null); // Создание рефа для панели

    //useEffect(() => {
    //     //Загрузка данных из базы данных
    //    fetchTemplate().then((data) => {
    //        setRows(data.map((desc, index) => ({
    //            id: index + 1, // или другой способ генерации уникального ID
    //            jobName: desc.JobName,
    //            resourceDay: desc.ResourceDay,
    //            frameDay: desc.FrameDay,
    //        })));

    //    });
    //}, []);

    useEffect(() => {
        setRows(fetchTemplate().map((desc, index) => ({
            id: index + 1, // или другой способ генерации уникального ID
            jobName: desc.jobName,
            resourceDay: desc.resourceDay,
            frameDay: desc.frameDay,
        })));

        // Обработчик кликов для закрытия панели при клике вне её
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = rows.map((row) => row.id);
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
        onAdd(rows.filter((row) => selected.includes(row.id)));
        onClose();
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    return (
        <Box
            ref={panelRef}
            sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '50vw', // Установите ширину в 50% от ширины экрана
            height: '100vh', // Высота панели 100% от высоты экрана
            bgcolor: 'background.paper',
            boxShadow: 3,
            zIndex: 1200, // Убедитесь, что панель выше формы
            p: 2,
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Paper sx={{ width: '100%', mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <h2>Выбор из шаблона</h2>
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
                                <TableCell padding="checkbox">
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
                            {rows.map((row) => {
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
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                inputProps={{
                                                    'aria-labelledby': labelId,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">{row.jobName}</TableCell>
                                        <TableCell align="center">{row.resourceDay}</TableCell>
                                        <TableCell align="center">{row.frameDay}</TableCell>
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

TemplatePanel.propTypes = {
    onClose: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
};
