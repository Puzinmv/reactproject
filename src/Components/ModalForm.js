import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, Box, Tabs, Tab, TextField, Button, Typography, Autocomplete,
    InputLabel, Select, MenuItem, FormControl, FormHelperText,
    Switch, Grid, InputAdornment, FormControlLabel, ListItemText,
    ClickAwayListener, Popper, Checkbox, List, ListItem, Snackbar, Alert,
} from '@mui/material';

//import InputAdornment from '@mui/material/InputAdornment';
import {
    fetchUser, UpdateData, GetfilesInfo, uploadFilesDirectus,
    deleteFileDirectus, fetchCustomer, fetchCustomerContact
} from '../services/directus';
import {CreateProject, GetProjectTemtplate} from '../services/openproject';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';
import CustomTable from './CustomTable'; 
import TableJobOnTrip from './TableJobOnTrip'; 

const WORNING_TEXT = 'Измения может вносить только отдел исполнителей';

const TabPanel = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box p={2}>{children}</Box>}
        </div>
    );
};
const calculateTotalCost = (data) => {
    return [
        data.Cost || 0,
        data.tiketsCost || 0,
        data.HotelCost || 0,
        data.dailyCost || 0,
        data.otherPayments || 0,
        data.HiredCost || 0
    ].reduce((sum, value) => sum + value, 0);
};

const ModalForm = ({ row, departament, onClose, currentUser, onDataSaved, limitation }) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [formData, setFormData] = useState(row);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [projectTemplateOptions, setProjectTemplateOptions] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [customerContactOptions, setCustomerContactOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [fileInfo, setfileInfo] = useState([]);
    const [autofill, setAutofill] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [checkedTemplates, setCheckedTemplates] = useState([]);
    const [snackbarState, setSnackbarState] = useState({ open: false, message: '', severity: 'info' });
    const [totoalCost, settotoalCost] = useState(calculateTotalCost(formData));
    const [totoalCostPerHour, settotoalCostPerHour] = useState(0);
    const [CostPerHour, setCostPerHour] = useState(0);
    const [SummPerHour, setSummPerHour] = useState(0);
    const [startDateHelperText, setStartDateHelperText] = useState('');
    const textFieldRef = useRef(null);


    useEffect(() => {
        const fetchCustomerOptions = async () => {
            try {
                const response = await fetchCustomer(formData.initiator.first_name);
                const customers = response.map(item => ({
                    name: item.shortName,
                    id: item.id,
                    fullName: item.fullName,
                    CRMID: item.CRMID
                }))
                setCustomerOptions(customers)
                return customers;
            } catch (error) {
                console.error('Error fetching customer options:', error);
            }
        };
        const fetchUserOptions = async () => {
            try {
                const response = await fetchUser();
                setInitiatorOptions(response);
            } catch (error) {
                console.error('Error fetching user options:', error);
            }
        };
        fetchUserOptions();
        fetchCustomerOptions().then((customers) => {
            const value = customers.find((option) => option.name === formData.Customer) || null;
            setCustomer(value);
            if (!value) setAutofill(true)
        });
        
        GetfilesInfo(formData.Files).then((fileInfo) => {
            setfileInfo(fileInfo)
        }).catch((error) => {
                console.error('Error fetching file info:', error);
        });

        GetProjectTemtplate().then((data) => setProjectTemplateOptions(data))
    }, [formData.Customer, formData.Files, formData.initiator.first_name]);

    useEffect(() => {
        settotoalCostPerHour(`${Math.round(totoalCost*100 / (formData.resourceSumm * 8))/100} ₽/час`);
    }, [totoalCost, formData.resourceSumm]);


    const prevResourceSummRef = useRef(formData.resourceSumm);

    useEffect(() => {
        setCostPerHour(`${Math.round(formData.Cost * 100 / (formData.resourceSumm * 8)) / 100} ₽/час`);
        if (prevResourceSummRef.current !== formData.resourceSumm) {
            setFormData(prevFormData => ({
                ...prevFormData,
                jobCalculated: false,
            }));
            prevResourceSummRef.current = formData.resourceSumm;
        }
    }, [formData.Cost, formData.resourceSumm]);

    useEffect(() => {
        if (formData.Price) {
            setSummPerHour(`${Math.round(formData.Price * 100 / (formData.frameSumm * 8)) / 100} ₽/час по длительности`);
        } else {
            setSummPerHour('В случае нулевой стоимости проект будет стартован как инвестиционный');
        }

    }, [formData.Price, formData.frameSumm]);


    const prevPriceRef = useRef(formData.Price);
    const prevCostRef = useRef(formData.Cost);

    useEffect(() => {
        if (prevPriceRef.current !== formData.Price || prevCostRef.current !== formData.Cost) {
            setFormData(prevFormData => ({
                ...prevFormData,
                priceAproved: false,
            }));
            prevPriceRef.current = formData.Price;
            settotoalCost(calculateTotalCost(formData));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.Price, formData.Cost]);

    useEffect(() => {
        const value = formData.resourceSumm * 8 * formData.Department.CostHour;
        setFormData(prevData => {
            if (prevData.Cost !== value) {
                return { ...prevData, Cost: value };
            }
            return prevData;
        });

    }, [formData.Department.CostHour, formData.resourceSumm]);

    useEffect(() => {
        let newStatus = 'Новая карта';
        if (formData.jobCalculated && !formData.priceAproved) {
            newStatus = 'Оценка трудозатрат проведена';
        } else if (formData.jobCalculated && formData.priceAproved) {
            newStatus = 'Экономика согласована';
        }
        if (formData.Project_created) newStatus = 'Проект стартован'

        setFormData(prevData => {
            if (prevData.status !== newStatus) {
                return { ...prevData, status: newStatus };
            }
            return prevData;
        });
    }, [formData.Project_created, formData.jobCalculated, formData.priceAproved]);

    const validateFields = () => {
        const newErrors = {};
        if (!formData.initiator) newErrors.initiator = 'Поле не должно быть пустым';
        if (!formData.Department) newErrors.Department = 'Выберите отдел';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // стандартные функции изменения полей
    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    const handleSave = async (newformData) => {
        if (!validateFields()) {
            return;
        }
        try {
            if (!newformData?.target) {
                console.log('SafeData', newformData)
                await UpdateData(newformData);
            } else {
                console.log('SafeData', formData)
                await UpdateData(formData);
            }
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

    const triggerSnackbar = (message, severity) => {
        setSnackbarState({ open: true, message, severity });
    };


    const handleChange = (e) => {

        const { name, value } = e.target;
        if (['CommentJob', 'HiredCost', 'Hired', 'OpenProject_Template_id', 'Limitations'].indexOf(name) > -1 &&
            currentUser.ProjectCardRole !== 'Admin' &&
            currentUser.ProjectCardRole !== 'Technical')
        {
            triggerSnackbar('Измения может вносить только отдел исполнителей', "warning")
            return
        }
        let newValue = value;
        // для чисел
        if (['Hired','HiredCost','Cost', 'tiketsCost', 'HotelCost', 'dailyCost', 'otherPayments', 'Price', 'resourceSumm', 'frameSumm'].indexOf(name) > -1) {
            newValue = parseCurrency(value);
        }
        if (name ==='dateStart') {
            const today = new Date();
            const minDate = new Date();
            minDate.setDate(today.getDate() + 14);
            const selectedDateObj = new Date(value);
            console.log(today, minDate, selectedDateObj, value)
            if (selectedDateObj < minDate) {
                console.log("today, minDate, selectedDateObj, value")
                setStartDateHelperText('На подготовку менее 14 дней. Согласуйте страт проекта с исполнителями');
            } else {
                setStartDateHelperText('');
            }
            
        }

        setFormData({ ...formData, [name]: newValue });

        if (['Cost', 'tiketsCost', 'HotelCost', 'dailyCost', 'otherPayments', 'HiredCost'].indexOf(name) > -1) {
            settotoalCost(calculateTotalCost({ ...formData, [name]: newValue }));
        }

        // Проверка соответствия с шаблонами ограничения от исполнителей
        if (name === 'Limitations') {
            const newCheckedTemplates = limitation.filter((template) => value.includes(template));
            setCheckedTemplates(newCheckedTemplates);
        }
        
    };

    const handleChangeSwitch = (e) => {
        const { name, checked } = e.target;
        setFormData({ ...formData, [name]: checked });
    }


    // показ шаблонов ограничения от исполнителей
    const handleFocus = (event) => {
        setAnchorEl(textFieldRef.current);
    };

    const handleFocusOut = (event) => {
        if (textFieldRef.current && !textFieldRef.current.contains(event.target) && !anchorEl?.contains(event.relatedTarget)) {
            setAnchorEl(null);
        }
    };

    const handleCheckboxToggle = (template) => {
        if (currentUser.ProjectCardRole !== 'Admin' &&
            currentUser.ProjectCardRole !== 'Technical') {
            triggerSnackbar(WORNING_TEXT, "warning")
            return
        }
        const currentIndex = checkedTemplates.indexOf(template);
        const newChecked = [...checkedTemplates];

        if (currentIndex === -1) {
            newChecked.push(template);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        setCheckedTemplates(newChecked);

        const newValue = newChecked.map((item) => `- ${item}`).join('\n');
        setFormData((prevData) => ({ ...prevData, Limitations: newValue }));
    };

    //изменения в заказчике
    const handleCustomerChange = async (event, value) => {
        setFormData({
            ...formData,
            Customer: value ? value?.name : '',
            CustomerCRMID: value ? value?.CRMID : ''
        });
        setCustomer(value);
        try {
            const response = await fetchCustomerContact(value.CRMID);
            setCustomerContactOptions(response.map(item => ({
                name: item.Name,
                id: item.id,
                email: item.email,
                jobTitle: item.jobTitle,
                tel: item.tel
            })))
        } catch (error) {
            console.error('Error fetching customer сontact options:', error);
        }

    };
    
    const handleCustomerContactChange = (event, value) => {
        setFormData({
            ...formData,
            CustomerContact: value.name ? value.name : '',
            CustomerContactEmail: value.email ? value.email : '',
            CustomerContactJobTitle: value.jobTitle ? value.jobTitle : '',
            CustomerContactTel: value.tel ? value.tel : '',
        });
    };

    const handleInitiatorChange = (event, newValue) => {
        if (newValue) setFormData({
            ...formData, initiator: {
                id: newValue.id,
                first_name: newValue.first_name,
                last_name: newValue.last_name || '',
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

    const handleFileUpload = async (files) => {
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
            const uploadedFiles = await uploadFilesDirectus(filesArray);
            const newformData = { ...formData, Files: updateFilesArray(formData.Files, uploadedFiles, formData.id) };
            await UpdateData(newformData);
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


    const handleFileDelete = async (fileId) => {
        const updateFilesArray = (currentFiles, deletedFileId) => {
            return currentFiles.filter(file => file.directus_files_id !== deletedFileId);
        };

        try {
            await deleteFileDirectus(fileId);
            const newformData = { ...formData, Files: updateFilesArray(formData.Files, fileId) };
            await UpdateData(newformData);
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
        if (currentUser.ProjectCardRole !== 'Admin' &&
            currentUser.ProjectCardRole !== 'Technical') {
            triggerSnackbar(WORNING_TEXT, "warning")
            return false
        }
        const frame = jobDescriptions.reduce((sum, key) => {
            const resourceDay = parseFloat(key.frameDay);
            return sum + (isNaN(resourceDay) ? 0 : resourceDay);
        }, 0);
        const resource = jobDescriptions.reduce((sum, key) => {
            const resourceDay = parseFloat(key.resourceDay);
            return sum + (isNaN(resourceDay) ? 0 : resourceDay);
        }, 0);
        setFormData({ ...formData, JobDescription: jobDescriptions, frameSumm: frame, resourceSumm: resource });
        return true
    };

    const handleJobOnTripChange = (data) => {
        if (currentUser.ProjectCardRole !== 'Admin' &&
            currentUser.ProjectCardRole !== 'Technical') {
            triggerSnackbar(WORNING_TEXT, "warning")
            return false
        }
        setFormData({ ...formData, JobOnTripTable: data });
        return true
    };
    const handleCreateProject = async () => {
        triggerSnackbar("Старт проекта", "info")
        const response = await CreateProject(formData);
        console.log(response)
        if (response) {
            const newdata = { ...formData, Project_created: true, status: 'Проект стартован' }
            setFormData(newdata);
            handleSave(newdata);
        } else {
            triggerSnackbar("Ошибка при создании проекта", "error")
        }
    }
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarState({ ...snackbarState, open: false });
    };

    return (
        <Modal open={true} onClose={onClose}>
            <div>  
                <Box sx={{
                    width: 'calc(100% - 10rem)',
                    bgcolor: 'background.paper',
                    p: 3,
                    mx: 'auto',
                    mt: 4,
                    fontFamily: 'Roboto, sans-serif',
                    ml: '5rem',
                    mr: '5rem',
                    maxHeight: '90vh',
                }}>
                    <Tabs value={tabIndex} onChange={handleTabChange} aria-label="form tabs" sx={{ flexShrink: 0 }} >
                        <Tab label="Общая информация" />
                        <Tab label="Объем работ" />
                        <Tab label="Коммерческая часть" />
                    </Tabs>
                    <Box sx={{
                        maxHeight: 'calc(90vh - 128px)',
                        overflowY: 'auto'
                    }}>
                        <TabPanel value={tabIndex} index={0}>
                            <Grid container spacing={1}>
                                <Grid item xs={12} md={3}>
                                    <Autocomplete
                                        options={InitiatorOptions}
                                        getOptionLabel={(option) => `${option.first_name} ${option.last_name || ''}`}
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
                                <Grid item xs={12} md={8}>
                                    <Typography variant="h6" gutterBottom>
                                        Данные о заказчике
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={autofill || false}
                                                name="autofill"
                                                onChange={(e) => {
                                                    setCustomerContactOptions([])
                                                    setAutofill(e.target.checked)
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography variant="body1" color="textPrimary">
                                                убрать автозаполнение
                                            </Typography>
                                        }
                                        labelPlacement="end"
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    {autofill ? (
                                        <TextField
                                            label="Заказчик"
                                            name="Customer"
                                            value={formData.Customer}
                                            onChange={handleChange}
                                            fullWidth
                                            margin="dense"
                                        />
                                    ) : (
                                        <Autocomplete
                                            options={customerOptions}
                                            getOptionLabel={(option) => option.name}
                                                value={customer}
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
                                    )}
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
                                    {customerContactOptions.length > 0 ? (
                                        <Autocomplete
                                            options={customerContactOptions}
                                            getOptionLabel={(option) => option.name}
                                            value={customerContactOptions.find((option) => option.name === formData.CustomerContact) || null}
                                            onChange={handleCustomerContactChange}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Контакт заказчика ФИО"
                                                    margin="dense"
                                                    InputProps={params.InputProps}
                                                />
                                            )}
                                            fullWidth
                                            disableClearable
                                        />
                                    ): (
                                        <TextField
                                            label = "Контакт заказчика ФИО"
                                            name = "CustomerContact"
                                            value = {formData.CustomerContact}
                                            onChange={handleChange}
                                            fullWidth
                                            margin="dense"
                                    />  )}
                               

                                </Grid>
                                <Grid item xs={12} md={4}>
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

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth margin="dense" error={!!errors.Department}>
                                        <InputLabel id="Department-label">Отдел исполнителей</InputLabel>
                                        <Select
                                            labelId="Department-label"
                                            id="Department"
                                            name="Department"
                                            value={formData.Department ? formData.Department.id : ''}
                                            label="Отдел исполнителей"
                                            onChange={handleDepartmentChange}
                                            margin="dense"
                                        >
                                            {departament.map(item => (
                                                <MenuItem key={item.id} value={item.id}>
                                                    {item.Department}
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
                                        label="Особые пожелания заказчика или инициатора"
                                        name="ProjectScope"
                                        value={formData.ProjectScope}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid item xs={12}>
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
                            </Grid>
                        </TabPanel>
                        <TabPanel value={tabIndex} index={1}>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <CustomTable
                                        depatmentid={formData.Department?.id || -1}
                                        jobDescriptions={formData?.JobDescription || []}
                                        projectCardRole={currentUser?.ProjectCardRole || ''}
                                        handleJobChange={handleJobChange}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Комментарии к оценке работ"
                                        name="CommentJob"
                                        value={formData.CommentJob || ''}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid container item xs={12} md={6} justifyContent="flex-end" alignItems="center">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.jobCalculated || false}
                                                name="jobCalculated"
                                                onChange={handleChangeSwitch}
                                                disabled={currentUser.ProjectCardRole !== 'Admin' && currentUser.ProjectCardRole !== 'Technical' }
                                            />
                                        }
                                        label={
                                            <Typography variant="body1" color="textPrimary">
                                                Расчет трудозатрат произведен
                                            </Typography>
                                        }
                                        labelPlacement="start" 
                                    />
                                </Grid>
                                <Grid item xs={3} md={3}>
                                    <TextField
                                        label="Ресурсная оценка (Трудозатраты)"
                                        name="resourceSumm"
                                        value={formData.resourceSumm || 0}
                                        onChange={handleChange}
                                        size="small"
                                        fullWidth
                                        margin="dense"
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={3} md={3}>
                                    <TextField
                                        label="Рамочная оценка (Длительность)"
                                        name="frameSumm"
                                        value={formData.frameSumm || 0}
                                        onChange={handleChange}
                                        size="small"
                                        fullWidth
                                        margin="dense"
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                    />
                                </Grid>
                                <Grid container item xs={12} md={6}>
                                </Grid>
                                <Grid item xs={3} md={3}>
                                    <TextField
                                        label="Стоимость подрядчика"
                                        name="HiredCost"
                                        value={formatCurrency(formData.HiredCost) || 0}
                                        onChange={handleChange}
                                        size="small"
                                        fullWidth
                                        margin="dense"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={3} md={3}>
                                    <TextField
                                        label="Трудозатраты подрядчика"
                                        name="Hired"
                                        value={formData.Hired || 0}
                                        onChange={handleChange}
                                        size="small"
                                        fullWidth
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TableJobOnTrip
                                        data={formData.JobOnTripTable || []}
                                        projectCardRole={currentUser?.ProjectCardRole || ''}
                                        handleChange={handleJobOnTripChange}
                                    />
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel id="OpenProject-template">Шаблон проекта</InputLabel>
                                        <Select
                                            labelId="OpenProject-template-label"
                                            id="OpenProject-template"
                                            name="OpenProject_Template_id"
                                            value={formData.OpenProject_Template_id || 0}
                                            label="Шаблон проекта"
                                            onChange={handleChange}
                                        >
                                            {projectTemplateOptions.map(item => (
                                                    <MenuItem key={item.value} value={item.value}>
                                                        {item.name}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Ограничения со стороны исполнителей"
                                        name="Limitations"
                                        value={formData.Limitations || ''}
                                        onChange={handleChange}
                                        onFocus={handleFocus}
                                        fullWidth
                                        multiline
                                        margin="dense"
                                        ref={textFieldRef}
                                    />
                                    <Popper
                                        open={Boolean(anchorEl)}
                                        anchorEl={textFieldRef.current}
                                        placement="top-start"
                                        style={{ zIndex: 1300 }} 
         
                                    >
                                        <ClickAwayListener onClickAway={handleFocusOut}>
                                            <List style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '8px', width: textFieldRef.current?.offsetWidth || 300 }}>
                                                {limitation.map((template) => (
                                                    <ListItem key={template.name} dense>
                                                        <Checkbox
                                                            edge="start"
                                                            checked={checkedTemplates.indexOf(template.name) !== -1}
                                                            tabIndex={-1}
                                                            disableRipple
                                                            onChange={() => handleCheckboxToggle(template.name)}
                                                        />
                                                        <ListItemText primary={template.name} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </ClickAwayListener>
                                    </Popper>
                                </Grid>
                            </Grid>
                        </TabPanel>
                        <TabPanel value={tabIndex} index={2}>
                            <Grid container spacing={2} style={{ padding: '0 16px' }}>
                                <Grid item xs={6} md={3}>
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
                                <Grid item xs={12} md={3} container alignItems="center">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.priceAproved || false}
                                                name="priceAproved"
                                                disabled={currentUser.ProjectCardRole !== 'Admin' &&
                                                    currentUser.ProjectCardRole !== 'Commercial' &&
                                                    formData?.initiator?.Head !== currentUser?.id }
                                                onChange={handleChangeSwitch}
                                            />
                                        }
                                        label={
                                            <Typography variant="body1" color="textPrimary">
                                                Цена согласована
                                            </Typography>
                                        }
                                        labelPlacement="start" 
                                    />

                                </Grid>
                                <Grid item xs={6} md={3}>
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
                                <Grid item xs={6} md={3}>
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
                                <Grid item xs={12} md={8}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="h6" gutterBottom>
                                                Накладные расходы
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <TextField
                                                label="Стоимость билетов"
                                                name="tiketsCost"
                                                value={formatCurrency(formData.tiketsCost)}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={9}>
                                            <TextField
                                                label="Описание"
                                                placeholder="Самолет, поезд, автобус"
                                                name="tiketsCostDescription"
                                                value={formData.tiketsCostDescription}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <TextField
                                                label="Стоимость отелей"
                                                name="HotelCost"
                                                value={formatCurrency(formData.HotelCost)}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={9}>
                                            <TextField
                                                label="Описание"
                                                placeholder="Пример: 2 ночи"
                                                name="HotelCostDescription"
                                                value={formData.HotelCostDescription}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <TextField
                                                label="Суточные расходы"
                                                name="dailyCost"
                                                value={formatCurrency(formData.dailyCost)}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={9}>
                                            <TextField
                                                label="Описание"
                                                placeholder="Пример: 3 дня"
                                                name="dailyCostDescription"
                                                value={formData.dailyCostDescription}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <TextField
                                                label="Прочие платежи"
                                                name="otherPayments"
                                                value={formatCurrency(formData.otherPayments)}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                        <Grid item xs={6} md={9}>
                                            <TextField
                                                label="Описание"
                                                placeholder="Такси, бензин и другое"
                                                name="otherPaymentsDescription"
                                                value={formData.otherPaymentsDescription}
                                                onChange={handleChange}
                                                size="small"
                                                fullWidth
                                                margin="dense"
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        Данные для старта проекта
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel id="company-label">Компания</InputLabel>
                                        <Select
                                            labelId="company-label"
                                            id="company"
                                            name="company"
                                            value={formData.company}
                                            label="Компания"
                                            onChange={handleChange}
                                        >
                                            <MenuItem value={'Астерит'}>Астерит</MenuItem>
                                            <MenuItem value={'Профинтег'}>Профинтег</MenuItem>
                                        </Select>
                                    </FormControl>
                                    {(currentUser.email === 'puzin.m.v@asterit.ru') && (
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.Project_created || false}
                                                    name="Project_created"
                                                    onChange={handleChangeSwitch}
                                                />
                                            }
                                            label={
                                                <Typography variant="body1" color="textPrimary">
                                                    проект стартован
                                                </Typography>
                                            }
                                            labelPlacement="start"
                                        />)}
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <TextField
                                        label="Реквизиты договора"
                                        placeholder="№1 от 01.01.2020"
                                        name="contract"
                                        value={formData.contract}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        label="Дата начала"
                                        name="dateStart"
                                        type="date"
                                        value={formData.dateStart}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        helperText={startDateHelperText}
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                        FormHelperTextProps={{
                                            sx: { color: 'error.main' }, 
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        label="Крайний срок"
                                        name="deadline"
                                        type="date"
                                        value={formData.deadline}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        helperText="Заполнять только в случае жестких ограничений срока проведения работ"
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>
                    </Box>
                    <Box mt={1} display="flex" justifyContent="flex-end" alignItems="center">
                        {(formData.status === 'Экономика согласована') && (
                            <Button variant="contained" sx={{ bgcolor: 'green', mr: 1 }} onClick={handleCreateProject}>
                                Создать проект
                            </Button>
                        )}
                        <Box>
                            <Button variant="contained" color="secondary" onClick={handleCancel} sx={{ mr: 1 }}>
                                Отмена
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleSave} sx={{ mr: 1 }}>
                                Сохранить
                            </Button>
                        </Box>
                    </Box>
                </Box>
                <Snackbar
                    open={snackbarState.open}
                    autoHideDuration={3000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    style={{ position: 'absolute', top: 50, right: 50 }}
                >
                    <Alert severity={snackbarState.severity} sx={{ width: '100%' }}>
                        {snackbarState.message}
                    </Alert>
                </Snackbar>
            </div>  
        </Modal>
    );
};

export default ModalForm;