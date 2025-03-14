import React, { useState, useEffect } from 'react';
// import AuthWrapper from './Components/AuthWrapper';

import { GetProjects } from './services/openproject';
import { 
    Container, 
    Typography, 
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Box,
} from '@mui/material';

function AnalyticsApp() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Функция для преобразования ISO 8601 Duration в дни
    const convertDurationToDays = (duration) => {
        if (!duration) return '—';
        
        // Извлекаем дни и часы из строки формата P14D или P2DT22H
        const daysMatch = duration.match(/P(\d+)D/);
        const hoursMatch = duration.match(/T(\d+)H/);
        
        let days = daysMatch ? parseInt(daysMatch[1]) : 0;
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        
        // Добавляем часы как дробную часть дня
        if (hours) {
            days += hours / 24;
        }
        
        // Округляем до одного знака после запятой
        return days.toFixed(1);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const projects = await GetProjects();
            setData(projects);
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
       // <AuthWrapper isLoginFunc={fetchData}>
            <Container maxWidth={false} disableGutters>
                <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{
                        color: 'primary.main',
                        mb: 4,
                        textAlign: 'center'
                    }}
                >
                    Отчеты
                </Typography>

                <TableContainer 
                    component={Paper} 
                    sx={{ 
                        mb: 4,
                        maxHeight: 'calc(100vh - 200px)', // Высота таблицы с учетом отступов
                        width: '100%' // Полная ширина
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : data ? (
                        <Table stickyHeader sx={{ minWidth: 2000 }}> {/* Минимальная ширина для горизонтального скролла */}
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 80 }}>ID</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>Название</TableCell>
                                    <TableCell sx={{ minWidth: 150 }}>Заказчик</TableCell>
                                    <TableCell sx={{ minWidth: 150 }}>Контактное лицо</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>Дата начала</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>Дата окончания</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>Длительность</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>План. время</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>Затр. время</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>Ост. время</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>Прогресс</TableCell>
                                    <TableCell sx={{ minWidth: 150 }}>Статус задач</TableCell>
                                    <TableCell sx={{ minWidth: 150 }}>Статус проекта</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.map((project) => (
                                    <TableRow 
                                        key={project.id}
                                        sx={{ 
                                            backgroundColor: !project.workPackages ? '#fff4f4' : 'inherit'
                                        }}
                                    >
                                        <TableCell>{project.customField31}</TableCell>
                                        <TableCell>
                                            <a 
                                                href={`https://openproject.asterit.ru/projects/${project.identifier}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    textDecoration: 'none', 
                                                    color: 'inherit' 
                                                }}
                                            >
                                                {project.name}
                                            </a>
                                            {!project.workPackages && (
                                                <Typography 
                                                    variant="caption" 
                                                    color="error" 
                                                    display="block"
                                                >
                                                    Ошибка загрузки данных
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{project.customField20}</TableCell>
                                        <TableCell>{project.customField24}</TableCell>
                                        <TableCell>
                                            {project.workPackages?.startDate ? 
                                                new Date(project.workPackages.startDate).toLocaleDateString('ru-RU') : 
                                                '—'}
                                        </TableCell>
                                        <TableCell>
                                            {project.workPackages?.dueDate ? 
                                                new Date(project.workPackages.dueDate).toLocaleDateString('ru-RU') : 
                                                '—'}
                                        </TableCell>
                                        <TableCell>{convertDurationToDays(project.workPackages?.duration)} д.</TableCell>
                                        <TableCell>{convertDurationToDays(project.workPackages?.estimatedTime)} д.</TableCell>
                                        <TableCell>{convertDurationToDays(project.workPackages?.spentTime)} д.</TableCell>
                                        <TableCell>{convertDurationToDays(project.workPackages?.remainingTime)} д.</TableCell>
                                        <TableCell>
                                            {project.workPackages?.percentageDone ? 
                                                `${project.workPackages.percentageDone}%` : 
                                                '0%'}
                                        </TableCell>
                                        <TableCell>{project.workPackages?.status || '—'}</TableCell>
                                        <TableCell>
                                            {project._links?.status?.title || 'Не указан'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography sx={{ p: 2, textAlign: 'center' }}>
                            Нет доступных данных
                        </Typography>
                    )}
                </TableContainer>
            </Container>
       // </AuthWrapper>
    );
}


export default AnalyticsApp; 