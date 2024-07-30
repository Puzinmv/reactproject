import React, { useState, useEffect } from 'react';
import {
    Modal, Box, TextField, Button, Typography, Autocomplete, InputLabel,
    Select, MenuItem, FormControl, FormHelperText, Grid
} from '@mui/material';
import axios from 'axios';
import { fetchUser, uploadFilesDirectus, CreateItemDirectus, UpdateData } from '../services/directus';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';


const CreateForm = ({ row, departament, onClose, token, onDataSaved }) => {

    const [formData, setFormData] = useState(row);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [errors, setErrors] = useState({});

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
    }, [token]);


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
            console.log('createNewitem', formData)
            const files = Array.from(formData.Files.map((file)=>file.file));
            const item = await CreateItemDirectus({ ...formData, Files: [] }, token);
            console.log(item)
            if (files.length > 0) {
                const uploadedFiles = await uploadFilesDirectus(files, token);
                const newFiles = uploadedFiles.map((file, index) => ({
                    id: index+1,
                    Project_Card_id: item.id,
                    directus_files_id: file.id
                }));
                console.log({ ...item, Files: newFiles });
                await UpdateData({ ...item, Files: newFiles }, token);
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
        let newValue = value;
        setFormData({ ...formData, [name]: newValue });
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
                            error={!!errors.title}
                            helperText={errors.title}
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
                                    error={!!errors.Customer}
                                    helperText={errors.Customer}
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

export default CreateForm;