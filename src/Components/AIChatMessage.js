import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WarningIcon from '@mui/icons-material/Warning';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function AIChatMessage({ message }) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    // Функция для предварительной обработки текста
    const preprocessContent = (content) => {
        // Заменяем \boxed{text} на соответствующий markdown
        return content.replace(/\\boxed{([^}]+)}/g, '**$1**');
    };
    
    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 2,
            maxWidth: '100%'
        }}>
            {!isUser && (
                <Avatar sx={{ 
                    mr: 1, 
                    bgcolor: isSystem ? 'warning.main' : 'primary.main' 
                }}>
                    {isSystem ? <WarningIcon /> : <SmartToyIcon />}
                </Avatar>
            )}
            
            <Paper sx={{ 
                p: 2, 
                maxWidth: '80%',
                bgcolor: isUser 
                    ? 'primary.light' 
                    : isSystem 
                        ? 'warning.light' 
                        : 'background.paper',
                color: isUser ? 'white' : 'text.primary'
            }}>
                {isSystem ? (
                    <Typography variant="body1">{message.content}</Typography>
                ) : (
                    <Box>
                        {message.reasoning && (
                            <Box sx={{ 
                                mb: 2,
                                p: 1,
                                borderRadius: 1,
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                borderLeft: '3px solid',
                                borderColor: 'primary.main'
                            }}>
                                <Typography 
                                    variant="caption" 
                                    component="div"
                                    sx={{ 
                                        color: 'text.secondary',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {message.reasoning}
                                </Typography>
                            </Box>
                        )}
                        <Box sx={{ 
                            '& p': { m: 0 },
                            '& pre': { 
                                p: 1, 
                                borderRadius: 1, 
                                bgcolor: 'rgba(0,0,0,0.05)',
                                overflowX: 'auto'
                            },
                            '& code': {
                                fontFamily: 'monospace',
                                p: 0.5,
                                borderRadius: 0.5,
                                bgcolor: 'rgba(0,0,0,0.05)',
                            },
                            '& .katex': {
                                fontSize: '1.1em',
                            },
                            '& strong': {
                                backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 500,
                            }
                        }}>
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {preprocessContent(message.content)}
                            </ReactMarkdown>
                        </Box>
                    </Box>
                )}
            </Paper>
            
            {isUser && (
                <Avatar sx={{ ml: 1, bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                </Avatar>
            )}
        </Box>
    );
}

export default AIChatMessage; 