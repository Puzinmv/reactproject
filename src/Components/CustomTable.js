import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import TemplatePanel from './TemplatePanel';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExcelJS from 'exceljs';


export default function CustomTable({ depatmentid, jobDescriptions, projectCardRole, handleJobChange, disabled, price, cost }) {
    const [rows, setRows] = useState(jobDescriptions || []);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleAddRow = () => {
        const newRow = [...rows, { id: rows.length + 1, jobName: '', resourceDay: 0, frameDay: 0 }];
        if (handleJobChange(newRow)) setRows(newRow);
    };

    const handleDeleteRow = (index) => {
        if (index < rows.length) {
            for (let i = index + 1; i < rows.length; i++) {
                rows[i].id = i
            }
        }
        const newRow = rows.filter((_, i) => i !== index)

        if (handleJobChange(newRow)) setRows(newRow);
    };

    const handleAddFromTemplate = (templateRows) => {
        let maxId = rows.length ? Math.max(...rows.map(r => r.id)) : 0;

        const newRows = templateRows.map((row) => {
            maxId += 1;
            return {
                jobName: row.jobName,
                resourceDay: row.resourceDay,
                frameDay: row.frameDay,
                id: maxId,
            };
        });
        const row = [...rows, ...newRows]
        if (handleJobChange(row)) setRows(row);
    };
    const handleCellEdit = (id, key, value) => {
        const newRow = rows.map(row => (row.id === id ? { ...row, [key]: value } : row))
        if (handleJobChange(newRow)) setRows(newRow);      
    };

    const handleCopyToClipboard = () => {
        const rowsForCopy = rows.map(row => {
            const formattedJobName = `"${row.jobName.replace(/"/g, '""')}"`;
            return [row.id, formattedJobName, row.resourceDay, row.frameDay].join('\t');
        }).join('\n');
        console.log(rowsForCopy)
        // Проверка, что rowsForCopy является строкой
        if (typeof rowsForCopy !== 'string' || rowsForCopy.trim() === '') {
            console.log('Ничего для копирования нет.');
            return;
        }
        // Проверка на поддержку Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rowsForCopy)
                .then(() => setOpenSnackbar(true))
                .catch(err => console.log(err));
        } else {
            // Fallback для HTTP или устаревших браузеров
            const textarea = document.createElement('textarea');
            textarea.value = rowsForCopy;
            document.body.appendChild(textarea);

            // Скрываем textarea с помощью CSS
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';

            textarea.select(); // Выбираем текст в textarea
            textarea.setSelectionRange(0, textarea.value.length); // Для надёжности выбираем весь текст

            try {
                const successful = document.execCommand('copy'); // Копируем текст
                if (successful) {
                    setOpenSnackbar(true);
                    console.log('Текст успешно скопирован');
                } else {
                    console.log('Не удалось скопировать текст');
                }
            } catch (err) {
                console.log('Ошибка при копировании', err);
            }

            document.body.removeChild(textarea); // Удаляем textarea
        }
    };

    const handleExportToExcel = async () => {
        try {
            const response = await fetch(`${process.env.PUBLIC_URL}/templates/specification.xlsx`, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1);
            // Начинаем с 7-й строки 
            const startRow = 7;
            // Заполняем данные таблицы
            rows.forEach((row, index) => {
                const currentRow = worksheet.getRow(startRow + index);
                
                currentRow.getCell(1).value = Number(row.id) || 0;;
                currentRow.getCell(2).value = row.jobName;
                currentRow.getCell(3).value = Number(row.frameDay) || 0;
                currentRow.getCell(9).value = Number(row.resourceDay) || 0;
                
                // Устанавливаем числовой тип для ячеек
                currentRow.getCell(1).numFmt = '0';
                currentRow.getCell(3).numFmt = '0';
                currentRow.getCell(9).numFmt = '0';
                
                currentRow.commit();
            });

            // Заполняем дополнительные ячейки
            worksheet.getCell('D26').value = price; // Цена
            worksheet.getCell('J26').value = cost;  // Себестоимость

            worksheet.getCell('C26').value = { 
                formula: '=SUM(C7:C25)',
                result: rows.reduce((sum, row) => sum + (Number(row.frameDay) || 0), 0)
            };
            worksheet.getCell('I26').value = { 
                formula: '=SUM(I7:I25)',
                result: rows.reduce((sum, row) => sum + (Number(row.resourceDay) || 0), 0)
            };
            // Включаем полный пересчет формул при загрузке
            workbook.calcProperties.fullCalcOnLoad = true;
            
            // Генерация файла
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Спецификация работы.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            alert('Произошла ошибка при экспорте в Excel');
        }
    };



    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%', mb: 1 }}>
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
                        Описание работ
                    </Typography>
                    <Tooltip title="Добавить строку">
                        <IconButton 
                            disabled={disabled}
                            onClick={handleAddRow}>
                            <AddCircleIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Выбрать из шаблона">
                        <IconButton 
                            disabled={disabled} 
                            onClick={() => setIsPanelOpen(true)}>
                            <ImportContactsIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Копировать в буфер обмена">
                        <IconButton onClick={handleCopyToClipboard}>
                            <ContentCopyIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Экспорт в Excel">
                        <IconButton onClick={handleExportToExcel}>
                            <FileDownloadIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
                <TableContainer
                    sx={{ border: 1, borderColor: 'grey.500'}}>
                    <Table
                        sx={{ minWidth: 750 }}
                        aria-labelledby="tableTitle"
                        size='small'
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                                <TableCell sx={{ width: '90%', fontWeight: 'bold', textAlign: 'center' }}>Наименование работ</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Ресурсная</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Рамочная</TableCell>
                                <TableCell sx={{ width: 20, textAlign: 'center' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => {
                                return (
                                    <TableRow
                                        hover
                                        role="checkbox"
                                        tabIndex={-1}
                                        key={index}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell
                                            sx={{ width: 20, textAlign: 'center' }}
                                            contentEditable={projectCardRole === 'Admin' ||
                                            projectCardRole === 'Technical'}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent)}
                                        >
                                            {row.id}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: '90%', whiteSpace: 'pre-line' }}
                                            component="th"
                                            scope="row"
                                            padding="none"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'jobName', e.target.textContent)}
                                        >
                                            {row.jobName}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'resourceDay', e.target.textContent)}
                                        >
                                            {row.resourceDay}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable={!disabled && (projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical')}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'frameDay', e.target.textContent)}
                                        >
                                            {row.frameDay}
                                        </TableCell>
                                        {!disabled && (
                                            <TableCell align="right">
                                                <Tooltip title="Удалить">
                                                    <IconButton onClick={() => handleDeleteRow(index)}>
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
            {isPanelOpen && (
                <TemplatePanel
                    depatmentid={depatmentid}
                    onClose={() => setIsPanelOpen(false)}
                    onAdd={handleAddFromTemplate}
                />
            )}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                    Таблица скопирована в буфер обмена
                </Alert>
            </Snackbar>
        </Box>
    );
}
