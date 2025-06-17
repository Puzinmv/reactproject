import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Typography, TextField, Button, Paper, CircularProgress, IconButton, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchUserChats, createNewChat, fetchChatMessages, saveMessage, updateChatTitle, deleteChat, fetchSystemPrompt, fetchUserPromptWrapper } from '../services/directus';
import { sendMessageToAI, getAvailableModels } from '../services/openrouter';
import { sendMessageToDeepSeek } from '../services/deepseek';
import AIChatMessage from '../Components/AIChatMessage';
import AIChatSidebar from '../Components/AIChatSidebar';
import AuthWrapper from '../Components/AuthWrapper';
import PromptSettingsModal from '../Components/PromptSettingsModal';

function AIChat() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const messagesEndRef = useRef(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [aiModels, setAiModels] = useState([
        {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            description: 'Платная модель',
            context: '32K токенов',
            provider: 'deepseek'
        }
    ]);
    const [selectedModel, setSelectedModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState(null);
    const [userPromptWrapper, setUserPromptWrapper] = useState(null);
    const [isPromptSettingsOpen, setIsPromptSettingsOpen] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const models = await getAvailableModels();
                const freeModels = models.filter(model => 
                    model.pricing.prompt === "0" && 
                    model.pricing.completion === "0" && 
                    model.pricing.request === "0"
                );
                
                const formattedModels = freeModels.map(model => ({
                    id: model.id,
                    name: model.name,
                    description: model.description,
                    context: `${model.context_length} токенов`,
                    provider: model.id.split('/')[0]
                }));

                // Добавляем бесплатные модели к уже существующей платной модели
                setAiModels(prevModels => [...prevModels, ...formattedModels]);
                
                // Получаем сохраненную модель из localStorage
                const savedModel = localStorage.getItem('selectedAIModel');
                
                // Если есть сохраненная модель и она доступна в списке, используем её
                if (savedModel && formattedModels.some(m => m.id === savedModel)) {
                    setSelectedModel(savedModel);
                } else {
                    // Иначе устанавливаем Deepseek R1 или первую доступную модель
                    const defaultModel = formattedModels.find(m => m.id.includes('deepseek-r1')) || formattedModels[0];
                    if (defaultModel) {
                        setSelectedModel(defaultModel.id);
                        localStorage.setItem('selectedAIModel', defaultModel.id);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке моделей:', error);
            }
        };

        loadModels();
    }, []);

    const handleModelChange = (modelId) => {
        setSelectedModel(modelId);
        localStorage.setItem('selectedAIModel', modelId);
    };

    const handleNewChat = useCallback(async () => {
        try {
            const newChat = await createNewChat();
            navigate(`/AI/${newChat.id}`);
            setChats(prevChats => [newChat, ...prevChats]);

            if (systemPrompt) {
                console.log('Добавление системного промпта:', systemPrompt);
                const systemMessage = await saveMessage(
                    newChat.id,
                    systemPrompt,
                    'system'
                );
                setMessages([systemMessage]);
            }
        } catch (error) {
            console.error('Ошибка при создании нового чата:', error);
        }
    }, [navigate, systemPrompt]);

    const loadData = useCallback(async () => {
        try {
            // Сначала загружаем промпты
            const [newSystemPrompt, newWrapper] = await Promise.all([
                fetchSystemPrompt(selectedModel),
                fetchUserPromptWrapper(selectedModel)
            ]);
            console.log('Загружены промпты:', { 
                systemPrompt: newSystemPrompt, 
                userWrapper: newWrapper 
            });
            setSystemPrompt(newSystemPrompt);
            setUserPromptWrapper(newWrapper);

            // Затем загружаем чаты
            const userChats = await fetchUserChats();
            setChats(userChats);
            
            if (!chatId) {
                if (userChats.length > 0) {
                    navigate(`/AI/${userChats[0].id}`);
                    setCurrentChat(userChats[0]);
                } else {
                    // Создаем новый чат с системным промптом
                    const newChat = await createNewChat();
                    navigate(`/AI/${newChat.id}`);
                    setChats([newChat]);
                    
                    // Добавляем системный промпт если он есть
                    if (newSystemPrompt) {
                        console.log('Добавление системного промпта в новый чат:', newSystemPrompt);
                        const systemMessage = await saveMessage(
                            newChat.id,
                            newSystemPrompt,
                            'system'
                        );
                        setMessages([systemMessage]);
                    }
                }
            } else {
                const currentChat = userChats.find(chat => chat.id === parseInt(chatId, 10));
                if (currentChat) {
                    setCurrentChat(currentChat);
                }
            }

        } catch (error) {
            console.error('Ошибка при загрузке чатов:', error);
        }
    }, [chatId, navigate, selectedModel]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!chatId) return;
        
        const loadMessages = async () => {
            try {
                const chatMessages = await fetchChatMessages(chatId);
                setMessages(chatMessages);
                console.log(currentChat, chatId, chats)
                if (!currentChat) {
                    const chat = chats.find(c => c.id === parseInt(chatId, 10));
                    if (chat) {
                        console.log(chat)
                        setCurrentChat(chat);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке сообщений:', error);
            }
        };
        
        loadMessages();
    }, [chatId, chats, currentChat]);

    useEffect(() => {
        if (chatId && chats.length > 0) {
            const chat = chats.find(c => c.id === parseInt(chatId, 10));
            if (chat) {
                setCurrentChat(chat);
            }
        }
    }, [chatId, chats]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const loadPrompts = async () => {
            const [newSystemPrompt, newWrapper] = await Promise.all([
                fetchSystemPrompt(selectedModel),
                fetchUserPromptWrapper(selectedModel)
            ]);
            console.log('Загружены промпты:', { 
                systemPrompt: newSystemPrompt, 
                userWrapper: newWrapper 
            });
            setSystemPrompt(newSystemPrompt);
            setUserPromptWrapper(newWrapper);
        };

        loadPrompts();
    }, [selectedModel]);

    const updateChatTitleFromResponse = async (content) => {
        try {
            const titleResponse = await sendMessageToAI([
                {
                    role: "system",
                    content: "Создай короткое название (не более 4-5 слов) для чата на основе этого сообщения. Ответь только названием, без кавычек и дополнительного текста."
                },
                {
                    role: "user",
                    content: content
                }
            ]);

            if (titleResponse?.content && currentChat) {
                const titleMatch = titleResponse.content.match(/\\boxed{(.*?)}/s);
                const newTitle = titleMatch 
                    ? titleMatch[1].trim().replace(/^"(.*)"$/, '$1')
                    : titleResponse.content.trim();

                await updateChatTitle(currentChat.id, newTitle);
                setChats(chats.map(chat => 
                    chat.id === currentChat.id 
                        ? { ...chat, title: newTitle } 
                        : chat
                ));
                setCurrentChat({ ...currentChat, title: newTitle });
            }
        } catch (error) {
            console.error('Ошибка при обновлении названия чата:', error);
        }
    };

    const handlePromptSettingsUpdate = (newSystemPrompt, newUserWrapper) => {
        setSystemPrompt(newSystemPrompt);
        setUserPromptWrapper(newUserWrapper);
    };

    const renderModelSelector = () => (
        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 300 }}>
                <InputLabel>Модель ИИ</InputLabel>
                <Select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    label="Модель ИИ"
                >
                    {aiModels.map((model) => {
                        const shortDescription = model.description.length > 100 
                            ? model.description.substring(0, 100) + '...' 
                            : model.description;
                            
                        return (
                            <MenuItem 
                                key={model.id} 
                                value={model.id}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    py: 1.5
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {model.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {shortDescription}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Контекст: {model.context}
                                </Typography>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
            <Tooltip title={
                selectedModel ? (
                    <Box sx={{ p: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {aiModels.find(m => m.id === selectedModel)?.name}
                        </Typography>
                        <Typography variant="body2">
                            {aiModels.find(m => m.id === selectedModel)?.description}
                        </Typography>
                    </Box>
                ) : ''
            }>
                <IconButton size="small">
                    <InfoIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Настройки промптов">
                <IconButton
                    size="small"
                    onClick={() => setIsPromptSettingsOpen(true)}
                >
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );

    const handleSendMessage = async () => {
        if (!newMessage.trim() || loading) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setLoading(true);

        try {
            const userMessage = await saveMessage(chatId, messageText, 'user');
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);

            const messageHistory = updatedMessages.map(msg => {
                const processedMessage = {
                    role: msg.role,
                    content: msg.content
                };

                if (msg.role === 'user' && userPromptWrapper) {
                    processedMessage.content = userPromptWrapper.replace('{prompt}', msg.content);
                }

                return processedMessage;
            });

            console.log('Отправка запроса к ИИ:', {
                model: selectedModel,
                messages: messageHistory,
                systemPrompt,
                userPromptWrapper
            });

            let aiResponse;
            if (selectedModel.startsWith('deepseek')) {
                aiResponse = await sendMessageToDeepSeek(messageHistory, selectedModel);
            } else {
                aiResponse = await sendMessageToAI(messageHistory, selectedModel);
            }

            if (aiResponse?.content) {
                const savedResponse = await saveMessage(
                    chatId, 
                    aiResponse.content, 
                    aiResponse?.role,
                    aiResponse?.reasoning
                );
                const newMessages = [...updatedMessages, savedResponse];
                setMessages(newMessages);

                if (newMessages.length === 2) {
                    await updateChatTitleFromResponse(messageText);
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChat = async (chatIdToDelete) => {
        try {
            await deleteChat(chatIdToDelete);
            const updatedChats = chats.filter(chat => chat.id !== chatIdToDelete);
            setChats(updatedChats);
            
            if (chatIdToDelete === chatId) {
                if (updatedChats.length > 0) {
                    navigate(`/AI/${updatedChats[0].id}`);
                } else {
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error('Ошибка при удалении чата:', error);
        }
    };

    const handleTitleEdit = async () => {
        if (!isEditingTitle) {
            setEditedTitle(currentChat?.title || 'Новый чат');
            setIsEditingTitle(true);
        } else {
            try {
                if (editedTitle.trim() && currentChat) {
                    await updateChatTitle(currentChat.id, editedTitle.trim());
                    setChats(chats.map(chat => 
                        chat.id === currentChat.id 
                            ? { ...chat, title: editedTitle.trim() } 
                            : chat
                    ));
                }
            } catch (error) {
                console.error('Ошибка при обновлении названия:', error);
            }
            setIsEditingTitle(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingTitle(false);
        setEditedTitle('');
    };

    return (
        <AuthWrapper isLoginFunc={loadData}>
            <Container maxWidth="xl" sx={{ height: 'calc(100vh - 80px)', py: 2 }}>
                <Grid container spacing={2} sx={{ height: '100%' }}>
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <AIChatSidebar 
                            chats={chats}
                            currentChatId={chatId}
                            onNewChat={handleNewChat}
                            onDeleteChat={handleDeleteChat}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={9} sx={{ height: '100%' }}>
                        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ 
                                p: 2, 
                                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                {isEditingTitle ? (
                                    <>
                                        <TextField
                                            fullWidth
                                            value={editedTitle}
                                            onChange={(e) => setEditedTitle(e.target.value)}
                                            size="small"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleTitleEdit();
                                                }
                                            }}
                                        />
                                        <IconButton 
                                            size="small" 
                                            onClick={handleTitleEdit}
                                            color="primary"
                                        >
                                            <CheckIcon />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            onClick={handleCancelEdit}
                                        >
                                            <CloseIcon />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                            {currentChat?.title || 'Новый чат'}
                                        </Typography>
                                        <IconButton 
                                            size="small" 
                                            onClick={handleTitleEdit}
                                            sx={{ 
                                                opacity: 0.6,
                                                '&:hover': { opacity: 1 }
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                                {renderModelSelector()}
                            </Box>
                            
                            <Box sx={{ 
                                flexGrow: 1, 
                                overflow: 'auto', 
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {messages.length === 0 ? (
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'center', 
                                        alignItems: 'center',
                                        height: '100%'
                                    }}>
                                        <Typography variant="body1" color="text.secondary">
                                            Начните новый разговор
                                        </Typography>
                                    </Box>
                                ) : (
                                    messages.map((message) => (
                                        <AIChatMessage key={message.id} message={message} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </Box>
                            
                            <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                <Grid container spacing={1}>
                                    <Grid item xs>
                                        <TextField
                                            fullWidth
                                            placeholder="Введите сообщение..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            disabled={loading}
                                            multiline
                                            maxRows={4}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                            onClick={handleSendMessage}
                                            disabled={loading || !newMessage.trim()}
                                        >
                                            Отправить
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
            <PromptSettingsModal
                open={isPromptSettingsOpen}
                onClose={() => setIsPromptSettingsOpen(false)}
                currentSystemPrompt={systemPrompt}
                currentUserWrapper={userPromptWrapper}
                onUpdate={handlePromptSettingsUpdate}
            />
        </AuthWrapper>
    );
}

export default AIChat; 