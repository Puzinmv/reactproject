import { Box, TextField, Typography, Autocomplete, InputLabel, Select, MenuItem, FormControl, FormHelperText } from '@mui/material';
import Grid from '@mui/material/Grid';

const FirstTabContent = ({ departament, InitiatorOptions, selectedInitiator, handleInitiatorChange }) => {


    return (
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
        </Grid>)
};

export default FirstTabContent;