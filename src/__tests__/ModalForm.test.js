import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalForm from '../Components/ModalForm';
import { UpdateData, fetchCard } from '../services/directus';

jest.mock('../services/directus', () => ({
  UpdateData: jest.fn(),
  fetchCard: jest.fn(),
  GetfilesInfo: jest.fn().mockResolvedValue([])
}));

const mockFormData = {
  id: 1,
  title: 'Тестовый проект',
  initiator: { id: 1, first_name: 'Иван', last_name: 'Иванов' },
  Department: { id: 1, Department: 'ИТ отдел' },
  Customer: 'ООО Тест',
  Files: []
};

describe('ModalForm', () => {
  beforeEach(() => {
    fetchCard.mockResolvedValue([mockFormData, []]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('загружает и отображает данные формы', async () => {
    render(
      <ModalForm 
        rowid={1}
        departament={[{ id: 1, Department: 'ИТ отдел' }]}
        currentUser={{ ProjectCardRole: 'Admin' }}
        onClose={() => {}}
        onDataSaved={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Тестовый проект')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ООО Тест')).toBeInTheDocument();
    });
  });

  test('валидация обязательных полей', async () => {
    render(
      <ModalForm 
        rowid={1}
        departament={[{ id: 1, Department: 'ИТ отдел' }]}
        currentUser={{ ProjectCardRole: 'Admin' }}
        onClose={() => {}}
        onDataSaved={() => {}}
      />
    );

    const saveButton = screen.getByText('Сохранить');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Поле не должно быть пустым')).toBeInTheDocument();
    });
  });

  test('сохраняет изменения при валидных данных', async () => {
    UpdateData.mockResolvedValue({ success: true });

    render(
      <ModalForm 
        rowid={1}
        departament={[{ id: 1, Department: 'ИТ отдел' }]}
        currentUser={{ ProjectCardRole: 'Admin' }}
        onClose={() => {}}
        onDataSaved={() => {}}
      />
    );

    await waitFor(() => {
      const titleInput = screen.getByLabelText(/название проекта/i);
      userEvent.type(titleInput, 'Новый тестовый проект');
    });

    const saveButton = screen.getByText('Сохранить');
    await userEvent.click(saveButton);

    expect(UpdateData).toHaveBeenCalled();
  });
}); 