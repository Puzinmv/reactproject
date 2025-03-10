import React from 'react';
import { Box, List, ListItem, ListItemText, ListItemIcon, Button, Paper, Typography, IconButton, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';

function AIChatSidebar({ chats, currentChatId, onNewChat, onDeleteChat }) {
    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2 }}>
                <Button 
                    variant="contained" 
                    fullWidth 
                    startIcon={<AddIcon />}
                    onClick={onNewChat}
                >
                    Новый чат
                </Button>
            </Box>
            
            <Divider />
            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <List>
                    {chats.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                История чатов пуста
                            </Typography>
                        </Box>
                    ) : (
                        chats.map((chat) => (
                            <ListItem 
                                key={chat.id}
                                component={Link}
                                to={`/AI/${chat.id}`}
                                selected={chat.id === currentChatId}
                                sx={{
                                    textDecoration: 'none',
                                    color: 'text.primary',
                                    '&.Mui-selected': {
                                        bgcolor: 'action.selected'
                                    }
                                }}
                                secondaryAction={
                                    <IconButton 
                                        edge="end" 
                                        size="small"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onDeleteChat(chat.id);
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemIcon>
                                    <ChatIcon />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={chat.title || 'Новый чат'} 
                                    primaryTypographyProps={{
                                        noWrap: true,
                                        style: { maxWidth: '80%' }
                                    }}
                                    secondary={new Date(chat.date_created).toLocaleDateString()}
                                />
                            </ListItem>
                        ))
                    )}
                </List>
            </Box>
        </Paper>
    );
}

export default AIChatSidebar; 