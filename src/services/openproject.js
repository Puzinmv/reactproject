import axios from 'axios';

export const CreateProject = (id) => {
    let data = JSON.stringify({
        "name": "»м¤ проекта",
        "description": {
            "raw": "**ќписание**"
        },
        "public": false,
        "statusExplanation": {
            "raw": "**ќписание статуса проекта**"
        },
        "customField32": "÷ель проекта",
        "customField28": {
            "raw": "**ќписание работ**"
        },
        "customField29": 17,
        "customField30": 21,
        "customField33": {
            "raw": "**јдреса проведени¤ работ**"
        },
        "customField34": {
            "raw": "**ќграничени¤ со стороны исполнителей**"
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