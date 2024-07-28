import React, { useState, useEffect } from 'react';
import {
    Modal, Box, TextField, Button, Typography, Autocomplete, InputLabel,
    Select, MenuItem, FormControl, FormHelperText, Grid
} from '@mui/material';
import axios from 'axios';
import { fetchUser, GetfilesInfo, uploadFilesDirectus, deleteFileDirectus, CreateItemDirectus } from '../services/directus';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import FileUpload from './FileUpload';


const CreateForm = ({ row, departament, onClose, token, onDataSaved }) => {

    const [formData, setFormData] = useState(row);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [InitiatorOptions, setInitiatorOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [fileInfo, setfileInfo] = useState([]);

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

    const validateFields = () => {
        const newErrors = {};
        if (!formData.initiator) newErrors.initiator = 'Поле не должно быть пустым';
        if (!formData.Department) newErrors.Department = 'Выберите отдел';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateFields()) {
            return;
        }
        try {
            console.log('createNewitem',formData)
            await CreateItemDirectus(formData, token);
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

    const handleDepartmentChange = (event, value) => {
        if (value.props.value) setFormData({ ...formData, Department: departament[value.props.value-1] });
    };

    const handleDescriptionChange = (editor, fieldName) => {
        const data = editor.getData();
        setFormData({ ...formData, [fieldName]: data });
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
        console.log('добавление файлов', files)
        //try {
        //    const filesArray = Array.from(files);
        //    const uploadedFiles = await uploadFilesDirectus(filesArray, token);
        //    const newformData = { ...formData, Files: updateFilesArray(formData.Files, uploadedFiles, formData.id) };
        //    await UpdateData(newformData, token);
        //    setFormData(newformData);
        //    GetfilesInfo(newformData.Files).then((fileInfo) => {
        //        setfileInfo(fileInfo)
        //    }).catch((error) => {
        //        console.error('Ошибка при загрузке информаци о файлах:', error);
        //    });
        //} catch (error) {
        //    console.error('Ошибка при загрузке файлов:', error);
        //}
    };

    const handleFileDelete = async (fileId, token) => {
        const updateFilesArray = (currentFiles, deletedFileId) => {
            return currentFiles.filter(file => file.directus_files_id !== deletedFileId);
        };

        console.log('удаление файла', fileId)
        //try {
        //    await deleteFileDirectus(fileId);
        //    const newformData = { ...formData, Files: updateFilesArray(formData.Files, fileId) };
        //    await UpdateData(newformData, token);
        //    setFormData(newformData);
        //    GetfilesInfo(newformData.Files).then((fileInfo) => {
        //        setfileInfo(fileInfo)
        //    }).catch((error) => {
        //        console.error('Ошибка при загрузке информаци о файлах', error);
        //    });
        //} catch (error) {
        //    console.error('Ошибка при удалении файла:', error);
        //}
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
                                    <MenuItem key={item.id} value={item.id}>
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