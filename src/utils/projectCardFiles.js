const LOCAL_PROJECT_CARD_FILE_PREFIX = 'local-project-card-file:';

const buildLocalProjectCardFileId = () => (
    `${LOCAL_PROJECT_CARD_FILE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export const isLocalProjectCardFile = (file) => Boolean(file?.file);

export const getProjectCardRelationId = (file) => {
    if (!file || isLocalProjectCardFile(file)) {
        return null;
    }

    if (file.relationId !== undefined && file.relationId !== null) {
        return file.relationId;
    }

    if (typeof file.id === 'string' && file.id.startsWith(LOCAL_PROJECT_CARD_FILE_PREFIX)) {
        return null;
    }

    return file.id ?? null;
};

export const getProjectCardDirectusFileId = (file) => {
    if (!file) {
        return null;
    }

    if (file.directusFileId !== undefined && file.directusFileId !== null) {
        return file.directusFileId;
    }

    if (file.directus_files_id && typeof file.directus_files_id === 'object') {
        return file.directus_files_id.id ?? null;
    }

    return file.directus_files_id ?? null;
};

const getProjectCardFilename = (file) => {
    if (!file) {
        return '';
    }

    if (file.filename_download) {
        return file.filename_download;
    }

    if (file.file?.name) {
        return file.file.name;
    }

    if (file.directus_files_id && typeof file.directus_files_id === 'object') {
        return file.directus_files_id.filename_download ?? '';
    }

    return '';
};

export const normalizeProjectCardFile = (file) => {
    if (!file) {
        return null;
    }

    const localId = typeof file.id === 'string' && file.id.startsWith(LOCAL_PROJECT_CARD_FILE_PREFIX)
        ? file.id
        : null;
    const relationId = getProjectCardRelationId(file);

    return {
        id: localId || relationId || buildLocalProjectCardFileId(),
        relationId,
        directusFileId: getProjectCardDirectusFileId(file),
        filename_download: getProjectCardFilename(file),
        file: file.file ?? null,
        isLocal: isLocalProjectCardFile(file),
    };
};

export const normalizeProjectCardFiles = (files = []) => (
    (files || [])
        .map((file) => normalizeProjectCardFile(file))
        .filter(Boolean)
);

export const createLocalProjectCardFiles = (fileList) => (
    Array.from(fileList || []).map((file) => ({
        id: buildLocalProjectCardFileId(),
        relationId: null,
        directusFileId: null,
        filename_download: file.name,
        file,
        isLocal: true,
    }))
);
