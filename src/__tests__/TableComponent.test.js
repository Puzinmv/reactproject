import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableComponent from '../Components/TableComponent';
import { fetchDatanew } from '../services/directus';

// Мокаем сервисы
jest.mock('../services/directus', () => ({
  fetchDatanew: jest.fn()
}));

const mockData = {
  data: [
    {
      id: 1,
      title: 'Тестовый проект',
      status: 'Новая карта',
      initiator: { first_name: 'Иван', last_name: 'Иванов' },
      Department: { Department: 'ИТ отдел' },
      date_created: '2024-03-20'
    }
  ],
  meta: { total: 1 }
};

describe('TableComponent', () => {
  beforeEach(() => {
    fetchDatanew.mockResolvedValue(mockData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('отображает данные таблицы корректно', async () => {
    render(
      <TableComponent 
        UserOption={[]}
        departamentOption={[]}
        CurrentUser={{ id: 1 }}
        onRowSelect={() => {}}
        onCreate={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Тестовый проект')).toBeInTheDocument();
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
      expect(screen.getByText('ИТ отдел')).toBeInTheDocument();
    });
  });

  test('работает переключатель "Мои карты"', async () => {
    render(
      <TableComponent 
        UserOption={[]}
        departamentOption={[]}
        CurrentUser={{ id: 1 }}
        onRowSelect={() => {}}
        onCreate={() => {}}
      />
    );

    const switchElement = screen.getByRole('checkbox', { name: /мои карты/i });
    await userEvent.click(switchElement);

    expect(fetchDatanew).toHaveBeenCalledWith(expect.objectContaining({
      currentUser: null
    }));
  });

  test('работает поиск по колонкам', async () => {
    render(
      <TableComponent 
        UserOption={[]}
        departamentOption={[]}
        CurrentUser={{ id: 1 }}
        onRowSelect={() => {}}
        onCreate={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText(/поиск/i);
    await userEvent.type(searchInput, 'тест');

    expect(fetchDatanew).toHaveBeenCalledWith(expect.objectContaining({
      search: 'тест'
    }));
  });
}); 