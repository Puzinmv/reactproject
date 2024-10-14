import React, { useState, useEffect } from 'react';
import {
    Modal, Box, TextField, Button, Typography, Autocomplete, InputLabel,
    Select, MenuItem, FormControl, FormHelperText, Grid, FormControlLabel,
    Switch
} from '@mui/material';
import {
    fetchUser, uploadFilesDirectus, CreateItemDirectus, UpdateData,
    fetchCustomer, fetchCustomerContact
} from '../services/directus';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';
import { fetchCustomer1C, fetchCustomerContact1C } from '../services/1c';



const CreateForm = ({ row, departament, currentUser, onClose, onDataSaved }) => {

    const [formData, setFormData] = useState(row);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [customerOptions1C, setCustomerOptions1C] = useState([]);
    const [customerContactOptions, setCustomerContactOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [autofill, setAutofill] = useState(false);
    const [autofill1С, setAutofill1С] = useState(true);
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        const fetchCustomerOptions = async () => {
            try {
                const response = await fetchCustomer(formData.initiator.first_name);
                setCustomerOptions(response.map(item => ({
                    name: item.shortName,
                    id: item.id,
                    fullName: item.fullName,
                    CRMID: item.CRMID,
                    options: item.shortName,
                })))
            } catch (error) {
                console.error('Error fetching customer options:', error);
            }
        };
        const fetchCustomerOptions1C = async () => {
            try {
                const response = await fetchCustomer1C(formData.initiator.RefKey_1C || currentUser.RefKey_1C);
                console.log(response)
                setCustomerOptions1C(response.map(item => ({
                    name: item.Description,
                    id: item.Ref_Key,
                    fullName: item['НаименованиеПолное'],
                    CRMID: item.Code,
                    options: item.Description,
                })))
            } catch (error) {
                console.error('Error fetching customer 1c options:', error);
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
        fetchCustomerOptions()
        fetchCustomerOptions1C()
    }, [currentUser.RefKey_1C, formData.initiator.RefKey_1C, formData.initiator.first_name]);


    const validateFields = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = 'Название проекта не должно быть пустым';
        if (!formData.initiator) newErrors.initiator = 'Инициатор не должен быть пустым';
        if (!formData.Customer) newErrors.Customer = 'Заполните поле Заказчик';
        if (!formData.Department?.id) newErrors.Department = 'выберите отдел исполнителей';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateFields()) {
            return;
        }
        try {
            const files = Array.from(formData.Files.map((file)=>file.file));
            const item = await CreateItemDirectus({ ...formData, Files: [] });
            if (files.length > 0) {
                const uploadedFiles = await uploadFilesDirectus(files);
                const newFiles = uploadedFiles.map((file, index) => ({
                    id: index+1,
                    Project_Card_id: item.id,
                    directus_files_id: file.id
                }));
                await UpdateData({ ...item, Files: newFiles });
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

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
    const handleCustomerChange1c = async (event, value) => {
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
                first_name: newValue.first_name,
                last_name: newValue.last_name || '',
            }
        });
    };

    const handleDepartmentChange = (event) => {
        const value = event.target.value
        if (value) { 
            const department = departament.find(dep => dep.id === value) || {};
            setFormData({ ...formData, Department: department });
        }
    };

    const handleDescriptionChange = (editor, fieldName) => {
        const data = editor.getData();
        setFormData({ ...formData, [fieldName]: data });
    };

    const selectedInitiator = formData.initiator
        ? InitiatorOptions.find((option) => option.id === formData.initiator.id) || ''
        : '';

    const handleFileUpload = async (files) => {
            const updateFilesArray = (currentFiles, uploadedFiles) => {
                const maxId = currentFiles.reduce((max, file) => Math.max(max, file.id), 0);
                const newFiles = uploadedFiles.map((file, index) => ({
                    id: maxId + index + 1,
                    filename_download: file.name,
                    file: file,
                }));
                return [...currentFiles, ...newFiles];
        };
        const filesArray = Array.from(files);
        setFormData({ ...formData, Files: updateFilesArray(formData.Files, filesArray) })
    };

    const handleFileDelete = async (fileId) => {
        const files = formData.Files.filter((file) => file.id !== fileId)
        setFormData({ ...formData, Files: files });
    };


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
            <Box sx={{
                width: 'calc(100% - 13rem)',
                bgcolor: 'background.paper',
                p: 3,
                mx: 'auto',
                mt: 4,
                fontFamily: 'Roboto, sans-serif',
                ml: '5rem',
                mr: '5rem',
                maxHeight: '90vh',
            }}>
                <Box sx={{
                    maxHeight: 'calc(90vh - 64px)',
                    overflowY: 'auto',
                    paddingRight: '16px', 
                    boxSizing: 'border-box',
                }}>
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
                                error={!!errors.title}
                                helperText={errors.title}
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
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autofill1С || false}
                                            name="autofill1С"
                                            onChange={(e) => {
                                                setCustomerContactOptions([])
                                                setAutofill1С(e.target.checked)
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body1" color="textPrimary">
                                            данные из 1С (экспериментально)
                                        </Typography>
                                    }
                                    labelPlacement="end"
                                />
                            </Grid>
                        <Grid item xs={12} md={8}>
                            {autofill1С ? (
                                <Autocomplete
                                    options={customerOptions1C}
                                    getOptionLabel={(option) => option.name}
                                    value={customer}
                                    onChange={handleCustomerChange1c}
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
                            ) : (
                                    <>
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
                                    </>
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
                            ) : (
                                <TextField
                                    label="Контакт заказчика ФИО"
                                    name="CustomerContact"
                                    value={formData.CustomerContact}
                                    onChange={handleChange}
                                    fullWidth
                                    margin="dense"
                                />)}


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
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth margin="dense" error={!!errors.Department}>
                                <InputLabel id="Department-label">Исполнитель</InputLabel>
                                <Select
                                    labelId="Department-label"
                                    id="Department"
                                    name="Department"
                                    value={formData.Department ? formData.Department.id : ''}
                                    label="Исполнитель"
                                    onChange={handleDepartmentChange}
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
                                label="Ограничения от инициатора"
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
                                files={formData.Files}
                                onUpload={handleFileUpload}
                                onDelete={handleFileDelete}
                            />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
                <Box mt={1} display="flex" justifyContent="flex-end" alignItems="center">
                    <Button variant="contained" color="secondary" onClick={handleCancel} sx={{ mr: 1 }}>
                        Отмена
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleSave} sx={{ mr: 1 }}>
                        Сохранить
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default CreateForm;