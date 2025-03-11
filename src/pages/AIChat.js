import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Typography, TextField, Button, Paper, CircularProgress, IconButton, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import { fetchUserChats, createNewChat, fetchChatMessages, saveMessage, updateChatTitle, deleteChat } from '../services/directus';
import { sendMessageToAI } from '../services/openrouter';
import AIChatMessage from '../Components/AIChatMessage';
import AIChatSidebar from '../Components/AIChatSidebar';
import AuthWrapper from '../Components/AuthWrapper';
import { AI_MODELS, DEFAULT_MODEL } from '../constants/aiModels';

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
    const [selectedModel, setSelectedModel] = useState(() => {
        const savedModel = localStorage.getItem('selectedAIModel');
        return savedModel || DEFAULT_MODEL;
    });

    
    const loadData = async () => {
        try {
            const userChats = await fetchUserChats();
            setChats(userChats);
            console.log(userChats)
            if (!chatId && userChats.length > 0) {
                navigate(`/AI/${userChats[0].id}`);
                setCurrentChat(userChats[0]);
            } else if (!chatId) {
                handleNewChat();
            } else {
                const currentChat = userChats.find(chat => chat.id === parseInt(chatId, 10));
                if (currentChat) {
                    setCurrentChat(currentChat);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке чатов:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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

    // Прокрутка к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleNewChat = async () => {
        try {
            const newChat = await createNewChat();
            navigate(`/AI/${newChat.id}`);
            setChats([newChat, ...chats]);
        } catch (error) {
            console.error('Ошибка при создании нового чата:', error);
        }
    };

    // Функция для обновления названия чата на основе первого ответа
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
                // Извлекаем текст из формата \boxed{}
                const titleMatch = titleResponse.content.match(/\\boxed{(.*?)}/s);
                const newTitle = titleMatch 
                    ? titleMatch[1].trim().replace(/^"(.*)"$/, '$1') // Удаляем кавычки если они есть
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

    const renderModelSelector = () => (
        <Box sx={{ ml: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Модель ИИ</InputLabel>
                <Select
                    value={selectedModel}
                    onChange={(e) => {
                        setSelectedModel(e.target.value);
                        localStorage.setItem('selectedAIModel', e.target.value);
                    }}
                    label="Модель ИИ"
                >
                    {AI_MODELS.map((model) => (
                        <MenuItem 
                            key={model.id} 
                            value={model.id}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start'
                            }}
                        >
                            <Typography variant="subtitle2">
                                {model.name}
                                <Typography 
                                    component="span" 
                                    variant="caption" 
                                    sx={{ ml: 1, color: 'text.secondary' }}
                                >
                                    {model.provider}
                                </Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {model.description}
                            </Typography>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Tooltip title="Информация о модели">
                <IconButton
                    size="small"
                    onClick={() => {
                        const model = AI_MODELS.find(m => m.id === selectedModel);
                        if (model) {
                            // Можно показать модальное окно с подробной информацией
                            alert(`${model.name}\n\n${model.description}\n\nКонтекст: ${model.context}`);
                        }
                    }}
                >
                    <InfoIcon fontSize="small" />
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
            // Сохраняем сообщение пользователя
            const userMessage = await saveMessage(chatId, messageText, 'user');
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);

            // Передаем выбранную модель в API
            const aiResponse = await sendMessageToAI(
                updatedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                selectedModel
            );
            console.log(aiResponse)
            if (aiResponse?.content) {
                const savedResponse = await saveMessage(
                    chatId, 
                    aiResponse.content, 
                    aiResponse?.role,
                    aiResponse?.reasoning
                );
                const newMessages = [...updatedMessages, savedResponse];
                setMessages(newMessages);

                // Обновляем название чата только если это первая пара сообщений
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
        console.log(isEditingTitle, currentChat, editedTitle)
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
                    {/* Боковая панель с историей чатов */}
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <AIChatSidebar 
                            chats={chats}
                            currentChatId={chatId}
                            onNewChat={handleNewChat}
                            onDeleteChat={handleDeleteChat}
                        />
                    </Grid>
                    
                    {/* Основная область чата */}
                    <Grid item xs={12} md={9} sx={{ height: '100%' }}>
                        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Обновленный заголовок чата */}
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
                                            onKeyPress={(e) => {
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
                            
                            {/* Сообщения */}
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
                            
                            {/* Ввод сообщения */}
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
        </AuthWrapper>
    );
}

export default AIChat; 