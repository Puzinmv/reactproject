import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ModalForm from '../Components/ModalForm';
import { UpdateData, fetchCard, fetchUser } from '../services/directus';
import { GetProjectTemtplate } from '../services/openproject';

jest.mock('@ckeditor/ckeditor5-react', () => ({
  CKEditor: ({ data = '', onChange }) => (
    <textarea
      data-testid="ckeditor"
      defaultValue={data}
      onChange={(event) => onChange?.(event, { getData: () => event.target.value })}
    />
  )
}));

jest.mock('@ckeditor/ckeditor5-build-classic', () => ({}));

jest.mock('../services/directus', () => ({
  UpdateData: jest.fn(),
  fetchCard: jest.fn(),
  fetchUser: jest.fn()
}));

jest.mock('../services/1c', () => ({
  fetchCustomer1C: jest.fn().mockResolvedValue([]),
  fetchCustomerContact1C: jest.fn().mockResolvedValue([]),
  fetchCustomerInn1C: jest.fn().mockResolvedValue('')
}));

jest.mock('../services/openproject', () => ({
  CreateProject: jest.fn(),
  GetProjectTemtplate: jest.fn()
}));

const baseCard = {
  id: 1,
  title: 'Тестовый проект',
  initiator: { id: 1, first_name: 'Иван', last_name: 'Иванов' },
  Department: { id: 1, Department: 'ИТ отдел', prefix: 'it' },
  Customer: 'ООО Тест',
  Files: [],
  status: 'Новая карта',
  jobCalculated: false,
  priceAproved: false,
  system_requirements: []
};

const renderModalForm = async ({
  card = baseCard,
  currentUser = { id: 99, ProjectCardRole: 'Admin' }
} = {}) => {
  fetchCard.mockResolvedValue([card, []]);
  fetchUser.mockResolvedValue([]);
  GetProjectTemtplate.mockResolvedValue([]);

  render(
    <ThemeProvider theme={createTheme()}>
      <ModalForm
        rowid={card.id}
        departament={[{ id: 1, Department: 'ИТ отдел' }]}
        currentUser={currentUser}
        onClose={() => {}}
        onDataSaved={() => {}}
      />
    </ThemeProvider>
  );

  await screen.findByDisplayValue(card.title);
};

describe('ModalForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loaded card data', async () => {
    await renderModalForm();

    expect(screen.getByDisplayValue('Тестовый проект')).toBeInTheDocument();
    expect(screen.getByText('Новая карта')).toBeInTheDocument();
  });

  test('saves valid changes', async () => {
    UpdateData.mockResolvedValue({ success: true });

    await renderModalForm();

    const titleInput = screen.getByLabelText(/название проекта/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Новый тестовый проект');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(UpdateData).toHaveBeenCalled();
    });
  });

  test('switches status to "Новая карта" when all system requirements are approved', async () => {
    await renderModalForm({
      card: {
        ...baseCard,
        status: 'Запрос инициатору',
        need_system_requirements: true,
        system_requirements: [
          { requirement: 'Требование 1', approved: true },
          { requirement: 'Требование 2', approved: false }
        ]
      },
      currentUser: { id: 1, ProjectCardRole: 'Commercial' }
    });

    expect(screen.getByText('Запрос инициатору')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /объем работ/i }));

    const requirementRow = (await screen.findByText('Требование 2')).closest('tr');
    const approvalCheckbox = within(requirementRow).getByRole('checkbox');

    expect(approvalCheckbox).toBeEnabled();

    await userEvent.click(approvalCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Новая карта')).toBeInTheDocument();
    });
  });
});
