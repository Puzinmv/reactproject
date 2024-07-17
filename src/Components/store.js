import create from 'zustand';

export const useStore = create(set => ({
    columnOrder: [],
    hiddenColumns: {},
    columnWidths: {},
    setColumnOrder: order => set({ columnOrder: order }),
    setHiddenColumns: columns => set({ hiddenColumns: columns }),
    setColumnWidths: widths => set({ columnWidths: widths }),
}));
