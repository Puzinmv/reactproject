import React, { useState, useEffect } from 'react';
import AuthWrapper from './Components/AuthWrapper';
import { fetchInitGrade, updateOrCreateGrade } from './services/directus';
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
    TableRow
} from '@mui/material';

function GradeApp() {
    const [presaleUsers, setPresaleUsers] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [presaleUsersData, gradesData] = await fetchInitGrade();
            setPresaleUsers(presaleUsersData);
            // Преобразуем оценки в объект для быстрого доступа
            const gradesMap = {};
            gradesData.forEach(grade => {
                const dateStr = new Date(grade.dateGrade).toISOString().slice(0, 7);
                gradesMap[`${grade.presale}-${dateStr}`] = grade.grade;
            });
            setGrades(gradesMap);
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
                // Получаем первый день предыдущего месяца относительно выбранного
                const [year, month] = selectedMonth.split('-');
                const selectedDate = new Date(year, month, 1); // Преобразуем выбранную дату
                const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1); // Получаем предыдущий месяц
                const dateGrade = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;

                await updateOrCreateGrade(presaleId, newValue, dateGrade);
                
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

    return (
        <AuthWrapper isLiginFunc={fetchData}>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography 
                    variant="h4" 
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
                    <Paper 
                        elevation={3}
                        sx={{ 
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}
                    >
                        <Typography 
                            variant="h5" 
                            component="h2" 
                            sx={{ 
                                p: 3,
                                backgroundColor: 'primary.main',
                                color: 'white'
                            }}
                        >
                            Оценки за {new Date(selectedMonth).toLocaleString('ru', { year: 'numeric', month: 'long' })}
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Имя</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Оценка</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {presaleUsers
                                        .filter(presale => isUserActiveInPeriod(presale, selectedMonth))
                                        .map(presale => (
                                            <TableRow 
                                                key={presale.id}
                                                sx={{ 
                                                    '&:hover': { 
                                                        backgroundColor: '#f8f8f8' 
                                                    }
                                                }}
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
                                                        disabled={loading}
                                                        sx={{ 
                                                            flexWrap: 'wrap',
                                                            '& .MuiToggleButton-root': { 
                                                                minWidth: '35px',
                                                                '&.Mui-selected': {
                                                                    backgroundColor: 'secondary.main',
                                                                    color: 'white',
                                                                    '&:hover': {
                                                                        backgroundColor: 'secondary.dark',
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {[...Array(10)].map((_, i) => (
                                                            <ToggleButton 
                                                                key={i + 1} 
                                                                value={i + 1}
                                                            >
                                                                {i + 1}
                                                            </ToggleButton>
                                                        ))}
                                                    </ToggleButtonGroup>
                                                </TableCell>
                                            </TableRow>
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