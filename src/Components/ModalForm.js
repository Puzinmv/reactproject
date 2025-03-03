import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, Box, Tabs, Tab, TextField, Button, Typography, Autocomplete,
    InputLabel, Select, MenuItem, FormControl, FormHelperText,
    Switch, Grid, InputAdornment, FormControlLabel, ListItemText,
    ClickAwayListener, Popper, Checkbox, List, ListItem, Snackbar, Alert,
    CircularProgress, Chip, Card, Link, Divider
} from '@mui/material';
import { styled } from '@mui/system';
import { 
    STATUS, STATUS_COLORS, ROLES, WARNING_MESSAGES, FORM_FIELDS, 
    COMPANIES, EMAILS
} from '../constants/index.js';
//import InputAdornment from '@mui/material/InputAdornment';
import {
    fetchCard, fetchUser, UpdateData, GetfilesInfo, uploadFilesDirectus,
    deleteFileDirectus, GetFilesStartId
} from '../services/directus';
import { fetchCustomer1C, fetchCustomerContact1C } from '../services/1c';
import {CreateProject, GetProjectTemtplate} from '../services/openproject';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';
import CustomTable from './CustomTable'; 
import TableJobOnTrip from './TableJobOnTrip'; 
import './ModalForm.css';


const TabPanel = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box p={2}>{children}</Box>}
        </div>
    );
};
const calculateTotalCost = (data) => {
    const costs = [
        parseFloat(data.Cost) || 0,
        parseFloat(data.tiketsCost) || 0,
        parseFloat(data.HotelCost) || 0,
        parseFloat(data.dailyCost) || 0,
        parseFloat(data.otherPayments) || 0
    ];
    return costs.reduce((sum, value) => sum + value, 0);
};

// Функция для определения цвета статуса
const getStatusColor = (status) => STATUS_COLORS[status] || '#e0e0e0';

// стили для switch с ошибкой
const RedSwitch = styled(Switch)(({ theme, error }) => ({
    '& .MuiSwitch-switchBase': {
        color: error === 'true' ? 'red' : theme.palette.primary.main,
    },
    '& .Mui-checked': {
        color: error === 'true' ? 'red' : theme.palette.primary.main,
    },
}));

const ModalForm = ({ rowid, departament, onClose, currentUser, onDataSaved}) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [formData, setFormData] = useState({});
    const [customerOptions, setCustomerOptions] = useState([]);
    const [projectTemplateOptions, setProjectTemplateOptions] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [customerContactOptions, setCustomerContactOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [limitation, setLimitation] = useState([]);
    const [errors, setErrors] = useState({});
    const [fileInfo, setfileInfo] = useState([]);
    const [autofill, setAutofill] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [checkedTemplates, setCheckedTemplates] = useState([]);
    const [snackbarState, setSnackbarState] = useState({ open: false, message: '', severity: 'info', multiline: false });
    const [totalCost, setTotalCost] = useState(0);
    const [totoalCostPerHour, settotoalCostPerHour] = useState('');
    const [CostPerHour, setCostPerHour] = useState('');
    const [SummPerHour, setSummPerHour] = useState(0);
    const [startDateHelperText, setStartDateHelperText] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false); // анимация кнопки при создании проекта
    const textFieldRef = useRef(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const selectRef = useRef(null);
    const switchRef = useRef(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [aiJobDescriptions, setAiJobDescriptions] = useState([]);

    console.log(formData.priceAproved,formData.jobCalculated )
    // const prevPriceRef = useRef(null);
    // const prevCostRef = useRef(null);

    // Первичная загрузка данных карточки
    useEffect(() => {
        const loadCard = async () => {
            try {
                const [row, limitation] = await fetchCard(rowid);
                if (row) {
                    setFormData(row);
                    setLimitation(limitation);
                    setTotalCost(calculateTotalCost(row));
                    if (row.aiJobDescriptions) {
                        setAiJobDescriptions(row.aiJobDescriptions);
                    }
                    console.log(row)
                } else {
                    onClose();
                }
            } catch (error) {
                console.error('Error fetching card:', error);
                onClose();
            }
        };

        loadCard();
    }, [rowid, onClose]);

    // Загрузка связанных данных после получения formData
    useEffect(() => {
        if (!formData?.id) return;

        const loadRelatedData = async () => {
            try {
                // Загрузка информации о клиенте
                    const response = await fetchCustomer1C(formData?.initiator?.RefKey_1C || currentUser?.RefKey_1C);
                    const mappedCustomers = response.map(item => ({
                        name: item.Description,
                        id: item.Ref_Key,
                        fullName: item['НаименованиеПолное'],
                        CRMID: item.Code,
                        options: item.Description,
                    }))
                    setCustomerOptions(mappedCustomers)
                    const selectedCustomer = mappedCustomers.find(
                        option => option.name === formData?.Customer
                    );
                    setCustomer(selectedCustomer);
                    if (!selectedCustomer) setAutofill(true);
            } catch (error) {
                setAutofill(true)
                console.error('Ошибка при загрузке данных из 1с:', error);
            }
        };
        fetchUser()
            .then(users => {
                setInitiatorOptions(users);
            })
            .catch(error => {
                console.error('Ошибка при загрузке пользователей:', error);
            });
        // Загрузка файлов
        if (formData?.Files) {
            GetfilesInfo(formData?.Files)
                .then(files => {
                    setfileInfo(files);
                })
                .catch(error => {
                    console.error('Ошибка при загрузке файлов:', error);
                });
        }

        // Загрузка шаблонов проектов
        GetProjectTemtplate()
            .then(templates => {
                setProjectTemplateOptions(templates);
            })
            .catch(error => {
                console.error('Ошибка при загрузке шаблонов проектов:', error);
            });
        // Загрузка информации о клиенте
        if (formData?.initiator?.RefKey_1C || currentUser?.RefKey_1C) loadRelatedData();
    }, [
        formData?.id, 
        formData?.initiator?.RefKey_1C,
        formData?.Customer,
        formData?.Files,
        currentUser?.RefKey_1C
    ]); 

    useEffect(() => {
        if (!formData?.resourceSumm) return;
        if (totalCost && formData?.resourceSumm) settotoalCostPerHour(`${Math.round(totalCost * 100 / (formData.resourceSumm * 8)) / 100} ₽/час`)
        else settotoalCostPerHour('')
    }, [totalCost, formData.resourceSumm]);

    useEffect(() => {
        if (!formData?.Limitations) return;
        const newCheckedTemplates = limitation.filter((template) => formData.Limitations?.includes(template.name.trim())).map((template) => template.name);
        setCheckedTemplates(newCheckedTemplates);
    }, [formData.Limitations, limitation]);

    // const prevResourceSummRef = useRef(formData.resourceSumm);

    useEffect(() => {
        if (formData?.Cost && formData?.resourceSumm) setCostPerHour(`${Math.round(formData.Cost * 100 / (formData.resourceSumm * 8)) / 100} ₽/час`)
        else setCostPerHour('')
        // console.log(prevResourceSummRef, formData.resourceSumm)
        // if (prevResourceSummRef.current !== undefined && formData.resourceSumm !== undefined && prevResourceSummRef.current !== formData.resourceSumm) {
        //     console.log(prevResourceSummRef, formData.resourceSumm)
        //     setFormData(prevFormData => ({
        //         ...prevFormData,
        //         jobCalculated: false,
        //     }));
        //     prevResourceSummRef.current = formData.resourceSumm;
        // }
        
        setTotalCost(calculateTotalCost({Cost:formData.Cost, tiketsCost: formData.tiketsCost, HotelCost:formData.HotelCost, dailyCost: formData.dailyCost, otherPayments:formData.otherPayments}))
    }, [formData.Cost, formData.resourceSumm, formData.tiketsCost, formData.HotelCost, formData.dailyCost, formData.otherPayments]);

    useEffect(() => {
        if (formData.Price && formData.frameSumm) {
            setSummPerHour(`${Math.round(formData.Price * 100 / (formData.frameSumm * 8)) / 100} ₽/час по длительности`);
        } else {
            setSummPerHour('В случае нулевой стоимости проект будет стартован как инвестиционный');
        }

    }, [formData.Price, formData.frameSumm]);

    useEffect(() => {
        if (isInitialLoad) return;
        if (formData.resourceSumm !== undefined || formData.HiredCost !== undefined) {
            
            const value = (formData?.resourceSumm * 8 * formData?.Department?.CostHour || 0) + (formData?.HiredCost || 0);
            console.log("isInitialLoad", isInitialLoad, value)
            setFormData(prevData => {
                if (prevData?.Cost !== undefined && prevData.Cost !== value) {
                    console.log(prevData)
                    setTotalCost(calculateTotalCost({ ...prevData, Cost: value }))
                    return { ...prevData, jobCalculated: false, priceAproved: false, Cost: value };
                }
                return prevData;
            });
        }
    }, [formData?.Department?.CostHour, formData?.HiredCost, formData?.resourceSumm, isInitialLoad]);

    useEffect(() => {
        if (![STATUS.NEW_CARD, STATUS.LABOR_COSTS_ESTIMATED, STATUS.ECONOMICS_AGREED].includes(formData.status)) return;
        let newStatus = STATUS.NEW_CARD;
        if (formData.jobCalculated && !formData.priceAproved) {
            newStatus = STATUS.LABOR_COSTS_ESTIMATED;
        } else if (formData.jobCalculated && formData.priceAproved) {
            newStatus = STATUS.ECONOMICS_AGREED;
        }
        if (formData.Project_created) newStatus = STATUS.PROJECT_STARTED

        setFormData(prevData => {
            if (prevData.status !== newStatus && prevData.status !== STATUS.PROJECT_CANCELED) {
                return { ...prevData, status: newStatus };
            }
            return prevData;
        });
    }, [formData.Project_created, formData.jobCalculated, formData.priceAproved, formData.status]);

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

    // const handleCancel = () => {
    //     //setFormData(row);
    //     onClose();
    // };

    const triggerSnackbar = (message, severity, options = {}) => {
        setSnackbarState({ open: true, message, severity, ...options });
    };

    const triggerShakeAnimation = () => {
        if (switchRef.current) {
            switchRef.current.classList.add('shake'); 
            setTimeout(() => {
                try {
                    switchRef.current.classList.remove('shake'); // Убираем класс через 500мс
                } catch (error) {
                }
            }, 5000);
        }
    };

    const handleAutofillToggle = async (e) => {
        setCustomerContactOptions([]);
        setAutofill(e.target.checked);
        if (!e.target.checked) {
            try {
                const response = await fetchCustomer1C(formData?.initiator?.RefKey_1C || currentUser?.RefKey_1C);
                const mappedCustomers = response.map(item => ({
                    name: item.Description,
                    id: item.Ref_Key,
                    fullName: item['НаименованиеПолное'],
                    CRMID: item.Code,
                    options: item.Description,
                }));
                setCustomerOptions(mappedCustomers);
                const selectedCustomer = mappedCustomers.find(
                    option => option.name === formData?.Customer
                );
                setCustomer(selectedCustomer);
            } catch (error) {
                console.error('Ошибка при загрузке данных из 1с:', error);
                setAutofill(true);
                triggerSnackbar("Ошибка при загрузке данных из 1С. Автозаполнение включено.", "error");
            }
        }

    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ([FORM_FIELDS.COMMENT_JOB, FORM_FIELDS.HIRED_COST, FORM_FIELDS.HIRED, FORM_FIELDS.OPEN_PROJECT_TEMPLATE_ID, FORM_FIELDS.LIMITATIONS].indexOf(name) > -1 &&
            currentUser?.ProjectCardRole !== ROLES.ADMIN &&
            currentUser?.ProjectCardRole !== ROLES.TECHNICAL)
        {
            triggerSnackbar(WARNING_MESSAGES.ONLY_EXECUTORS, "warning")
            return
        }
        let newValue = value;
        // для чисел
        if (['Hired','HiredCost','tiketsCost', 'HotelCost', 'dailyCost', 'otherPayments', 'Price'].indexOf(name) > -1) {
            newValue = parseCurrency(value);
        }
        if (name ==='dateStart') {
            const today = new Date();
            const minDate = new Date();
            minDate.setDate(today.getDate() + 14);
            const selectedDateObj = new Date(value);
            if (selectedDateObj < minDate) {
                setStartDateHelperText(WARNING_MESSAGES.START_PROJECT_SOON);
            } else {
                setStartDateHelperText('');
            }
        }
        if (name === 'Price' && formData?.Price !== newValue) {
            setFormData({ ...formData, priceAproved: false, [name]: newValue })
        } else {setFormData({ ...formData, [name]: newValue })}
        
        if (name === 'HiredCost') {
            console.log("isInitialLoad",isInitialLoad)
            setIsInitialLoad(false);

        }

        if (name === 'OpenProject_Template_id' && newValue) {
            setErrors({...errors, OpenProject_Template_id: ''});
        }

        // if (['Cost', 'tiketsCost', 'dailyCost', 'HotelCost', 'otherPayments'].indexOf(name) > -1) {
        //     console.log(calculateTotalCost({ ...formData, [name]: newValue }),name, newValue )
        //     setTotalCost(calculateTotalCost({ ...formData, [name]: newValue }));
        // }

        // Проверка соответствия с шаблонами ограничения от исполнителей
        if (name === FORM_FIELDS.LIMITATIONS) {
            const newCheckedTemplates = limitation.filter((template) => value.includes(template.name.trim())).map((template) => template.name );
            setCheckedTemplates(newCheckedTemplates);
        }
        
    };

    const handleChangeCost = (e) => {
        const { name, value } = e.target;
        let newValue = parseCurrency(value);
        setFormData({ ...formData, [name]: newValue });
        setTotalCost(calculateTotalCost({ ...formData, [name]: newValue }));
        console.log(formData[name])

    };

    const handleChangeSwitch = (e) => {
        const { name, checked } = e.target;
        setFormData({ ...formData, [name]: checked });

        if (!formData.OpenProject_Template_id && name === 'jobCalculated' && checked) {
            setErrors({...errors, OpenProject_Template_id: 'Выберите шаблон проекта'});
            if (selectRef.current) {
                selectRef.current.focus();
                selectRef.current.scrollIntoView({ behavior: 'smooth' });
            }
            triggerShakeAnimation();
            setTimeout(() => {
                setFormData({ ...formData, jobCalculated: false });
            }, 500);
            return;
        }

        setErrors({...errors, OpenProject_Template_id: ''});
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
        if (currentUser?.ProjectCardRole !== ROLES.ADMIN &&
            currentUser?.ProjectCardRole !== ROLES.TECHNICAL) {
            triggerSnackbar(WARNING_MESSAGES.ONLY_EXECUTORS, "warning")
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
            const response = await fetchCustomerContact1C(value.id);
            setCustomerContactOptions(response.map(item => ({
                name: item.Description,
                id: item.Ref_Key,
                email: item['КонтактнаяИнформация']
                    .filter(contact => contact['Тип'] === 'АдресЭлектроннойПочты')
                    .map(contact => contact['АдресЭП'])
                    .join(';'), 
                jobTitle: item['ДолжностьПоВизитке'],
                tel: item.КонтактнаяИнформация
                    .filter(contact => contact['Тип'] === 'Телефон')
                    .map(contact => contact['Представление'])
                    .join(';')
            })))
        } catch (error) {
            console.error('Error fetching 1c customer сontact options:', error);
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
                first_name: newValue.first_name || '',
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
            const updateFilesArray = async (currentFiles, uploadedFiles, projectCardId) => {
                const maxDbId = await GetFilesStartId();
                const maxId = currentFiles.reduce((max, file) => Math.max(max, file.id, ), maxDbId);
                console.log(maxId, maxDbId, currentFiles, uploadedFiles,projectCardId);
                const newFiles = uploadedFiles.map((file, index) => ({
                    id: maxId + index + 1,
                    Project_Card_id: projectCardId,
                    directus_files_id: file.id
                }));
                console.log([...currentFiles, ...newFiles]);
                return [...currentFiles, ...newFiles];
            };
        try {
            const filesArray = Array.from(files);
            const uploadedFiles = await uploadFilesDirectus(filesArray);
            const newformData = { ...formData, Files: await updateFilesArray(formData.Files, uploadedFiles, formData.id) };
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
        if (currentUser?.ProjectCardRole !== ROLES.ADMIN &&
            currentUser?.ProjectCardRole !== ROLES.TECHNICAL) {
            triggerSnackbar(WARNING_MESSAGES.ONLY_EXECUTORS, "warning")
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
        setIsInitialLoad(false);
        setFormData({ ...formData, JobDescription: jobDescriptions, frameSumm: frame, resourceSumm: resource });
        return true
    };

    const handleJobOnTripChange = (data) => {
        if (currentUser?.ProjectCardRole !== ROLES.ADMIN &&
            currentUser?.ProjectCardRole !== ROLES.TECHNICAL) {
            triggerSnackbar(WARNING_MESSAGES.ONLY_EXECUTORS, "warning")
            return false
        }
        setFormData({ ...formData, JobOnTripTable: data });
        return true
    };
    const handleCreateProject = async () => {
        // Проверка обязательных полей
        const newFieldErrors = {};
        if (!formData.company) {
            newFieldErrors.company = 'Выберите компанию';
        }
        if (!formData.contract) {
            newFieldErrors.contract = 'Введите реквизиты договора';
        }

        // Если есть ошибки, обновляем состояние и прерываем создание проекта
        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            triggerSnackbar(
                `Для старта проекта заполните обязательные поля, если номера договора еще нет, то введите значение 'Будет позже'.
                Не забудьте внести актуальное значение когда номер будет известен.`,
                "error",
                { multiline: true }
            );
            return;
        }

        // Если ошибок нет, сбрасываем состояние ошибок
        setFieldErrors({});

        triggerSnackbar("Старт проекта", "info")
        setIsCreatingProject(true);
        try {
            const response = await CreateProject(formData);
            console.log('Проект успешно создан:', response)
            if (response) {
                const newdata = { ...formData, ...response, Project_created: true, status: STATUS.PROJECT_STARTED }
                setFormData(newdata);
                handleSave(newdata);
            } else {
                triggerSnackbar("Ошибка при создании проекта", "error")
            }
        } catch (error) {
            triggerSnackbar("Ошибка при создании проекта", "error")
        } finally {
            setIsCreatingProject(false);
        }
    }

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarState({ ...snackbarState, open: false });
    };

    const handleProjectCancelToggle = async () => {
        const newStatus = formData.status === STATUS.PROJECT_CANCELED 
            ? STATUS.NEW_CARD 
            : STATUS.PROJECT_CANCELED;
        const newFormData = { ...formData, status: newStatus };
        await handleSave(newFormData);
    };

    const isReadOnly = formData.status === STATUS.PROJECT_CANCELED;

    return (
        <Modal 
            open={true} 
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') {
                    onClose();
                }
            }}
            disableEscapeKeyDown
        >
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
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="form tabs" sx={{ flexShrink: 0 }} >
                            <Tab label="Общая информация" />
                            <Tab label="Объем работ" />
                            <Tab label="Коммерческая часть" />
                        </Tabs>
                        <Card
                            variant="solid"
                            color="primary"
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                            <Chip
                                label={formData.status}
                                sx={{ bgcolor: getStatusColor(formData.status), color: 'white' }}
                            />
                            {(formData?.Project_created && formData?.projectRedirect) && (
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                    <Link
                                        href={formData?.projectRedirect || '#'} 
                                        underline="always"
                                        variant="plain"
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                        }}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Ссылка на проект
                                    </Link>
                                </Typography>
                            )}
                        </Card>
                    </Box>
                    <Box sx={{
                        maxHeight: 'calc(90vh - 128px)',
                        overflowY: 'auto'
                    }}>
                        <TabPanel value={tabIndex} index={0}>
                            <Grid container spacing={1}>
                                <Grid item xs={12} md={3}>
                                    <Autocomplete
                                        options={InitiatorOptions}
                                        getOptionLabel={(option) => `${option?.first_name || ''} ${option?.last_name || ''}`}
                                        value={selectedInitiator}
                                        onChange={handleInitiatorChange}
                                        disabled={isReadOnly}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Инициатор"
                                                margin="dense"
                                                disabled={isReadOnly}
                                                error={Boolean(errors.initiator)}
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
                                        value={formData.title ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.title ? true : undefined
                                        }}
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
                                                onChange={handleAutofillToggle}
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
                                            value={formData.Customer ?? ''}
                                            onChange={handleChange}
                                            fullWidth
                                            margin="dense"
                                            disabled={isReadOnly}
                                            InputLabelProps={{
                                                shrink: formData.Customer ? true : undefined
                                            }}
                                        />
                                    ) : (
                                        <Autocomplete
                                            options={customerOptions}
                                            getOptionLabel={(option) => option.name}
                                            value={customer}
                                            onChange={handleCustomerChange}
                                            disabled={isReadOnly}
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
                                        value={formData.CustomerCRMID ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.CustomerCRMID ? true : undefined
                                        }}
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
                                            value = {formData.CustomerContact ?? ''}
                                            onChange={handleChange}
                                            fullWidth
                                            margin="dense"
                                            disabled={isReadOnly}
                                            InputLabelProps={{
                                                shrink: formData.CustomerContact ? true : undefined
                                            }}
                                        />  )}
                               

                                </Grid>
                                <Grid item xs={12} md={4}>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Должность"
                                        name="CustomerContactJobTitle"
                                        value={formData.CustomerContactJobTitle ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.CustomerContactJobTitle ? true : undefined
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Email"
                                        name="CustomerContactEmail"
                                        value={formData.CustomerContactEmail ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.CustomerContactEmail ? true : undefined
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Телефон"
                                        name="CustomerContactTel"
                                        value={formData.CustomerContactTel ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.CustomerContactTel ? true : undefined
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        Данные о проекте
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth margin="dense" disabled={isReadOnly}>
                                        <InputLabel id="Department-label">Отдел исполнителей</InputLabel>
                                        <Select
                                            labelId="Department-label"
                                            id="Department"
                                            name="Department"
                                            value={formData.Department?.id || ''}
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
                                        disabled={isReadOnly}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Особые пожелания заказчика или инициатора"
                                        name="ProjectScope"
                                        value={formData.ProjectScope ?? ''}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        margin="dense"
                                        disabled={isReadOnly}
                                        InputLabelProps={{
                                            shrink: formData.ProjectScope ? true : undefined
                                        }}
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
                                            isReadOnly={isReadOnly}
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
                                        aiJobDescriptions={aiJobDescriptions}
                                        projectCardRole={currentUser?.ProjectCardRole || ''}
                                        handleJobChange={handleJobChange}
                                        handleAiJobChange={(newAiDescriptions) => {
                                            setAiJobDescriptions(newAiDescriptions);
                                            setFormData(prev => ({
                                                ...prev,
                                                aiJobDescriptions: newAiDescriptions
                                            }));
                                            return true;
                                        }}
                                        disabled={isReadOnly}
                                        price={formData?.Price}
                                        cost={formData?.Cost}
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
                                        disabled={isReadOnly}
                                    />
                                </Grid>
                                <Grid container item xs={12} md={6} justifyContent="flex-end" alignItems="center">
                                    <FormControlLabel 
                                        ref={switchRef}
                                        control={
                                            <RedSwitch
                                                checked={formData.jobCalculated || false}
                                                name="jobCalculated"
                                                onChange={handleChangeSwitch}
                                                color="primary"
                                                error={errors.OpenProject_Template_id ? 'true' : 'false'}
                                                disabled={currentUser?.ProjectCardRole !== ROLES.ADMIN && currentUser?.ProjectCardRole !== ROLES.TECHNICAL }
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
                                        disabled={isReadOnly}
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
                                        disabled={isReadOnly}
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
                                        disabled={isReadOnly}
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
                                        disabled={isReadOnly}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TableJobOnTrip
                                        data={formData.JobOnTripTable || []}
                                        projectCardRole={currentUser?.ProjectCardRole || ''}
                                        handleChange={handleJobOnTripChange}
                                        disabled={isReadOnly}
                                    />
                                </Grid>
                                <Grid item xs={6} md={4}>
                                    <FormControl fullWidth margin="dense" error={Boolean(errors?.OpenProject_Template_id)}>
                                        <InputLabel id="OpenProject-template">Шаблон проекта</InputLabel>
                                        <Select
                                            labelId="OpenProject-template-label"
                                            id="OpenProject-template"
                                            name="OpenProject_Template_id"
                                            value={projectTemplateOptions.some(item => item.value === formData.OpenProject_Template_id) 
                                                ? formData.OpenProject_Template_id 
                                                : ''}
                                            label="Шаблон проекта"
                                            onChange={handleChange}
                                            ref={selectRef}
                                        >
                                            {projectTemplateOptions.length > 0 ? (
                                                projectTemplateOptions.map(item => (
                                                    <MenuItem key={item.value} value={item.value}>
                                                        {item.name}
                                                    </MenuItem>
                                                ))
                                            ) : (
                                                <MenuItem key={999} value="">Нет доступных шаблонов</MenuItem>
                                            )}
                                        </Select>
                                        {errors.OpenProject_Template_id && 
                                            <FormHelperText>
                                                {errors.OpenProject_Template_id}
                                            </FormHelperText>}
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
                                        disabled={isReadOnly}
                                        ref={textFieldRef}
                                    />
                                    <Popper
                                        open={Boolean(anchorEl)}
                                        anchorEl={textFieldRef.current}
                                        placement="top-start"
                                        style={{ zIndex: 1300 }} 
         
                                    >
                                        <ClickAwayListener onClickAway={handleFocusOut}>
                                            <List style={{ 
                                                    backgroundColor: 'white', 
                                                    border: '1px solid #ccc', 
                                                    padding: '8px', 
                                                    width: textFieldRef.current?.offsetWidth || 300,
                                                    maxHeight: '400px',
                                                    overflowY: 'auto',
                                                }}>
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
                            <Grid container spacing={2} alignItems="flex-start" >
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        label="Цена"
                                        name="Price"
                                        value={formatCurrency(formData.Price)}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        aria-describedby="Sum-helper-text"
                                        disabled={isReadOnly}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                        }}
                                    />
                                    <FormHelperText id="Sum-helper-text">
                                        {SummPerHour}
                                    </FormHelperText>
                                </Grid>
                                <Grid item xs={6} md={3} container alignItems="center">
                                    <Box height="56px" display="flex" alignItems="center" mt={2}>
                                        {(currentUser?.ProjectCardRole === ROLES.ADMIN ||
                                        currentUser?.ProjectCardRole === ROLES.COMMERCIAL ||
                                        formData?.initiator?.Head === currentUser?.id) ? (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={formData.priceAproved || false}
                                                        name="priceAproved"
                                                        onChange={handleChangeSwitch}
                                                    />
                                                }
                                                label={
                                                    <Typography 
                                                        variant="body1" 
                                                        sx={{
                                                            color: formData.priceAproved ? 'green' : 'red',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {formData.priceAproved ? 'Цена согласована' : 'Цена не согласована'}
                                                    </Typography>
                                                }
                                                labelPlacement="end" 
                                            />
                                        ) : (
                                            <Typography 
                                                variant="body1" 
                                                sx={{
                                                    color: formData.priceAproved ? 'green' : 'red',
                                                    fontWeight: 'bold',

                                                }}
                                            >
                                                {formData.priceAproved ? 'Цена согласована' : 'Цена не согласована'}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        label="Себестоимость"
                                        name="Cost"
                                        value={formatCurrency(formData.Cost)}
                                        onChange={handleChangeCost}
                                        fullWidth
                                        margin="dense"
                                        aria-describedby="Sum-helper-text"
                                        disabled={isReadOnly}
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
                                        value={formatCurrency(totalCost)}
                                        fullWidth
                                        margin="dense"
                                        aria-describedby="Sum-helper-text"
                                        disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                                disabled={isReadOnly}
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
                                <FormControl fullWidth margin="dense" error={Boolean(fieldErrors.company)}>
                                        <InputLabel id="company-label">Компания</InputLabel>
                                        <Select
                                            labelId="company-label"
                                            id="company"
                                            name="company"
                                            value={formData.company}
                                            label="Компания"
                                            onChange={handleChange}
                                        >
                                            <MenuItem value={COMPANIES.ASTERIT}>{COMPANIES.ASTERIT}</MenuItem>
                                            <MenuItem value={COMPANIES.PROFINTEG}>{COMPANIES.PROFINTEG}</MenuItem>
                                        </Select>
                                        {fieldErrors.company && <FormHelperText>{fieldErrors.company}</FormHelperText>}
                                    </FormControl>
                                    {(currentUser?.email === EMAILS.ADMIN) && (
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
                                        disabled={isReadOnly}
                                        error={Boolean(fieldErrors.contract)}
                                        helperText={fieldErrors.contract}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <TextField
                                        label="Дата начала"
                                        name="dateStart"
                                        type="date"
                                        value={formData.dateStart ||''}
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
                                        value={formData.deadline || ''}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="dense"
                                        helperText="Заполнять только в случае жестких ограничений срока проведения работ"
                                        InputLabelProps={{
                                            shrink: true,
                                        }}
                                    />
                                </Grid>
                                {(formData.status === STATUS.ECONOMICS_AGREED) && (
                                    <Box mb={2} width="100%" display="flex" justifyContent="flex-end" gap={2} alignItems="center">
                                        <Typography variant="body2" color="textSecondary">
                                            Убедитесь, что все данные верны перед созданием проекта
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            sx={{
                                                bgcolor: 'green',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'darkgreen',
                                                },
                                                '&:disabled': {
                                                    bgcolor: 'rgba(0, 128, 0, 0.5)',
                                                },
                                                px: 3,
                                                py: 1,
                                            }}
                                            onClick={handleCreateProject}
                                            disabled={isCreatingProject}
                                        >
                                            {isCreatingProject ? (
                                                <CircularProgress size={24} color="inherit" />
                                            ) : (
                                                'Создать проект'
                                            )}
                                        </Button>
                                    </Box>
                                )}
                            </Grid>
                        </TabPanel>
                    </Box>
                        <Box mt={2} display="flex" flexDirection="column" alignItems="flex-end">
                            <Divider sx={{ width: '100%', mb: 2 }} />
                            <Box display="flex" justifyContent="flex-end" alignItems="center">
                                {(formData.status !== STATUS.PROJECT_STARTED && formData.status !== STATUS.PROJECT_ENDED) && (
                                    <Button 
                                        variant={formData.status === STATUS.PROJECT_CANCELED ? "contained" : "outlined"}
                                        color="primary" 
                                        onClick={handleProjectCancelToggle}
                                        sx={{ mr: 15 }} 
                                    >
                                        {formData.status === STATUS.PROJECT_CANCELED 
                                            ? "Возобновить проект" 
                                            : "Отменить проект"}
                                    </Button>
                                )}
                                <Button 
                                    variant="outlined" 
                                    onClick={onClose} 
                                    sx={{ mr: 2 }}
                                >
                                    Отмена
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={handleSave}
                                    disabled={isReadOnly}
                                >
                                    Сохранить
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                <Snackbar
                    open={snackbarState.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert 
                        onClose={handleCloseSnackbar} 
                        severity={snackbarState.severity} 
                        sx={{ 
                            width: '100%',
                            ...(snackbarState.multiline && {
                                '& .MuiAlert-message': {
                                    whiteSpace: 'pre-wrap',
                                },
                            }),
                        }}
                    >
                        {snackbarState.message}
                    </Alert>
                </Snackbar>
            </div>  
        </Modal>
    );
};

export default ModalForm;