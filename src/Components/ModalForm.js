import React, { useState, useEffect } from 'react';
import { Modal, Box, Tabs, Tab, TextField, Button, Typography, Autocomplete, OutlinedInput } from '@mui/material';
import axios from 'axios';
import { fetchUser, UpdateData } from '../services/directus';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
//import CustomEditor from './CDEditor';

const TabPanel = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box p={3}>{children}</Box>}
        </div>
    );
};

const ModalForm = ({ row, onClose, token, collection, onDataSaved }) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
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
        if (!formData.initiator) newErrors.title = 'Поле не должно быть пустым';
        // Add more validation 
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!validateFields()) {
            return; // Prevent saving if validation fails
        }
        // сохранение данных
        const UpdateDataPromice = async () => {
            console.log(formData, token, collection);
            try {
                await UpdateData(formData, token, collection);
            } catch (error) {
                console.error('Error fetching user options:', error);
            }
        };
        UpdateDataPromice().then(() => {
            onDataSaved();
            setIsEditing(false);
            onClose(); 
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(row); // Сброс данных до исходных
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCustomerChange = (event, newValue) => {
        setFormData({ ...formData, Customer: newValue ? newValue.name : '' });
    };

    const handleInitiatorChange = (event, newValue) => {
        console.log(newValue);
        if (newValue) setFormData({
            ...formData, initiator: {
                id: newValue.id,
                first_name: newValue.first_name,
                last_name: newValue.last_name,
            }
        });
    };
    const handleDescriptionChange = (event, editor) => {
        const data = editor.getData();
        setFormData({ ...formData, Description: data });
    };

    const selectedInitiator = formData.initiator
        ? InitiatorOptions.find((option) => option.id === formData.initiator.id) || null
        : null;
    console.log(formData);

    return (
        <Modal open={true} onClose={onClose}>
            <Box sx={{ width: 500, bgcolor: 'background.paper', p: 4, mx: 'auto', mt: 4, fontFamily: 'Roboto, sans-serif' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="form tabs">
                    <Tab label="Основное" />
                    <Tab label="Детали" />
                    <Tab label="Финансы" />
                </Tabs>
                <TabPanel value={tabIndex} index={0}>
                    <Autocomplete
                        options={InitiatorOptions}
                        getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                        value={selectedInitiator}
                        onChange={handleInitiatorChange}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Инициатор"
                                margin="normal"
                                InputProps={{
                                    ...params.InputProps,
                                    readOnly: !isEditing,
                                }}
                                error={!!errors.title}
                                helperText={errors.title}
                            />
                        )}
                        fullWidth
                        disableClearable={!isEditing}
                        readOnly={!isEditing}
                    />
                    <TextField
                        label="Название проекта"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputProps={{
                            readOnly: !isEditing,
                        }}
                    />
                    {!isEditing ? (
                        <OutlinedInput
                            id="description"
                            type="text"
                            value={formData.Description.replace(/(<([^>]+)>)/gi, "")} // Убирает HTML-теги для отображения только текста
                            readOnly
                            multiline
                            rows={4}
                            //endAdornment={
                            //    <div dangerouslySetInnerHTML={{ __html: formData.Description }} style={{ padding: '14px 12px', fontFamily: 'inherit' }} />
                            //}
                            label="Описание проекта"
                        />
                    ) : (
                        <CKEditor
                            editor={ClassicEditor}
                            data={formData.Description || ''}
                            onChange={handleDescriptionChange}
                        />
                    )}

                    <Autocomplete
                        options={customerOptions}
                        getOptionLabel={(option) => option.name}
                        value={customerOptions.find((option) => option.name === formData.Customer) || null}
                        onChange={handleCustomerChange}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Заказчик"
                                margin="normal"
                                InputProps={{
                                    ...params.InputProps,
                                    readOnly: !isEditing,
                                }}
                            />
                        )}
                        fullWidth
                        disableClearable={!isEditing}
                        readOnly={!isEditing}
                    />
                </TabPanel>
                <TabPanel value={tabIndex} index={1}>
                    <TextField
                        label="Job Description"
                        name="JobDescription"
                        value={(formData.JobDescription || []).map(job => `${job.JobName}, Days: ${job.ResourceDay}, Frame: ${job.FrameDay}`).join('; ')}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputProps={{
                            readOnly: !isEditing,
                        }}
                    />
                    <TextField
                        label="Limitations"
                        name="Limitations"
                        value={formData.Limitations}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputProps={{
                            readOnly: !isEditing,
                        }}
                    />
                </TabPanel>
                <TabPanel value={tabIndex} index={2}>
                    <TextField
                        label="Price"
                        name="Price"
                        value={formData.Price || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputProps={{
                            readOnly: !isEditing,
                        }}
                    />
                    <TextField
                        label="Cost"
                        name="Cost"
                        value={formData.Cost || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputProps={{
                            readOnly: !isEditing,
                        }}
                    />
                </TabPanel>
                <Box mt={2}>
                    {!isEditing ? (
                        <Button variant="contained" color="primary" onClick={handleEdit}>
                            Изменить
                        </Button>
                    ) : (
                        <>
                            <Button variant="contained" color="primary" onClick={handleSave} sx={{ mr: 2 }}>
                                Сохранить
                            </Button>
                            <Button variant="contained" color="secondary" onClick={handleCancel}>
                                Отмена
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </Modal>
    );
};

export default ModalForm;
