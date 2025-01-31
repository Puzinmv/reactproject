import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../Components/LoginForm';

describe('LoginForm', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
  });

  test('отображает форму AD авторизации по умолчанию', () => {
    render(<LoginForm onLogin={mockOnLogin} />);
    
    expect(screen.getByText('Авторизация AD')).toBeInTheDocument();
    expect(screen.getByLabelText('AD login')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('переключается между формами авторизации', async () => {
    render(<LoginForm onLogin={mockOnLogin} />);
    
    const switchButton = screen.getByRole('checkbox', { name: /авторизация через active directory/i });
    await userEvent.click(switchButton);
    
    expect(screen.getByText('Авторизация')).toBeInTheDocument();
    expect(screen.getByLabelText('Email адрес')).toBeInTheDocument();
  });

  test('вызывает onLogin с правильными параметрами при AD авторизации', async () => {
    render(<LoginForm onLogin={mockOnLogin} />);
    
    await userEvent.type(screen.getByLabelText('AD login'), 'testuser');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    
    const submitButton = screen.getByText('Вход через AD');
    await userEvent.click(submitButton);
    
    expect(mockOnLogin).toHaveBeenCalledWith('testuser', 'password123', true);
  });

  test('показывает сообщение об ошибке при неудачной авторизации', async () => {
    mockOnLogin.mockResolvedValue(false);
    render(<LoginForm onLogin={mockOnLogin} />);
    
    await userEvent.type(screen.getByLabelText('AD login'), 'testuser');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword');
    
    const submitButton = screen.getByText('Вход через AD');
    await userEvent.click(submitButton);
    
    expect(screen.getByText('Неверный логин или пароль')).toBeInTheDocument();
  });
}); 