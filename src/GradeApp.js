import React, { useState, useEffect } from 'react';
import AuthWrapper from './Components/AuthWrapper';
import { fetchInitGrade, updateOrCreateGrade, closeMonthGrades, openMonthGrades } from './services/directus';
import { 
    Container, 
    Typography, 
    ToggleButton, 
    ToggleButtonGroup,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip
} from '@mui/material';
import { LockOutlined, LockOpenOutlined } from '@mui/icons-material';

function GradeApp() {
    const [presaleUsers, setPresaleUsers] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [allGrades, setAllGrades] = useState({});
    const [averageGrades, setAverageGrades] = useState({});
    const [closedMonths, setClosedMonths] = useState([]);

    const fetchData = async () => {
        try {
            const [presaleUsersData, gradesData, allGradesWithUsers, averageGradesData, closedMonthsData] = await fetchInitGrade();
            setPresaleUsers(presaleUsersData);
            
            // Преобразуем оценки текущего пользователя
            const gradesMap = {};
            gradesData.forEach(grade => {
                const dateStr = new Date(grade.dateGrade).toISOString().slice(0, 7);
                gradesMap[`${grade.presale}-${dateStr}`] = grade.grade;
            });
            setGrades(gradesMap);

            // Проверяем, есть ли доступ к оценкам других пользователей
            const hasAccessToOtherGrades = allGradesWithUsers && allGradesWithUsers.some(grade => 
                !gradesData.some(userGrade => 
                    userGrade.id === grade.id
                )
            );

            // Преобразуем все оценки только если есть доступ к оценкам других пользователей
            if (hasAccessToOtherGrades) {
                const allGradesMap = {};
                console.log(allGradesWithUsers)
                allGradesWithUsers.forEach(grade => {
                    const dateStr = new Date(grade.dateGrade).toISOString().slice(0, 7);
                    const key = `${grade.presale}-${dateStr}`;
                    if (!allGradesMap[key]) {
                        allGradesMap[key] = [];
                    }
                    allGradesMap[key].push({
                        grade: grade.grade,
                        user: grade.user_updated || grade.user_created,
                        date: grade.date_updated || grade.date_created
                    });
                });
                console.log(allGradesMap)
                setAllGrades(allGradesMap);

                // Преобразуем средние оценки только если есть доступ к оценкам других пользователей
                if (averageGradesData) {
                    const averageGradesMap = {};
                    averageGradesData.forEach(avg => {
                        const dateStr = new Date(avg.dateGrade).toISOString().slice(0, 7);
                        const key = `${avg.presale}-${dateStr}`;
                        averageGradesMap[key] = Number(avg.avg.grade);
                    });
                    setAverageGrades(averageGradesMap);
                }
            } else {
                setAllGrades({});
                setAverageGrades({});
            }

            // Сохраняем закрытые месяцы
            setClosedMonths(closedMonthsData.map(item => item.monthDate));

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        // Установка предыдущего месяца по умолчанию
        const today = new Date();
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1);
        setSelectedMonth(`${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`);
        fetchData();
    }, []);

    const getMonthsList = () => {
        const months = [];
        const years = new Set();
        const today = new Date();
        
        for (let i = 0; i < 12; i++) {
            const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            months.push({
                value: monthStr,
                year: month.getFullYear(),
                label: month.toLocaleString('ru', { month: 'short' })
            });
            years.add(month.getFullYear());
        }
        return { months, years: Array.from(years) };
    };

    const renderMonthButtons = () => {
        const elements = [];
        const { months } = getMonthsList();

        months.forEach((month, index) => {
            const prevMonth = index > 0 ? months[index - 1] : null;
            
            if (!prevMonth || prevMonth.year !== month.year) {
                elements.push(
                    <Typography
                        key={`year-${month.year}`}
                        variant="body2"
                        sx={{
                            px: 1,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'text.secondary'
                        }}
                    >
                        {month.year}
                    </Typography>
                );
            }
            
            elements.push(
                <ToggleButton key={month.value} value={month.value}>
                    {month.label}
                </ToggleButton>
            );
        });

        return elements;
    };

    const isUserActiveInPeriod = (user, selectedMonth) => {
        const [year, month] = selectedMonth.split('-');
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);
        
        const userStart = new Date(user.dateStart);
        const userEnd = user.dateEnd ? new Date(user.dateEnd) : new Date();

        return userStart <= periodEnd && (!user.dateEnd || userEnd >= periodStart);
    };

    const handleMonthChange = (_, newMonth) => {
        if (newMonth !== null) {
            setSelectedMonth(newMonth);
        }
    };

    const handleGradeChange = async (presaleId, _, newValue) => {
        if (newValue !== null) {
            try {
                setLoading(true);
                // Получаем первый день выбранного месяца
                const [year, month] = selectedMonth.split('-');
                const dateGrade = `${year}-${month}-01`;

                await updateOrCreateGrade(presaleId, newValue, dateGrade);
                fetchData()
                // Обновляем оценки текущего пользователя
                setGrades(prev => ({
                    ...prev,
                    [`${presaleId}-${selectedMonth}`]: newValue
                }));
            } catch (error) {
                console.error('Ошибка при сохранении оценки:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const getGradeValue = (presaleId) => {
        return grades[`${presaleId}-${selectedMonth}`] || '';
    };

    const handleRowExpand = (presaleId) => {
        setExpandedRows(prev => ({
            ...prev,
            [presaleId]: !prev[presaleId]
        }));
    };

    const handleToggleMonth = async () => {
        try {
            setLoading(true);
            if (isMonthClosed(selectedMonth)) {
                await openMonthGrades(selectedMonth);
                setClosedMonths(prev => prev.filter(month => month !== selectedMonth));
            } else {
                await closeMonthGrades(selectedMonth);
                setClosedMonths(prev => [...prev, selectedMonth]);
            }
        } catch (error) {
            console.error('Ошибка при изменении статуса месяца:', error);
        } finally {
            setLoading(false);
        }
    };

    const isMonthClosed = (month) => closedMonths.includes(month);

    return (
        <AuthWrapper isLoginFunc={fetchData}>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{
                        // fontWeight: 'bold',
                        color: 'primary.main',
                        mb: 4,
                        textAlign: 'center'
                    }}
                >
                    Оценка работы отдела Presale
                </Typography>

                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 3, 
                        mb: 4,
                        borderRadius: 2,
                        background: 'linear-gradient(to right, #ffffff, #f5f5f5)'
                    }}
                >
                    <Typography 
                        variant="h6" 
                        gutterBottom
                        sx={{ 
                            color: 'text.secondary',
                            mb: 2
                        }}
                    >
                        Выберите месяц
                    </Typography>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        overflowX: 'auto',
                        padding: '8px 0'
                    }}>
                        <ToggleButtonGroup
                            value={selectedMonth}
                            exclusive
                            onChange={handleMonthChange}
                            aria-label="выбор месяца"
                            sx={{ 
                                display: 'flex',
                                '& .MuiToggleButton-root': { 
                                    minWidth: '70px',
                                    px: 2,
                                    py: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        }
                                    }
                                }
                            }}
                        >
                            {renderMonthButtons()}
                        </ToggleButtonGroup>
                    </div>
                </Paper>

                {presaleUsers && (
                    <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Имя</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Оценка</TableCell>
                                        {Object.keys(averageGrades).length > 0 && (
                                            <TableCell sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                Средняя оценка
                                                <Tooltip title={isMonthClosed(selectedMonth) ? "Открыть оценки за месяц" : "Закрыть оценки за месяц"}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleToggleMonth}
                                                        disabled={loading}
                                                        sx={{ 
                                                            '&:hover': { 
                                                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                            }
                                                        }}
                                                    >
                                                        {isMonthClosed(selectedMonth) ? (
                                                            <LockOutlined fontSize="small" />
                                                        ) : (
                                                            <LockOpenOutlined fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {presaleUsers
                                        .filter(presale => isUserActiveInPeriod(presale, selectedMonth))
                                        .map(presale => (
                                            <React.Fragment key={presale.id}>
                                                <TableRow 
                                                    sx={{ 
                                                        '&:hover': { backgroundColor: '#f8f8f8' },
                                                        cursor: Object.keys(allGrades).length > 0 ? 'pointer' : 'default'
                                                    }}
                                                    onClick={() => Object.keys(allGrades).length > 0 && handleRowExpand(presale.id)}
                                                >
                                                    <TableCell>{presale.user.first_name}</TableCell>
                                                    <TableCell>
                                                        <ToggleButtonGroup
                                                            value={getGradeValue(presale.id)}
                                                            exclusive
                                                            onChange={(event, value) => handleGradeChange(presale.id, event, value)}
                                                            aria-label="оценка"
                                                            size="small"
                                                            color="secondary"
                                                            disabled={loading || isMonthClosed(selectedMonth)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {[...Array(10)].map((_, i) => (
                                                                <ToggleButton key={i + 1} value={i + 1}>
                                                                    {i + 1}
                                                                </ToggleButton>
                                                            ))}
                                                        </ToggleButtonGroup>
                                                    </TableCell>
                                                    {Object.keys(averageGrades).length > 0 && (
                                                        <TableCell>
                                                            {averageGrades[`${presale.id}-${selectedMonth}`] 
                                                                ? averageGrades[`${presale.id}-${selectedMonth}`].toFixed(1) 
                                                                : '-'}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                                {expandedRows[presale.id] && Object.keys(allGrades).length > 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={Object.keys(averageGrades).length > 0 ? 3 : 2} sx={{ backgroundColor: '#fafafa', p: 2 }}>
                                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                                История оценок за {new Date(selectedMonth).toLocaleString('ru', { year: 'numeric', month: 'long' })} 
                                                                (Всего оценок: {allGrades[`${presale.id}-${selectedMonth}`]?.length || 0}):
                                                            </Typography>
                                                            {allGrades[`${presale.id}-${selectedMonth}`]?.map((grade, index) => (
                                                                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                                    {grade.user.first_name}: {grade.grade} - {new Date(grade.date).toLocaleString('ru')}
                                                                </Typography>
                                                            )) || (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Нет оценок за выбранный период
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {isMonthClosed(selectedMonth) && (
                                                    <TableRow>
                                                        <TableCell colSpan={Object.keys(averageGrades).length > 0 ? 3 : 2} sx={{ backgroundColor: '#fafafa', p: 2 }}>
                                                            <Typography 
                                                                variant="caption" 
                                                                color="text.secondary"
                                                                sx={{ 
                                                                    display: 'block', 
                                                                    mt: 1,
                                                                    fontStyle: 'italic'
                                                                }}
                                                            >
                                                                Оценки за этот месяц закрыты
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </Container>
        </AuthWrapper>
    );
}

export default GradeApp; 