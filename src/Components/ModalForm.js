import React, { useState, useEffect } from 'react';
import { Modal, Box, Tabs, Tab, TextField, Button, Typography, Autocomplete, InputLabel, Select, MenuItem, FormControl, FormHelperText } from '@mui/material';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import axios from 'axios';
import { fetchUser, UpdateData, GetfilesInfo, uploadFilesDirectus, deleteFileDirectus } from '../services/directus';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';
import CustomTable from './CustomTable'; 

const TabPanel = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box p={2}>{children}</Box>}
        </div>
    );
};

const ModalForm = ({ row, departament, onClose, token, onDataSaved }) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [formData, setFormData] = useState(row);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [fileInfo, setfileInfo] = useState([]);

    const calculateTotalCost = (data) => {
        return [
            data.Cost || 0,
            data.tiketsCost || 0,
            data.HotelCost || 0,
            data.dailyCost || 0,
            data.otherPayments || 0
        ].reduce((sum, value) => sum + value, 0);
    };
    const [Cost, setCost] = useState(formData.Cost);
    const [totoalCost, settotoalCost] = useState(calculateTotalCost(formData));
    const [totoalCostPerHour, settotoalCostPerHour] = useState(0);
    const [CostPerHour, setCostPerHour] = useState(0);
    const [SummPerHour, setSummPerHour] = useState(0);

    useEffect(() => {
        const fetchCustomerOptions = async () => {
            try {
                const response = await axios.get('https://jsonplaceholder.typicode.com/users');
                setCustomerOptions(response.data);
            } catch (error) {
                console.error('Error fetching customer options:', error);
            }
        };
        const fetchUserOptions = async () => {
            try {
                const response = await fetchUser(token);
                setInitiatorOptions(response);
            } catch (error) {
                console.error('Error fetching user options:', error);
            }
        };
        fetchUserOptions();
        fetchCustomerOptions();

        GetfilesInfo(formData.Files).then((fileInfo) => {
            setfileInfo(fileInfo)
        }).catch((error) => {
                console.error('Error fetching file info:', error);
            });
    }, [token]);

    useEffect(() => {
        settotoalCostPerHour(`${Math.round(totoalCost*100 / (formData.resourceSumm * 8))/100} ₽/час`);
    }, [totoalCost, formData.resourceSumm]);

    useEffect(() => {
        setCostPerHour(`${Math.round(formData.Cost * 100/ (formData.resourceSumm * 8))/100} ₽/час`);
    }, [formData.Cost, formData.resourceSumm]);

    useEffect(() => {
        setSummPerHour(`${Math.round(formData.Price * 100 / (formData.frameSumm * 8)) / 100} ₽/час по длительности`);
    }, [formData.Price, formData.frameSumm]);

    useEffect(() => {
        const value = formData.resourceSumm * 8 * formData.Department.CostHour;
        setCost(value);
        setFormData({
            ...formData, Cost: value
        })
    }, [formData.resourceSumm]);

    const validateFields = () => {
        const newErrors = {};
        if (!formData.initiator) newErrors.initiator = 'Поле не должно быть пустым';
        if (!formData.Department) newErrors.Department = 'Выберите отдел';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    const handleSave = async () => {
        if (!validateFields()) {
            return;
        }
        try {
            console.log('formData',formData)
            await UpdateData(formData, token);
            onDataSaved();
            onClose();
        } catch (error) {
            console.error('Error saving data:', error);
        }
    };

    const handleCancel = () => {
        setFormData(row);
        onClose();
    };

    const handleChange = (e) => {

        const { name, value } = e.target;
        let newValue = value;

        // для чисел
        if (['Cost', 'tiketsCost', 'HotelCost', 'dailyCost', 'otherPayments', 'Price', 'resourceSumm', 'frameSumm'].indexOf(name) > -1) {
            newValue = parseCurrency(value);
        }

        setFormData({ ...formData, [name]: newValue });
        if (['Cost', 'tiketsCost', 'HotelCost', 'dailyCost', 'otherPayments'].indexOf(name) > -1) {
            settotoalCost(calculateTotalCost({ ...formData, [name]: newValue }));
        }
    };

    const handleCustomerChange = (event, newValue) => {
        setFormData({ ...formData, Customer: newValue ? newValue.name : '' });
    };

    const handleInitiatorChange = (event, newValue) => {
        if (newValue) setFormData({
            ...formData, initiator: {
                id: newValue.id,
                first_name: newValue.first_name,
                last_name: newValue.last_name,
            }
        });
    };

    const handleDepartmentChange = (event, value) => {
        if (value.props.value) setFormData({ ...formData, Department: departament[value.props.value-1] });
    };

    const handleDescriptionChange = (editor, fieldName) => {
        const data = editor.getData();
        setFormData({ ...formData, [fieldName]: data });
    };
    const formatCurrency = (value) => {
        if (!value) return '';
        const parts = value.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join(',');
    };
    const parseCurrency = (value) => {
        if (!value) return '';
        return parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    };

    const selectedInitiator = formData.initiator
        ? InitiatorOptions.find((option) => option.id === formData.initiator.id) || ''
        : '';

    const handleFileUpload = async (files, token) => {
            const updateFilesArray = (currentFiles, uploadedFiles, projectCardId) => {
                const maxId = currentFiles.reduce((max, file) => Math.max(max, file.id), 0);
                const newFiles = uploadedFiles.map((file, index) => ({
                    id: maxId + index + 1,
                    Project_Card_id: projectCardId,
                    directus_files_id: file.id
                }));
                return [...currentFiles, ...newFiles];
            };
        try {
            const filesArray = Array.from(files);
            const uploadedFiles = await uploadFilesDirectus(filesArray, token);
            const newformData = { ...formData, Files: updateFilesArray(formData.Files, uploadedFiles, formData.id) };
            await UpdateData(newformData, token);
            setFormData(newformData);
            GetfilesInfo(newformData.Files).then((fileInfo) => {
                setfileInfo(fileInfo)
            }).catch((error) => {
                console.error('Ошибка при загрузке информаци о файлах:', error);
            });
        } catch (error) {
            console.error('Ошибка при загрузке файлов:', error);
        }
    };

    const handleFileDelete = async (fileId, token) => {
        const updateFilesArray = (currentFiles, deletedFileId) => {
            return currentFiles.filter(file => file.directus_files_id !== deletedFileId);
        };

        try {
            console.log(fileId)
            await deleteFileDirectus(fileId);
            const newformData = { ...formData, Files: updateFilesArray(formData.Files, fileId) };
            await UpdateData(newformData, token);
            setFormData(newformData);
            GetfilesInfo(newformData.Files).then((fileInfo) => {
                setfileInfo(fileInfo)
            }).catch((error) => {
                console.error('Ошибка при загрузке информаци о файлах', error);
            });
        } catch (error) {
            console.error('Ошибка при удалении файла:', error);
        }
    };

    const handleJobChange = (jobDescriptions) => {
        const frame = jobDescriptions.reduce((sum, key) => {
            const resourceDay = parseFloat(key.frameDay);
            return sum + (isNaN(resourceDay) ? 0 : resourceDay);
        }, 0);
        const resource = jobDescriptions.reduce((sum, key) => {
            const resourceDay = parseFloat(key.resourceDay);
            return sum + (isNaN(resourceDay) ? 0 : resourceDay);
        }, 0);
        setFormData({ ...formData, JobDescription: jobDescriptions, frameSumm: frame, resourceSumm: resource });
    };
 
    return (
        <Modal open={true} onClose={onClose}>
            <Box sx={{
                width: 'calc(100% - 20rem)',
                bgcolor: 'background.paper',
                p: 3,
                mx: 'auto',
                mt: 4,
                fontFamily: 'Roboto, sans-serif',
                ml: '10rem',
                mr: '10rem',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="form tabs">
                    <Tab label="Основное" />
                    <Tab label="Детали" />
                    <Tab label="Финансы" />
                </Tabs>
                <TabPanel value={tabIndex} index={0}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <Autocomplete
                                options={InitiatorOptions}
                                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                                value={selectedInitiator}
                                onChange={handleInitiatorChange}
                                renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Инициатор"
                                            margin="dense"
                                            InputProps={params.InputProps}
                                            error={!!errors.initiator}
                                            helperText={errors.initiator}
                                        />
                                    )}
                                fullWidth
                                disableClearable
                            />
                        </Grid>
                        <Grid item xs={12} md={9}>
                            <TextField
                                label="Название проекта"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Данные о заказчике
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <Autocomplete
                                options={customerOptions}
                                getOptionLabel={(option) => option.name}
                                value={customerOptions.find((option) => option.name === formData.Customer) || null}
                                onChange={handleCustomerChange}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Заказчик"
                                        margin="dense"
                                        InputProps={params.InputProps}
                                    />
                                )}
                                fullWidth
                                disableClearable
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Заказчик CRMID"
                                name="CustomerCRMID"
                                value={formData.CustomerCRMID}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <TextField
                                label="Контакт заказчика ФИО"
                                name="CustomerContact"
                                value={formData.CustomerContact}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Контакт заказчика CRMID"
                                name="CustomerContactCRMID"
                                value={formData.CustomerContactCRMID}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Должность"
                                name="CustomerContactJobTitle"
                                value={formData.CustomerContactJobTitle}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Email"
                                name="CustomerContactEmail"
                                value={formData.CustomerContactEmail}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Телефон"
                                name="CustomerContactTel"
                                value={formData.CustomerContactTel}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Данные о проекте
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth margin="dense" error={!!errors.Department}>
                                <InputLabel id="Department-label">Отдел исполнителей</InputLabel>
                                <Select
                                    labelId="Department-label"
                                    id="Department"
                                    name="Department"
                                    value={formData.Department ? formData.Department.id : ''}
                                    label="Отдел исполнителей"
                                    onChange={handleDepartmentChange}
                                >
                                    {departament.map(item => (
                                        <MenuItem key={item.id } value={item.id}>
                                            {item.Name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.Department && <FormHelperText>{errors.Department}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography
                                variant="body1"
                                color="textSecondary"
                                style={{
                                    marginTop: '12px',
                                    marginBottom: '4px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Описание проекта
                            </Typography>
                            <CKEditor
                                id="CKEditor-label"
                                editor={ClassicEditor}
                                data={formData.Description || ''}
                                name="Description"
                                onChange={(event, editor) => handleDescriptionChange(editor, 'Description')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Ограничения от инициатора"
                                name="ProjectScope"
                                value={formData.ProjectScope}
                                onChange={handleChange}
                                fullWidth
                                multiline
                                margin="dense"
                            />
                        </Grid>
                        <Box mt={1}>
                            <Typography variant="h6" gutterBottom>
                                Файлы
                            </Typography>
                            <FileUpload
                                files={fileInfo}
                                onUpload={handleFileUpload}
                                onDelete={handleFileDelete}
                            />
                        </Box>
                    </Grid>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <CustomTable jobDescriptions={formData.JobDescription} handleJobChange={handleJobChange} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Ресурсная оценка (Трудозатраты)"
                                name="resourceSumm"
                                value={formData.resourceSumm}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Рамочная оценка (Длительность)"
                                name="frameSumm"
                                value={formData.frameSumm}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography
                                variant="body1"
                                color="textSecondary"
                                style={{
                                    marginTop: '12px',
                                    marginBottom: '4px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Работы на выезде
                            </Typography>
                            <CKEditor
                                id="CKEditorjobOnTrip-label"
                                editor={ClassicEditor}
                                data={formData.jobOnTrip || ''}
                                onChange={(event, editor) => handleDescriptionChange(editor, 'jobOnTrip')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Ограничения со стороны исполнителей"
                                name="Limitations"
                                value={formData.Limitations}
                                onChange={handleChange}
                                fullWidth
                                multiline
                                margin="dense"
                            />
                        </Grid>
                    </Grid>
                </TabPanel>
                <TabPanel value={tabIndex} index={2}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Цена"
                                name="Price"
                                value={formatCurrency(formData.Price)}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                                aria-describedby="Sum-helper-text"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                }}
                            />
                            <FormHelperText id="Sum-helper-text">
                                {SummPerHour}
                            </FormHelperText>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Себестоимость"
                                name="Cost"
                                value={formatCurrency(formData.Cost)}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                                aria-describedby="Cost-helper-text"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                    readOnly: true,
                                }}
                            />
                            <FormHelperText id="Cost-helper-text">
                                {CostPerHour}
                            </FormHelperText>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Себестоимость с накладными"
                                name="TotalCost"
                                value={formatCurrency(totoalCost)}
                                fullWidth
                                margin="dense"
                                aria-describedby="TotalCost-helper-text"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                    readOnly: true,
                                }}
                            />
                            <FormHelperText id="TotalCost-helper-text">
                                {totoalCostPerHour}
                            </FormHelperText>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Накладные расходы
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Стоимость билетов"
                                name="tiketsCost"
                                value={formData.tiketsCost}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Описание стоимости билетов"
                                name="tiketsCostDescription"
                                value={formData.tiketsCostDescription}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Стоимость отелей"
                                name="HotelCost"
                                value={formData.HotelCost}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Описание стоимости отелей"
                                name="HotelCostDescription"
                                value={formData.HotelCostDescription}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Суточные расходы"
                                name="dailyCost"
                                value={formData.dailyCost}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Описание суточных расходов"
                                name="dailyCostDescription"
                                value={formData.dailyCostDescription}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Прочие платежи"
                                name="otherPayments"
                                value={formData.otherPayments}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Описание прочих платежей"
                                name="otherPaymentsDescription"
                                value={formData.otherPaymentsDescription}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Данные для старта проекта
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Компания"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Номер дата контракта"
                                name="contract"
                                value={formData.contract}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Дата начала"
                                name="dateStart"
                                type="date"
                                value={formData.dateStart}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Крайний срок"
                                name="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={handleChange}
                                fullWidth
                                margin="dense"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </Grid>
                    </Grid>
                </TabPanel>
                <Box mt={1}>
                    <Button variant="contained" color="primary" onClick={handleSave} sx={{ mr: 1 }}>
                        Сохранить
                    </Button>
                    <Button variant="contained" color="secondary" onClick={handleCancel}>
                        Отмена
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default ModalForm;