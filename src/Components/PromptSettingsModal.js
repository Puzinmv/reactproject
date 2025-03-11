import React, { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField,
    Typography,
    Box
} from '@mui/material';
import { updateSystemPrompt, updateUserPromptWrapper } from '../services/directus';

function PromptSettingsModal({ open, onClose, currentSystemPrompt, currentUserWrapper, onUpdate }) {
    const [systemPrompt, setSystemPrompt] = useState('');
    const [userWrapper, setUserWrapper] = useState('');

    useEffect(() => {
        setSystemPrompt(currentSystemPrompt || '');
        setUserWrapper(currentUserWrapper || '');
    }, [currentSystemPrompt, currentUserWrapper, open]);

    const handleSave = async () => {
        try {
            await Promise.all([
                updateSystemPrompt(systemPrompt),
                updateUserPromptWrapper(userWrapper)
            ]);
            onUpdate(systemPrompt, userWrapper);
            onClose();
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>Настройки промптов</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Системный промпт
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Введите системный промпт..."
                        variant="outlined"
                        sx={{ mb: 3 }}
                    />

                    <Typography variant="subtitle2" gutterBottom>
                        Обертка пользовательского промпта
                    </Typography>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Используйте {'{prompt}'} для обозначения места вставки сообщения пользователя
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={userWrapper}
                        onChange={(e) => setUserWrapper(e.target.value)}
                        placeholder="Пример: Ответь на следующий вопрос: {prompt}"
                        variant="outlined"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button onClick={handleSave} variant="contained">
                    Сохранить
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default PromptSettingsModal; 