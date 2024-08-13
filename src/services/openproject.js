import axios from 'axios';

export const CreateProject = (id) => {
    let data = JSON.stringify({
        "name": "Имя проекта",
        "description": {
            "raw": "**Описание**"
        },
        "public": false,
        "statusExplanation": {
            "raw": "**Описание статуса проекта**"
        },
        "customField32": "Цель проекта",
        "customField28": {
            "raw": "**Описание работ**"
        },
        "customField29": 17,
        "customField30": 21,
        "customField33": {
            "raw": "**Адреса проведения работ**"
        },
        "customField34": {
            "raw": "**Ограничения со стороны исполнителей**"
        },
        "_meta": {
            "copyMembers": true,
            "copyVersions": true,
            "copyCategories": true,
            "copyWorkPackages": true,
            "copyWorkPackageAttachments": true,
            "copyWiki": true,
            "copyWikiPageAttachments": true,
            "copyForums": true,
            "copyQueries": true,
            "copyBoards": true,
            "copyOverview": true,
            "copyStorages": true,
            "copyStorageProjectFolders": true,
            "copyFileLinks": true,
            "sendNotifications": false
        },
        "_links": {
            "status": {
                "href": "/api/v3/project_statuses/not_started"
            },
            "parent": {
                "href": null
            },
            "customField1": {
                "href": "/api/v3/users/22"
            }
        }
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://openproject.asterit.ru/api/v3/projects/${id}/copy`,
        headers: {
            'X-Authentication-Scheme': 'Session',
            'X-CSRF-TOKEN': 'cqDD5jprMMh0kaT8uOMviX2XT1dWzph4msFxrCwm3nod-q2akrA--s3vZ-G6g6kQv4KaLPz61Yfhr9DtfvY-6Q',
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'host': 'openproject.asterit.ru'
        },
        data: data
    };

    axios.request(config)
        .then((response) => {
            return response.data
        })
        .catch((error) => {
            console.log(error);
            return null
        });

};


export default CreateProject;